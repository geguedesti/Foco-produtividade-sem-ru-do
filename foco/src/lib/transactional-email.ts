function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!)
}

export async function sendTransactionalEmail(to: string, subject: string, url: string, action: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!apiKey || !from) throw new Error('O envio de email ainda não foi configurado neste site.')

  const safeUrl = escapeHtml(url)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<main style="font-family:Arial,sans-serif;color:#1d1b18;line-height:1.6"><h1 style="font-size:24px">Foco</h1><p>${action}</p><p><a href="${safeUrl}" style="display:inline-block;background:#1d1b18;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">${action}</a></p><p>Se você não solicitou isso, pode ignorar esta mensagem.</p></main>`,
      text: `${action}: ${url}\n\nSe você não solicitou isso, pode ignorar esta mensagem.`,
    }),
  })
  if (!response.ok) {
    const details = await response.text()
    console.error('Falha ao enviar email transacional:', response.status, details)
    throw new Error('Não foi possível enviar o email. Confira a configuração do serviço de email.')
  }
}
