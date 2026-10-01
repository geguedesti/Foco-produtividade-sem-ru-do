import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock, Flame, Target } from 'lucide-react'
import { FocusTimer } from '@/components/FocusTimer'
import { TaskList, type Task } from '@/components/TaskList'
import { WeekChart } from '@/components/WeekChart'
import {
  applyTheme,
  dayKey,
  getTheme,
  getWorkspaceId,
  setTheme,
  type ThemeName,
} from '@/lib/workspace'
import {
  createTask,
  deleteTask,
  getDashboard,
  logFocusSession,
  toggleTask,
  type Priority,
} from '@/server/productivity.functions'

export const Route = createFileRoute('/')({
  component: Home,
})

type FullTask = Task & { completedAt: string | null }
type Session = { id: number; minutes: number; createdAt: string; taskId: number | null }

function greeting(h: number) {
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

const THEMES: { id: ThemeName; label: string; color: string }[] = [
  { id: 'padrao', label: 'Padrão', color: '#d9472b' },
  { id: 'noturno', label: 'Noturno', color: '#1d1b18' },
  { id: 'rosa', label: 'Rosa', color: '#d6336c' },
  { id: 'ceu', label: 'Céu', color: '#2c7be5' },
]

function Home() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<FullTask[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<Date | null>(null)
  const [theme, setThemeState] = useState<ThemeName>('padrao')

  const refresh = useCallback(async (id: string) => {
    try {
      const data = await getDashboard({ data: { workspaceId: id } })
      setTasks(data.tasks)
      setSessions(data.sessions)
      setError(null)
    } catch {
      setError('Não foi possível carregar seus dados. Tente recarregar a página.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = getWorkspaceId()
    setWorkspaceId(id)
    setNow(new Date())
    const t = getTheme()
    setThemeState(t)
    applyTheme(t)
    refresh(id)
  }, [refresh])

  function changeTheme(t: ThemeName) {
    setThemeState(t)
    setTheme(t)
  }

  async function handleCreate(title: string, priority: Priority, plannedMinutes: number) {
    if (!workspaceId) return
    const tempId = -Date.now()
    setTasks((ts) => [
      {
        id: tempId,
        title,
        priority,
        done: false,
        pomodoros: 0,
        plannedMinutes,
        doneMinutes: 0,
        completedAt: null,
      },
      ...ts,
    ])
    try {
      const row = await createTask({ data: { workspaceId, title, priority, plannedMinutes } })
      setTasks((ts) => ts.map((t) => (t.id === tempId ? row : t)))
    } catch {
      setTasks((ts) => ts.filter((t) => t.id !== tempId))
      setError('Não foi possível salvar a tarefa.')
    }
  }

  async function handleToggle(task: Task) {
    if (!workspaceId || task.id < 0) return
    const done = !task.done
    setTasks((ts) =>
      ts.map((t) => (t.id === task.id ? { ...t, done, completedAt: done ? new Date().toISOString() : null } : t)),
    )
    await toggleTask({ data: { workspaceId, id: task.id, done } }).catch(() => refresh(workspaceId))
  }

  async function handleDelete(task: Task) {
    if (!workspaceId || task.id < 0) return
    setTasks((ts) => ts.filter((t) => t.id !== task.id))
    await deleteTask({ data: { workspaceId, id: task.id } }).catch(() => refresh(workspaceId))
  }

  async function handleFocusComplete(minutes: number, taskId: number | null) {
    if (!workspaceId) return
    try {
      const row = await logFocusSession({ data: { workspaceId, minutes, taskId } })
      setSessions((s) => [row, ...s])
      if (row.taskId != null) {
        setTasks((ts) =>
          ts.map((t) => {
            if (t.id !== row.taskId) return t
            const doneMinutes = t.doneMinutes + minutes
            const reachedGoal = t.plannedMinutes > 0 && doneMinutes >= t.plannedMinutes
            return {
              ...t,
              pomodoros: t.pomodoros + 1,
              doneMinutes,
              done: reachedGoal ? true : t.done,
              completedAt: reachedGoal && !t.done ? new Date().toISOString() : t.completedAt,
            }
          }),
        )
      }
    } catch {
      setError('A sessão de foco não pôde ser registrada.')
    }
  }

  const stats = useMemo(() => {
    const today = now ?? new Date()
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      return d
    })
    const byDay = new Map<string, number>()
    for (const s of sessions) {
      const k = dayKey(new Date(s.createdAt))
      byDay.set(k, (byDay.get(k) ?? 0) + s.minutes)
    }
    const minutes = days.map((d) => byDay.get(dayKey(d)) ?? 0)
    const labels = days.map((d) =>
      d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').replace(/^\w/, (c) => c.toUpperCase()),
    )
    const todayKey = dayKey(today)
    const todaySessions = sessions.filter((s) => dayKey(new Date(s.createdAt)) === todayKey)
    const doneToday = tasks.filter((t) => t.completedAt && dayKey(new Date(t.completedAt)) === todayKey).length
    let streak = 0
    for (let i = minutes.length - 1; i >= 0; i--) {
      if (minutes[i] > 0) streak++
      else if (i === minutes.length - 1) continue
      else break
    }
    return {
      labels,
      minutes,
      todayMinutes: minutes[6],
      todayPomodoros: todaySessions.length,
      doneToday,
      streak,
      weekTotal: minutes.reduce((a, b) => a + b, 0),
    }
  }, [sessions, tasks, now])

  const openTasks = tasks.filter((t) => !t.done && t.id > 0)
  const dateLabel = now?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) ?? ''

  return (
    <div className="grain min-h-screen">
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-full bg-tomato">
              <span className="h-3 w-3 rounded-full bg-paper" />
            </span>
            <span className="font-display text-2xl font-semibold tracking-tight">Foco</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => changeTheme(t.id)}
                  aria-label={`Tema ${t.label}`}
                  title={t.label}
                  className={`h-5 w-5 rounded-full border-2 transition ${
                    theme === t.id ? 'border-ink scale-110' : 'border-line hover:border-ink'
                  }`}
                  style={{ background: t.color }}
                />
              ))}
            </div>
            <span className="text-sm font-medium capitalize text-muted">{dateLabel}</span>
          </div>
        </header>

        <div className="rise mt-12 mb-10 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-tomato">
            {now ? greeting(now.getHours()) : 'Olá'}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] sm:text-6xl">
            {openTasks.length === 0
              ? 'Um dia limpo. Escolha o que importa.'
              : `${openTasks.length} ${openTasks.length === 1 ? 'tarefa espera' : 'tarefas esperam'} por você. Uma de cada vez.`}
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-tomato/30 bg-tomato-soft px-4 py-3 text-sm text-tomato">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <FocusTimer tasks={openTasks} onFocusComplete={handleFocusComplete} />
          <TaskList
            tasks={tasks}
            loading={loading}
            onCreate={handleCreate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </div>

        <section
          className="rise mt-6 rounded-[28px] border border-line bg-card p-6 sm:p-8"
          style={{ animationDelay: '160ms' }}
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-3xl">Sua semana</h2>
              <p className="mt-1 text-sm text-muted">
                {stats.weekTotal} minutos de foco nos últimos 7 dias
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Clock size={16} />} label="Foco hoje" value={`${stats.todayMinutes} min`} />
            <Stat icon={<Target size={16} />} label="Pomodoros hoje" value={String(stats.todayPomodoros)} />
            <Stat icon={<CheckCircle2 size={16} />} label="Concluídas hoje" value={String(stats.doneToday)} />
            <Stat
              icon={<Flame size={16} />}
              label="Sequência"
              value={`${stats.streak} ${stats.streak === 1 ? 'dia' : 'dias'}`}
            />
          </div>

          <div className="mt-8">
            <WeekChart labels={stats.labels} minutes={stats.minutes} todayIndex={6} />
          </div>
        </section>

        <footer className="mt-10 text-center text-xs text-muted">
          Sem cadastro: suas tarefas e sessões ficam salvas na nuvem e vinculadas a este navegador.
        </footer>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/60 p-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        {icon} {label}
      </div>
      <div className="mt-2 font-display text-3xl">{value}</div>
    </div>
  )
}