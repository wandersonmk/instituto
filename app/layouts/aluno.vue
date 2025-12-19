<template>
  <!-- Loading inicial enquanto verifica autenticação -->
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
          <div class="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="graduation-cap" class-name="w-4 h-4 sm:w-6 sm:h-6 text-white" fallback="🎓" />
          </div>
          <div class="min-w-0 flex-1">
            <h1 class="text-sm sm:text-lg font-bold text-foreground dark:text-gray-100 truncate">Área do Aluno</h1>
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
    
    <!-- Navigation -->
    <nav class="bg-card border-b border-border overflow-x-auto">
      <div class="container mx-auto px-3 sm:px-4">
        <div class="flex space-x-0.5 sm:space-x-1">
          <NuxtLink
            to="/aluno"
            class="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center justify-center"
            :class="$route.path === '/aluno' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="home" class-name="w-4 h-4 sm:inline mr-0 sm:mr-2" fallback="🏠" />
            <span class="hidden sm:inline">Dashboard</span>
          </NuxtLink>
          
          <NuxtLink
            to="/aluno/indicacoes"
            class="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center justify-center"
            :class="$route.path === '/aluno/indicacoes' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="handshake" class-name="w-4 h-4 sm:inline mr-0 sm:mr-2" fallback="🤝" />
            <span class="hidden sm:inline">Indicações</span>
          </NuxtLink>
          
          <NuxtLink
            to="/aluno/aulas"
            class="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center justify-center"
            :class="$route.path === '/aluno/aulas' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="book" class-name="w-4 h-4 sm:inline mr-0 sm:mr-2" fallback="📚" />
            <span class="hidden sm:inline">Aulas</span>
          </NuxtLink>
          
          <NuxtLink
            to="/aluno/faltas"
            class="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center justify-center"
            :class="$route.path === '/aluno/faltas' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="calendar-times" class-name="w-4 h-4 sm:inline mr-0 sm:mr-2" fallback="📅" />
            <span class="hidden sm:inline">Faltas</span>
          </NuxtLink>
          
          <!-- Aba de Vídeos (só aparece se tiver permissão) -->
          <NuxtLink
            v-if="temAcessoVideos"
            to="/aluno/videos"
            class="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center justify-center"
            :class="$route.path === '/aluno/videos' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="video" class-name="w-4 h-4 sm:inline mr-0 sm:mr-2" fallback="🎥" />
            <span class="hidden sm:inline">Vídeos</span>
          </NuxtLink>
        </div>
      </div>
    </nav>
    
    <!-- Main Content -->
    <main class="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <slot />
    </main>
    
    <!-- Footer -->
    <footer class="bg-card border-t border-border py-4 mt-8">
      <div class="container mx-auto px-3 sm:px-4 text-center">
        <p class="text-xs sm:text-sm text-muted-foreground dark:text-gray-300">
          © 2025 Instituto Fios de Ouro - Todos os direitos reservados
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const { user, signOut, isLoading: authLoading } = useAuth()
const router = useRouter()
const supabase = useSupabaseClient()

// Controle de loading de autenticação
const isAuthLoading = ref(true)

// Nome do usuário vindo do banco de dados
const userNome = ref<string>('Aluno')

// Verificar se aluno tem acesso a vídeos
const temAcessoVideos = ref(false)

// Aguardar autenticação carregar
onMounted(() => {
  // Aguarda um pouco para garantir que a autenticação foi carregada
  const checkAuth = async () => {
    let attempts = 0
    while (authLoading.value && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 50))
      attempts++
    }
    isAuthLoading.value = false
  }
  checkAuth()
})

// Buscar dados do aluno no banco
async function carregarDadosAluno() {
  // Proteção SSR - só executa no client
  if (process.server) return
  if (!user.value) return
  
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('nome_completo, acesso_videos')
      .eq('user_id', user.value.id)
      .single()
    
    if (!error && data) {
      // Atualizar nome do banco
      userNome.value = data.nome_completo || user.value?.user_metadata?.nome || user.value?.email || 'Aluno'
      temAcessoVideos.value = data.acesso_videos || false
    } else {
      // Fallback para user_metadata se não encontrar no banco
      userNome.value = user.value?.user_metadata?.nome || user.value?.email || 'Aluno'
    }
  } catch (error) {
    console.error('Erro ao carregar dados do aluno:', error)
    // Fallback em caso de erro
    userNome.value = user.value?.user_metadata?.nome || user.value?.email || 'Aluno'
  }
}

// Carregar dados ao montar (apenas no client)
onMounted(() => {
  carregarDadosAluno()
})

// Recarregar quando o usuário mudar
watch(user, () => {
  if (process.client && user.value) {
    carregarDadosAluno()
  }
}, { immediate: false })

async function sair() {
  try {
    console.log('Iniciando logout...')
    
    // Fazer signOut primeiro
    await signOut()
    
    // Limpar storage
    if (process.client) {
      localStorage.clear()
      sessionStorage.clear()
    }
    
    console.log('Logout concluído, redirecionando...')
    
    // Forçar reload da página para limpar estado
    window.location.href = '/login'
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    // Mesmo com erro, redireciona forçando reload
    window.location.href = '/login'
  }
}
</script>
