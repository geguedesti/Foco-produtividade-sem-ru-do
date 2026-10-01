import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Settings2, SkipForward } from 'lucide-react'

type Mode = 'foco' | 'pausa' | 'longa'
type Durations = Record<Mode, number>

const DEFAULT_DURATIONS: Durations = { foco: 25, pausa: 5, longa: 15 }
const DUR_KEY = 'foco:durations'

function clamp(v: number) {
  return Math.max(1, Math.min(180, Math.round(Number(v) || 1)))
}

function loadDurations(): Durations {
  try {
    const raw = localStorage.getItem(DUR_KEY)
    if (!raw) return DEFAULT_DURATIONS
    const parsed = JSON.parse(raw)
    return {
      foco: clamp(parsed.foco ?? 25),
      pausa: clamp(parsed.pausa ?? 5),
      longa: clamp(parsed.longa ?? 15),
    }
  } catch {
    return DEFAULT_DURATIONS
  }
}

const MODE_LABEL: Record<Mode, string> = {
  foco: 'Foco',
  pausa: 'Pausa curta',
  longa: 'Pausa longa',
}

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

type TaskOption = { id: number; title: string }

export function FocusTimer({
  tasks,
  onFocusComplete,
}: {
  tasks: TaskOption[]
  onFocusComplete: (minutes: number, taskId: number | null) => void
}) {
  const [mode, setMode] = useState<Mode>('foco')
  const [durations, setDurations] = useState<Durations>(DEFAULT_DURATIONS)
  const [remaining, setRemaining] = useState(DEFAULT_DURATIONS.foco * 60)
  const [running, setRunning] = useState(false)
  const [cycle, setCycle] = useState(0)
  const [taskId, setTaskId] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const endAt = useRef<number | null>(null)

  useEffect(() => {
    const d = loadDurations()
    setDurations(d)
    setRemaining(d[mode] * 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const total = durations[mode] * 60
  const progress = total > 0 ? 1 - remaining / total : 0

  function switchMode(next: Mode, dur = durations) {
    setRunning(false)
    endAt.current = null
    setMode(next)
    setRemaining(dur[next] * 60)
  }

  function finish() {
    setRunning(false)
    endAt.current = null
    if (mode === 'foco') {
      onFocusComplete(durations.foco, taskId)
      const nextCycle = cycle + 1
      setCycle(nextCycle)
      switchMode(nextCycle % 4 === 0 ? 'longa' : 'pausa')
    } else {
      switchMode('foco')
    }
    chime()
  }

  useEffect(() => {
    if (!running) return
    if (endAt.current == null) endAt.current = Date.now() + remaining * 1000
    const tick = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current! - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) finish()
    }, 250)
    return () => clearInterval(tick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode])

  function toggle() {
    if (running) {
      setRunning(false)
      endAt.current = null
    } else {
      setRunning(true)
    }
  }

  function updateDuration(m: Mode, value: number) {
    const next = { ...durations, [m]: clamp(value) }
    setDurations(next)
    localStorage.setItem(DUR_KEY, JSON.stringify(next))
    if (!running && m === mode) setRemaining(next[m] * 60)
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  useEffect(() => {
    document.title = running
      ? `${mm}:${ss} · ${MODE_LABEL[mode]} — Foco`
      : 'Foco — produtividade sem ruído'
  }, [mm, ss, running, mode])

  const R = 118
  const C = 2 * Math.PI * R
  const accent = mode === 'foco' ? 'var(--color-tomato)' : 'var(--color-moss)'

  const taskOptions = useMemo(() => tasks, [tasks])

  return (
    <section className="rise rounded-[28px] border border-line bg-card p-6 sm:p-8 shadow-[0_1px_0_rgba(0,0,0,0.03),0_20px_40px_-28px_rgba(60,40,20,0.35)]">
      <div className="flex items-center gap-1 rounded-full bg-paper p-1 text-sm font-semibold">
        {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-full px-3 py-2 transition ${
              mode === m ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
        <button
          onClick={() => setShowSettings((s) => !s)}
          aria-label="Personalizar tempos"
          className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:text-ink"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {showSettings && (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-paper p-3">
          {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
            <label key={m} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                {MODE_LABEL[m]}
              </span>
              <input
                type="number"
                min={1}
                max={180}
                value={durations[m]}
                onChange={(e) => updateDuration(m, Number(e.target.value))}
                className="w-full rounded-lg border border-line bg-card px-2 py-1 font-mono text-sm outline-none focus:border-ink"
              />
            </label>
          ))}
        </div>
      )}

      <div className="relative mx-auto my-8 grid aspect-square w-full max-w-[280px] place-items-center">
        <svg viewBox="0 0 260 260" className="absolute inset-0 -rotate-90">
          <circle cx="130" cy="130" r={R} fill="none" stroke="var(--color-line)" strokeWidth="6" />
          <circle
            cx="130"
            cy="130"
            r={R}
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.3s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="text-center">
          <div className="font-mono text-6xl font-medium tracking-tight tabular-nums">
            {mm}:{ss}
          </div>
          <div className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {running ? 'em andamento' : 'pronto'} · ciclo {(cycle % 4) + 1}/4
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => switchMode(mode)}
          aria-label="Reiniciar"
          className="grid h-12 w-12 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={toggle}
          className="flex h-14 min-w-36 items-center justify-center gap-2 rounded-full px-6 font-semibold text-white transition active:scale-95"
          style={{ background: accent }}
        >
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? 'Pausar' : 'Começar'}
        </button>
        <button
          onClick={finish}
          aria-label="Pular"
          className="grid h-12 w-12 place-items-center rounded-full border border-line text-muted transition hover:text-ink"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <label className="mt-7 block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trabalhando em</span>
        <select
          value={taskId ?? ''}
          onChange={(e) => setTaskId(e.target.value ? Number(e.target.value) : null)}
          className="mt-2 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-ink"
        >
          <option value="">Sem tarefa específica</option>
          {taskOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}