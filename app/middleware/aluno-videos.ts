export default defineNuxtRouteMiddleware(async (to, from) => {
  // Só executa no cliente
  if (process.server) return

  const supabase = useSupabaseClient()
  const { user, isLoading } = useAuth()

  // Aguarda o carregamento da autenticação (máximo 3 segundos)
  let attempts = 0
  const maxAttempts = 60
  
  while (isLoading.value && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 50))
    attempts++
  }

  // Se não tiver usuário, redireciona para login
  if (!user.value) {
    return navigateTo('/login')
  }

  try {
    // Buscar dados do aluno e verificar se tem acesso a vídeos
    const { data: aluno, error } = await supabase
      .from('alunos')
      .select('acesso_videos')
      .eq('user_id', user.value.id)
      .single()

    if (error) {
      console.error('Erro ao verificar acesso a vídeos:', error)
      return navigateTo('/aluno')
    }

    // Se não tiver acesso, redireciona para dashboard do aluno
    if (!aluno?.acesso_videos) {
      console.warn('Aluno sem permissão para acessar vídeos')
      return navigateTo('/aluno')
    }

    // Se tiver acesso, permite continuar
  } catch (error) {
    console.error('Erro no middleware aluno-videos:', error)
    return navigateTo('/aluno')
  }
})
