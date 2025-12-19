<script setup lang="ts">
import { ref, computed } from 'vue'

// Controle do modal de cadastro/edição
const mostrarModal = ref(false)
const modoEdicao = ref(false)
const videoEditando = ref<any>(null)

// Controle do modal de visualização
const mostrarModalVisualizacao = ref(false)
const videoVisualizacao = ref<any>(null)

// Controle do modal de confirmação de exclusão
const videoParaExcluir = ref<any>(null)

// Controle do modal de permissões
const mostrarModalPermissoes = ref(false)
const videoPermissoes = ref<any>(null)

// Estados para gerenciamento de categorias
const mostrarModalCategorias = ref(false)
const mostrarModalCategoria = ref(false)
const mostrarModalExcluirCategoria = ref(false)
const categoriaEditando = ref<any>(null)
const nomeCategoria = ref('')
const corCategoria = ref('purple')

// Controle de expansão das categorias (accordion)
const categoriasExpandidas = ref<Set<string>>(new Set())

// Dados do formulário
const titulo = ref('')
const descricao = ref('')
const urlYoutube = ref('')
const duracao = ref('')
const ordem = ref('')
const categoriaId = ref('')
const ativo = ref(true)
const thumbnail = ref('')

// Lista de vídeos (mockado para visualização)
const videos = ref<any[]>([
  {
    id: '1',
    titulo: 'Introdução ao Curso',
    descricao: 'Apresentação geral do curso e objetivos',
    url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duracao: '15:30',
    categoria: 'Módulo 1',
    categoria_id: '1',
    ordem: 1,
    ativo: true,
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    visualizacoes: 45,
    alunos_com_acesso: 12
  },
  {
    id: '2',
    titulo: 'Fundamentos Básicos',
    descricao: 'Conceitos essenciais para começar',
    url_youtube: 'https://www.youtube.com/watch?v=example2',
    duracao: '22:15',
    categoria: 'Módulo 1',
    categoria_id: '1',
    ordem: 2,
    ativo: true,
    thumbnail: 'https://img.youtube.com/vi/example2/mqdefault.jpg',
    visualizacoes: 38,
    alunos_com_acesso: 12
  }
])

// Lista de categorias (mockado)
const categorias = ref([
  { id: '1', nome: 'Módulo 1', cor: 'purple' },
  { id: '2', nome: 'Módulo 2', cor: 'blue' },
  { id: '3', nome: 'Avançado', cor: 'green' }
])

// Cores disponíveis para categorias
const coresDisponiveis = [
  { valor: 'purple', nome: 'Roxo', hex: '#9333ea' },
  { valor: 'blue', nome: 'Azul', hex: '#3b82f6' },
  { valor: 'green', nome: 'Verde', hex: '#10b981' },
  { valor: 'orange', nome: 'Laranja', hex: '#f97316' },
  { valor: 'red', nome: 'Vermelho', hex: '#ef4444' },
  { valor: 'yellow', nome: 'Amarelo', hex: '#eab308' },
  { valor: 'pink', nome: 'Rosa', hex: '#ec4899' },
  { valor: 'indigo', nome: 'Índigo', hex: '#6366f1' }
]

// Filtros
const filtroTitulo = ref('')
const filtroCategoria = ref('')

// Computed para filtrar vídeos
const videosFiltrados = computed(() => {
  return videos.value.filter(video => {
    const tituloMatch = video.titulo.toLowerCase().includes(filtroTitulo.value.toLowerCase())
    const categoriaMatch = !filtroCategoria.value || video.categoria_id === filtroCategoria.value
    return tituloMatch && categoriaMatch
  })
})

// Função para extrair ID do YouTube da URL
function extrairYoutubeId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  const match = url.match(regex)
  return match ? match[1] : ''
}

// Função para gerar thumbnail do YouTube
function gerarThumbnail(url: string): string {
  const videoId = extrairYoutubeId(url)
  return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : ''
}

// Watch para atualizar thumbnail quando URL mudar
watch(urlYoutube, (novaUrl) => {
  if (novaUrl) {
    thumbnail.value = gerarThumbnail(novaUrl)
  }
})

// Função para limpar formulário
function limparFormulario() {
  titulo.value = ''
  descricao.value = ''
  urlYoutube.value = ''
  duracao.value = ''
  ordem.value = ''
  categoriaId.value = ''
  ativo.value = true
  thumbnail.value = ''
  modoEdicao.value = false
  videoEditando.value = null
}

// Abrir modal para novo vídeo
function abrirModalNovo() {
  limparFormulario()
  mostrarModal.value = true
}

