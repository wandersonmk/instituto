export default defineNuxtRouteMiddleware(async (to, from) => {
  // No servidor, não precisa verificar autenticação detalhada
  if (process.server) {
    return
  }
  
  try {
    const supabase = useSupabaseClient()
    const { user } = useAuth()
    
    // Verificar sessão atual do Supabase diretamente
    const { data: { session } } = await supabase.auth.getSession()
    
    console.log('Guest middleware - Verificando sessão:', { 
      hasSession: !!session,
      hasUser: !!user.value,
      sessionEmail: session?.user?.email,
      userEmail: user.value?.email,
      userRole: user.value?.user_metadata?.role || session?.user?.user_metadata?.role
    })
    
    // Se tem sessão válida, redireciona para área apropriada
    if (session?.user) {
      const userRole = session.user.user_metadata?.role
      
      if (userRole === 'aluno') {
        console.log('Guest middleware: Aluno autenticado, redirecionando para /aluno')
        return navigateTo('/aluno', { replace: true })
      } else {
        console.log('Guest middleware: Admin autenticado, redirecionando para /alunos')
        return navigateTo('/alunos', { replace: true })
      }
    }
    
    // Se não tem sessão, permite acesso ao login
    console.log('Guest middleware: Sem sessão, permitindo acesso ao login')
  } catch (error) {
    console.error('Erro no middleware guest:', error)
    // Em caso de erro, permite acesso ao login
  }
})
