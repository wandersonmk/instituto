import { createClient } from '@supabase/supabase-js'

/**
 * Envio manual de teste da integração Agzap. Diferente do lembrete automático
 * (que roda direto no banco via pg_cron/pg_net, sem passar por aqui), este é
 * síncrono de propósito — o admin quer ver na hora se deu certo ou não.
 *
 * O token nunca trafega pro navegador: essa rota lê do banco com a
 * service_role (ignora RLS) só depois de confirmar que quem está chamando é
 * admin da própria empresa, e repassa a chamada pra Agzap por trás.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { numero, mensagem } = body as { numero?: string; mensagem?: string }

  if (!numero?.trim() || !mensagem?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Informe o número e a mensagem' })
  }

  const config = useRuntimeConfig()
  const admin = createClient(config.public.supabaseUrl, config.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // --- quem está chamando? ---
  const token = getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Não autenticado' })
  }

  const { data: auth, error: erroToken } = await admin.auth.getUser(token)
  if (erroToken || !auth?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Sessão inválida' })
  }

  const { data: solicitante } = await admin
    .from('usuarios')
    .select('perfil, empresa_id')
    .eq('user_id', auth.user.id)
    .single()

  if (!solicitante || solicitante.perfil !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores podem enviar mensagens de teste' })
  }

  // --- token da integração ---
  const { data: configNotif } = await admin
    .from('configuracoes_notificacoes')
    .select('whatsapp_token')
    .eq('empresa_id', solicitante.empresa_id)
    .maybeSingle()

  const whatsappToken = configNotif?.whatsapp_token?.trim()
  if (!whatsappToken) {
    throw createError({ statusCode: 400, statusMessage: 'Configure o token da instância na aba Integrações antes de testar' })
  }

  // --- normaliza o número (mesma regra da função do banco) ---
  const digitos = numero.replace(/\D/g, '')
  const numeroFinal = digitos.length <= 11 ? `55${digitos}` : digitos

  // --- chama a Agzap de verdade, síncrono ---
  try {
    const resposta = await $fetch.raw('https://app.agzap.com.br/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: {
        token: whatsappToken,
        number: numeroFinal,
        type: 'text',
        message: mensagem.trim()
      }
    })

    return { success: true, status: resposta.status }
  } catch (e: any) {
    // $fetch lança em status >= 400 — devolve o que a Agzap respondeu, não um erro genérico
    const status = e?.response?.status
    const detalhe = e?.response?._data?.message || e?.response?._data?.error || e?.message || 'Falha ao enviar'
    throw createError({ statusCode: 502, statusMessage: `Agzap respondeu com erro (${status ?? '?'}): ${detalhe}` })
  }
})
