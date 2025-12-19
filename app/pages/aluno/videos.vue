<script setup lang="ts">
import type { VideoComCategoria } from '~/composables/useVideos'

definePageMeta({
  middleware: ['aluno', 'aluno-videos'],
  layout: 'aluno'
})

const {
  categorias,
  isLoading,
  buscarCategorias,
  buscarVideosPorCategoria,
  buscarEstatisticas,
  marcarConcluido
} = useVideos()

const estatisticas = ref<any>(null)
const videosCategoria = ref<Record<string, VideoComCategoria[]>>({})
const videoSelecionado = ref<VideoComCategoria | null>(null)

// Carregar dados ao montar
onMounted(async () => {
  await carregarDados()
})

const carregarDados = async () => {
  try {
    // Buscar estatísticas
    estatisticas.value = await buscarEstatisticas()

    // Buscar categorias
    await buscarCategorias()

    // Buscar vídeos de cada categoria
    if (categorias.value && Array.isArray(categorias.value)) {
      for (const categoria of categorias.value) {
        const videos = await buscarVideosPorCategoria(categoria.id)
        videosCategoria.value[categoria.id] = videos || []
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  }
}

const formatarDuracao = (segundos: number) => {
  const minutos = Math.floor(segundos / 60)
  const segs = segundos % 60
  return `${minutos}:${segs.toString().padStart(2, '0')}`
}

const getEmbedUrl = (url: string) => {
  // Converter URL do YouTube para embed
  const videoId = url.split('v=')[1]?.split('&')[0]
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`
  }
  return url
}

const abrirVideo = (video: VideoComCategoria) => {
  videoSelecionado.value = video
}

const fecharVideo = () => {
  videoSelecionado.value = null
}

const marcarComoConcluido = async () => {
  if (!videoSelecionado.value) return

  const sucesso = await marcarConcluido(videoSelecionado.value.id)
  if (sucesso) {
    // Atualizar estado local
    if (videoSelecionado.value) {
      videoSelecionado.value.concluido = true
      videoSelecionado.value.progresso = 100
    }

    // Recarregar estatísticas
    estatisticas.value = await buscarEstatisticas()

    // Atualizar lista de vídeos
    await carregarDados()
  }
}
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

      <!-- Estatísticas -->
      <div v-if="estatisticas" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div class="bg-gradient-to-br from-blue-50 via-indigo-50/70 to-purple-100/80 dark:from-blue-900/30 dark:via-indigo-900/40 dark:to-purple-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800/30">
          <div class="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Total de Vídeos</div>
          <div class="text-2xl sm:text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
            {{ estatisticas.total_videos }}
          </div>
        </div>

        <div class="bg-gradient-to-br from-green-50 via-emerald-50/70 to-teal-100/80 dark:from-green-900/30 dark:via-emerald-900/40 dark:to-teal-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800/30">
          <div class="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Concluídos</div>
          <div class="text-2xl sm:text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
            {{ estatisticas.videos_concluidos }}
          </div>
        </div>

        <div class="bg-gradient-to-br from-purple-50 via-violet-50/70 to-fuchsia-100/80 dark:from-purple-900/30 dark:via-violet-900/40 dark:to-fuchsia-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30">
          <div class="text-xs sm:text-sm font-medium text-purple-700 dark:text-purple-300">Progresso</div>
          <div class="text-2xl sm:text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">
            {{ estatisticas.percentual_conclusao }}%
          </div>
        </div>

        <div class="bg-gradient-to-br from-orange-50 via-amber-50/70 to-yellow-100/80 dark:from-orange-900/30 dark:via-amber-900/40 dark:to-yellow-900/30 p-4 rounded-lg border border-orange-100 dark:border-orange-800/30">
          <div class="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Tempo</div>
          <div class="text-2xl sm:text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">
            {{ estatisticas.tempo_total_minutos }}min
          </div>
        </div>
      </div>

      <!-- Categorias e Vídeos -->
      <div v-if="categorias && categorias.length > 0" class="space-y-6">
        <div v-for="categoria in categorias" :key="categoria.id" class="space-y-4">
          <div class="flex items-center gap-3">
            <div v-if="categoria.icone" class="text-2xl sm:text-3xl">{{ categoria.icone }}</div>
            <div>
              <h2 class="text-xl sm:text-2xl font-bold dark:text-white">{{ categoria.nome }}</h2>
              <p v-if="categoria.descricao" class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {{ categoria.descricao }}
              </p>
            </div>
          </div>

          <!-- Lista de vídeos da categoria -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="video in videosCategoria[categoria.id] || []"
              :key="video.id"
              class="bg-gradient-to-br from-white via-slate-50/80 to-gray-100/90 dark:from-slate-900/90 dark:via-gray-900/95 dark:to-black/90 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              @click="abrirVideo(video)"
            >
              <!-- Thumbnail -->
              <div class="relative aspect-video bg-gray-200 dark:bg-gray-800">
                <img
                  v-if="video.thumbnail"
                  :src="video.thumbnail"
                  :alt="video.titulo"
                  class="w-full h-full object-cover"
                />
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Icon icon="play" class-name="text-white text-4xl" fallback="▶️" />
                </div>

                <!-- Badge de nível -->
                <div class="absolute top-2 right-2">
                  <span
                    class="px-2 py-1 text-xs font-semibold rounded"
                    :class="{
                      'bg-green-500 text-white': video.nivel === 'iniciante',
                      'bg-yellow-500 text-white': video.nivel === 'intermediario',
                      'bg-red-500 text-white': video.nivel === 'avancado'
                    }"
                  >
                    {{ video.nivel }}
                  </span>
                </div>

                <!-- Barra de progresso -->
                <div v-if="video.progresso && video.progresso > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-gray-300 dark:bg-gray-700">
                  <div
                    class="h-full bg-blue-500 transition-all"
                    :style="{ width: `${video.progresso}%` }"
                  ></div>
                </div>
              </div>

              <!-- Info -->
              <div class="p-4">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {{ video.titulo }}
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {{ video.descricao }}
                </p>

                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{{ formatarDuracao(video.duracao) }}</span>
                  <span v-if="video.concluido" class="text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                    <Icon icon="check-circle" class-name="w-4 h-4" fallback="✓" />
                    Concluído
                  </span>
                  <span v-else-if="video.progresso && video.progresso > 0" class="text-blue-600 dark:text-blue-400 font-semibold">
                    {{ Math.round(video.progresso) }}%
                  </span>
                </div>

                <!-- Tags -->
                <div v-if="video.tags && video.tags.length > 0" class="flex flex-wrap gap-1 mt-3">
                  <span
                    v-for="tag in video.tags.slice(0, 3)"
                    :key="tag"
                    class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Estado vazio -->
      <div v-else class="bg-card border border-border rounded-lg p-12 text-center">
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

    <!-- Modal de Vídeo -->
    <div
      v-if="videoSelecionado"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      @click="fecharVideo"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
        @click.stop
      >
        <div class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between z-10">
          <h3 class="text-xl font-bold dark:text-white">{{ videoSelecionado.titulo }}</h3>
          <button
            @click="fecharVideo"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <Icon icon="xmark" class-name="text-2xl" fallback="✕" />
          </button>
        </div>

        <div class="p-6 space-y-4">
          <!-- Player de vídeo (YouTube embed) -->
          <div class="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              v-if="videoSelecionado.url_video"
              :src="getEmbedUrl(videoSelecionado.url_video)"
              class="w-full h-full"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>

          <!-- Descrição -->
          <div>
            <h4 class="font-semibold dark:text-white mb-2">Sobre este vídeo</h4>
            <p class="text-gray-600 dark:text-gray-400">{{ videoSelecionado.descricao }}</p>
          </div>

          <!-- Tags -->
          <div v-if="videoSelecionado.tags && videoSelecionado.tags.length > 0">
            <h4 class="font-semibold dark:text-white mb-2">Tags</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tag in videoSelecionado.tags"
                :key="tag"
                class="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full"
              >
                #{{ tag }}
              </span>
            </div>
          </div>

          <!-- Botão marcar como concluído -->
          <div v-if="!videoSelecionado.concluido" class="pt-4">
            <AppButton
              @click="marcarComoConcluido"
              class="w-full"
            >
              <Icon icon="check" class-name="mr-2 w-5 h-5" fallback="✓" />
              Marcar como Concluído
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