// Abrir modal para editar vídeo
function editarVideo(video: any, event?: Event) {
  if (event) event.stopPropagation()
  modoEdicao.value = true
  videoEditando.value = video
  
  titulo.value = video.titulo
  descricao.value = video.descricao
  urlYoutube.value = video.url_youtube
  duracao.value = video.duracao
  ordem.value = video.ordem.toString()
  categoriaId.value = video.categoria_id
  ativo.value = video.ativo
  thumbnail.value = video.thumbnail
  
  mostrarModal.value = true
}

// Salvar vídeo (aqui você implementará a lógica de banco de dados)
async function salvarVideo() {
  console.log('Salvando vídeo:', {
    titulo: titulo.value,
    descricao: descricao.value,
    url_youtube: urlYoutube.value,
    duracao: duracao.value,
    ordem: ordem.value,
    categoria_id: categoriaId.value,
    ativo: ativo.value,
    thumbnail: thumbnail.value
  })
  
  // TODO: Implementar salvamento no banco de dados
  
  fecharModal()
}

// Fechar modal
function fecharModal() {
  mostrarModal.value = false
  limparFormulario()
}

// Visualizar vídeo
function visualizarVideo(video: any) {
  videoVisualizacao.value = video
  mostrarModalVisualizacao.value = true
}

// Fechar modal de visualização
function fecharModalVisualizacao() {
  mostrarModalVisualizacao.value = false
  videoVisualizacao.value = null
}

// Confirmar exclusão
function confirmarExclusao(video: any, event?: Event) {
  if (event) event.stopPropagation()
  videoParaExcluir.value = video
}

// Cancelar exclusão
function cancelarExclusao() {
  videoParaExcluir.value = null
}

// Excluir vídeo
async function excluirVideo() {
  console.log('Excluindo vídeo:', videoParaExcluir.value.id)
  // TODO: Implementar exclusão no banco de dados
  videoParaExcluir.value = null
}

// Toggle ativo/inativo
async function toggleAtivo(video: any, event?: Event) {
  if (event) event.stopPropagation()
  console.log('Alterando status do vídeo:', video.id)
  // TODO: Implementar toggle no banco de dados
}

// Gerenciar permissões
function gerenciarPermissoes(video: any, event?: Event) {
  if (event) event.stopPropagation()
  videoPermissoes.value = video
  mostrarModalPermissoes.value = true
}

// Fechar modal de permissões
function fecharModalPermissoes() {
  mostrarModalPermissoes.value = false
  videoPermissoes.value = null
}

// Limpar filtros
function limparFiltros() {
  filtroTitulo.value = ''
  filtroCategoria.value = ''
}

// ===== GERENCIAMENTO DE CATEGORIAS =====

// Abrir modal de listagem de categorias
function abrirModalCategorias() {
  mostrarModalCategorias.value = true
}

// Fechar modal de listagem
function fecharModalCategorias() {
  mostrarModalCategorias.value = false
}

// Abrir modal para criar nova categoria
function novaCategoria() {
  categoriaEditando.value = null
  nomeCategoria.value = ''
  corCategoria.value = 'purple'
  mostrarModalCategoria.value = true
}

// Abrir modal para editar categoria
function editarCategoria(categoria: any) {
  categoriaEditando.value = categoria
  nomeCategoria.value = categoria.nome
  corCategoria.value = categoria.cor
  mostrarModalCategoria.value = true
}

// Salvar categoria (criar ou editar)
function salvarCategoria() {
  if (!nomeCategoria.value.trim()) {
    alert('Digite um nome para a categoria')
    return
  }

  if (categoriaEditando.value) {
    // Editar categoria existente
    const index = categorias.value.findIndex(c => c.id === categoriaEditando.value.id)
    if (index !== -1) {
      categorias.value[index].nome = nomeCategoria.value.trim()
      categorias.value[index].cor = corCategoria.value
    }
    console.log('Categoria atualizada:', categoriaEditando.value.id)
  } else {
    // Criar nova categoria
    const novaId = String(Math.max(...categorias.value.map(c => Number(c.id)), 0) + 1)
    categorias.value.push({
      id: novaId,
      nome: nomeCategoria.value.trim(),
      cor: corCategoria.value
    })
    console.log('Nova categoria criada:', novaId)
  }

  fecharModalCategoria()
}

// Fechar modal de criar/editar
function fecharModalCategoria() {
  mostrarModalCategoria.value = false
  categoriaEditando.value = null
  nomeCategoria.value = ''
  corCategoria.value = 'purple'
}

