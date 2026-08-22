import { withTimeout } from '~/utils/withTimeout'

export default defineNuxtRouteMiddleware(async (to, from) => {
  // No servidor, não precisa verificar autenticação detalhada
  if (process.server) {
    return
  }
  
  try {
    const { isAuthenticated, user, isLoading } = useAuth()
    
    // Aguarda o carregamento inicial ser concluído (máximo 3 segundos)
    let attempts = 0
    const maxAttempts = 30
    
    while (isLoading.value && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }
    
    // Se ainda não está autenticado após o loading, verificar diretamente no Supabase
    if (!isAuthenticated.value || !user.value) {
      try {
        const nuxtApp = useNuxtApp()
        if (nuxtApp.$supabase) {
          const supabase = nuxtApp.$supabase as any
          // Com timeout: sem prazo, um lock preso (aba suspensa por muito
          // tempo) deixa esse await pendurado pra sempre — e como a
          // navegação da rota espera esse middleware terminar, a página
          // nunca troca de tela (fica presa na anterior até F5).
          const { data } = await withTimeout(supabase.auth.getSession(), 5000, 'getSession middleware')
          if (data.session && data.session.user) {
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

    // Professor tem área própria e não deve cair no painel administrativo
    if (userRole === 'professor' && !to.path.startsWith('/professor')) {
      console.log('[Auth Middleware] Professor redirecionado para /professor')
      return navigateTo('/professor')
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
