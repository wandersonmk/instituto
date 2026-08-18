<script setup lang="ts">
// Aplica middleware de autenticação
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// Estado de carregamento
const isLoading = ref(true)
const { isLoading: authLoading } = process.client ? useAuth() : { isLoading: ref(false) }

// Aguarda a autenticação ser carregada e adiciona um delay mínimo para UX
onMounted(async () => {
  // Espera limitada (3s). Sem teto, qualquer falha ao restaurar a sessão deixa
  // a tela presa para sempre em "Carregando Dashboard".
  let tentativas = 0
  while (authLoading.value && tentativas < 60) {
    await new Promise(resolve => setTimeout(resolve, 50))
    tentativas++
  }

  // Delay reduzido para carregamento mais rápido
  await new Promise(resolve => setTimeout(resolve, 300))

  isLoading.value = false
})
</script>

<template>
  <div>
    <!-- Loading enquanto carrega -->
    <AppLoading 
      v-if="isLoading"
      title="Carregando Dashboard" 
      description="Preparando visão geral do sistema..."
    />
    
    <!-- Dashboard quando carregado -->
    <DashboardOverview v-else />
  </div>
</template>
