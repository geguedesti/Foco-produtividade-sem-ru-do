import { useState } from 'react'
import { X } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export function AccountDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signup' | 'signin' | 'forgot'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  function translateError(message: string) {
    const normalized = message.toLowerCase()
    if (normalized.includes('invalid email address') || normalized.includes('[body.email]')) return 'Digite um endereço de email válido.'
    if (normalized.includes('email not verified') || normalized.includes('email_not_verified')) return 'Confirme seu email pelo link que enviamos. Você pode solicitar outro ao tentar entrar novamente.'
    if (normalized.includes('uppercase') || normalized.includes('maiúscula')) return 'A senha precisa conter pelo menos uma letra maiúscula.'
    if (normalized.includes('password') && normalized.includes('invalid')) return 'Email ou senha incorretos.'
    if (normalized.includes('already exists') || normalized.includes('already registered')) return 'Este email já tem uma conta. Tente entrar.'
    if (normalized.includes('not configured') || normalized.includes('não foi configurado')) return 'O envio de emails ainda não foi configurado pelo responsável pelo site.'
    if (normalized.includes('provider_not_found') || normalized.includes('google') && normalized.includes('provider')) return 'O login do Google ainda não foi ativado pelo responsável pelo site.'
    return message || 'Não foi possível concluir. Confira os dados e tente novamente.'
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (mode === 'forgot') {
        const result = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: `${window.location.origin}/redefinir-senha`,
        })
        if (result.error) throw new Error(result.error.message || 'Não foi possível solicitar a recuperação.')
        setNotice('Se este email tiver uma conta, enviaremos um link para criar uma nova senha.')
        return
      }
      if (mode === 'signup' && !/[A-Z]/.test(password)) {
        throw new Error('A senha precisa conter pelo menos uma letra maiúscula.')
      }
      const result = mode === 'signup'
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) throw new Error(result.error.message || 'Não foi possível entrar.')
      if (mode === 'signup') setNotice('Enviamos um link de confirmação para seu email. Confirme o endereço para concluir o cadastro.')
      else onClose()
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : ''))
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setBusy(true)
    setError('')
    try {
      const result = await authClient.signIn.social({ provider: 'google', callbackURL: '/' })
      if (result.error) throw new Error(result.error.message || 'Google ainda não está configurado.')
    } catch (err) {
      setError(translateError(err instanceof Error ? err.message : ''))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-title" className="w-full max-w-md rounded-[28px] border border-line bg-card p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-tomato">Foco</p>
            <h2 id="account-title" className="mt-2 font-display text-3xl">{mode === 'signup' ? 'Crie sua conta' : mode === 'forgot' ? 'Recupere sua senha' : 'Bem-vinda de volta'}</h2>
            <p className="mt-2 text-sm text-muted">{mode === 'forgot' ? 'Enviaremos um link seguro para o email da sua conta.' : 'Suas tarefas e sessões acompanham você em qualquer dispositivo.'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-muted hover:bg-paper hover:text-ink"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3">
          {mode === 'signup' && <label className="block text-sm font-semibold">Nome<input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal outline-none focus:border-ink" /></label>}
          <label className="block text-sm font-semibold">Email<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal outline-none focus:border-ink" /></label>
          {mode !== 'forgot' && <label className="block text-sm font-semibold">Senha<input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 font-normal outline-none focus:border-ink" /><span className="mt-1 block text-xs font-normal text-muted">Pelo menos 8 caracteres{mode === 'signup' ? ' e uma letra maiúscula.' : '.'}</span></label>}
          {error && <p role="alert" className="rounded-xl bg-tomato-soft px-3 py-2 text-sm text-tomato">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-moss-soft px-3 py-2 text-sm text-moss">{notice}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-ink px-4 py-3 font-semibold text-paper transition hover:opacity-90 disabled:opacity-60">{busy ? 'Aguarde…' : mode === 'signup' ? 'Criar conta' : mode === 'forgot' ? 'Enviar link de recuperação' : 'Entrar com email'}</button>
        </form>

        {mode !== 'forgot' && <>
          <div className="my-4 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
          <button type="button" disabled={busy} onClick={google} className="w-full rounded-xl border border-line px-4 py-3 font-semibold transition hover:bg-paper disabled:opacity-60">Continuar com Google</button>
        </>}
        <p className="mt-5 text-center text-sm text-muted">
          {mode === 'signup' ? 'Já tem uma conta?' : mode === 'signin' ? 'Ainda não tem conta?' : 'Lembrou sua senha?'}{' '}
          <button type="button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice('') }} className="font-semibold text-tomato hover:underline">{mode === 'signup' ? 'Entrar' : mode === 'signin' ? 'Criar conta' : 'Entrar'}</button>
        </p>
        {mode === 'signin' && <p className="mt-2 text-center"><button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice('') }} className="text-sm font-semibold text-tomato hover:underline">Esqueci minha senha</button></p>}
      </section>
    </div>
  )
}
