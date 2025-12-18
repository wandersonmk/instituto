import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { email, nome, aluno_id, telefone } = body

  // Validação básica
  if (!email || !nome || !aluno_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email, nome e aluno_id são obrigatórios'
    })
  }

  // Gera senha padrão: telefone sem formatação ou senha aleatória segura
  const senhaDefault = telefone?.replace(/\D/g, '') || `Aluno${Math.random().toString(36).slice(-8)}@2024`

  const config = useRuntimeConfig()
  
  // Criar cliente Supabase com service_role key (apenas no servidor!)
  const supabase = createClient(
    config.public.supabaseUrl,
    config.supabaseServiceKey, // Service role key (privada)
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Criar usuário usando Admin API
    // email_confirm: true = conta já confirmada, não envia email
    // Senha padrão: telefone do aluno sem formatação (admin pode pedir reset depois)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: senhaDefault,
      email_confirm: true, // Confirma automaticamente (não envia email)
      user_metadata: {
        role: 'aluno',
        nome,
        aluno_id
      }
    })

    if (error) {
      console.error('Erro ao criar usuário Auth:', error)
      throw createError({
        statusCode: 500,
        statusMessage: error.message
      })
    }

    return {
      success: true,
      user_id: data.user?.id
    }
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Erro ao criar usuário'
    })
  }
})
