const KEY = 'foco:workspace'
const LOCAL_DATA_KEY = 'foco:guest-data'

export type LocalTask = {
  id: number
  title: string
  priority: string
  done: boolean
  pomodoros: number
  plannedMinutes: number
  doneMinutes: number
  createdAt: string
  completedAt: string | null
}
export type LocalSession = { id: number; minutes: number; createdAt: string; taskId: number | null }
export type LocalDashboard = { tasks: LocalTask[]; sessions: LocalSession[] }

// Each browser gets an anonymous workspace id so data persists without accounts.
export function getWorkspaceId(): string {
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

export const PRIORITY_LABEL = { alta: 'Alta', media: 'Média', baixa: 'Baixa' } as const

export function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total))
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${h}h` : `${h}h ${rest}min`
}

// ---- tema ----
export type ThemeName = 'padrao' | 'noturno' | 'rosa' | 'ceu'
const THEME_KEY = 'foco:theme'

export function getTheme(): ThemeName {
  const t = localStorage.getItem(THEME_KEY)
  return t === 'noturno' || t === 'rosa' || t === 'ceu' ? t : 'padrao'
}

export function applyTheme(t: ThemeName) {
  const root = document.documentElement
  if (t === 'padrao') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
}

export function setTheme(t: ThemeName) {
  localStorage.setItem(THEME_KEY, t)
  applyTheme(t)
}

export function getLocalDashboard(): LocalDashboard {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_DATA_KEY) || '{}')
    return {
      tasks: Array.isArray(data.tasks) ? data.tasks : [],
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
    }
  } catch {
    return { tasks: [], sessions: [] }
  }
}

export function saveLocalDashboard(data: LocalDashboard) {
  localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data))
}
