import { useState } from 'react'
import { Plus, Trash2, Timer } from 'lucide-react'
import type { Priority } from '@/server/productivity.functions'
import { PRIORITY_LABEL, formatMinutes } from '@/lib/workspace'
import { CircularProgress } from './CircularProgress'

export type Task = {
  id: number
  title: string
  priority: string
  done: boolean
  pomodoros: number
  plannedMinutes: number
  doneMinutes: number
}

const PRIORITY_STYLE: Record<string, string> = {
  alta: 'bg-tomato-soft text-tomato',
  media: 'bg-[var(--color-priority-medium-soft)] text-[var(--color-priority-medium)]',
  baixa: 'bg-moss-soft text-moss',
}
const ORDER: Record<string, number> = { alta: 0, media: 1, baixa: 2 }

type Filter = 'abertas' | 'concluidas' | 'todas'

export function TaskList({
  tasks,
  loading,
  onCreate,
  onToggle,
  onDelete,
}: {
  tasks: Task[]
  loading: boolean
  onCreate: (title: string, priority: Priority, plannedMinutes: number) => void
  onToggle: (task: Task) => void
  onDelete: (task: Task) => void
}) {
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [filter, setFilter] = useState<Filter>('abertas')

  const visible = tasks
    .filter((t) => (filter === 'todas' ? true : filter === 'abertas' ? !t.done : t.done))
    .sort((a, b) => Number(a.done) - Number(b.done) || ORDER[a.priority] - ORDER[b.priority])

  const openCount = tasks.filter((t) => !t.done).length
  const doneCount = tasks.length - openCount

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const planned = Math.min(24 * 60, (Number(hours) || 0) * 60 + (Number(minutes) || 0))
    onCreate(title.trim(), priority, planned)
    setTitle('')
    setHours('')
    setMinutes('')
  }

  return (
    <section
      className="rise flex flex-col rounded-[28px] border border-line bg-card p-6 sm:p-8"
      style={{ animationDelay: '80ms' }}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Tarefas</h2>
          <p className="mt-1 text-sm text-muted">
            {openCount} em aberto · {doneCount} concluída{doneCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-paper p-1 text-xs font-semibold">
          {(['abertas', 'concluidas', 'todas'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 capitalize transition ${
                filter === f ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
              }`}
            >
              {f === 'concluidas' ? 'concluídas' : f}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="O que precisa ser feito?"
          maxLength={200}
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none placeholder:text-muted/70 focus:border-ink"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            aria-label="Prioridade"
            className="rounded-xl border border-line bg-paper px-3 py-3 text-sm outline-none focus:border-ink"
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          <div className="flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm">
            <span className="text-xs uppercase tracking-wider text-muted">Tempo</span>
            <input
              value={hours}
              maxLength={2}
              onChange={(e) => setHours(e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              placeholder="0"
              aria-label="Horas planejadas"
              className="w-9 bg-transparent text-center outline-none"
            />
            <span className="text-muted">h</span>
            <input
              value={minutes}
              maxLength={2}
              onChange={(e) => setMinutes(e.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              placeholder="00"
              aria-label="Minutos planejados"
              className="w-9 bg-transparent text-center outline-none"
            />
            <span className="text-muted">min</span>
          </div>

          <button
            type="submit"
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-black active:scale-95"
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>
      </form>

      <ul className="mt-5 flex-1 divide-y divide-line">
        {loading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="py-4">
              <div className="h-5 w-2/3 animate-pulse rounded bg-line/70" />
            </li>
          ))}

        {!loading && visible.length === 0 && (
          <li className="py-12 text-center text-sm text-muted">
            {filter === 'concluidas'
              ? 'Nada concluído ainda. O primeiro check é o mais gostoso.'
              : 'Lista limpa. Adicione a próxima coisa importante.'}
          </li>
        )}

        {visible.map((t) => {
          const pct = t.plannedMinutes > 0 ? Math.min(1, t.doneMinutes / t.plannedMinutes) : t.done ? 1 : 0
          return (
            <li key={t.id} className="group flex items-center gap-3 py-3.5">
              <CircularProgress
                value={pct}
                done={t.done}
                onClick={() => onToggle(t)}
                label={t.done ? 'Reabrir tarefa' : 'Concluir tarefa'}
              />

              <div className="min-w-0 flex-1">
                <div className={`truncate text-[15px] ${t.done ? 'text-muted line-through' : ''}`}>
                  {t.title}
                </div>
                {t.plannedMinutes > 0 && (
                  <div className="mt-0.5 font-mono text-[11px] text-muted">
                    {formatMinutes(t.doneMinutes)} / {formatMinutes(t.plannedMinutes)}
                    {t.done && ' — Concluída'}
                  </div>
                )}
              </div>

              {t.pomodoros > 0 && (
                <span className="flex items-center gap-1 font-mono text-xs text-muted" title="Pomodoros dedicados">
                  <Timer size={13} /> {t.pomodoros}
                </span>
              )}

              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                  PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE.media
                }`}
              >
                {PRIORITY_LABEL[t.priority as Priority] ?? t.priority}
              </span>

              <button
                onClick={() => onDelete(t)}
                aria-label="Excluir tarefa"
                className="text-muted opacity-0 transition hover:text-tomato group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
