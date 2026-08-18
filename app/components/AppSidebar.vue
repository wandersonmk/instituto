<template>
  <div v-if="isLoggedIn">
    <!-- Overlay para mobile (só aparece quando menu mobile está aberto) -->
    <div 
      v-if="isMobileOpen"
      @click="$emit('close-mobile')"
      class="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
    ></div>

    <!-- Sidebar Desktop (sempre visível em desktop) -->
    <div 
      class="hidden lg:flex fixed left-0 top-0 h-screen w-64 bg-background text-foreground z-50 shadow-2xl flex-col border-r border-border"
    >
      <!-- Header com a logo da empresa — fundo transparente de verdade. -->
      <div class="flex items-center justify-center p-5 border-b border-border">
        <img src="/logo-instituto.png" alt="Instituto Fios de Ouro" class="w-full max-w-[190px] h-auto object-contain" />
      </div>

      <!-- Menu de navegação -->
      <nav class="px-4 py-2 flex-1 overflow-y-auto">
        <ul class="space-y-1">
          <!-- Dashboard -->
          <li>
            <NuxtLink 
              to="/"
              class="flex items-center px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="home" class-name="w-5 h-5 mr-3" fallback="" />
              <span>Dashboard</span>
            </NuxtLink>
          </li>

          <!-- Alunos -->
          <li>
            <NuxtLink 
              to="/alunos"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/alunos' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="user-graduate" class-name="w-5 h-5 mr-3" fallback="🎓" />
              <span>Alunos</span>
            </NuxtLink>
          </li>

          <!-- Professores -->
          <li>
            <NuxtLink
              to="/professores"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/professores' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="chalkboard-teacher" class-name="w-5 h-5 mr-3" fallback="👩‍🏫" />
              <span>Professores</span>
            </NuxtLink>
          </li>

          <!-- Cursos -->
          <li>
            <NuxtLink 
              to="/cursos"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/cursos' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="book-open" class-name="w-5 h-5 mr-3" fallback="📚" />
              <span>Cursos</span>
            </NuxtLink>
          </li>

          <!-- Aulas em Vídeo -->
          <li>
            <NuxtLink 
              to="/aulas-videos"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/aulas-videos' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="video" class-name="w-5 h-5 mr-3" fallback="🎥" />
              <span>Aulas em Vídeo</span>
            </NuxtLink>
          </li>

          <!-- Indicações Recebidas -->
          <li>
            <NuxtLink
              to="/indicacoes"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/indicacoes' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="handshake" class-name="w-5 h-5 mr-3" fallback="🤝" />
              <span>Indicações Recebidas</span>
              <span
                v-if="indicacoesNovas > 0"
                class="ml-auto flex-shrink-0 px-1 py-0.5 min-w-[1.05rem] text-center text-[9px] leading-tight font-bold rounded-full bg-emerald-600 text-white"
              >
                {{ indicacoesNovas > 99 ? '99+' : indicacoesNovas }}
              </span>
            </NuxtLink>
          </li>

          <!-- Relatório de Faltas -->
          <li>
            <NuxtLink 
              to="/relatorio-faltas"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/relatorio-faltas' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="calendar-times" class-name="w-5 h-5 mr-3" fallback="📅" />
              <span>Relatório de Faltas</span>
              <span
                v-if="faltasPendentes > 0"
                class="ml-auto flex-shrink-0 px-1 py-0.5 min-w-[1.05rem] text-center text-[9px] leading-tight font-bold rounded-full bg-amber-500 text-white"
                title="Faltas justificadas aguardando sua análise"
              >
                {{ faltasPendentes > 99 ? '99+' : faltasPendentes }}
              </span>
            </NuxtLink>
          </li>

          <!-- Relatório de Aulas -->
          <li>
            <NuxtLink
              to="/relatorio-aulas"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/relatorio-aulas' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="clipboard-list" class-name="w-5 h-5 mr-3" fallback="📋" />
              <span>Relatório de Aulas</span>
            </NuxtLink>
          </li>

          <!-- Avaliações -->
          <li>
            <NuxtLink
              to="/avaliacoes"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/avaliacoes' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="star" class-name="w-5 h-5 mr-3" fallback="⭐" />
              <span>Avaliações</span>
              <span
                v-if="avaliacoesNovas > 0"
                class="ml-auto flex-shrink-0 px-1 py-0.5 min-w-[1.05rem] text-center text-[9px] leading-tight font-bold rounded-full bg-emerald-600 text-white"
              >
                {{ avaliacoesNovas > 99 ? '99+' : avaliacoesNovas }}
              </span>
            </NuxtLink>
          </li>

          <!-- Configurações -->
          <li>
            <NuxtLink 
              to="/configuracoes"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/configuracoes' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="cog" class-name="w-5 h-5 mr-3" fallback="" />
              <span>Configurações</span>
            </NuxtLink>
          </li>

          <!-- Ajuda -->
          <li>
            <NuxtLink 
              to="/ajuda"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/ajuda' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="question-circle" class-name="w-5 h-5 mr-3" fallback="" />
              <span>Ajuda</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Seção inferior com informações do usuário -->
      <div class="mt-auto">
        <!-- Informações do usuário -->
        <div v-if="isLoggedIn" class="p-3 border-t border-border bg-muted/30">
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span class="text-xs font-semibold text-white">
                {{ userEmail ? userEmail.charAt(0).toUpperCase() : 'U' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-foreground truncate">
                {{ userEmail || 'Usuário' }}
              </p>
              <p class="text-xs text-muted-foreground flex items-center">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                Online
              </p>
            </div>
          </div>
        </div>
        
        <!-- Loading state quando usuário ainda está carregando -->
        <div v-else class="p-3 border-t border-border bg-muted/30">
          <div class="flex items-center space-x-3 mb-3">
            <div class="w-8 h-8 bg-muted rounded-full flex items-center justify-center animate-pulse">
              <span class="text-xs font-medium text-muted-foreground">...</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="h-3 bg-muted rounded animate-pulse mb-1"></div>
              <div class="h-2.5 bg-muted/70 rounded animate-pulse w-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sidebar Mobile (só aparece quando isMobileOpen for true) -->
    <div 
      :class="isMobileOpen ? 'translate-x-0' : '-translate-x-full'"
      class="lg:hidden fixed left-0 top-0 h-screen w-64 bg-background text-foreground z-50 shadow-2xl flex-col border-r border-border transition-transform duration-300 ease-in-out flex"
    >
      <!-- Header com a logo da empresa e botão fechar -->
      <div class="flex items-center justify-between gap-2 p-4 border-b border-border">
        <div class="h-10 min-w-0 flex-1">
          <img src="/logo-instituto.png" alt="Instituto Fios de Ouro" class="h-full w-auto max-w-full object-contain" />
        </div>

        <!-- Botão fechar -->
        <button
          @click="$emit('close-mobile')"
          class="p-2 rounded-lg text-foreground/80 hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Menu de navegação mobile (mesmo conteúdo do desktop) -->
      <nav class="px-4 py-2 flex-1 overflow-y-auto">
        <ul class="space-y-1">
          <!-- Dashboard -->
          <li>
            <NuxtLink 
              to="/"
              @click="$emit('close-mobile')"
              class="flex items-center px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="home" class-name="w-5 h-5 mr-3" fallback="" />
              <span>Dashboard</span>
            </NuxtLink>
          </li>

          <!-- Alunos -->
          <li>
            <NuxtLink 
              to="/alunos"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/alunos' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="user-graduate" class-name="w-5 h-5 mr-3" fallback="🎓" />
              <span>Alunos</span>
            </NuxtLink>
          </li>

          <!-- Professores -->
          <li>
            <NuxtLink
              to="/professores"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/professores' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="chalkboard-teacher" class-name="w-5 h-5 mr-3" fallback="👩‍🏫" />
              <span>Professores</span>
            </NuxtLink>
          </li>

          <!-- Cursos -->
          <li>
            <NuxtLink 
              to="/cursos"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/cursos' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="book-open" class-name="w-5 h-5 mr-3" fallback="📚" />
              <span>Cursos</span>
            </NuxtLink>
          </li>

          <!-- Aulas em Vídeo -->
          <li>
            <NuxtLink 
              to="/aulas-videos"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/aulas-videos' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="video" class-name="w-5 h-5 mr-3" fallback="🎥" />
              <span>Aulas em Vídeo</span>
            </NuxtLink>
          </li>

          <!-- Indicações Recebidas -->
          <li>
            <NuxtLink
              to="/indicacoes"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/indicacoes' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="handshake" class-name="w-5 h-5 mr-3" fallback="🤝" />
              <span>Indicações Recebidas</span>
              <span
                v-if="indicacoesNovas > 0"
                class="ml-auto flex-shrink-0 px-1 py-0.5 min-w-[1.05rem] text-center text-[9px] leading-tight font-bold rounded-full bg-emerald-600 text-white"
              >
                {{ indicacoesNovas > 99 ? '99+' : indicacoesNovas }}
              </span>
            </NuxtLink>
          </li>

          <!-- Relatório de Faltas -->
          <li>
            <NuxtLink 
              to="/relatorio-faltas"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/relatorio-faltas' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="calendar-times" class-name="w-5 h-5 mr-3" fallback="📅" />
              <span>Relatório de Faltas</span>
              <span
                v-if="faltasPendentes > 0"
                class="ml-auto flex-shrink-0 px-1 py-0.5 min-w-[1.05rem] text-center text-[9px] leading-tight font-bold rounded-full bg-amber-500 text-white"
                title="Faltas justificadas aguardando sua análise"
              >
                {{ faltasPendentes > 99 ? '99+' : faltasPendentes }}
              </span>
            </NuxtLink>
          </li>

          <!-- Relatório de Aulas -->
          <li>
            <NuxtLink
              to="/relatorio-aulas"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/relatorio-aulas' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="clipboard-list" class-name="w-5 h-5 mr-3" fallback="📋" />
              <span>Relatório de Aulas</span>
            </NuxtLink>
          </li>

          <!-- Avaliações -->
          <li>
            <NuxtLink
              to="/avaliacoes"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/avaliacoes' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="star" class-name="w-5 h-5 mr-3" fallback="⭐" />
              <span>Avaliações</span>
              <span
                v-if="avaliacoesNovas > 0"
                class="ml-auto flex-shrink-0 px-1 py-0.5 min-w-[1.05rem] text-center text-[9px] leading-tight font-bold rounded-full bg-emerald-600 text-white"
              >
                {{ avaliacoesNovas > 99 ? '99+' : avaliacoesNovas }}
              </span>
            </NuxtLink>
          </li>

          <!-- Configurações -->
          <li>
            <NuxtLink 
              to="/configuracoes"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/configuracoes' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="cog" class-name="w-5 h-5 mr-3" fallback="" />
              <span>Configurações</span>
            </NuxtLink>
          </li>

          <!-- Ajuda -->
          <li>
            <NuxtLink 
              to="/ajuda"
              @click="$emit('close-mobile')"
              class="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-muted group relative"
              :class="$route.path === '/ajuda' ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:text-foreground'"
            >
              <Icon icon="question-circle" class-name="w-5 h-5 mr-3" fallback="" />
              <span>Ajuda</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <!-- Seção inferior com informações do usuário (mobile) -->
      <div class="mt-auto">
        <!-- Informações do usuário -->
        <div v-if="isLoggedIn" class="p-3 border-t border-border bg-muted/30">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span class="text-xs font-semibold text-white">
                {{ userEmail ? userEmail.charAt(0).toUpperCase() : 'U' }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-foreground truncate">
                {{ userEmail || 'Usuário' }}
              </p>
              <p class="text-xs text-green-600 flex items-center">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                Online
              </p>
            </div>
          </div>
        </div>
        
        <!-- Loading state quando usuário ainda está carregando -->
        <div v-else class="p-3 border-t border-border bg-muted/30">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-muted rounded-full flex items-center justify-center animate-pulse">
              <span class="text-xs font-medium text-muted-foreground">...</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="h-3 bg-muted rounded animate-pulse mb-1"></div>
              <div class="h-2.5 bg-muted/70 rounded animate-pulse w-10"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

// Props
interface Props {
  isMobileOpen?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMobileOpen: false
})

// Emits
const emit = defineEmits<{
  'close-mobile': []
}>()

// Composables - abordagem simplificada
const userEmail = ref<string | null>(null)
const userName = ref<string | null>(null)
const isLoggedIn = ref(false)

// Badges de "coisa nova" no menu (avaliações não vistas, indicações
// pendentes) — o sidebar monta uma vez e sobrevive à troca de página, então
// é o lugar certo pra manter o canal de tempo real aberto.
const { avaliacoesNovas, indicacoesNovas, faltasPendentes, recarregarTudo, assinarTempoReal, encerrarTempoReal } = useNotificacoesAdmin()

// Verificar autenticação usando o composable useAuth
const { isAuthenticated, user } = process.client ? useAuth() : { isAuthenticated: ref(false), user: ref(null) }

// Toast e montagem SIMPLES
const toast = ref<any>(null)
if (process.client) {
  // Verificar autenticação antes de montar
  if (isAuthenticated && isAuthenticated.value) {
    isLoggedIn.value = true
  }
  
  onMounted(async () => {
    toast.value = await useToastSafe()
    // Se ainda não conseguiu determinar, faz a verificação manual
    if (!isLoggedIn.value) {
      checkUserSession()
    } else {
      // Atualizar email do usuário
      if (user?.value?.email) {
        userEmail.value = user.value.email
      }
    }
  })
  
  // Watcher para mudanças de autenticação
  if (isAuthenticated) {
    watch(isAuthenticated, (newVal) => {
      isLoggedIn.value = newVal
      if (newVal && user?.value?.email) {
        userEmail.value = user.value.email
      }
    })
  }

  // Assina o tempo real assim que loga (cobre os 3 jeitos de isLoggedIn virar
  // true acima: checagem síncrona, checkUserSession() ou o watch de cima) e
  // encerra ao deslogar — não fica com canal aberto sem usuário.
  watch(isLoggedIn, (logado) => {
    if (logado) {
      recarregarTudo()
      assinarTempoReal()
    } else {
      encerrarTempoReal()
    }
  }, { immediate: true })

  onUnmounted(() => {
    encerrarTempoReal()
  })
}

// Atualizar dados quando página ficar visível - SIMPLES
if (process.client) {
  // Escutar mudanças de visibilidade da página para atualizar dados
  const handleVisibilityChange = async () => {
    if (!document.hidden) {
      checkUserSession()
    }
  }
  
  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })
  
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}