// Confirmar exclusão de categoria
function confirmarExcluirCategoria(categoria: any) {
  categoriaEditando.value = categoria
  mostrarModalExcluirCategoria.value = true
}

// Excluir categoria
function excluirCategoria() {
  if (!categoriaEditando.value) return

  // Verificar se há vídeos usando esta categoria
  const videosVinculados = videos.value.filter(v => v.categoria_id === categoriaEditando.value.id)
  
  if (videosVinculados.length > 0) {
    alert(`Não é possível excluir esta categoria pois há ${videosVinculados.length} vídeo(s) vinculado(s) a ela.`)
    fecharModalExcluirCategoria()
    return
  }

  // Excluir categoria
  const index = categorias.value.findIndex(c => c.id === categoriaEditando.value.id)
  if (index !== -1) {
    categorias.value.splice(index, 1)
  }

  console.log('Categoria excluída:', categoriaEditando.value.id)
  fecharModalExcluirCategoria()
}

// Fechar modal de exclusão
function fecharModalExcluirCategoria() {
  mostrarModalExcluirCategoria.value = false
  categoriaEditando.value = null
}

// Obter número de vídeos por categoria
function contarVideosPorCategoria(categoriaId: string): number {
  return videos.value.filter(v => v.categoria_id === categoriaId).length
}

// Toggle expansão de categoria
function toggleCategoria(categoriaId: string) {
  if (categoriasExpandidas.value.has(categoriaId)) {
    categoriasExpandidas.value.delete(categoriaId)
  } else {
    categoriasExpandidas.value.add(categoriaId)
  }
}

// Verificar se categoria está expandida
function isCategoriaExpandida(categoriaId: string): boolean {
  return categoriasExpandidas.value.has(categoriaId)
}

// Agrupar vídeos por categoria
const videosPorCategoria = computed(() => {
  const grupos: Record<string, any[]> = {}
  
  // Inicializar grupos para todas as categorias
  categorias.value.forEach(cat => {
    grupos[cat.id] = []
  })
  
  // Agrupar vídeos filtrados por categoria
  videosFiltrados.value.forEach(video => {
    if (grupos[video.categoria_id]) {
      grupos[video.categoria_id].push(video)
    }
  })
  
  return grupos
})

// Expandir todas as categorias
function expandirTodas() {
  categorias.value.forEach(cat => {
    categoriasExpandidas.value.add(cat.id)
  })
}

