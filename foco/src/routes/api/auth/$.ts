import { createFileRoute } from '@tanstack/react-router'
import { auth } from '@/lib/auth'

const unavailable = () => new Response('Autenticação não configurada. Configure DATABASE_URL e BETTER_AUTH_SECRET.', { status: 503 })

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }) => auth ? auth.handler(request) : unavailable(),
      POST: async ({ request }) => auth ? auth.handler(request) : unavailable(),
    },
  },
})
