import { pgTable, serial, text, timestamp, integer, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const authUser = pgTable('user', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('user_email_unique').on(t.email)])

export const authSession = pgTable('session', {
  id: text().primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text().notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
}, (t) => [uniqueIndex('session_token_unique').on(t.token), index('session_user_idx').on(t.userId)])

export const authAccount = pgTable('account', {
  id: text().primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text(),
  password: text(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('account_user_idx').on(t.userId), uniqueIndex('account_provider_unique').on(t.providerId, t.accountId)])

export const authVerification = pgTable('verification', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('verification_identifier_idx').on(t.identifier)])

export const guestImport = pgTable('guest_import', {
  guestWorkspaceId: text('guest_workspace_id').primaryKey(),
  userId: text('user_id').notNull().references(() => authUser.id, { onDelete: 'cascade' }),
  importedAt: timestamp('imported_at').notNull().defaultNow(),
})

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
