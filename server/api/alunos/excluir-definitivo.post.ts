import { createClient } from '@supabase/supabase-js'

/**
 * Exclusão DEFINITIVA de aluno: usada só quando "Excluir" normal foi barrado
 * por histórico vinculado (matrícula/falta/presença/pagamento) e o admin
 * decide apagar tudo mesmo assim. Irreversível — apaga o aluno e todo o
 * histórico acadêmico/financeiro dele, e também a conta de login (se tiver).
 *
 * A exclusão em si roda como RPC (public.excluir_aluno_definitivamente),
 * chamada com o token do PRÓPRIO admin (não a service_role) — assim o
 * auth.uid() dentro da função é o admin de verdade, e a checagem de
 * admin+empresa do RPC funciona igual a uma chamada comum do app. A
 * service_role só entra depois, pra apagar o login (auth.admin.deleteUser),
 * que é uma API exclusiva de admin do GoTrue.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { alunoId } = body as { alunoId?: string }

  if (!alunoId) {
    throw createError({ statusCode: 400, statusMessage: 'Informe o aluno' })
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
    throw createError({ statusCode: 403, statusMessage: 'Apenas administradores podem excluir alunos definitivamente' })
  }

  // Confere de antemão que o aluno é da mesma empresa (o RPC confere de novo
  // por dentro — isso aqui só devolve um erro mais claro antes de tentar).
  const { data: aluno } = await admin.from('alunos').select('empresa_id').eq('id', alunoId).maybeSingle()
  if (!aluno) {
    throw createError({ statusCode: 404, statusMessage: 'Aluno não encontrado' })
  }
  if (aluno.empresa_id !== solicitante.empresa_id) {
    throw createError({ statusCode: 403, statusMessage: 'Esse aluno não pertence à sua empresa' })
  }

  // --- exclusão de verdade, autenticada como o próprio admin ---
  const comoAdmin = createClient(config.public.supabaseUrl, config.public.supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })

  const { data: userIdApagado, error: erroRpc } = await comoAdmin.rpc('excluir_aluno_definitivamente', {
    p_aluno_id: alunoId
  })

  if (erroRpc) {
    throw createError({ statusCode: 400, statusMessage: erroRpc.message })
  }

  // --- se o aluno tinha login próprio, apaga a conta também ---
  if (userIdApagado) {
    const { error: erroAuth } = await admin.auth.admin.deleteUser(userIdApagado as string)
    if (erroAuth) {
      // O aluno e o histórico já foram apagados de verdade — isso aqui é só a
      // credencial de login sobrando (sem nenhum dado vinculado). Não é motivo
      // pra devolver erro pro admin, mas fica registrado pra investigar.
      console.error('Aluno excluído, mas falhou ao remover o login:', erroAuth)
    }
  }

  return { success: true }
})
