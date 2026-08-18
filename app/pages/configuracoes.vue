<script setup lang="ts">
// Aplica middleware de autenticação
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// Estado de carregamento
const isLoading = ref(true)
let authLoading: any = ref(false)
const isClient = typeof window !== 'undefined'

if (isClient) {
  // Só executa useAuth no aluno
  const auth = useAuth()
  authLoading = auth.isLoading

  onMounted(async () => {
    // Aguarda o auth loading terminar
    while (authLoading.value) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    // Delay reduzido para carregamento mais rápido
    await new Promise(resolve => setTimeout(resolve, 300))
    isLoading.value = false
  })
} else {
  isLoading.value = false
}

const ABAS = [
  { valor: 'lembretes', label: 'Lembretes de Aula', icon: 'bell', fallback: '🔔' },
  { valor: 'integracoes', label: 'Integrações', icon: 'plug', fallback: '🔌' }
] as const

const abaAtiva = ref<'lembretes' | 'integracoes'>('lembretes')
</script>

<template>
  <div>
    <!-- Sempre mostra loading até o client terminar de carregar -->
    <AppLoading
      v-if="isLoading || !isClient"
      title="Carregando Configurações"
      description="Preparando a área de configurações..."
    />
    <!-- Conteúdo só aparece após carregamento client-side. Sem título aqui —
         o cabeçalho do layout (dashboard.vue) já mostra "Configurações". -->
    <div v-else class="space-y-3">
      <!-- Abas: controle segmentado, mesmo padrão usado na área do professor -->
      <div class="inline-flex items-center gap-1 bg-muted/60 p-1 rounded-xl overflow-x-auto max-w-full">
        <button
          v-for="aba in ABAS"
          :key="aba.valor"
          @click="abaAtiva = aba.valor"
          class="px-3.5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
          :class="abaAtiva === aba.valor
            ? 'bg-card text-amber-600 dark:text-primary shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
        >
          <Icon :icon="aba.icon" class-name="w-4 h-4" :fallback="aba.fallback" />
          {{ aba.label }}
        </button>
      </div>

      <LembretesAulaManager v-if="abaAtiva === 'lembretes'" />
      <IntegracaoAgzapManager v-else />
    </div>
  </div>
</template>
