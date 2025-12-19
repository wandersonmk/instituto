<script setup lang="ts">
definePageMeta({
  middleware: ['aluno', 'aluno-videos'], // Protege com ambos os middlewares
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()

// Estado
const isLoading = ref(true)
const videos = ref<any[]>([])
const categorias = ref<any[]>([])

// Buscar vídeos disponíveis
async function buscarVideos() {
  if (!user.value) {
    isLoading.value = false
    return
  }
  
  try {
    // Por enquanto, apenas estrutura básica
    // Aqui você vai buscar os vídeos do banco quando criar as tabelas
    console.log('Buscando vídeos para aluno:', user.value.id)
    
    // Simulação de dados vazios por enquanto
    videos.value = []
    categorias.value = []
    
  } catch (error) {
    console.error('Erro ao buscar vídeos:', error)
  } finally {
    isLoading.value = false
  }
}

// Buscar ao montar
onMounted(() => {
  buscarVideos()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Vídeos"
      description="Buscando suas aulas em vídeo..."
    />
    
    <div v-else class="space-y-4 sm:space-y-6">
      <!-- Header -->
      <div class="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 sm:p-6 text-white">
        <div class="flex items-center space-x-3 mb-2">
          <div class="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Icon icon="video" class-name="w-6 h-6 text-white" fallback="🎥" />
          </div>
          <div>
            <h2 class="text-lg sm:text-2xl font-bold">
              Aulas em Vídeo
            </h2>
            <p class="text-sm text-purple-100">
              Acesse conteúdos exclusivos em vídeo
            </p>
          </div>
        </div>
      </div>

      <!-- Estado vazio (temporário) -->
      <div class="bg-card border border-border rounded-lg p-12 text-center">
        <div class="max-w-md mx-auto">
          <div class="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="video" class-name="w-10 h-10 text-purple-600 dark:text-purple-400" fallback="🎥" />
          </div>
          
          <h3 class="text-xl font-bold text-foreground mb-2">
            Em breve!
          </h3>
          
          <p class="text-muted-foreground mb-6">
            As aulas em vídeo estarão disponíveis em breve. 
            Aguarde enquanto preparamos conteúdos exclusivos para você!
          </p>
          
          <div class="inline-flex items-center space-x-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <Icon icon="check-circle" class-name="w-5 h-5" fallback="✓" />
            <span class="text-sm font-medium">Você tem acesso liberado</span>
          </div>
        </div>
      </div>

      <!-- Info adicional -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <Icon icon="info-circle" class-name="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fallback="ℹ️" />
          <div>
            <h4 class="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Sobre as Aulas em Vídeo
            </h4>
            <p class="text-sm text-blue-800 dark:text-blue-200">
              Aqui você encontrará vídeo-aulas complementares ao seu curso, 
              organizadas por categorias e temas para facilitar seu aprendizado.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
