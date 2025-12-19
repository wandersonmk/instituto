<script setup lang="ts">
definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()

// Estado
const isLoading = ref(true)
const indicacoes = ref<any[]>([])
const mostrarModal = ref(false)

// Formulário
const nomeIndicado = ref('')
const telefoneIndicado = ref('')

// Buscar indicações do aluno
async function buscarIndicacoes() {
  if (!user.value) {
    isLoading.value = false
    return
  }
  
  isLoading.value = true
  
  try {
    // Buscar aluno_id
    const { data: alunoData } = await supabase
      .from('alunos')
      .select('id')
      .eq('user_id', user.value.id)
      .single()
    
    if (!alunoData) return
    
    // Buscar indicações
    const { data, error } = await supabase
      .from('indicacoes')
      .select('*')
      .eq('aluno_id', alunoData.id)
      .order('data_indicacao', { ascending: false })
    
    if (error) throw error
    
    indicacoes.value = data || []
  } catch (error) {
    console.error('Erro ao buscar indicações:', error)
  } finally {
    isLoading.value = false
  }
}

// Formatar telefone
function formatarTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, '')
  if (numeros.length <= 2) {
    return `(${numeros}`
  } else if (numeros.length <= 7) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`
  } else if (numeros.length <= 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }
  return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7, 11)}`
}

function handleTelefoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  telefoneIndicado.value = formatarTelefone(input.value)
}

// Adicionar indicação
async function adicionarIndicacao() {
  if (!user.value || !nomeIndicado.value || !telefoneIndicado.value) return
  
  const toast = await useToastSafe()
  
  try {
    // Buscar aluno_id
    const { data: alunoData } = await supabase
      .from('alunos')
      .select('id')
      .eq('user_id', user.value.id)
      .single()
    
    if (!alunoData) {
      toast?.error('Erro: Aluno não encontrado')
      return
    }
    
    // Inserir indicação
    const { error } = await supabase
      .from('indicacoes')
      .insert({
        aluno_id: alunoData.id,
        nome_indicado: nomeIndicado.value,
        telefone_indicado: telefoneIndicado.value
      })
    
    if (error) throw error
    
    toast?.success('Indicação cadastrada com sucesso!')
    
    // Limpar formulário e recarregar
    nomeIndicado.value = ''
    telefoneIndicado.value = ''
    mostrarModal.value = false
    await buscarIndicacoes()
  } catch (error) {
    console.error('Erro ao adicionar indicação:', error)
    const toast = await useToastSafe()
    toast?.error('Erro ao cadastrar indicação')
  }
}

// Status badge color
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    'pendente': 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    'contatado': 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    'matriculado': 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    'recusado': 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  }
  return colors[status] || colors.pendente
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    'pendente': 'Pendente',
    'contatado': 'Contatado',
    'matriculado': 'Matriculado',
    'recusado': 'Recusado'
  }
  return labels[status] || status
}

// Buscar ao montar
onMounted(() => {
  buscarIndicacoes()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Indicações"
      description="Buscando suas indicações..."
    />
    
    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-foreground">Minhas Indicações</h2>
          <p class="text-muted-foreground mt-1">
            Indique amigos e acompanhe o status das suas indicações
          </p>
        </div>
        
        <button
          @click="mostrarModal = true"
          class="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          <Icon icon="plus" class-name="w-5 h-5" fallback="" />
          <span>Nova Indicação</span>
        </button>
      </div>
      
      <!-- Lista de indicações -->
      <div v-if="indicacoes.length === 0" class="text-center py-12 bg-card border border-border rounded-lg">
        <Icon icon="handshake" class-name="w-16 h-16 mx-auto mb-4 text-muted-foreground" fallback="🤝" />
        <h3 class="text-lg font-medium text-foreground mb-2">Nenhuma indicação cadastrada</h3>
        <p class="text-muted-foreground mb-4">Comece indicando seus amigos para estudar conosco!</p>
        <button
          @click="mostrarModal = true"
          class="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          Fazer Primeira Indicação
        </button>
      </div>
      
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="indicacao in indicacoes"
          :key="indicacao.id"
          class="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start justify-between mb-3">
            <div>
              <h3 class="font-semibold text-foreground">{{ indicacao.nome_indicado }}</h3>
              <p class="text-sm text-muted-foreground">{{ indicacao.telefone_indicado }}</p>
            </div>
            <span
              :class="getStatusColor(indicacao.status)"
              class="px-2 py-1 text-xs font-medium rounded-full"
            >
              {{ getStatusLabel(indicacao.status) }}
            </span>
          </div>
          
          <div class="text-xs text-muted-foreground">
            <p>Indicado em: {{ new Date(indicacao.data_indicacao).toLocaleDateString('pt-BR') }}</p>
            <p v-if="indicacao.observacoes" class="mt-2 italic">{{ indicacao.observacoes }}</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal Nova Indicação -->
    <div
      v-if="mostrarModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="mostrarModal = false"
    >
      <div class="bg-card border border-border rounded-lg max-w-md w-full p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-foreground">Nova Indicação</h3>
          <button @click="mostrarModal = false" class="p-2 hover:bg-muted rounded-lg">
            <Icon icon="times" class-name="w-5 h-5" fallback="✕" />
          </button>
        </div>
        
        <form @submit.prevent="adicionarIndicacao" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">
              Nome Completo <span class="text-red-500">*</span>
            </label>
            <AppInput
              v-model="nomeIndicado"
              type="text"
              placeholder="Digite o nome completo"
              required
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">
              Telefone <span class="text-red-500">*</span>
            </label>
            <AppInput
              v-model="telefoneIndicado"
              type="tel"
              placeholder="(00) 00000-0000"
              maxlength="15"
              @input="handleTelefoneInput"
              required
            />
          </div>
          
          <div class="flex space-x-3 pt-4">
            <button
              type="button"
              @click="mostrarModal = false"
              class="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Cadastrar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
