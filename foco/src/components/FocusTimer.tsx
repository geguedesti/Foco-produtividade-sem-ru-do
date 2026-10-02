import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Settings2, SkipForward } from 'lucide-react'

type Mode = 'foco' | 'pausa' | 'longa'
type Durations = Record<Mode, number>
type TimerSnapshot = {
  mode: Mode
  durations: Durations
  remaining: number
  running: boolean
  cycle: number
  taskId: number | null
  phaseTotalSeconds: number
  segmentStartedAt: number | null
  savedAt: number
}

const DEFAULT_DURATIONS: Durations = { foco: 25, pausa: 5, longa: 15 }
const DUR_KEY = 'foco:durations'
const TIMER_KEY = 'foco:timer'

function clamp(v: number) {
  return Math.max(1, Math.min(180, Math.round(Number(v) || 1)))
}

function loadDurations(): Durations {
  try {
    const parsed = JSON.parse(localStorage.getItem(DUR_KEY) || '{}')
    return { foco: clamp(parsed.foco ?? 25), pausa: clamp(parsed.pausa ?? 5), longa: clamp(parsed.longa ?? 15) }
  } catch { return DEFAULT_DURATIONS }
}

const MODE_LABEL: Record<Mode, string> = { foco: 'Foco', pausa: 'Pausa curta', longa: 'Pausa longa' }

function chime() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 1.2)
  } catch {}
}

type TaskOption = { id: number; title: string; plannedMinutes: number; doneMinutes: number }

