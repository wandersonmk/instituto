import { createClient } from '@supabase/supabase-js'

/**
 * Cria a conta de um professor, já confirmada (sem e-mail de confirmação).
 *
 * A rota usa a service_role key, que ignora RLS — por isso ela precisa validar
 * por conta própria quem está chamando. Sem essa checagem, qualquer pessoa que
 * descobrisse a URL poderia criar um professor e passar a marcar presença.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, nome, senha, cursoIds } = body as {
    email?: string
    nome?: string
    senha?: string
    cursoIds?: string[]
  }

  if (!email || !nome) {
    throw createError({ statusCode: 400, statusMessage: 'Email e nome são obrigatórios' })
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
    throw createError({
      statusCode: 403,
      statusMessage: 'Apenas administradores podem cadastrar professores'
    })
  }

  // --- cria a conta ---
  const senhaFinal = senha?.trim() || `Prof${Math.random().toString(36).slice(-8)}@2026`

  const { data: criado, error: erroCriacao } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: senhaFinal,
    email_confirm: true, // já nasce confirmada
    user_metadata: {
      nome,
      role: 'professor',
      empresa_id: solicitante.empresa_id
    }
  })

  if (erroCriacao) {
    throw createError({ statusCode: 400, statusMessage: erroCriacao.message })
  }

  // O trigger on_auth_user_created cria a linha em public.usuarios com perfil professor
  const { data: professor } = await admin
    .from('usuarios')
    .select('id')
    .eq('user_id', criado.user?.id)
    .single()

  // --- vincula os cursos escolhidos ---
  if (professor?.id && Array.isArray(cursoIds) && cursoIds.length > 0) {
    const vinculos = cursoIds.map(curso_id => ({
      curso_id,
      professor_id: professor.id,
      empresa_id: solicitante.empresa_id
    }))

    const { error: erroVinculo } = await admin
      .from('cursos_professores')
      .upsert(vinculos, { onConflict: 'curso_id,professor_id' })

    if (erroVinculo) {
      console.error('Professor criado, mas falhou ao vincular cursos:', erroVinculo)
    }
  }

  return {
    success: true,
    user_id: criado.user?.id,
    professor_id: professor?.id ?? null,
    senha: senhaFinal
  }
})