// Colapsar todas as categorias
function colapsarTodas() {
  categoriasExpandidas.value.clear()
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-end gap-3 mb-6">
      <button
        @click="abrirModalCategorias"
        class="px-4 py-2 bg-card border border-border text-foreground hover:bg-muted rounded-lg transition-colors flex items-center space-x-2"
      >
        <Icon icon="filter" class-name="w-4 h-4" fallback="📁" />
        <span>Gerenciar Categorias</span>
      </button>
      
      <button
        @click="abrirModalNovo"
        class="px-4 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors flex items-center space-x-2"
      >
        <Icon icon="plus" class-name="w-4 h-4" fallback="" />
        <span>Nova Aula em Vídeo</span>
      </button>
    </div>

    <!-- Filtros -->
    <div class="bg-card border border-border rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Buscar por título</label>
          <AppInput
            v-model="filtroTitulo"
            type="text"
            placeholder="Digite o título..."
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Categoria</label>
          <select
            v-model="filtroCategoria"
            class="w-full rounded-md !bg-input hover:!bg-input focus:!bg-input text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border border-input px-3 py-2"
          >
            <option value="">Todas as categorias</option>
            <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
              {{ cat.nome }}
            </option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            @click="limparFiltros"
            class="w-full px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      </div>
    </div>

    <!-- Lista de Vídeos por Categoria (Accordion) -->
    <div class="bg-card border border-border rounded-lg overflow-hidden">
      <div class="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <h3 class="font-semibold text-foreground">
          {{ videosFiltrados.length }} {{ videosFiltrados.length === 1 ? 'vídeo encontrado' : 'vídeos encontrados' }}
        </h3>
        <div v-if="!filtroTitulo" class="flex items-center space-x-2">
          <button
            @click="expandirTodas"
            class="px-3 py-1 text-xs border border-border text-foreground hover:bg-muted rounded transition-colors"
          >
            Expandir Todos
          </button>
          <button
            @click="colapsarTodas"
            class="px-3 py-1 text-xs border border-border text-foreground hover:bg-muted rounded transition-colors"
          >
            Colapsar Todos
          </button>
        </div>
      </div>

      <div v-if="videosFiltrados.length === 0" class="p-8 text-center">
        <Icon icon="video" class-name="w-16 h-16 mx-auto text-muted-foreground mb-4" fallback="🎥" />
        <p class="text-muted-foreground">Nenhum vídeo encontrado</p>
      </div>

      <!-- Lista Plana (quando há filtro de título) -->
      <div v-else-if="filtroTitulo" class="divide-y divide-border">
        <div
          v-for="video in videosFiltrados"
          :key="video.id"
          class="p-4 hover:bg-muted/30 cursor-pointer transition-all"
          @click="visualizarVideo(video)"
        >
          <div class="flex items-start space-x-4">
            <!-- Thumbnail -->
            <div class="flex-shrink-0 w-40 h-24 bg-muted rounded-lg overflow-hidden">
              <img 
                v-if="video.thumbnail" 
                :src="video.thumbnail" 
                :alt="video.titulo"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full flex items-center justify-center">
                <Icon icon="video" class-name="w-8 h-8 text-muted-foreground" fallback="🎥" />
              </div>
            </div>

            <!-- Informações -->
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <h3 class="text-base font-semibold text-foreground truncate">{{ video.titulo }}</h3>
                    <span
                      class="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0"
                      :class="video.ativo 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'"
                    >
                      {{ video.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                    <span class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs rounded-full font-medium">
                      {{ video.categoria }}
                    </span>
                  </div>
                  
                  <p class="text-sm text-muted-foreground line-clamp-2 mb-2">{{ video.descricao }}</p>
                  
                  <div class="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div class="flex items-center space-x-1">
                      <Icon icon="clock" class-name="w-4 h-4" fallback="⏱️" />
                      <span>{{ video.duracao }}</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <Icon icon="eye" class-name="w-4 h-4" fallback="👁️" />
                      <span>{{ video.visualizacoes }} visualizações</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <Icon icon="users" class-name="w-4 h-4" fallback="👥" />
                      <span>{{ video.alunos_com_acesso }} alunos</span>
                    </div>
                    <div class="flex items-center space-x-1">
                      <Icon icon="sort" class-name="w-4 h-4" fallback="📊" />
                      <span>Ordem: {{ video.ordem }}</span>
                    </div>
                  </div>
                </div>

                <!-- Botões de ação -->
                <div class="flex items-center space-x-2 ml-4" @click.stop>
                  <button
                    @click="gerenciarPermissoes(video, $event)"
                    class="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                    title="Gerenciar Permissões"
                  >
                    <Icon icon="user-lock" class-name="w-5 h-5" fallback="🔐" />
                  </button>
                  
                  <button
                    @click="editarVideo(video, $event)"
                    class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Icon icon="edit" class-name="w-5 h-5" fallback="✏️" />
                  </button>
                  
                  <button
                    @click="toggleAtivo(video, $event)"
                    class="p-2 hover:bg-muted rounded-lg transition-colors"
                    :class="video.ativo ? 'text-yellow-600' : 'text-green-600'"
                    :title="video.ativo ? 'Desativar' : 'Ativar'"
                  >
                    <Icon :icon="video.ativo ? 'eye-slash' : 'eye'" class-name="w-5 h-5" fallback="" />
                  </button>
                  
                  <button
                    @click="confirmarExclusao(video, $event)"
                    class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Icon icon="trash-alt" class-name="w-5 h-5" fallback="🗑️" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Accordion por Categoria (quando NÃO há filtro de título) -->
      <div v-else class="divide-y divide-border">
        <div
          v-for="categoria in categorias"
          :key="categoria.id"
          class="border-b border-border last:border-b-0"
        >
          <!-- Header da Categoria -->
          <button
            @click="toggleCategoria(categoria.id)"
            class="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            :class="isCategoriaExpandida(categoria.id) ? 'bg-muted/30' : ''"
          >
            <div class="flex items-center space-x-3">
              <!-- Ícone de expansão -->
              <Icon 
                :icon="isCategoriaExpandida(categoria.id) ? 'chevron-down' : 'chevron-right'" 
                class-name="w-5 h-5 text-muted-foreground transition-transform" 
                fallback="▶" 
              />
              
              <!-- Cor da categoria -->
              <div
                class="w-3 h-3 rounded-full"
                :style="{ backgroundColor: coresDisponiveis.find(c => c.valor === categoria.cor)?.hex || '#9333ea' }"
              ></div>
              
              <!-- Nome e contador -->
              <div class="flex items-center space-x-2">
                <h4 class="font-semibold text-foreground text-left">{{ categoria.nome }}</h4>
                <span class="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full">
                  {{ videosPorCategoria[categoria.id]?.length || 0 }}
                </span>
              </div>
            </div>
          </button>

          <!-- Lista de Vídeos da Categoria -->
          <div
            v-show="isCategoriaExpandida(categoria.id)"
            class="bg-background/50"
          >
            <div v-if="videosPorCategoria[categoria.id]?.length === 0" class="p-6 text-center">
              <p class="text-sm text-muted-foreground">Nenhum vídeo nesta categoria</p>
            </div>
            
            <div v-else class="divide-y divide-border/50">
              <div
                v-for="video in videosPorCategoria[categoria.id]"
                :key="video.id"
                class="p-4 hover:bg-muted/30 cursor-pointer transition-all"
                @click="visualizarVideo(video)"
              >
                <div class="flex items-start space-x-4">
                  <!-- Thumbnail -->
                  <div class="flex-shrink-0 w-40 h-24 bg-muted rounded-lg overflow-hidden">
                    <img 
                      v-if="video.thumbnail" 
                      :src="video.thumbnail" 
                      :alt="video.titulo"
                      class="w-full h-full object-cover"
                    />
                    <div v-else class="w-full h-full flex items-center justify-center">
                      <Icon icon="video" class-name="w-8 h-8 text-muted-foreground" fallback="🎥" />
                    </div>
                  </div>

                  <!-- Informações -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <div class="flex items-center space-x-2 mb-1">
                          <h3 class="text-base font-semibold text-foreground truncate">{{ video.titulo }}</h3>
                          <span
                            class="px-2 py-0.5 text-xs rounded-full font-medium flex-shrink-0"
                            :class="video.ativo 
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'"
                          >
                            {{ video.ativo ? 'Ativo' : 'Inativo' }}
                          </span>
                        </div>
                        
                        <p class="text-sm text-muted-foreground line-clamp-2 mb-2">{{ video.descricao }}</p>
                        
                        <div class="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div class="flex items-center space-x-1">
                            <Icon icon="clock" class-name="w-4 h-4" fallback="⏱️" />
                            <span>{{ video.duracao }}</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <Icon icon="eye" class-name="w-4 h-4" fallback="👁️" />
                            <span>{{ video.visualizacoes }} visualizações</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <Icon icon="users" class-name="w-4 h-4" fallback="👥" />
                            <span>{{ video.alunos_com_acesso }} alunos</span>
                          </div>
                          <div class="flex items-center space-x-1">
                            <Icon icon="sort" class-name="w-4 h-4" fallback="📊" />
                            <span>Ordem: {{ video.ordem }}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Botões de ação -->
                      <div class="flex items-center space-x-2 ml-4" @click.stop>
                        <button
                          @click="gerenciarPermissoes(video, $event)"
                          class="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                          title="Gerenciar Permissões"
                        >
                          <Icon icon="user-lock" class-name="w-5 h-5" fallback="🔐" />
                        </button>
                        
                        <button
                          @click="editarVideo(video, $event)"
                          class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Icon icon="edit" class-name="w-5 h-5" fallback="✏️" />
                        </button>
                        
                        <button
                          @click="toggleAtivo(video, $event)"
                          class="p-2 hover:bg-muted rounded-lg transition-colors"
                          :class="video.ativo ? 'text-yellow-600' : 'text-green-600'"
                          :title="video.ativo ? 'Desativar' : 'Ativar'"
                        >
                          <Icon :icon="video.ativo ? 'eye-slash' : 'eye'" class-name="w-5 h-5" fallback="" />
                        </button>
                        
                        <button
                          @click="confirmarExclusao(video, $event)"
                          class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Icon icon="trash-alt" class-name="w-5 h-5" fallback="🗑️" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Cadastro/Edição -->
  <div
    v-if="mostrarModal"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  >
    <div class="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <!-- Header do Modal -->
      <div class="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
        <h2 class="text-xl font-bold text-foreground">
          {{ modoEdicao ? 'Editar Vídeo' : 'Nova Aula em Vídeo' }}
        </h2>
        <button
          @click="fecharModal"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
        </button>
      </div>

      <!-- Conteúdo do Modal -->
      <form @submit.prevent="salvarVideo" class="p-6 space-y-6">
        <!-- Título -->
        <div>
          <label for="titulo" class="block text-sm font-medium text-foreground mb-2">
            Título da Aula <span class="text-red-500">*</span>
          </label>
          <AppInput
            id="titulo"
            v-model="titulo"
            type="text"
            placeholder="Ex: Introdução ao Módulo 1"
            required
          />
        </div>

        <!-- Descrição -->
        <div>
          <label for="descricao" class="block text-sm font-medium text-foreground mb-2">
            Descrição
          </label>
          <textarea
            id="descricao"
            v-model="descricao"
            rows="3"
            placeholder="Descreva brevemente o conteúdo da aula..."
            class="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors resize-none"
          ></textarea>
        </div>

        <!-- URL do YouTube -->
        <div>
          <label for="urlYoutube" class="block text-sm font-medium text-foreground mb-2">
            URL do YouTube <span class="text-red-500">*</span>
          </label>
          <AppInput
            id="urlYoutube"
            v-model="urlYoutube"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
            required
          />
          <p class="text-xs text-muted-foreground mt-1">
            Cole o link completo do vídeo no YouTube
          </p>
        </div>

        <!-- Preview da Thumbnail -->
        <div v-if="thumbnail" class="flex items-center space-x-4 p-4 bg-muted/30 rounded-lg">
          <img :src="thumbnail" alt="Preview" class="w-32 h-20 object-cover rounded" />
          <div>
            <p class="text-sm font-medium text-foreground">Preview da Thumbnail</p>
            <p class="text-xs text-muted-foreground">Será exibida na lista de vídeos</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Duração -->
          <div>
            <label for="duracao" class="block text-sm font-medium text-foreground mb-2">
              Duração <span class="text-red-500">*</span>
            </label>
            <AppInput
              id="duracao"
              v-model="duracao"
              type="text"
              placeholder="Ex: 15:30"
              required
            />
          </div>

          <!-- Ordem -->
          <div>
            <label for="ordem" class="block text-sm font-medium text-foreground mb-2">
              Ordem <span class="text-red-500">*</span>
            </label>
            <AppInput
              id="ordem"
              v-model="ordem"
              type="number"
              placeholder="1"
              min="1"
              required
            />
          </div>

          <!-- Categoria -->
          <div>
            <label for="categoriaId" class="block text-sm font-medium text-foreground mb-2">
              Categoria <span class="text-red-500">*</span>
            </label>
            <select
              id="categoriaId"
              v-model="categoriaId"
              required
              class="w-full rounded-md !bg-input hover:!bg-input focus:!bg-input text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border border-input px-3 py-2"
            >
              <option value="">Selecione</option>
              <option v-for="cat in categorias" :key="cat.id" :value="cat.id">
                {{ cat.nome }}
              </option>
            </select>
          </div>
        </div>

        <!-- Status Ativo -->
        <div class="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg">
          <input
            id="ativo"
            v-model="ativo"
            type="checkbox"
            class="rounded border-border text-primary focus:ring-primary focus:ring-offset-0 w-5 h-5 cursor-pointer"
          />
          <div>
            <label for="ativo" class="block text-sm font-medium text-foreground cursor-pointer">
              Vídeo ativo e visível para alunos com permissão
            </label>
            <p class="text-xs text-muted-foreground">
              Desmarque para deixar o vídeo oculto temporariamente
            </p>
          </div>
        </div>

        <!-- Botões -->
        <div class="flex justify-end space-x-3 pt-4 border-t border-border">
          <button
            type="button"
            @click="fecharModal"
            class="px-6 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="px-6 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors"
          >
            {{ modoEdicao ? 'Atualizar' : 'Cadastrar' }}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal de Visualização -->
  <div
    v-if="mostrarModalVisualizacao && videoVisualizacao"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  >
    <div class="bg-card border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h2 class="text-xl font-bold text-foreground">{{ videoVisualizacao.titulo }}</h2>
        <button
          @click="fecharModalVisualizacao"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <!-- Player do YouTube -->
        <div class="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            :src="`https://www.youtube.com/embed/${extrairYoutubeId(videoVisualizacao.url_youtube)}`"
            class="w-full h-full"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>

        <!-- Informações -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-4 bg-muted/30 rounded-lg">
            <p class="text-sm text-muted-foreground mb-1">Categoria</p>
            <p class="font-medium text-foreground">{{ videoVisualizacao.categoria }}</p>
          </div>
          <div class="p-4 bg-muted/30 rounded-lg">
            <p class="text-sm text-muted-foreground mb-1">Duração</p>
            <p class="font-medium text-foreground">{{ videoVisualizacao.duracao }}</p>
          </div>
          <div class="p-4 bg-muted/30 rounded-lg">
            <p class="text-sm text-muted-foreground mb-1">Visualizações</p>
            <p class="font-medium text-foreground">{{ videoVisualizacao.visualizacoes }}</p>
          </div>
          <div class="p-4 bg-muted/30 rounded-lg">
            <p class="text-sm text-muted-foreground mb-1">Alunos com Acesso</p>
            <p class="font-medium text-foreground">{{ videoVisualizacao.alunos_com_acesso }}</p>
          </div>
        </div>

        <div class="p-4 bg-muted/30 rounded-lg">
          <p class="text-sm text-muted-foreground mb-1">Descrição</p>
          <p class="text-foreground">{{ videoVisualizacao.descricao }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação de Exclusão -->
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div 
      v-if="videoParaExcluir"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      @click.self="cancelarExclusao"
    >
      <div class="bg-card rounded-xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
        <div class="bg-gradient-to-br from-red-500 to-red-600 p-6 text-center">
          <div class="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30">
            <Icon icon="exclamation-triangle" class-name="w-8 h-8 text-white" fallback="⚠️" />
          </div>
          <h3 class="text-xl font-bold text-white">Confirmar Exclusão</h3>
        </div>

        <div class="p-6">
          <p class="text-muted-foreground text-center mb-2">Tem certeza que deseja excluir o vídeo</p>
          <p class="text-center mb-4">
            <strong class="text-foreground text-lg">{{ videoParaExcluir.titulo }}</strong>?
          </p>
          <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-3 mb-6">
            <p class="text-red-800 dark:text-red-200 text-sm text-center">⚠️ Esta ação não pode ser desfeita</p>
          </div>
          
          <div class="flex space-x-3">
            <button
              @click="cancelarExclusao"
              class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              @click="excluirVideo"
              class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal de Permissões -->
  <div
    v-if="mostrarModalPermissoes && videoPermissoes"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  >
    <div class="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <div class="flex items-center justify-between p-6 border-b border-border">
        <div>
          <h2 class="text-xl font-bold text-foreground">Gerenciar Permissões</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ videoPermissoes.titulo }}</p>
        </div>
        <button
          @click="fecharModalPermissoes"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
        </button>
      </div>

      <div class="p-6">
        <div class="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800/30 rounded-lg p-4 mb-6">
          <div class="flex items-start space-x-3">
            <Icon icon="info-circle" class-name="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" fallback="ℹ️" />
            <div>
              <p class="text-sm font-medium text-purple-900 dark:text-purple-100">Controle de Acesso</p>
              <p class="text-xs text-purple-700 dark:text-purple-300 mt-1">
                Apenas alunos com campo "acesso_videos = true" podem ver vídeos. Você pode gerenciar isso na tela de Alunos.
              </p>
            </div>
          </div>
        </div>

        <div class="text-center py-8">
          <Icon icon="users" class-name="w-16 h-16 mx-auto text-muted-foreground mb-4" fallback="👥" />
          <p class="text-muted-foreground mb-4">Funcionalidade em desenvolvimento</p>
          <p class="text-sm text-muted-foreground">
            Em breve você poderá definir permissões específicas por aluno ou turma
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Listagem de Categorias -->
  <div
    v-if="mostrarModalCategorias"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="fecharModalCategorias"
  >
    <div class="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
      <div class="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
        <h3 class="text-lg font-semibold text-foreground">Gerenciar Categorias</h3>
        <button
          @click="fecharModalCategorias"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
        </button>
      </div>

      <div class="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
        <!-- Botão Nova Categoria -->
        <button
          @click="novaCategoria"
          class="w-full px-4 py-3 mb-4 golden-gradient text-primary-foreground rounded-lg transition-colors flex items-center justify-center space-x-2"
        >
          <Icon icon="plus" class-name="w-4 h-4" fallback="+" />
          <span>Nova Categoria</span>
        </button>

        <!-- Lista de Categorias -->
        <div class="space-y-3">
          <div
            v-for="categoria in categorias"
            :key="categoria.id"
            class="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <!-- Cor da categoria -->
                <div
                  class="w-4 h-4 rounded-full"
                  :style="{ backgroundColor: coresDisponiveis.find(c => c.valor === categoria.cor)?.hex || '#9333ea' }"
                ></div>
                
                <!-- Nome e contador -->
                <div>
                  <h4 class="font-medium text-foreground">{{ categoria.nome }}</h4>
                  <p class="text-xs text-muted-foreground">
                    {{ contarVideosPorCategoria(categoria.id) }} {{ contarVideosPorCategoria(categoria.id) === 1 ? 'vídeo' : 'vídeos' }}
                  </p>
                </div>
              </div>

              <!-- Ações -->
              <div class="flex items-center space-x-2">
                <button
                  @click="editarCategoria(categoria)"
                  class="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Editar categoria"
                >
                  <Icon icon="edit" class-name="w-4 h-4 text-blue-600 dark:text-blue-400" fallback="✏️" />
                </button>
                
                <button
                  @click="confirmarExcluirCategoria(categoria)"
                  class="p-2 hover:bg-muted rounded-lg transition-colors"
                  title="Excluir categoria"
                >
                  <Icon icon="trash" class-name="w-4 h-4 text-red-600 dark:text-red-400" fallback="🗑️" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="categorias.length === 0" class="text-center py-8">
            <Icon icon="filter" class-name="w-16 h-16 mx-auto text-muted-foreground mb-4" fallback="📁" />
            <p class="text-muted-foreground">Nenhuma categoria cadastrada</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Criar/Editar Categoria -->
  <div
    v-if="mostrarModalCategoria"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="fecharModalCategoria"
  >
    <div class="bg-card rounded-lg max-w-md w-full shadow-xl">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h3 class="text-lg font-semibold text-foreground">
          {{ categoriaEditando ? 'Editar Categoria' : 'Nova Categoria' }}
        </h3>
        <button
          @click="fecharModalCategoria"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
        </button>
      </div>

      <div class="p-6 space-y-4">
        <!-- Nome -->
        <div>
          <label class="block text-sm font-medium text-foreground mb-2">Nome da Categoria *</label>
          <AppInput
            v-model="nomeCategoria"
            type="text"
            placeholder="Ex: Módulo 1, Avançado..."
            @keydown.enter="salvarCategoria"
          />
        </div>

        <!-- Cor -->
        <div>
          <label class="block text-sm font-medium text-foreground mb-3">Cor *</label>
          <div class="grid grid-cols-4 gap-3">
            <button
              v-for="cor in coresDisponiveis"
              :key="cor.valor"
              @click="corCategoria = cor.valor"
              class="flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-all hover:scale-105"
              :class="corCategoria === cor.valor ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'"
            >
              <div
                class="w-8 h-8 rounded-full"
                :style="{ backgroundColor: cor.hex }"
              ></div>
              <span class="text-xs text-foreground">{{ cor.nome }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Botões -->
      <div class="flex justify-end space-x-3 p-4 border-t border-border">
        <button
          @click="fecharModalCategoria"
          class="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="salvarCategoria"
          class="px-4 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors"
        >
          {{ categoriaEditando ? 'Salvar Alterações' : 'Criar Categoria' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação de Exclusão de Categoria -->
  <div
    v-if="mostrarModalExcluirCategoria"
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    @click.self="fecharModalExcluirCategoria"
  >
    <div class="bg-card rounded-lg max-w-md w-full shadow-xl">
      <div class="flex items-center justify-between p-4 border-b border-border">
        <h3 class="text-lg font-semibold text-foreground">Confirmar Exclusão</h3>
        <button
          @click="fecharModalExcluirCategoria"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
        </button>
      </div>

      <div class="p-6">
        <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4 mb-6">
          <div class="flex items-start space-x-3">
            <Icon icon="exclamation-triangle" class-name="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" fallback="⚠️" />
            <div>
              <p class="text-sm font-medium text-red-900 dark:text-red-100">Atenção!</p>
              <p class="text-xs text-red-700 dark:text-red-300 mt-1">
                Tem certeza que deseja excluir a categoria "{{ categoriaEditando?.nome }}"?
              </p>
              <p v-if="contarVideosPorCategoria(categoriaEditando?.id) > 0" class="text-xs text-red-700 dark:text-red-300 mt-2">
                Esta categoria possui {{ contarVideosPorCategoria(categoriaEditando?.id) }} vídeo(s) vinculado(s) e não poderá ser excluída.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end space-x-3 p-4 border-t border-border">
        <button
          @click="fecharModalExcluirCategoria"
          class="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="excluirCategoria"
          class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium"
          :disabled="contarVideosPorCategoria(categoriaEditando?.id) > 0"
          :class="{ 'opacity-50 cursor-not-allowed': contarVideosPorCategoria(categoriaEditando?.id) > 0 }"
        >
          Excluir Categoria
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Gradiente dourado para botões primários */
.golden-gradient {
  background: radial-gradient(circle at top left, #ffd700 0%, #f0c000 50%, #daa520 100%) !important;
  box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
}

.golden-gradient:hover {
  background: radial-gradient(circle at top left, #ffe44d 0%, #ffd700 45%, #f0c000 100%) !important;
  box-shadow: 0 3px 6px rgba(255, 215, 0, 0.4);
}
</style>
