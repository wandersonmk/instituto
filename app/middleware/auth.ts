export default defineNuxtRouteMiddleware(async (to, from) => {
  // No servidor, não precisa verificar autenticação detalhada
  if (process.server) {
    return
  }
  
  try {
    console.log('[Auth Middleware] Iniciando verificação...')
    
    // Aguardar o plugin de auth ter executado - aumentado para dar mais tempo
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    const { isAuthenticated, user, isLoading } = useAuth()
    
    console.log('[Auth Middleware] Estado inicial:', { 
      isAuthenticated: isAuthenticated.value, 
      hasUser: !!user.value,
      isLoading: isLoading.value,
      email: user.value?.email
    })
    
    // Aguarda o carregamento ser concluído se ainda estiver carregando
    let attempts = 0
    const maxAttempts = 15 // Aumentado para 1.5 segundo adicional
    
    while (isLoading.value && attempts < maxAttempts) {
      console.log(`[Auth Middleware] Aguardando loading... tentativa ${attempts + 1}`)
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    console.log('[Auth Middleware] Estado final:', { 
      isAuthenticated: isAuthenticated.value, 
      hasUser: !!user.value,
      isLoading: isLoading.value,
      email: user.value?.email,
      attempts 
    })
    
    // Se ainda não está autenticado, tenta verificar diretamente no Supabase
    if (!isAuthenticated.value || !user.value) {
      console.log('[Auth Middleware] Tentando verificação direta no Supabase...')
      
      try {
        const nuxtApp = useNuxtApp()
        if (nuxtApp.$supabase) {
          const supabase = nuxtApp.$supabase as any
          const { data } = await supabase.auth.getSession()
          if (data.session && data.session.user) {
            console.log('[Auth Middleware] Sessão encontrada diretamente no Supabase:', data.session.user.email)
            // A sessão existe, permitir acesso e deixar o plugin atualizar o estado
            return
          }
        }
      } catch (error) {
        console.error('[Auth Middleware] Erro ao verificar sessão diretamente:', error)
      }
    }
    
    // Se não está autenticado, redireciona para login
    if (!isAuthenticated.value || !user.value) {
      console.log('[Auth Middleware] Usuário não autenticado, redirecionando para login')
      return navigateTo('/login')
    }
    
    // Verificar role do usuário e redirecionar para área correta
    const userRole = user.value.user_metadata?.role
    console.log('[Auth Middleware] User role:', userRole)
    
    // Se é aluno tentando acessar área admin, redireciona para área do aluno
    if (userRole === 'aluno' && !to.path.startsWith('/aluno/') && to.path !== '/aluno') {
      console.log('[Auth Middleware] Aluno tentando acessar área admin, redirecionando para /aluno')
      return navigateTo('/aluno')
    }
    
    // Se é admin tentando acessar área do aluno, redireciona para dashboard
    // Verifica se o path é exatamente /aluno ou começa com /aluno/ (mas não /alunos)
    if (userRole !== 'aluno' && (to.path === '/aluno' || to.path.startsWith('/aluno/'))) {
      console.log('[Auth Middleware] Admin tentando acessar área do aluno, redirecionando para /alunos')
      return navigateTo('/alunos')
    }
    
    console.log('[Auth Middleware] Usuário autenticado, permitindo acesso')
  } catch (error) {
    // Se houver erro na inicialização, redireciona para login
    console.error('[Auth Middleware] Erro:', error)
    return navigateTo('/login')
  }
})
