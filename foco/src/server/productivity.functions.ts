import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { focusSessions, guestImport, tasks } from '../../db/schema.js'
import { auth } from '@/lib/auth'

export type Priority = 'alta' | 'media' | 'baixa'
const PRIORITIES: Priority[] = ['alta', 'media', 'baixa']

function workspace(id: unknown): string {
  if (typeof id !== 'string' || !/^(?:[a-zA-Z0-9-]{8,64}|account:[a-zA-Z0-9_-]{1,128})$/.test(id)) {
    throw new Error('Espaço de trabalho inválido')
  }
  return id
}

async function authorizeWorkspace(id: string) {
  if (id.startsWith('account:')) {
    if (!auth) throw new Error('Configure o banco e a chave de autenticação antes de usar sua conta.')
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session || id !== `account:${session.user.id}`) throw new Error('Entre na sua conta para acessar esses dados.')
  }
}

export const getDashboard = createServerFn({ method: 'GET' })
  .inputValidator((data: { workspaceId: string }) => ({ workspaceId: workspace(data.workspaceId) }))
  .handler(async ({ data }) => {
    await authorizeWorkspace(data.workspaceId)
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 6)

    const [taskRows, sessionRows] = await Promise.all([
      db
        .select({
          id: tasks.id,
          workspaceId: tasks.workspaceId,
          title: tasks.title,
          priority: tasks.priority,
          done: tasks.done,
          pomodoros: tasks.pomodoros,
          plannedMinutes: tasks.plannedMinutes,
          createdAt: tasks.createdAt,
          completedAt: tasks.completedAt,
          doneMinutes: sql<number>`COALESCE((
            SELECT SUM(${focusSessions.minutes})
            FROM ${focusSessions}
            WHERE ${focusSessions.taskId} = ${tasks.id}
          ), 0)`.mapWith(Number),
        })
        .from(tasks)
        .where(eq(tasks.workspaceId, data.workspaceId))
        .orderBy(desc(tasks.createdAt)),
      db
        .select()
        .from(focusSessions)
        .where(and(eq(focusSessions.workspaceId, data.workspaceId), gte(focusSessions.createdAt, since)))
        .orderBy(desc(focusSessions.createdAt)),
    ])

    return {
      tasks: taskRows.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      })),
      sessions: sessionRows.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    }
  })

export const createTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { workspaceId: string; title: string; priority: Priority; plannedMinutes?: number }) => {
    const title = String(data.title ?? '').trim().slice(0, 200)
    if (!title) throw new Error('Título obrigatório')
    const priority = PRIORITIES.includes(data.priority) ? data.priority : 'media'
    const plannedMinutes = Math.max(0, Math.min(60 * 24, Math.round(Number(data.plannedMinutes) || 0)))
    return { workspaceId: workspace(data.workspaceId), title, priority, plannedMinutes }
  })
  .handler(async ({ data }) => {
    await authorizeWorkspace(data.workspaceId)
    const [row] = await db.insert(tasks).values(data).returning()
    return {
      ...row,
      doneMinutes: 0,
      createdAt: row.createdAt.toISOString(),
      completedAt: null,
    }
  })

export const toggleTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { workspaceId: string; id: number; done: boolean }) => ({
    workspaceId: workspace(data.workspaceId),
    id: Number(data.id),
    done: Boolean(data.done),
  }))
  .handler(async ({ data }) => {
    await authorizeWorkspace(data.workspaceId)
    await db
      .update(tasks)
      .set({ done: data.done, completedAt: data.done ? new Date() : null })
      .where(and(eq(tasks.id, data.id), eq(tasks.workspaceId, data.workspaceId)))
    return { ok: true }
  })

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data: { workspaceId: string; id: number }) => ({
    workspaceId: workspace(data.workspaceId),
    id: Number(data.id),
  }))
  .handler(async ({ data }) => {
    await authorizeWorkspace(data.workspaceId)
    await db.delete(tasks).where(and(eq(tasks.id, data.id), eq(tasks.workspaceId, data.workspaceId)))
    return { ok: true }
  })