// Função para verificar sessão do usuário
const checkUserSession = () => {
  if (process.client) {
    try {
      // Método mais simples - verificar email salvo
      const savedEmail = localStorage.getItem('user_email')
      if (savedEmail) {
        userEmail.value = savedEmail
        isLoggedIn.value = true
        console.log('[AppSidebar] Email encontrado:', savedEmail)
        return
      }
      
      // Tentar pegar do localStorage do Supabase
      const supabaseUrl = useRuntimeConfig().public?.supabaseUrl as string | undefined
      const authData = localStorage.getItem(getAuthStorageKey(supabaseUrl))
      if (authData) {
        const parsed = JSON.parse(authData)
        if (parsed.user && parsed.user.email) {
          userEmail.value = parsed.user.email
          isLoggedIn.value = true
          console.log('[AppSidebar] Usuário encontrado no Supabase:', userEmail.value)
          return
        }
      }
      
      // Tentar pegar do estado global se disponível
      const globalUser = useState('auth_user') as any
      if (globalUser.value && globalUser.value.email) {
        userEmail.value = globalUser.value.email
        isLoggedIn.value = true
        console.log('[AppSidebar] Usuário do estado global:', userEmail.value)
        return
      }
      
      console.log('[AppSidebar] Nenhum usuário encontrado')
    } catch (error) {
      console.error('[AppSidebar] Erro ao verificar sessão:', error)
    }
  }
}
</script>

<style scoped>
/* Gradiente dourado para itens ativos do menu */
:deep(.bg-primary) {
  background: radial-gradient(circle at top left, #ffd700 0%, #f0c000 50%, #daa520 100%) !important;
  box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
}

:deep(.bg-primary:hover) {
  background: radial-gradient(circle at top left, #ffe44d 0%, #ffd700 45%, #f0c000 100%) !important;
  box-shadow: 0 3px 6px rgba(255, 215, 0, 0.4);
}
</style>

