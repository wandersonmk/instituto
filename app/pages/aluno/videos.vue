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
  marcarConcluido,
  reverterConclusao,
  buscarVideoPorId,
  atualizarProgresso
} = useVideos()

const route = useRoute()
const estatisticas = ref<any>(null)
const videosCategoria = ref<Record<string, VideoComCategoria[]>>({})
const videoSelecionado = ref<VideoComCategoria | null>(null)
const termoPesquisa = ref('')
const videosFiltrados = ref<VideoComCategoria[]>([])

// Navegação em 2 telas: lista de módulos (categorias) e, ao clicar em um
// módulo, a lista de aulas daquele módulo — com botão de voltar.
const categoriaSelecionada = ref<string | null>(null)

const categoriaAtual = computed(() =>
  (categorias.value || []).find((c: any) => c.id === categoriaSelecionada.value) || null
)

const videosDaCategoriaAtual = computed(() =>
  categoriaSelecionada.value ? (videosCategoria.value[categoriaSelecionada.value] || []) : []
)

const progressoCategoriaAtual = computed(() =>
  categoriaSelecionada.value ? calcularProgressoCategoria(categoriaSelecionada.value) : 0
)

function abrirCategoria(categoriaId: string) {
  categoriaSelecionada.value = categoriaId
}

function voltarCategorias() {
  categoriaSelecionada.value = null
}

// Carregar dados ao montar
onMounted(async () => {
  await carregarDados()

  // Se veio da URL com videoId, abrir automaticamente (apenas do botão "Continuar Assistindo")
  const videoId = route.query.video as string
  if (videoId && route.query.continuar === 'true') {
    await abrirVideoPorId(videoId)
  }
})

// Abrir vídeo por ID
const abrirVideoPorId = async (videoId: string) => {
  try {
    const video = await buscarVideoPorId(videoId)
    if (video) {
      videoSelecionado.value = video
    }
  } catch (error) {
    console.error('Erro ao abrir vídeo:', error)
  }
}

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

const abrirVideo = async (video: VideoComCategoria) => {
  videoSelecionado.value = video
  
  console.log('Abrindo vídeo:', video.id, 'Progresso atual:', video.progresso)
  
  // Sempre registrar que o vídeo foi aberto (atualizar updated_at)
  // Mantém o progresso atual ou inicia com 1% se for novo
  const progressoAtual = video.progresso || 1
  console.log('Registrando visualização do vídeo com progresso:', progressoAtual)
  const sucesso = await atualizarProgresso(video.id, progressoAtual, video.tempo_assistido || 0, video.ultima_posicao || 0)
  console.log('Resultado:', sucesso ? 'sucesso' : 'falha')
}

const fecharVideo = () => {
  videoSelecionado.value = null
}

const marcarComoConcluido = async () => {
  if (!videoSelecionado.value) return

  try {
    const sucesso = await marcarConcluido(videoSelecionado.value.id)
    
    if (sucesso) {
      // Atualizar estado local do vídeo atual
      if (videoSelecionado.value) {
        videoSelecionado.value.concluido = true
        videoSelecionado.value.progresso = 100
      }

      // Atualizar vídeo na lista de categorias
      const categoriaId = videoSelecionado.value.categoria_id
      if (categoriaId && videosCategoria.value[categoriaId]) {
        const videoIndex = videosCategoria.value[categoriaId].findIndex(
          v => v.id === videoSelecionado.value?.id
        )
        if (videoIndex !== -1) {
          videosCategoria.value[categoriaId][videoIndex] = {
            ...videosCategoria.value[categoriaId][videoIndex],
            concluido: true,
            progresso: 100
          }
        }
      }

      // Recarregar estatísticas
      estatisticas.value = await buscarEstatisticas()

      // Fechar modal
      fecharVideo()

      console.log('Vídeo marcado como concluído com sucesso!')
    } else {
      throw new Error('Falha ao marcar vídeo como concluído')
    }
  } catch (error) {
    console.error('Erro ao marcar como concluído:', error)
    alert('Erro ao marcar vídeo como concluído. Tente novamente.')
  }
}

const reverterConclusaoVideo = async (video: VideoComCategoria) => {
  try {
    const sucesso = await reverterConclusao(video.id)
    
    if (sucesso) {
      // Atualizar vídeo na lista de categorias
      const categoriaId = video.categoria_id
      if (categoriaId && videosCategoria.value[categoriaId]) {
        const videoIndex = videosCategoria.value[categoriaId].findIndex(
          v => v.id === video.id
        )
        if (videoIndex !== -1) {
          videosCategoria.value[categoriaId][videoIndex] = {
            ...videosCategoria.value[categoriaId][videoIndex],
            concluido: false,
            progresso: 0
          }
        }
      }

      // Recarregar estatísticas
      estatisticas.value = await buscarEstatisticas()

      console.log('Conclusão revertida com sucesso!')
    } else {
      throw new Error('Falha ao reverter conclusão')
    }
  } catch (error) {
    console.error('Erro ao reverter conclusão:', error)
    alert('Erro ao reverter conclusão. Tente novamente.')
  }
}

