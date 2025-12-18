<template>
  <div class="space-y-6">
    <!-- Header com botão de adicionar -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-foreground">Gerenciar Cursos</h2>
        <p class="text-sm text-muted-foreground mt-1">Cadastre e gerencie os cursos oferecidos</p>
      </div>
      <button
        @click="abrirModalNovo"
        class="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium shadow-lg"
      >
        <Icon icon="plus" class-name="w-5 h-5" fallback="" />
        <span>Novo Curso</span>
      </button>
    </div>

    <!-- Filtro por nome -->
    <div class="flex items-center gap-3 bg-card border border-border rounded-lg p-4">
      <div class="flex-1 relative">
        <Icon icon="search" class-name="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" fallback="🔍" />
        <input
          v-model="filtroNome"
          type="text"
          placeholder="Filtrar por nome do curso..."
          class="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        />
      </div>
      <span class="text-sm text-muted-foreground whitespace-nowrap font-medium">
        {{ cursosFiltrados.length }} {{ cursosFiltrados.length === 1 ? 'curso' : 'cursos' }}
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading && cursos.length === 0" class="text-center py-12">
      <div class="flex flex-col items-center">
        <div class="w-12 h-12 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-muted-foreground animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-foreground mb-2">Carregando cursos...</h3>
        <p class="text-muted-foreground">Aguarde um momento</p>
      </div>
    </div>

    <!-- Lista de cursos -->
    <div v-else-if="cursos.length > 0">
      <!-- Mensagem se não há resultados no filtro -->
      <div v-if="cursosFiltrados.length === 0" class="text-center py-12 bg-card border border-border rounded-lg">
        <div class="flex flex-col items-center">
          <Icon icon="search" class-name="w-12 h-12 text-muted-foreground mb-4" fallback="🔍" />
          <h3 class="text-lg font-medium text-foreground mb-2">Nenhum curso encontrado</h3>
          <p class="text-muted-foreground">Tente ajustar o filtro de busca</p>
        </div>
      </div>

      <!-- Grid de cursos -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="curso in cursosFiltrados"
          :key="curso.id"
        class="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-200 relative group"
      >
        <!-- Badge de status -->
        <div class="absolute top-4 right-4">
          <span
            :class="curso.ativo ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'"
            class="px-2 py-1 text-xs font-medium rounded-full"
          >
            {{ curso.ativo ? 'Ativo' : 'Inativo' }}
          </span>
        </div>

        <!-- Conteúdo do card -->
        <div class="mb-4">
          <h3 class="text-lg font-bold text-foreground mb-2 pr-16">{{ curso.nome }}</h3>
          <p v-if="curso.descricao" class="text-sm text-muted-foreground line-clamp-2">
            {{ curso.descricao }}
          </p>
        </div>

        <!-- Informações do curso -->
        <div class="space-y-2 mb-4">
          <div v-if="curso.carga_horaria" class="flex items-center text-sm text-foreground">
            <Icon icon="clock" class-name="w-4 h-4 mr-2 text-primary" fallback="" />
            <span>{{ curso.carga_horaria }} horas</span>
          </div>
          <div v-if="curso.quantidade_aulas" class="flex items-center text-sm text-foreground">
            <Icon icon="book" class-name="w-4 h-4 mr-2 text-primary" fallback="" />
            <span>{{ curso.quantidade_aulas }} aulas</span>
          </div>
          <div v-if="curso.valor" class="flex items-center text-sm text-foreground font-medium">
            <Icon icon="dollar-sign" class-name="w-4 h-4 mr-2 text-green-600" fallback="" />
            <span>R$ {{ curso.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div v-if="curso.valor_multa_falta" class="flex items-center text-sm text-foreground">
            <Icon icon="exclamation-triangle" class-name="w-4 h-4 mr-2 text-amber-600" fallback="" />
            <span>Multa: R$ {{ curso.valor_multa_falta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <!-- Ações -->
        <div class="flex items-center space-x-2 pt-4 border-t border-border">
          <button
            @click="editarCurso(curso)"
            class="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Icon icon="edit" class-name="w-4 h-4" fallback="" />
            <span>Editar</span>
          </button>
          <button
            @click="toggleAtivoCurso(curso)"
            class="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm rounded-lg transition-colors"
            :class="curso.ativo ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-green-600 text-white hover:bg-green-700'"
          >
            <Icon :icon="curso.ativo ? 'ban' : 'check-circle'" class-name="w-4 h-4" fallback="" />
            <span>{{ curso.ativo ? 'Desativar' : 'Ativar' }}</span>
          </button>
          <button
            @click="confirmarExclusao(curso)"
            class="px-3 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
          >
            <Icon icon="trash" class-name="w-4 h-4" fallback="" />
          </button>
        </div>
      </div>
      </div>
    </div>

    <!-- Estado vazio -->
    <div v-else class="text-center py-12">
      <div class="flex flex-col items-center">
        <Icon icon="graduation-cap" class-name="w-16 h-16 text-muted-foreground/50 mb-4" fallback="" />
        <h3 class="text-lg font-medium text-foreground mb-2">Nenhum curso cadastrado</h3>
        <p class="text-muted-foreground mb-6">Comece cadastrando seu primeiro curso</p>
        <button
          @click="abrirModalNovo"
          class="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Icon icon="plus" class-name="w-5 h-5" fallback="" />
          <span>Cadastrar Primeiro Curso</span>
        </button>
      </div>
    </div>

    <!-- Modal de cadastro/edição -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="mostrarModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div class="bg-card rounded-xl shadow-2xl max-w-2xl w-full border border-border overflow-hidden max-h-[90vh] flex flex-col">
            <!-- Header -->
            <div class="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
              <h3 class="text-xl font-bold">{{ modoEdicao ? 'Editar Curso' : 'Novo Curso' }}</h3>
              <p class="text-sm opacity-90 mt-1">{{ modoEdicao ? 'Atualize as informações do curso' : 'Preencha os dados do novo curso' }}</p>
            </div>

            <!-- Formulário -->
            <form @submit.prevent="salvarCurso" class="p-6 space-y-4 overflow-y-auto flex-1">
              <!-- Nome -->
              <div>
                <label for="nome" class="block text-sm font-medium text-foreground mb-2">
                  Nome do Curso <span class="text-red-500">*</span>
                </label>
                <AppInput
                  id="nome"
                  v-model="form.nome"
                  type="text"
                  placeholder="Ex: Micropigmentação Facial"
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
                  v-model="form.descricao"
                  rows="3"
                  placeholder="Descreva o curso..."
                  class="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                ></textarea>
              </div>

              <!-- Carga horária e Quantidade de aulas -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="carga_horaria" class="block text-sm font-medium text-foreground mb-2">
                    Carga Horária (horas)
                  </label>
                  <AppInput
                    id="carga_horaria"
                    v-model="form.carga_horaria"
                    type="number"
                    placeholder="Ex: 40"
                    min="0"
                  />
                </div>

                <div>
                  <label for="quantidade_aulas" class="block text-sm font-medium text-foreground mb-2">
                    Quantidade de Aulas
                  </label>
                  <AppInput
                    id="quantidade_aulas"
                    v-model="form.quantidade_aulas"
                    type="number"
                    placeholder="Ex: 10"
                    min="0"
                  />
                </div>
              </div>

              <!-- Valor e Multa por falta -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="valor" class="block text-sm font-medium text-foreground mb-2">
                    Valor do Curso (R$)
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                    <input
                      id="valor"
                      :value="valorFormatado"
                      @input="handleValorInput"
                      type="text"
                      placeholder="0,00"
                      class="w-full pl-12 pr-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label for="valor_multa_falta" class="block text-sm font-medium text-foreground mb-2">
                    Multa por Falta (R$)
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                    <input
                      id="valor_multa_falta"
                      :value="multaFormatada"
                      @input="handleMultaInput"
                      type="text"
                      placeholder="0,00"
                      class="w-full pl-12 pr-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              <!-- Status -->
              <div class="flex items-center space-x-2">
                <input
                  id="ativo"
                  v-model="form.ativo"
                  type="checkbox"
                  class="w-4 h-4 text-primary border-input rounded focus:ring-2 focus:ring-primary"
                />
                <label for="ativo" class="text-sm font-medium text-foreground">
                  Curso ativo
                </label>
              </div>
            </form>

            <!-- Footer -->
            <div class="flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted/20">
              <button
                type="button"
                @click="fecharModal"
                class="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                @click="salvarCurso"
                :disabled="isLoading"
                class="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                {{ isLoading ? 'Salvando...' : (modoEdicao ? 'Atualizar' : 'Cadastrar') }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- Modal de confirmação de exclusão -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="cursoParaExcluir"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
        @click.self="cancelarExclusao"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-4"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-4"
        >
          <div class="bg-card rounded-xl shadow-2xl max-w-md w-full border border-border overflow-hidden">
            <div class="bg-gradient-to-br from-red-500 to-red-600 p-6 text-center relative">
              <div class="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30">
                <Icon icon="exclamation-triangle" class-name="w-8 h-8 text-white" fallback="" />
              </div>
              <h3 class="text-xl font-bold text-white">
                Confirmar Exclusão
              </h3>
            </div>

            <div class="p-6">
              <p class="text-muted-foreground text-center mb-2">
                Tem certeza que deseja excluir o curso
              </p>
              <p class="text-center mb-4">
                <strong class="text-foreground text-lg">{{ cursoParaExcluir.nome }}</strong>?
              </p>
              <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-3 mb-6">
                <p class="text-red-800 dark:text-red-200 text-sm text-center">
                  ⚠️ Esta ação não pode ser desfeita
                </p>
              </div>
              
              <div class="flex space-x-3">
                <button
                  @click="cancelarExclusao"
                  class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200 hover:scale-105"
                >
                  Cancelar
                </button>
                <button
                  @click="excluirCurso"
                  class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-red-500/50"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { Curso, CursoInput } from '../composables/useCursos'

const { 
  cursos, 
  isLoading, 
  error, 
  fetchCursos, 
  addCurso, 
  updateCurso, 
  deleteCurso,
  toggleAtivo
} = useCursos()

// Estados do modal
const mostrarModal = ref(false)
const modoEdicao = ref(false)
const cursoEditando = ref<Curso | null>(null)
const cursoParaExcluir = ref<Curso | null>(null)

// Formulário
const form = ref<CursoInput>({
  nome: '',
  descricao: '',
  carga_horaria: undefined,
  quantidade_aulas: undefined,
  valor: undefined,
  valor_multa_falta: undefined,
  ativo: true
})

// Valores formatados para exibição
const valorFormatado = ref('')
const multaFormatada = ref('')

// Filtro
const filtroNome = ref('')

// Função para formatar moeda brasileira
function formatarMoeda(valor: string): string {
  // Remove tudo que não é número
  const numero = valor.replace(/\D/g, '')
  
  if (!numero) return ''
  
  // Converte para número e divide por 100 (centavos)
  const valorNumerico = parseFloat(numero) / 100
  
  // Formata como moeda brasileira
  return valorNumerico.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Função para converter valor formatado para número
function converterParaNumero(valorFormatado: string): number {
  const numero = valorFormatado.replace(/\./g, '').replace(',', '.')
  return parseFloat(numero) || 0
}

// Handlers para os inputs de moeda
function handleValorInput(event: Event) {
  const input = event.target as HTMLInputElement
  valorFormatado.value = formatarMoeda(input.value)
  form.value.valor = converterParaNumero(valorFormatado.value)
}

function handleMultaInput(event: Event) {
  const input = event.target as HTMLInputElement
  multaFormatada.value = formatarMoeda(input.value)
  form.value.valor_multa_falta = converterParaNumero(multaFormatada.value)
}

// Buscar cursos ao montar
onMounted(() => {
  fetchCursos()
})

// Abrir modal para novo curso
function abrirModalNovo() {
  modoEdicao.value = false
  cursoEditando.value = null
  form.value = {
    nome: '',
    descricao: '',
    carga_horaria: undefined,
    quantidade_aulas: undefined,
    valor: undefined,
    valor_multa_falta: undefined,
    ativo: true
  }
  valorFormatado.value = ''
  multaFormatada.value = ''
  mostrarModal.value = true
}

// Editar curso
function editarCurso(curso: Curso) {
  modoEdicao.value = true
  cursoEditando.value = curso
  form.value = {
    nome: curso.nome,
    descricao: curso.descricao || '',
    carga_horaria: curso.carga_horaria,
    quantidade_aulas: curso.quantidade_aulas,
    valor: curso.valor,
    valor_multa_falta: curso.valor_multa_falta,
    ativo: curso.ativo
  }
  
  // Formatar valores para exibição
  valorFormatado.value = curso.valor ? curso.valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) : ''
  
  multaFormatada.value = curso.valor_multa_falta ? curso.valor_multa_falta.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) : ''
  
  mostrarModal.value = true
}

// Salvar curso
async function salvarCurso() {
  const cursoData: CursoInput = {
    nome: form.value.nome,
    descricao: form.value.descricao || undefined,
    carga_horaria: form.value.carga_horaria ? Number(form.value.carga_horaria) : undefined,
    quantidade_aulas: form.value.quantidade_aulas ? Number(form.value.quantidade_aulas) : undefined,
    valor: form.value.valor ? Number(form.value.valor) : undefined,
    valor_multa_falta: form.value.valor_multa_falta ? Number(form.value.valor_multa_falta) : undefined,
    ativo: form.value.ativo
  }

  let sucesso = false
  
  if (modoEdicao.value && cursoEditando.value) {
    sucesso = await updateCurso(cursoEditando.value.id, cursoData)
  } else {
    sucesso = await addCurso(cursoData)
  }

  if (sucesso) {
    fecharModal()
  }
}

// Fechar modal
function fecharModal() {
  mostrarModal.value = false
  modoEdicao.value = false
  cursoEditando.value = null
}

// Confirmar exclusão
function confirmarExclusao(curso: Curso) {
  cursoParaExcluir.value = curso
}

// Cancelar exclusão
function cancelarExclusao() {
  cursoParaExcluir.value = null
}

// Excluir curso
async function excluirCurso() {
  if (!cursoParaExcluir.value) return
  
  const sucesso = await deleteCurso(cursoParaExcluir.value.id)
  
  if (sucesso) {
    cursoParaExcluir.value = null
  }
}

// Toggle ativo/inativo
async function toggleAtivoCurso(curso: Curso) {
  await toggleAtivo(curso.id, !curso.ativo)
}

// Computed para filtrar cursos
const cursosFiltrados = computed(() => {
  if (!filtroNome.value) return cursos.value
  
  return cursos.value.filter(curso => 
    curso.nome.toLowerCase().includes(filtroNome.value.toLowerCase())
  )
})
</script>
