import { pgTable, serial, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core'

export const tasks = pgTable(
  'tasks',
  {
    id: serial().primaryKey(),
    workspaceId: text('workspace_id').notNull(),
    title: text().notNull(),
    priority: text().notNull().default('media'),
    done: boolean().notNull().default(false),
    pomodoros: integer().notNull().default(0),
    plannedMinutes: integer('planned_minutes').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (t) => [index('tasks_workspace_idx').on(t.workspaceId)],
)

export const focusSessions = pgTable(
  'focus_sessions',
  {
    id: serial().primaryKey(),
    workspaceId: text('workspace_id').notNull(),
    subjectId: integer('subject_id'),
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    minutes: integer().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('focus_sessions_workspace_idx').on(t.workspaceId)],
)