// Filtrar vídeos por termo de pesquisa
const filtrarVideos = () => {
  if (!termoPesquisa.value.trim()) {
    videosFiltrados.value = []
    return
  }

  const termo = termoPesquisa.value.toLowerCase().trim()
  const todosVideos: VideoComCategoria[] = []

  // Coletar todos os vídeos de todas as categorias
  Object.values(videosCategoria.value).forEach(videos => {
    todosVideos.push(...videos)
  })

  // Filtrar por título ou descrição
  videosFiltrados.value = todosVideos.filter(video => 
    video.titulo.toLowerCase().includes(termo) ||
    video.descricao?.toLowerCase().includes(termo)
  )
}

// Watch para filtrar automaticamente quando o termo mudar
watch(termoPesquisa, () => {
  filtrarVideos()
})

// Verificar se uma categoria/módulo está completo
const isCategoriaCompleta = (categoriaId: string): boolean => {
  const videos = videosCategoria.value[categoriaId] || []
  if (videos.length === 0) return false
  
  return videos.every(video => video.concluido === true)
}

// Calcular progresso de uma categoria
const calcularProgressoCategoria = (categoriaId: string): number => {
  const videos = videosCategoria.value[categoriaId] || []
  if (videos.length === 0) return 0
  
  const concluidos = videos.filter(video => video.concluido === true).length
  return Math.round((concluidos / videos.length) * 100)
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
      <div class="card-header-custom rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="video" class-name="w-4 h-4 text-gray-800 dark:text-white" fallback="🎥" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
              Aulas em Vídeo
            </h2>
            <p class="text-xs text-gray-600 dark:text-gray-300 leading-tight">
              Acesse conteúdos exclusivos em vídeo
            </p>
          </div>
        </div>
      </div>

      <!-- Estatísticas -->
      <div v-if="estatisticas" class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div class="flex items-center gap-2.5 bg-gradient-to-br from-blue-50 via-indigo-50/70 to-purple-100/80 dark:from-blue-900/30 dark:via-indigo-900/40 dark:to-purple-900/30 px-3 py-2.5 rounded-lg border border-blue-100 dark:border-blue-800/30">
          <div class="w-8 h-8 bg-white/60 dark:bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="video" class-name="w-4 h-4 text-blue-700 dark:text-blue-300" fallback="🎥" />
          </div>
          <div class="min-w-0">
            <div class="text-lg font-bold text-blue-900 dark:text-blue-100 leading-tight">{{ estatisticas.total_videos }}</div>
            <div class="text-[11px] font-medium text-blue-700 dark:text-blue-300 leading-tight truncate">Total de Vídeos</div>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-gradient-to-br from-green-50 via-emerald-50/70 to-teal-100/80 dark:from-green-900/30 dark:via-emerald-900/40 dark:to-teal-900/30 px-3 py-2.5 rounded-lg border border-green-100 dark:border-green-800/30">
          <div class="w-8 h-8 bg-white/60 dark:bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="check-circle" class-name="w-4 h-4 text-green-700 dark:text-green-300" fallback="✓" />
          </div>
          <div class="min-w-0">
            <div class="text-lg font-bold text-green-900 dark:text-green-100 leading-tight">{{ estatisticas.videos_concluidos }}</div>
            <div class="text-[11px] font-medium text-green-700 dark:text-green-300 leading-tight truncate">Concluídos</div>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-gradient-to-br from-purple-50 via-violet-50/70 to-fuchsia-100/80 dark:from-purple-900/30 dark:via-violet-900/40 dark:to-fuchsia-900/30 px-3 py-2.5 rounded-lg border border-purple-100 dark:border-purple-800/30">
          <div class="w-8 h-8 bg-white/60 dark:bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="chart-line" class-name="w-4 h-4 text-purple-700 dark:text-purple-300" fallback="📈" />
          </div>
          <div class="min-w-0">
            <div class="text-lg font-bold text-purple-900 dark:text-purple-100 leading-tight">{{ estatisticas.percentual_conclusao }}%</div>
            <div class="text-[11px] font-medium text-purple-700 dark:text-purple-300 leading-tight truncate">Progresso</div>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-gradient-to-br from-orange-50 via-amber-50/70 to-yellow-100/80 dark:from-orange-900/30 dark:via-amber-900/40 dark:to-yellow-900/30 px-3 py-2.5 rounded-lg border border-orange-100 dark:border-orange-800/30">
          <div class="w-8 h-8 bg-white/60 dark:bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="clock" class-name="w-4 h-4 text-orange-700 dark:text-orange-300" fallback="🕐" />
          </div>
          <div class="min-w-0">
            <div class="text-lg font-bold text-orange-900 dark:text-orange-100 leading-tight">{{ estatisticas.tempo_total_minutos }}min</div>
            <div class="text-[11px] font-medium text-orange-700 dark:text-orange-300 leading-tight truncate">Tempo</div>
          </div>
        </div>
      </div>

      <!-- Categorias e Vídeos -->
      <div v-if="categorias && categorias.length > 0" class="space-y-4">
        <!-- Campo de Pesquisa -->
        <div class="bg-card border border-border rounded-lg p-2.5">
          <div class="relative">
            <Icon
              icon="search"
              class-name="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fallback="🔍"
            />
            <input
              v-model="termoPesquisa"
              type="text"
              placeholder="Pesquisar aulas por nome..."
              class="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        <!-- Resultados da Pesquisa (fora das categorias) -->
        <div v-if="termoPesquisa.trim() && videosFiltrados.length > 0" class="bg-card border border-border rounded-lg p-4">
          <h3 class="text-lg font-semibold dark:text-white mb-4">
            Resultados da Pesquisa ({{ videosFiltrados.length }})
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="video in videosFiltrados"
              :key="video.id"
              @click="abrirVideo(video)"
              class="bg-white dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-all border border-gray-200 dark:border-gray-800 hover:border-primary"
            >
              <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                  <div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg flex items-center justify-center">
                    <Icon icon="play" class-name="w-6 h-6 text-primary" fallback="▶️" />
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <h4 class="font-semibold text-sm text-foreground line-clamp-2">{{ video.titulo }}</h4>
                  <p class="text-xs text-muted-foreground mt-1">{{ formatarDuracao(video.duracao) }}</p>
                  <div v-if="video.concluido" class="flex items-center gap-2 mt-2">
                    <div class="flex items-center gap-1">
                      <Icon icon="check-circle" class-name="w-4 h-4 text-green-500" fallback="✓" />
                      <span class="text-xs text-green-600 dark:text-green-400">Concluído</span>
                    </div>
                    <button
                      @click.stop="reverterConclusaoVideo(video)"
                      class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                      title="Reverter conclusão"
                    >
                      <Icon icon="rotate-left" class-name="w-5 h-5 text-gray-500 hover:text-orange-500" fallback="↺" />
                    </button>
                  </div>
                  <div v-else-if="video.progresso > 0" class="mt-2">
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        class="bg-primary h-1 rounded-full transition-all"
                        :style="{ width: `${video.progresso}%` }"
                      ></div>
                    </div>
                    <span class="text-xs text-muted-foreground">{{ video.progresso }}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Mensagem se não encontrar resultados -->
        <div v-if="termoPesquisa.trim() && videosFiltrados.length === 0" class="bg-card border border-border rounded-lg p-6 text-center">
          <Icon icon="search" class-name="w-12 h-12 text-gray-400 mx-auto mb-2" fallback="🔍" />
          <p class="text-muted-foreground">Nenhuma aula encontrada com "{{ termoPesquisa }}"</p>
        </div>

        <!-- Nível 1: lista de módulos (categorias) — clique entra no módulo -->
        <div v-if="!categoriaSelecionada" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            v-for="categoria in categorias"
            :key="categoria.id"
            v-show="(videosCategoria[categoria.id] || []).length > 0"
            type="button"
            @click="abrirCategoria(categoria.id)"
            class="group text-left bg-card border border-border rounded-lg p-3 hover:border-primary/60 hover:shadow-md transition-all"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span v-if="categoria.icone" class="text-2xl leading-none">{{ categoria.icone }}</span>
              <Icon v-else icon="folder" class-name="w-6 h-6 text-primary" fallback="📁" />
              <span
                v-if="isCategoriaCompleta(categoria.id)"
                class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold leading-none bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full"
              >
                <Icon icon="check-circle" class-name="w-2.5 h-2.5" fallback="✓" />
              </span>
            </div>
            <h2 class="text-sm font-bold dark:text-white truncate">{{ categoria.nome }}</h2>
            <p v-if="categoria.descricao" class="text-[11px] text-muted-foreground truncate mt-0.5">
              {{ categoria.descricao }}
            </p>

            <div class="flex items-center gap-1.5 mt-2.5">
              <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  class="h-1.5 rounded-full transition-all"
                  :class="isCategoriaCompleta(categoria.id) ? 'bg-green-500' : 'bg-blue-500'"
                  :style="{ width: `${calcularProgressoCategoria(categoria.id)}%` }"
                ></div>
              </div>
              <span class="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                {{ calcularProgressoCategoria(categoria.id) }}%
              </span>
            </div>

            <div class="flex items-center justify-between mt-1.5">
              <p class="text-[11px] text-muted-foreground">
                {{ (videosCategoria[categoria.id] || []).length }} vídeo(s)
              </p>
              <span class="flex items-center gap-0.5 text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Ver aulas
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </span>
            </div>
          </button>
        </div>

        <!-- Nível 2: aulas do módulo selecionado — com botão de voltar -->
        <div v-else class="space-y-3">
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              @click="voltarCategorias"
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Voltar
            </button>
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-bold dark:text-white truncate flex items-center gap-1.5">
                <span v-if="categoriaAtual?.icone">{{ categoriaAtual.icone }}</span>
                {{ categoriaAtual?.nome }}
              </h2>
              <p class="text-[11px] text-muted-foreground">
                {{ videosDaCategoriaAtual.length }} vídeo(s) · {{ progressoCategoriaAtual }}% concluído
              </p>
            </div>
          </div>

          <div v-if="videosDaCategoriaAtual.length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div
              v-for="video in videosDaCategoriaAtual"
              :key="video.id"
              class="group cursor-pointer"
              @click="abrirVideo(video)"
            >
              <!-- Pôster -->
              <div class="relative aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-800 ring-1 ring-black/5 dark:ring-white/10 transition-transform duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:z-10">
                <img
                  v-if="video.thumbnail"
                  :src="video.thumbnail"
                  :alt="video.titulo"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center">
                  <Icon icon="video" class-name="w-6 h-6 text-muted-foreground" fallback="🎥" />
                </div>

                <!-- Overlay de play no hover -->
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <Icon icon="play" class-name="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity" fallback="▶️" />
                </div>

                <!-- Selo de concluído (SVG próprio — sem depender de fonte/ícone externo, nunca deforma) -->
                <div v-if="video.concluido" class="absolute top-1 left-1 w-5 h-5 rounded-full bg-green-500 ring-2 ring-white dark:ring-gray-900 flex items-center justify-center shadow">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="w-2.5 h-2.5">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>

                <!-- Badge de nível -->
                <div v-if="video.nivel" class="absolute top-1 right-1">
                  <span
                    class="px-1.5 py-0.5 text-[9px] font-semibold leading-none rounded"
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
                <div v-if="video.progresso && video.progresso > 0" class="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                  <div
                    class="h-full bg-primary transition-all"
                    :style="{ width: `${video.progresso}%` }"
                  ></div>
                </div>
              </div>

              <!-- Título e meta -->
              <p class="text-xs font-semibold text-foreground mt-1.5 line-clamp-2">{{ video.titulo }}</p>
              <p v-if="video.descricao" class="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{{ video.descricao }}</p>
              <div class="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                <span>{{ formatarDuracao(video.duracao) }}</span>
                <span v-if="video.concluido" class="text-green-600 dark:text-green-400 font-medium">· Concluído</span>
                <span v-else-if="video.progresso && video.progresso > 0" class="text-blue-600 dark:text-blue-400 font-medium">
                  · {{ Math.round(video.progresso) }}%
                </span>
                <button
                  v-if="video.concluido"
                  @click.stop="reverterConclusaoVideo(video)"
                  class="ml-auto p-1 hover:bg-muted rounded-full transition-colors"
                  title="Reverter conclusão"
                >
                  <Icon icon="rotate-left" class-name="w-3.5 h-3.5 text-muted-foreground hover:text-orange-500" fallback="↺" />
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">
            <Icon icon="video" class-name="w-10 h-10 mx-auto mb-2 opacity-50" fallback="🎥" />
            <p class="text-sm">Nenhum vídeo neste módulo ainda</p>
          </div>
        </div>

        <!-- Nenhuma categoria com vídeo ainda -->
        <div
          v-if="!categoriaSelecionada && categorias.every(c => (videosCategoria[c.id] || []).length === 0)"
          class="text-center py-8 text-muted-foreground bg-card border border-border rounded-lg"
        >
          <Icon icon="video" class-name="w-12 h-12 mx-auto mb-2 opacity-50" fallback="🎥" />
          <p class="text-sm">Nenhum vídeo cadastrado ainda</p>
        </div>
      </div>

      <!-- Estado vazio (quando não há categorias) -->
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
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
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

<style scoped>
.card-header-custom {
  background-color: #ffffff;
}

.dark .card-header-custom {
  background-color: #1A1B1F;
}
</style>
