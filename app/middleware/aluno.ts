export default defineNuxtRouteMiddleware(async (to, from) => {
  const { user, isLoading } = useAuth()
  
  // Aguarda o carregamento da autenticação
  while (isLoading.value) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  // Se não estiver autenticado, redireciona para login
  if (!user.value) {
    return navigateTo('/login')
  }
  
  // Verifica se o usuário tem role 'aluno'
  const userRole = user.value.user_metadata?.role
  
  if (userRole !== 'aluno') {
    // Se não for aluno, redireciona para página inicial
    return navigateTo('/')
  }
})
