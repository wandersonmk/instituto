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
          <!-- Sino de notificações -->
          <div class="relative">
            <button
              @click="toggleNotificacoes"
              class="relative p-2 rounded-lg border border-border/50 bg-secondary/50 hover:bg-secondary transition-colors"
              title="Notificações"
            >
              <Icon icon="bell" class-name="w-4 h-4 sm:w-5 sm:h-5 text-foreground/70" fallback="🔔" />
              <span
                v-if="notificacoes.length > 0"
                class="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center leading-none"
              >
                {{ notificacoes.length > 9 ? '9+' : notificacoes.length }}
              </span>
            </button>

            <!-- Fundo pra fechar ao clicar fora -->
            <div v-if="mostrarNotificacoes" class="fixed inset-0 z-40" @click="mostrarNotificacoes = false"></div>

            <!-- Lista de notificações -->
            <div
              v-if="mostrarNotificacoes"
              class="notificacoes-scroll absolute right-0 mt-2 w-72 sm:w-80 max-w-[85vw] bg-card border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto"
            >
              <div class="p-3 border-b border-border">
                <h3 class="text-sm font-semibold text-foreground">Notificações</h3>
              </div>

              <div v-if="notificacoes.length === 0" class="p-6 text-center">
                <Icon icon="bell" class-name="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" fallback="🔔" />
                <p class="text-xs text-muted-foreground">Nenhuma notificação por aqui</p>
              </div>

              <button
                v-for="n in notificacoes"
                :key="n.id"
                type="button"
                @click="abrirNotificacao(n)"
                class="w-full flex items-start gap-2.5 p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 text-left"
              >
                <span
                  class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  :class="n.tipo === 'falta' ? 'bg-red-500' : 'bg-green-500'"
                ></span>
                <span class="min-w-0">
                  <span class="block text-sm font-medium text-foreground">{{ n.titulo }}</span>
                  <span class="block text-xs text-muted-foreground truncate">{{ n.descricao }}</span>
                </span>
              </button>
            </div>
          </div>

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
    
    <!-- Navigation (tablet/desktop) — itens distribuídos igualmente na linha -->
    <nav class="hidden sm:block bg-card border-b border-border">
      <div class="container mx-auto px-4">
        <div class="flex">
          <NuxtLink
            to="/aluno"
            class="flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
            :class="$route.path === '/aluno'
              ? 'border-primary text-amber-600 dark:text-primary'
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="home" class-name="w-5 h-5" fallback="🏠" />
            <span>Dashboard</span>
          </NuxtLink>

          <NuxtLink
            to="/aluno/indicacoes"
            class="flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
            :class="$route.path === '/aluno/indicacoes'
              ? 'border-primary text-amber-600 dark:text-primary'
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="handshake" class-name="w-5 h-5" fallback="🤝" />
            <span>Indicações</span>
          </NuxtLink>

          <NuxtLink
            to="/aluno/cursos"
            class="flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
            :class="$route.path === '/aluno/cursos'
              ? 'border-primary text-amber-600 dark:text-primary'
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="book" class-name="w-5 h-5" fallback="📚" />
            <span>Cursos</span>
          </NuxtLink>

          <NuxtLink
            to="/aluno/faltas"
            class="flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
            :class="$route.path === '/aluno/faltas'
              ? 'border-primary text-amber-600 dark:text-primary'
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="calendar-times" class-name="w-5 h-5" fallback="📅" />
            <span>Faltas</span>
          </NuxtLink>

          <!-- Aba de Vídeos (só aparece se tiver permissão) -->
          <NuxtLink
            v-if="temAcessoVideos"
            to="/aluno/videos"
            class="flex-1 px-2 py-3 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2"
            :class="$route.path === '/aluno/videos'
              ? 'border-primary text-amber-600 dark:text-primary'
              : 'border-transparent text-muted-foreground dark:text-gray-300 hover:text-foreground dark:hover:text-gray-100 hover:border-border'"
          >
            <Icon icon="video" class-name="w-5 h-5" fallback="🎥" />
            <span>Vídeos</span>
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24 sm:pb-8">
      <slot />
    </main>

    <!-- Footer (escondido no celular — o menu flutuante ocupa esse espaço) -->
    <footer class="hidden sm:block bg-card border-t border-border py-4 mt-8">
      <div class="container mx-auto px-3 sm:px-4 text-center">
        <p class="text-xs sm:text-sm text-muted-foreground dark:text-gray-300">
          © 2025 Instituto Fios de Ouro - Todos os direitos reservados
        </p>
      </div>
    </footer>

    <!-- Menu flutuante fixo embaixo (só no celular) — padrão de app mobile -->
    <nav
      class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.08)]"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="flex items-stretch">
        <NuxtLink
          to="/aluno"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          :class="$route.path === '/aluno' ? 'text-amber-600 dark:text-primary' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="home" class-name="w-5 h-5" fallback="🏠" />
          <span class="text-[10px] font-semibold leading-none">Dashboard</span>
        </NuxtLink>

        <NuxtLink
          to="/aluno/indicacoes"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          :class="$route.path === '/aluno/indicacoes' ? 'text-amber-600 dark:text-primary' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="handshake" class-name="w-5 h-5" fallback="🤝" />
          <span class="text-[10px] font-semibold leading-none">Indicações</span>
        </NuxtLink>

        <NuxtLink
          to="/aluno/cursos"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          :class="$route.path === '/aluno/cursos' ? 'text-amber-600 dark:text-primary' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="book" class-name="w-5 h-5" fallback="📚" />
          <span class="text-[10px] font-semibold leading-none">Cursos</span>
        </NuxtLink>

        <NuxtLink
          to="/aluno/faltas"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          :class="$route.path === '/aluno/faltas' ? 'text-amber-600 dark:text-primary' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="calendar-times" class-name="w-5 h-5" fallback="📅" />
          <span class="text-[10px] font-semibold leading-none">Faltas</span>
        </NuxtLink>

        <!-- Aba de Vídeos (só aparece se tiver permissão) -->
        <NuxtLink
          v-if="temAcessoVideos"
          to="/aluno/videos"
          class="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          :class="$route.path === '/aluno/videos' ? 'text-amber-600 dark:text-primary' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="video" class-name="w-5 h-5" fallback="🎥" />
          <span class="text-[10px] font-semibold leading-none">Vídeos</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { NotificacaoAluno } from '~/composables/useNotificacoes'

