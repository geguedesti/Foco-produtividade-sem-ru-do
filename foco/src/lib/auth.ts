import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import * as schema from '../../db/schema.js'
import { db } from '../../db/index.js'
import { sendTransactionalEmail } from './transactional-email.js'

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
const authConfigured = Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET)

export const auth = authConfigured
  ? betterAuth({
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
      database: drizzleAdapter(db, {
        provider: 'pg',
        schema: {
          user: schema.authUser,
          session: schema.authSession,
          account: schema.authAccount,
          verification: schema.authVerification,
        },
      }),
      emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        autoSignIn: false,
        sendResetPassword: async ({ user, url }) => {
          await sendTransactionalEmail(user.email, 'Recupere sua senha do Foco', url, 'Criar uma nova senha')
        },
      },
      emailVerification: {
        sendOnSignUp: true,
        sendOnSignIn: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          await sendTransactionalEmail(user.email, 'Confirme seu email no Foco', url, 'Confirmar meu email')
        },
      },
      hooks: {
        before: createAuthMiddleware(async (ctx) => {
          if (ctx.path !== '/sign-up/email' && ctx.path !== '/reset-password') return
          const password = ctx.body?.password ?? ctx.body?.newPassword
          if (typeof password === 'string' && !/[A-Z]/.test(password)) {
            throw new APIError('BAD_REQUEST', {
              message: 'A senha precisa conter pelo menos uma letra maiúscula.',
            })
          }
        }),
      },
      ...(googleConfigured
        ? {
            socialProviders: {
              google: {
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                requireEmailVerification: true,
              },
            },
          }
        : {}),
      trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : undefined,
      plugins: [tanstackStartCookies()],
    })
  : null