export function FocusTimer({ tasks, onFocusComplete }: {
  tasks: TaskOption[]
  onFocusComplete: (minutes: number, taskId: number | null) => void
}) {
  const [mode, setMode] = useState<Mode>('foco')
  const [durations, setDurations] = useState<Durations>(DEFAULT_DURATIONS)
  const [remaining, setRemaining] = useState(DEFAULT_DURATIONS.foco * 60)
  const [phaseTotalSeconds, setPhaseTotalSeconds] = useState(DEFAULT_DURATIONS.foco * 60)
  const [running, setRunning] = useState(false)
  const [cycle, setCycle] = useState(0)
  const [taskId, setTaskId] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const endAt = useRef<number | null>(null)
  const segmentStartedAt = useRef<number | null>(null)

  useEffect(() => {
    const baseDurations = loadDurations()
    setDurations(baseDurations)
    try {
      const saved = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null') as TimerSnapshot | null
      if (saved && ['foco', 'pausa', 'longa'].includes(saved.mode)) {
        const safeDurations = {
          foco: clamp(saved.durations?.foco ?? baseDurations.foco),
          pausa: clamp(saved.durations?.pausa ?? baseDurations.pausa),
          longa: clamp(saved.durations?.longa ?? baseDurations.longa),
        }
        const elapsedSinceSave = saved.running
          ? Math.max(0, Date.now() - (saved.savedAt || Date.now()))
          : 0
        const adjustedRemaining = saved.running
          ? Math.max(0, Math.ceil((saved.remaining * 1000 - elapsedSinceSave) / 1000))
          : Math.max(0, saved.remaining)
        setMode(saved.mode)
        setDurations(safeDurations)
        setRemaining(adjustedRemaining)
        setPhaseTotalSeconds(Math.max(1, saved.phaseTotalSeconds ?? safeDurations[saved.mode] * 60))
        setCycle(Math.max(0, saved.cycle || 0))
        setTaskId(saved.taskId ?? null)
        if (saved.running) {
          segmentStartedAt.current = Date.now()
          endAt.current = Date.now() + adjustedRemaining * 1000
          setRunning(true)
        }
      } else {
        setRemaining(baseDurations.foco * 60)
      }
    } catch {
      setRemaining(baseDurations.foco * 60)
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const snapshot: TimerSnapshot = {
      mode, durations, remaining, running, cycle, taskId,
      phaseTotalSeconds,
      segmentStartedAt: running ? Date.now() : null,
      savedAt: Date.now(),
    }
    localStorage.setItem(TIMER_KEY, JSON.stringify(snapshot))
  }, [mode, durations, remaining, running, cycle, taskId, phaseTotalSeconds, hydrated])

  const total = phaseTotalSeconds
  const progress = total > 0 ? 1 - remaining / total : 0

  function taskFocusSeconds(forTaskId: number | null) {
    if (forTaskId == null) return durations.foco * 60
    const selectedTask = tasks.find((task) => task.id === forTaskId)
    if (!selectedTask || selectedTask.plannedMinutes <= 0) return durations.foco * 60
    const left = Math.max(1, selectedTask.plannedMinutes - selectedTask.doneMinutes)
    return left * 60
  }

  function clearPhase(next: Mode, nextCycle = cycle) {
    setRunning(false)
    endAt.current = null
    segmentStartedAt.current = null
    setMode(next)
    setCycle(nextCycle)
    const nextTotal = next === 'foco' ? taskFocusSeconds(taskId) : durations[next] * 60
    setPhaseTotalSeconds(nextTotal)
    setRemaining(nextTotal)
  }

  function elapsedFocusNow() {
    const remainingNow = running && endAt.current != null
      ? Math.max(0, endAt.current - Date.now())
      : remaining * 1000
    return Math.max(0, phaseTotalSeconds * 1000 - remainingNow)
  }

  function logPartialFocus() {
    const minutes = Math.floor(elapsedFocusNow() / 60_000)
    if (minutes >= 1) {
      onFocusComplete(minutes, taskId)
      const selectedTask = tasks.find((task) => task.id === taskId)
      if (selectedTask && selectedTask.plannedMinutes > 0 && selectedTask.doneMinutes + minutes >= selectedTask.plannedMinutes) {
        setTaskId(null)
      }
    }
  }

  function skipPhase() {
    if (mode === 'foco') {
      logPartialFocus()
      const nextCycle = cycle + 1
      clearPhase(nextCycle % 4 === 0 ? 'longa' : 'pausa', nextCycle)
    } else {
      clearPhase('foco')
    }
    chime()
  }

  function completePhase() {
    if (mode === 'foco') {
      const minutes = Math.max(1, Math.round(phaseTotalSeconds / 60))
      onFocusComplete(minutes, taskId)
      const selectedTask = tasks.find((task) => task.id === taskId)
      if (selectedTask && selectedTask.plannedMinutes > 0 && selectedTask.doneMinutes + minutes >= selectedTask.plannedMinutes) {
        setTaskId(null)
      }
      const nextCycle = cycle + 1
      clearPhase(nextCycle % 4 === 0 ? 'longa' : 'pausa', nextCycle)
    } else {
      clearPhase('foco')
    }
    chime()
  }

  useEffect(() => {
    if (!running) return
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil(((endAt.current ?? Date.now()) - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) completePhase()
    }, 250)
    return () => clearInterval(tick)
    // The interval belongs to the active timer phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, durations.foco, taskId, cycle])

  function toggle() {
    if (running) {
      const nextRemaining = Math.max(0, Math.ceil(((endAt.current ?? Date.now()) - Date.now()) / 1000))
      setRemaining(nextRemaining)
      setRunning(false)
      endAt.current = null
      segmentStartedAt.current = null
    } else {
      const now = Date.now()
      segmentStartedAt.current = now
      endAt.current = now + remaining * 1000
      setRunning(true)
    }
  }

  function chooseMode(next: Mode) {
    if (next === mode) return
    if (mode === 'foco') logPartialFocus()
    clearPhase(next)
  }

  function updateDuration(m: Mode, value: number) {
    const next = { ...durations, [m]: clamp(value) }
    setDurations(next)
    localStorage.setItem(DUR_KEY, JSON.stringify(next))
    if (!running && m === mode) {
      const nextTotal = m === 'foco' ? taskFocusSeconds(taskId) : next[m] * 60
      setPhaseTotalSeconds(nextTotal)
      setRemaining(nextTotal)
    }
  }

  const hours = Math.floor(remaining / 3600)
  const mm = String(hours > 0 ? Math.floor((remaining % 3600) / 60) : Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')
  const hh = String(hours).padStart(2, '0')
  const clock = hours > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`

  useEffect(() => {
    document.title = running ? `${clock} · ${MODE_LABEL[mode]} — Foco` : 'Foco — produtividade sem ruído'
  }, [clock, running, mode])

  const R = 118
  const C = 2 * Math.PI * R
  const accent = mode === 'foco' ? 'var(--color-tomato)' : 'var(--color-moss)'
  const taskOptions = useMemo(() => tasks, [tasks])

  return (
    <section className="rise rounded-[28px] border border-line bg-card p-6 shadow-[0_1px_0_rgba(0,0,0,0.03),0_20px_40px_-28px_rgba(60,40,20,0.35)] sm:p-8">
      <div className="flex items-center gap-1 rounded-full bg-paper p-1 text-sm font-semibold">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => <button key={m} onClick={() => chooseMode(m)} className={`flex-1 rounded-full px-3 py-2 transition ${mode === m ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>{MODE_LABEL[m]}</button>)}
        <button onClick={() => setShowSettings((s) => !s)} aria-label="Personalizar tempos" className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:text-ink"><Settings2 size={16} /></button>
      </div>

      {showSettings && <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-paper p-3">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => <label key={m} className="flex flex-col gap-1"><span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{MODE_LABEL[m]}</span><input type="number" min={1} max={180} value={durations[m]} disabled={running} onChange={(e) => updateDuration(m, Number(e.target.value))} className="w-full rounded-lg border border-line bg-card px-2 py-1 font-mono text-sm outline-none focus:border-ink disabled:opacity-50" /></label>)}
      </div>}

      <div className="relative mx-auto my-8 grid aspect-square w-full max-w-[280px] place-items-center">
        <svg viewBox="0 0 260 260" className="absolute inset-0 -rotate-90"><circle cx="130" cy="130" r={R} fill="none" stroke="var(--color-line)" strokeWidth="6" /><circle cx="130" cy="130" r={R} fill="none" stroke={accent} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }} /></svg>
        <div className="text-center"><div className={`font-mono font-medium tracking-tight tabular-nums ${hours > 0 ? 'text-4xl sm:text-5xl' : 'text-6xl'}`}>{clock}</div><div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">{running ? 'em andamento' : 'pronto'} · ciclo {(cycle % 4) + 1}/4</div></div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={() => clearPhase(mode)} aria-label="Reiniciar" className="grid h-12 w-12 place-items-center rounded-full border border-line text-muted transition hover:text-ink"><RotateCcw size={18} /></button>
        <button onClick={toggle} className="flex h-14 min-w-36 items-center justify-center gap-2 rounded-full px-6 font-semibold text-white transition active:scale-95" style={{ background: accent }}>{running ? <Pause size={18} /> : <Play size={18} />}{running ? 'Pausar' : 'Começar'}</button>
        <button onClick={skipPhase} aria-label="Pular" className="grid h-12 w-12 place-items-center rounded-full border border-line text-muted transition hover:text-ink"><SkipForward size={18} /></button>
      </div>

      <label className="mt-7 block"><span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trabalhando em</span><select value={taskId ?? ''} disabled={running} onChange={(e) => { const selected = e.target.value ? Number(e.target.value) : null; setTaskId(selected); if (mode === 'foco') { const total = taskFocusSeconds(selected); setPhaseTotalSeconds(total); setRemaining(total) } }} className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink disabled:opacity-60"><option value="">Sem tarefa específica</option>{taskOptions.map((t) => <option key={t.id} value={t.id}>{t.title}{t.plannedMinutes > 0 ? ` · ${Math.max(0, t.plannedMinutes - t.doneMinutes)} min restantes` : ''}</option>)}</select><span className="mt-1.5 block text-xs text-muted">Com tempo planejado, o foco acompanha o restante da tarefa; as pausas seguem os tempos definidos acima.</span></label>
    </section>
  )
}