const { user, signOut, isLoading: authLoading } = useAuth()
const router = useRouter()
const supabase = useSupabaseClient()
const { notificacoes, definirAluno, recarregar: recarregarNotificacoes, dispensar: dispensarNotificacao } = useNotificacoes()

// Controle de loading de autenticação
const isAuthLoading = ref(true)

// Nome do usuário vindo do banco de dados
const userNome = ref<string>('Aluno')
const alunoId = ref<string | null>(null)

// Verificar se aluno tem acesso a vídeos
const temAcessoVideos = ref(false)

// Notificações (sino no cabeçalho) — a lista em si é estado compartilhado
// (useNotificacoes), então some da lista assim que a pendência é resolvida
// em qualquer página, sem precisar navegar de volta pra cá.
const mostrarNotificacoes = ref(false)

function toggleNotificacoes() {
  mostrarNotificacoes.value = !mostrarNotificacoes.value
  if (mostrarNotificacoes.value) recarregarNotificacoes()
}

function abrirNotificacao(n: NotificacaoAluno) {
  mostrarNotificacoes.value = false

  if (n.tipo === 'falta') {
    // Clicar já tira do sino e leva pra página de faltas — a dívida em si só
    // resolve quando for paga (isso o backend continua checando de verdade).
    dispensarNotificacao(n.id)
    router.push('/aluno/faltas')
    return
  }

  // Avaliação só sai do sino quando o aluno realmente terminar e enviar o
  // formulário (ver enviarAvaliacao() → recarregarNotificacoes() em cursos.vue).
  if (n.presencaId) {
    router.push(`/aluno/cursos?avaliar=${n.presencaId}`)
  }
}

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
      .select('id, nome_completo, acesso_videos')
      .eq('user_id', user.value.id)
      .single()

    if (!error && data) {
      // Atualizar nome do banco
      userNome.value = data.nome_completo || user.value?.user_metadata?.nome || user.value?.email || 'Aluno'
      temAcessoVideos.value = data.acesso_videos || false
      alunoId.value = data.id
      definirAluno(data.id)
      await recarregarNotificacoes()
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

<style scoped>
/* Barra de rolagem discreta na lista de notificações — sem isso o
   navegador usa a barra padrão clara, que destoa feio no modo escuro. */
.notificacoes-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(120, 120, 120, 0.35) transparent;
}

.notificacoes-scroll::-webkit-scrollbar {
  width: 6px;
}

.notificacoes-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.notificacoes-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(120, 120, 120, 0.35);
  border-radius: 999px;
}
</style>
