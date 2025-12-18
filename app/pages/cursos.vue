<script setup lang="ts">
// Aplica middleware de autenticação
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const isLoading = ref(true)

// Usa nextTick para garantir que o componente está montado antes de esconder o loading
onMounted(() => {
  nextTick(() => {
    setTimeout(() => {
      isLoading.value = false
    }, 200)
  })
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Cursos"
      description="Preparando a área de gerenciamento de cursos..."
    />
    <div v-else class="space-y-6">
      <CursosManager />
    </div>
  </div>
</template>
