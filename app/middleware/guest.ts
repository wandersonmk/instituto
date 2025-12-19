export default defineNuxtRouteMiddleware(async (to, from) => {
  // Apenas executa no cliente para evitar hydration mismatch
  if (process.server) {
    return
  }
  
  // Evitar execução durante a navegação inicial
  if (!from.name) {
    return
  }
  
  // Evitar loop: se já está vindo de área protegida, não redireciona
  if (from.path?.startsWith('/aluno') || from.path?.startsWith('/dashboard')) {
    return
  }
  
  try {
    const supabase = useSupabaseClient()
    
    // Verificar sessão uma única vez
    const { data: { session } } = await supabase.auth.getSession()
    
    // Se não tem sessão, permite acesso
    if (!session?.user) {
      return
    }
    
    // Se tem sessão, redireciona baseado no role
    const userRole = session.user.user_metadata?.role
    
    if (userRole === 'aluno') {
      return navigateTo('/aluno', { replace: true })
    }
    
    return navigateTo('/alunos', { replace: true })
  } catch (error) {
    console.error('Erro no middleware guest:', error)
    return
  }
})
