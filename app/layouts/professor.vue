<template>
  <div v-if="isAuthLoading" class="min-h-screen bg-background flex items-center justify-center">
    <div class="text-center">
      <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
      <p class="text-muted-foreground dark:text-gray-300">Carregando...</p>
    </div>
  </div>

  <div v-else class="min-h-screen bg-background">
    <!-- Header -->
    <header class="bg-card border-b border-border sticky top-0 z-40">
      <div class="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        <div class="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <!-- Logo com fundo transparente de verdade — o dourado tem
               contraste bom tanto no claro quanto no escuro, não precisa de
               versão separada por tema. -->
          <div class="h-9 sm:h-12 flex-shrink-0">
            <img src="/logo-instituto.png" alt="Instituto Fios de Ouro" class="h-full w-auto object-contain" />
          </div>
          <div class="min-w-0 flex-1 pl-2 sm:pl-3 border-l border-border/60">
            <h1 class="text-sm sm:text-lg font-bold text-foreground dark:text-gray-100 truncate">Área do Professor</h1>
            <p class="text-xs text-muted-foreground dark:text-gray-300 truncate hidden sm:block">{{ userNome }}</p>
          </div>
        </div>

        <div class="flex items-center space-x-2 flex-shrink-0">
          <ThemeToggle />
          <button
            @click="sair"
            class="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-xs sm:text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
          >
            <Icon icon="sign-out-alt" class-name="w-3 h-3 sm:w-4 sm:h-4" fallback="" />
            <span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <!-- As abas dos dias da semana ficam dentro da própria página (índice do
         professor), não aqui: elas controlam estado da página (qual dia está
         selecionado), não rotas diferentes. No celular a página as renderiza
         de novo como barra flutuante embaixo, no mesmo padrão do painel do
         aluno — por isso o padding extra embaixo só no celular. -->
    <main class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 sm:pb-8">
      <slot />
    </main>

    <footer class="hidden sm:block bg-card border-t border-border py-4 mt-8">
      <div class="container mx-auto px-3 sm:px-4 text-center">
        <p class="text-xs sm:text-sm text-muted-foreground dark:text-gray-300">
          © 2025 Instituto Fios de Ouro - Todos os direitos reservados
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { user, isLoading: authLoading } = useAuth()
const supabase = useSupabaseClient()

const isAuthLoading = ref(true)
const userNome = ref<string>('Professor')

onMounted(async () => {
  let attempts = 0
  while (authLoading.value && attempts < 50) {
    await new Promise(resolve => setTimeout(resolve, 50))
    attempts++
  }
  isAuthLoading.value = false
  carregarNome()
})

async function carregarNome() {
  if (process.server || !user.value) return

  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('user_id', user.value.id)
      .single()

    userNome.value = (!error && data?.nome)
      ? data.nome
      : (user.value?.user_metadata?.nome || user.value?.email || 'Professor')
  } catch {
    userNome.value = user.value?.user_metadata?.nome || user.value?.email || 'Professor'
  }
}

watch(user, () => {
  if (process.client && user.value) carregarNome()
})

async function sair() {
  try {
    // Revoga a sessão antes de limpar o storage, senão o token some antes do signOut
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Erro ao sair:', error)
  } finally {
    if (process.client) {
      localStorage.clear()
      sessionStorage.clear()
    }
    // Recarga completa: router.push manteria o estado de auth em memória
    // e o middleware devolveria o usuário para /professor
    window.location.href = '/login'
  }
}
</script>
