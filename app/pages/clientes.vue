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
  // Só executa useAuth no cliente
  const auth = useAuth()
  authLoading = auth.isLoading

  onMounted(async () => {
    // Aguarda o auth loading terminar
    while (authLoading.value) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    // Delay adicional para garantir carregamento suave
    await new Promise(resolve => setTimeout(resolve, 500))
    isLoading.value = false
  })
} else {
  isLoading.value = false
}
</script>

<template>
  <div>
    <!-- Sempre mostra loading até o client terminar de carregar -->
    <AppLoading 
      v-if="isLoading || !isClient" 
      title="Carregando Alunos"
      description="Preparando a área de cadastro de alunos..."
    />
    <!-- Conteúdo só aparece após carregamento client-side -->
    <div v-else class="space-y-6">
      <AlunosCadastroManager />
    </div>
  </div>
</template>
