import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { applyTheme, getTheme, setTheme, type ThemeName } from '@/lib/workspace'

export const Route = createFileRoute('/faq')({ component: FAQ })

const questions = [
  ['Como funciona o Foco?', 'Organize suas tarefas, escolha uma e use o timer para alternar períodos de concentração e pausas. O resumo semanal mostra o tempo que você registrou.'],
  ['Como o tempo da tarefa entra no timer?', 'Selecione uma tarefa com tempo planejado para o contador usar os minutos que faltam. Depois do foco, as pausas usam os tempos definidos no timer. Sem tarefa selecionada, vale o tempo padrão.'],
  ['Preciso criar uma conta?', 'Não. Você pode continuar sem login e seus dados ficam salvos neste navegador. Ao criar uma conta, suas tarefas e sessões locais são importadas para a nuvem. O cadastro só é concluído após confirmar seu email.'],
  ['O que acontece se eu pular um ciclo?', 'Só entram no histórico os minutos completos que você realmente ficou em foco. Menos de um minuto não é registrado, e pausas nunca contam como foco.'],
  ['Meus dados continuam se eu atualizar a página?', 'Sim. O countdown ativo é restaurado quando você volta ao mesmo navegador. No modo sem login, tarefas e sessões também ficam neste navegador; com conta, ficam associadas à sua conta.'],
  ['Como recupero minha senha?', 'Na janela de entrada, escolha “Esqueci minha senha”. Enviaremos um link de recuperação para o email confirmado da sua conta.'],
  ['Como uso o Google para entrar?', 'A opção Google depende de credenciais OAuth configuradas para este site. Depois da configuração, use o botão “Continuar com Google”.'],
  ['Quais regras a senha precisa seguir?', 'A senha precisa ter pelo menos 8 caracteres e uma letra maiúscula.'],
  ['Posso mudar a aparência?', 'Sim. Use as bolinhas de tema na parte superior da tela, inclusive aqui na FAQ, para alternar entre as paletas disponíveis. A escolha fica salva e também será aplicada quando você voltar ao Foco.'],
]

const themes: { id: ThemeName; label: string; color: string }[] = [
  { id: 'padrao', label: 'Padrão', color: '#d9472b' },
  { id: 'noturno', label: 'Noturno', color: '#1d1b18' },
  { id: 'rosa', label: 'Rosa', color: '#d6336c' },
  { id: 'ceu', label: 'Céu', color: '#2c7be5' },
]

function FAQ() {
  const [theme, setThemeState] = useState<ThemeName>('padrao')

  useEffect(() => {
    const currentTheme = getTheme()
    setThemeState(currentTheme)
    applyTheme(currentTheme)
  }, [])

  function changeTheme(nextTheme: ThemeName) {
    setThemeState(nextTheme)
    setTheme(nextTheme)
  }

  return <main className="grain min-h-screen px-5 py-8 sm:px-8">
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"><ArrowLeft size={16} /> Voltar ao Foco</Link>
        <div className="flex items-center gap-2" aria-label="Escolher tema">
          <span className="mr-1 text-xs font-medium text-muted">Tema</span>
          {themes.map((item) => <button
            key={item.id}
            type="button"
            onClick={() => changeTheme(item.id)}
            aria-label={`Tema ${item.label}`}
            aria-pressed={theme === item.id}
            title={item.label}
            className={`h-5 w-5 rounded-full border-2 transition ${theme === item.id ? 'scale-110 border-ink' : 'border-line hover:border-ink'}`}
            style={{ background: item.color }}
          />)}
        </div>
      </header>
      <p className="mt-12 text-xs font-bold uppercase tracking-[0.25em] text-tomato">Ajuda</p>
      <h1 className="mt-3 font-display text-5xl">Perguntas frequentes</h1>
      <p className="mt-3 text-muted">Um pouco mais de clareza para cuidar do que importa.</p>
      <div className="mt-8 space-y-3">
        {questions.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-line bg-card p-5">
          <summary className="cursor-pointer list-none font-semibold marker:hidden">{question}<span className="float-right text-tomato transition group-open:rotate-45">+</span></summary>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{answer}</p>
        </details>)}
      </div>
    </div>
  </main>
}