export const logFocusSession = createServerFn({ method: 'POST' })
  .inputValidator((data: { workspaceId: string; minutes: number; taskId: number | null }) => ({
    workspaceId: workspace(data.workspaceId),
    minutes: Math.max(1, Math.min(180, Math.round(Number(data.minutes) || 0))),
    taskId: data.taskId == null ? null : Number(data.taskId),
  }))
  .handler(async ({ data }) => {
    await authorizeWorkspace(data.workspaceId)
    let taskId: number | null = null
    let autoCompleted = false

    if (data.taskId != null) {
      const [owned] = await db
        .select({ id: tasks.id, pomodoros: tasks.pomodoros, plannedMinutes: tasks.plannedMinutes, done: tasks.done })
        .from(tasks)
        .where(and(eq(tasks.id, data.taskId), eq(tasks.workspaceId, data.workspaceId)))

      if (owned) {
        taskId = owned.id
        const newPomodoros = owned.pomodoros + 1

        const [sumRow] = await db
          .select({ total: sql<number>`COALESCE(SUM(${focusSessions.minutes}), 0)`.mapWith(Number) })
          .from(focusSessions)
          .where(eq(focusSessions.taskId, owned.id))

        const doneAfter = (sumRow?.total ?? 0) + data.minutes
        const reachedGoal = owned.plannedMinutes > 0 && doneAfter >= owned.plannedMinutes

        await db
          .update(tasks)
          .set({
            pomodoros: newPomodoros,
            done: reachedGoal ? true : owned.done,
            completedAt: reachedGoal && !owned.done ? new Date() : undefined,
          })
          .where(eq(tasks.id, owned.id))

        autoCompleted = reachedGoal && !owned.done
      }
    }

    const [row] = await db
      .insert(focusSessions)
      .values({ workspaceId: data.workspaceId, minutes: data.minutes, taskId })
      .returning()

    return { ...row, createdAt: row.createdAt.toISOString(), autoCompleted }
  })

export const importGuestData = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    guestWorkspaceId: string
    tasks: Array<{ id: number; title: string; priority: string; done: boolean; pomodoros: number; plannedMinutes: number; createdAt: string; completedAt: string | null }>
    sessions: Array<{ id: number; minutes: number; createdAt: string; taskId: number | null }>
  }) => {
    const guestWorkspaceId = workspace(data.guestWorkspaceId)
    if (guestWorkspaceId.startsWith('account:')) throw new Error('Espaço convidado inválido')
    return {
      guestWorkspaceId,
      tasks: data.tasks.slice(0, 1000).map((t) => ({
        id: Number(t.id), title: String(t.title).slice(0, 200),
        priority: PRIORITIES.includes(t.priority as Priority) ? t.priority : 'media',
        done: Boolean(t.done), pomodoros: Math.max(0, Math.round(Number(t.pomodoros) || 0)),
        plannedMinutes: Math.max(0, Math.min(1440, Math.round(Number(t.plannedMinutes) || 0))),
        createdAt: new Date(t.createdAt), completedAt: t.completedAt ? new Date(t.completedAt) : null,
      })),
      sessions: data.sessions.slice(0, 5000).map((s) => ({
        id: Number(s.id), minutes: Math.max(1, Math.min(180, Math.round(Number(s.minutes) || 1))),
        createdAt: new Date(s.createdAt), taskId: s.taskId == null ? null : Number(s.taskId),
      })),
    }
  })
  .handler(async ({ data }) => {
    if (!auth) throw new Error('Configure o banco e a chave de autenticação para criar uma conta.')
    const session = await auth.api.getSession({ headers: getRequestHeaders() })
    if (!session) throw new Error('Entre na sua conta antes de importar os dados.')
    const userId = session.user.id
    await db.transaction(async (tx) => {
      const [claimed] = await tx.insert(guestImport)
        .values({ guestWorkspaceId: data.guestWorkspaceId, userId })
        .onConflictDoNothing()
        .returning({ id: guestImport.guestWorkspaceId })
      if (!claimed) return

      const legacyTasks = await tx.select().from(tasks).where(eq(tasks.workspaceId, data.guestWorkspaceId))
      const legacySessions = await tx.select().from(focusSessions).where(eq(focusSessions.workspaceId, data.guestWorkspaceId))
      const localTaskIds = new Map<number, number>()
      const legacyTaskIds = new Map<number, number>()
      async function copyTask(task: {
        id: number; title: string; priority: string; done: boolean; pomodoros: number;
        plannedMinutes: number; createdAt: Date; completedAt: Date | null
      }, target: Map<number, number>) {
        const [created] = await tx.insert(tasks).values({
          workspaceId: `account:${userId}`,
          title: task.title,
          priority: task.priority,
          done: task.done,
          pomodoros: task.pomodoros,
          plannedMinutes: task.plannedMinutes,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
        }).returning({ id: tasks.id })
        target.set(task.id, created.id)
      }
      for (const task of data.tasks) await copyTask(task, localTaskIds)
      for (const task of legacyTasks) await copyTask(task, legacyTaskIds)
      for (const item of data.sessions) {
        await tx.insert(focusSessions).values({
          workspaceId: `account:${userId}`,
          minutes: item.minutes,
          createdAt: item.createdAt,
          taskId: item.taskId == null ? null : localTaskIds.get(item.taskId) ?? null,
        })
      }
      for (const item of legacySessions) {
        await tx.insert(focusSessions).values({
          workspaceId: `account:${userId}`,
          minutes: item.minutes,
          createdAt: item.createdAt,
          taskId: item.taskId == null ? null : legacyTaskIds.get(item.taskId) ?? null,
        })
      }
    })
    return { ok: true }
  })
