export default defineNuxtRouteMiddleware(async () => {
  const { user, isLoading } = useAuth()

  // Aguarda o carregamento da autenticação (máximo 3 segundos)
  let attempts = 0
  while (isLoading.value && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 50))
    attempts++
  }

  if (!user.value) {
    return navigateTo('/login')
  }

  // Admin também conduz aula: em instituto pequeno é a mesma pessoa
  const userRole = user.value.user_metadata?.role
  if (userRole !== 'professor' && userRole !== 'admin') {
    return navigateTo('/')
  }
})
