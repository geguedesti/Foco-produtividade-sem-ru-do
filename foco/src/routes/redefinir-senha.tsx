import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/redefinir-senha')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
    error: typeof search.error === 'string' ? search.error : '',
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { token, error: linkError } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!/[A-Z]/.test(password)) {
      setError('A senha precisa conter pelo menos uma letra maiúscula.')
      return
    }
    setBusy(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) throw new Error(result.error.message || 'O link expirou ou não é válido.')
      setSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : ''
      setError(message.includes('uppercase') || message.includes('maiúscula')
        ? 'A senha precisa conter pelo menos uma letra maiúscula.'
        : 'O link expirou ou não é válido. Solicite uma nova recuperação.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="grain grid min-h-screen place-items-center px-5 py-10">
    <section className="w-full max-w-md rounded-[28px] border border-line bg-card p-7 sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-tomato">Foco</p>
      <h1 className="mt-2 font-display text-3xl">{success ? 'Senha atualizada' : 'Crie uma nova senha'}</h1>
      {success ? <><p className="mt-3 text-sm text-muted">Sua senha foi alterada. Agora você pode entrar na sua conta.</p><Link to="/" className="mt-6 block rounded-xl bg-ink px-4 py-3 text-center font-semibold text-paper">Voltar ao Foco</Link></> : !token || linkError ? <><p className="mt-3 text-sm text-muted">Este link expirou ou não é válido. Solicite uma nova recuperação na tela de entrada.</p><Link to="/" className="mt-6 block text-center font-semibold text-tomato">Voltar ao Foco</Link></> : <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold">Nova senha<input type="password" minLength={8} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal outline-none focus:border-ink" /><span className="mt-1 block text-xs font-normal text-muted">Pelo menos 8 caracteres e uma letra maiúscula.</span></label>
        {error && <p role="alert" className="rounded-xl bg-tomato-soft px-3 py-2 text-sm text-tomato">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-paper disabled:opacity-60">{busy ? 'Aguarde…' : 'Salvar nova senha'}</button>
      </form>}
    </section>
  </main>
}
