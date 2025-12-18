<script setup lang="ts">
import { ref, computed } from 'vue'

// Controle do modal de cadastro/edição
const mostrarModal = ref(false)
const modoEdicao = ref(false)
const alunoEditando = ref<any>(null)
const paginaAtualModal = ref(1) // Paginação do modal de cadastro

// Controle do modal de visualização
const mostrarModalVisualizacao = ref(false)
const alunoVisualizacao = ref<any>(null)
const paginaAtualVisualizacao = ref(1) // Paginação do modal de visualização

// Filtros
const filtroNome = ref('')
const filtroTelefone = ref('')

// Estado para carregamento do CEP
const buscandoCEP = ref(false)
const erroCEP = ref('')

// Dados do formulário - Página 1 (Dados Pessoais)
const nomeCompleto = ref('')
const telefone = ref('')
const endereco = ref('')
const numero = ref('')
const complemento = ref('')
const bairro = ref('')
const cep = ref('')
const estado = ref('')
const pais = ref('Brasil')

// Dados do formulário - Página 2 (Dados do Curso)
const cursoContratado = ref('')
const quantidadeHoras = ref('')
const quantidadeAulas = ref('')
const aulasConcluidas = ref('')
const diasSemana = ref<string[]>([])
const localAulas = ref('')
const horaEntrada = ref('')
const horaSaida = ref('')
const multaFalta = ref('')

// Dias da semana disponíveis
const diasDisponiveis = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' }
]

// Lista de alunos (do banco de dados)
const alunos = ref<any[]>([])
const carregandoAlunos = ref(false)

// Função para buscar alunos do banco
async function buscarAlunos() {
  if (!process.client) return
  
  carregandoAlunos.value = true
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('user_id', user.value?.id)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar alunos:', error)
      return
    }
    
    // Mapear os dados do banco para o formato do componente
    alunos.value = (data || []).map((aluno: any) => ({
      id: aluno.id,
      nome: aluno.nome_completo,
      telefone: aluno.telefone || '',
      endereco: aluno.endereco && aluno.numero ? `${aluno.endereco}, ${aluno.numero}` : aluno.endereco || '',
      numero: aluno.numero || '',
      complemento: aluno.complemento || '',
      bairro: aluno.bairro || '',
      cep: aluno.cep || '',
      estado: aluno.estado || '',
      pais: aluno.pais || 'Brasil',
      ativo: aluno.ativo,
      cursoContratado: aluno.curso_contratado || '',
      quantidadeHoras: aluno.quantidade_horas?.toString() || '',
      quantidadeAulas: aluno.quantidade_aulas?.toString() || '',
      aulasConcluidas: aluno.aulas_concluidas?.toString() || '0',
      diasSemana: aluno.dias_semana || [],
      localAulas: aluno.local_aulas || '',
      horaEntrada: aluno.hora_entrada || '',
      horaSaida: aluno.hora_saida || '',
      multaFalta: aluno.multa_falta || ''
    }))
  } catch (error) {
    console.error('Erro inesperado ao buscar alunos:', error)
  } finally {
    carregandoAlunos.value = false
  }
}

// Buscar alunos ao montar o componente
onMounted(() => {
  buscarAlunos()
})

// Computed para filtrar alunos
const alunosFiltrados = computed(() => {
  return alunos.value.filter(aluno => {
    const nomeMatch = aluno.nome.toLowerCase().includes(filtroNome.value.toLowerCase())
    const telefoneMatch = aluno.telefone.toLowerCase().includes(filtroTelefone.value.toLowerCase())
    return nomeMatch && telefoneMatch
  })
})

// Estados brasileiros
const estados = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
]

// Função para formatar CEP
function formatarCEP(valor: string) {
  const numeros = valor.replace(/\D/g, '')
  if (numeros.length <= 5) {
    return numeros
  }
  return numeros.slice(0, 5) + '-' + numeros.slice(5, 8)
}

// Função para buscar CEP no ViaCEP
async function buscarCEP(cepValue: string) {
  const numeroCEP = cepValue.replace(/\D/g, '')
  
  // Valida se o CEP tem 8 dígitos
  if (numeroCEP.length !== 8) {
    return
  }
  
  buscandoCEP.value = true
  erroCEP.value = ''
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${numeroCEP}/json/`)
    const data = await response.json()
    
    if (data.erro) {
      erroCEP.value = 'CEP não encontrado'
      return
    }
    
    // Preenche os campos com os dados do ViaCEP
    endereco.value = data.logradouro || ''
    bairro.value = data.bairro || ''
    estado.value = data.uf || ''
    
    // Foca no campo número após preencher
    setTimeout(() => {
      const numeroInput = document.querySelector('input[placeholder="Número"]') as HTMLInputElement
      if (numeroInput) {
        numeroInput.focus()
      }
    }, 100)
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    erroCEP.value = 'Erro ao buscar CEP. Tente novamente.'
  } finally {
    buscandoCEP.value = false
  }
}

// Handler para CEP
function handleCEPInput(event: Event) {
  const input = event.target as HTMLInputElement
  const cepFormatado = formatarCEP(input.value)
  cep.value = cepFormatado
  
  // Busca automaticamente quando o CEP estiver completo (8 dígitos)
  const numeroCEP = cepFormatado.replace(/\D/g, '')
  if (numeroCEP.length === 8) {
    buscarCEP(cepFormatado)
  } else {
    erroCEP.value = ''
  }
}

// Função para formatar telefone
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

// Handler para telefone
function handleTelefoneInput(event: Event) {
  const input = event.target as HTMLInputElement
  telefone.value = formatarTelefone(input.value)
}

// Função para limpar formulário
function limparFormulario() {
  // Página 1 - Dados Pessoais
  nomeCompleto.value = ''
  telefone.value = ''
  endereco.value = ''
  numero.value = ''
  complemento.value = ''
  bairro.value = ''
  cep.value = ''
  estado.value = ''
  pais.value = 'Brasil'
  
  // Página 2 - Dados do Curso
  cursoContratado.value = ''
  quantidadeHoras.value = ''
  quantidadeAulas.value = ''
  aulasConcluidas.value = ''
  diasSemana.value = []
  localAulas.value = ''
  horaEntrada.value = ''
  horaSaida.value = ''
  multaFalta.value = ''
  
  modoEdicao.value = false
  alunoEditando.value = null
  paginaAtualModal.value = 1
}

// Abrir modal para novo aluno
function abrirModalNovo() {
  limparFormulario()
  mostrarModal.value = true
}

// Abrir modal para editar aluno
function editarAluno(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  modoEdicao.value = true
  alunoEditando.value = aluno
  
  // Página 1 - Dados Pessoais
  nomeCompleto.value = aluno.nome
  telefone.value = aluno.telefone || ''
  
  // Extrair endereco e numero se estiver concatenado
  if (aluno.endereco && aluno.endereco.includes(',')) {
    const partes = aluno.endereco.split(',')
    endereco.value = partes[0].trim()
    numero.value = partes[1]?.trim() || aluno.numero || ''
  } else {
    endereco.value = aluno.endereco || ''
    numero.value = aluno.numero || ''
  }
  
  complemento.value = aluno.complemento || ''
  bairro.value = aluno.bairro || ''
  cep.value = aluno.cep || ''
  estado.value = aluno.estado || ''
  pais.value = aluno.pais || 'Brasil'
  
  // Página 2 - Dados do Curso
  cursoContratado.value = aluno.cursoContratado || ''
  quantidadeHoras.value = aluno.quantidadeHoras || ''
  quantidadeAulas.value = aluno.quantidadeAulas || ''
  aulasConcluidas.value = aluno.aulasConcluidas || ''
  diasSemana.value = aluno.diasSemana || []
  localAulas.value = aluno.localAulas || ''
  horaEntrada.value = aluno.horaEntrada || ''
  horaSaida.value = aluno.horaSaida || ''
  multaFalta.value = aluno.multaFalta || ''
  
  mostrarModal.value = true
  paginaAtualModal.value = 1
  fecharModalVisualizacao()
}

// Salvar aluno
async function salvarAluno() {
  if (!process.client) return
  
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  const alunoData = {
    nome_completo: nomeCompleto.value,
    telefone: telefone.value,
    endereco: endereco.value,
    numero: numero.value,
    complemento: complemento.value,
    bairro: bairro.value,
    cep: cep.value,
    estado: estado.value,
    pais: pais.value,
    curso_contratado: cursoContratado.value,
    quantidade_horas: quantidadeHoras.value ? parseInt(quantidadeHoras.value) : null,
    quantidade_aulas: quantidadeAulas.value ? parseInt(quantidadeAulas.value) : null,
    aulas_concluidas: aulasConcluidas.value ? parseInt(aulasConcluidas.value) : 0,
    dias_semana: diasSemana.value,
    local_aulas: localAulas.value,
    hora_entrada: horaEntrada.value || null,
    hora_saida: horaSaida.value || null,
    multa_falta: multaFalta.value,
    user_id: user.value?.id
  }
  
  try {
    if (modoEdicao.value && alunoEditando.value) {
      // Atualizar aluno existente
      const { error } = await supabase
        .from('alunos')
        .update(alunoData)
        .eq('id', alunoEditando.value.id)
      
      if (error) {
        console.error('Erro ao atualizar aluno:', error)
        alert('Erro ao atualizar aluno')
        return
      }
    } else {
      // Inserir novo aluno
      const { error } = await supabase
        .from('alunos')
        .insert([alunoData])
      
      if (error) {
        console.error('Erro ao criar aluno:', error)
        alert('Erro ao criar aluno')
        return
      }
    }
    
    // Recarregar lista de alunos
    await buscarAlunos()
    fecharModal()
  } catch (error) {
    console.error('Erro inesperado ao salvar aluno:', error)
    alert('Erro inesperado ao salvar aluno')
  }
}

// Fechar modal
function fecharModal() {
  mostrarModal.value = false
  limparFormulario()
}

// Navegação de páginas do modal de cadastro
function proximaPaginaModal() {
  if (paginaAtualModal.value < 2) {
    paginaAtualModal.value++
  }
}

function paginaAnteriorModal() {
  if (paginaAtualModal.value > 1) {
    paginaAtualModal.value--
  }
}

// Navegação de páginas do modal de visualização
function proximaPaginaVisualizacao() {
  if (paginaAtualVisualizacao.value < 2) {
    paginaAtualVisualizacao.value++
  }
}

function paginaAnteriorVisualizacao() {
  if (paginaAtualVisualizacao.value > 1) {
    paginaAtualVisualizacao.value--
  }
}

// Excluir aluno
async function excluirAluno(id: string, event?: Event) {
  if (event) event.stopPropagation()
  
  if (!confirm('Tem certeza que deseja excluir este aluno?')) {
    return
  }
  
  if (!process.client) return
  
  const supabase = useSupabaseClient()
  
  try {
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('Erro ao excluir aluno:', error)
      alert('Erro ao excluir aluno')
      return
    }
    
    // Recarregar lista de alunos
    await buscarAlunos()
    fecharModalVisualizacao()
  } catch (error) {
    console.error('Erro inesperado ao excluir aluno:', error)
    alert('Erro inesperado ao excluir aluno')
  }
}

// Bloquear/Desbloquear aluno
async function toggleBloqueio(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  
  if (!process.client) return
  
  const supabase = useSupabaseClient()
  const novoStatus = !aluno.ativo
  
  try {
    const { error } = await supabase
      .from('alunos')
      .update({ ativo: novoStatus })
      .eq('id', aluno.id)
    
    if (error) {
      console.error('Erro ao alterar status do aluno:', error)
      alert('Erro ao alterar status do aluno')
      return
    }
    
    // Atualizar localmente
    aluno.ativo = novoStatus
  } catch (error) {
    console.error('Erro inesperado ao alterar status:', error)
    alert('Erro inesperado ao alterar status')
  }
}

// Abrir modal de visualização
function visualizarAluno(aluno: any) {
  alunoVisualizacao.value = aluno
  mostrarModalVisualizacao.value = true
}

// Fechar modal de visualização
function fecharModalVisualizacao() {
  mostrarModalVisualizacao.value = false
  alunoVisualizacao.value = null
  paginaAtualVisualizacao.value = 1
}
</script>

<template>
  <div class="bg-card text-card-foreground rounded-lg border border-border shadow-sm">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-border">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Icon icon="user-graduate" class-name="w-5 h-5 text-white" fallback="" />
        </div>
        <div>
          <h2 class="text-xl font-semibold text-foreground">Gerenciamento de Alunos</h2>
          <p class="text-sm text-muted-foreground mt-1">
            Total: <span class="font-bold text-foreground">{{ alunos.length }}</span> alunos cadastrados
          </p>
        </div>
      </div>
      
      <button
        @click="abrirModalNovo"
        class="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
      >
        <Icon icon="plus" class-name="w-4 h-4" fallback="" />
        <span>Novo Aluno</span>
      </button>
    </div>

    <!-- Filtros -->
    <div class="px-6 pb-4 border-b border-border">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label for="filtroNome" class="block text-sm font-medium text-foreground mb-2">
            Filtrar por Nome
          </label>
          <AppInput
            id="filtroNome"
            v-model="filtroNome"
            type="text"
            placeholder="Digite o nome do aluno..."
          />
        </div>
        
        <div>
          <label for="filtroTelefone" class="block text-sm font-medium text-foreground mb-2">
            Filtrar por Telefone
          </label>
          <AppInput
            id="filtroTelefone"
            v-model="filtroTelefone"
            type="text"
            placeholder="Digite o telefone..."
          />
        </div>
      </div>
      
      <div v-if="filtroNome || filtroTelefone" class="mt-3 flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          Mostrando <span class="font-semibold text-foreground">{{ alunosFiltrados.length }}</span> de {{ alunos.length }} alunos
        </p>
        <button
          @click="filtroNome = ''; filtroTelefone = ''"
          class="text-sm text-primary hover:text-primary/80 font-medium"
        >
          Limpar filtros
        </button>
      </div>
    </div>

    <!-- Lista de Alunos -->
    <div class="p-6">
      <!-- Loading -->
      <div v-if="carregandoAlunos" class="text-center py-12">
        <div class="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p class="text-muted-foreground">Carregando alunos...</p>
      </div>

      <!-- Lista vazia -->
      <div v-else-if="alunos.length === 0" class="text-center py-12">
        <Icon icon="user-graduate" class-name="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fallback="" />
        <h3 class="text-lg font-medium text-foreground mb-2">Nenhum aluno cadastrado</h3>
        <p class="text-muted-foreground mb-4">Comece adicionando seu primeiro aluno</p>
        <button
          @click="abrirModalNovo"
          class="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
        >
          Adicionar Primeiro Aluno
        </button>
      </div>

      <div v-else-if="alunosFiltrados.length === 0" class="text-center py-12">
        <Icon icon="user-graduate" class-name="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" fallback="" />
        <h3 class="text-lg font-medium text-foreground mb-2">Nenhum aluno encontrado</h3>
        <p class="text-muted-foreground mb-4">Tente ajustar os filtros de busca</p>
        <button
          @click="filtroNome = ''; filtroTelefone = ''"
          class="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
        >
          Limpar Filtros
        </button>
      </div>

      <div v-else class="grid grid-cols-1 gap-4">
        <div
          v-for="aluno in alunosFiltrados"
          :key="aluno.id"
          class="border border-border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-all"
          :class="{ 'opacity-60': !aluno.ativo }"
          @click="visualizarAluno(aluno)"
        >
          <div class="flex items-center justify-between">
            <!-- Informações do Aluno -->
            <div class="flex items-center space-x-4 flex-1">
              <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon icon="user-graduate" class-name="w-5 h-5 text-primary" fallback="" />
              </div>
              
              <div class="flex-1">
                <div class="flex items-center space-x-2 mb-1">
                  <h3 class="text-base font-semibold text-foreground">{{ aluno.nome }}</h3>
                  <span
                    v-if="!aluno.ativo"
                    class="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-full font-medium"
                  >
                    Bloqueado
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs rounded-full font-medium"
                  >
                    Ativo
                  </span>
                </div>
                
                <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Icon icon="phone" class-name="w-4 h-4" fallback="" />
                  <span>{{ aluno.telefone || 'Sem telefone' }}</span>
                </div>
              </div>
            </div>

            <!-- Botões rápidos -->
            <div class="flex items-center space-x-2 ml-4" @click.stop>
              <button
                @click="editarAluno(aluno, $event)"
                class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Editar"
              >
                <Icon icon="edit" class-name="w-5 h-5" fallback="" />
              </button>
              
              <button
                @click="toggleBloqueio(aluno, $event)"
                class="p-2 hover:bg-muted rounded-lg transition-colors"
                :class="aluno.ativo ? 'text-yellow-600' : 'text-green-600'"
                :title="aluno.ativo ? 'Bloquear' : 'Desbloquear'"
              >
                <Icon :icon="aluno.ativo ? 'ban' : 'check-circle'" class-name="w-5 h-5" fallback="" />
              </button>
              
              <button
                @click="excluirAluno(aluno.id, $event)"
                class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Excluir"
              >
                <Icon icon="trash-alt" class-name="w-5 h-5" fallback="" />
              </button>
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
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon icon="user-graduate" class-name="w-5 h-5 text-primary" fallback="" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">
              {{ modoEdicao ? 'Editar Aluno' : 'Novo Aluno' }}
            </h3>
            <p class="text-sm text-muted-foreground">
              Página {{ paginaAtualModal }} de 2 - {{ paginaAtualModal === 1 ? 'Dados Pessoais' : 'Dados do Curso' }}
            </p>
          </div>
        </div>
        <button
          @click="fecharModal"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5" fallback="" />
        </button>
      </div>

      <!-- Formulário -->
      <form @submit.prevent="salvarAluno" class="p-6 space-y-8">
        
        <!-- Página 1: Dados Pessoais -->
        <div v-if="paginaAtualModal === 1" class="space-y-6">
        <!-- Seção: Dados Pessoais -->
        <div class="space-y-4">
          <div class="flex items-center space-x-2 pb-2 border-b border-border">
            <Icon icon="user" class-name="w-5 h-5 text-primary" fallback="" />
            <h4 class="text-base font-semibold text-foreground">Dados Pessoais</h4>
          </div>

          <!-- Nome e Telefone -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="nomeCompleto" class="block text-sm font-medium text-foreground mb-2">
                Nome Completo <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="nomeCompleto"
                v-model="nomeCompleto"
                type="text"
                placeholder="Digite o nome completo"
                required
              />
            </div>

            <div>
              <label for="telefone" class="block text-sm font-medium text-foreground mb-2">
                Telefone <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="telefone"
                v-model="telefone"
                type="tel"
                placeholder="(00) 00000-0000"
                maxlength="15"
                @input="handleTelefoneInput"
                required
              />
            </div>
          </div>
        </div>

        <!-- Seção: Endereço -->
        <div class="space-y-4">
          <div class="flex items-center space-x-2 pb-2 border-b border-border">
            <Icon icon="map-marker-alt" class-name="w-5 h-5 text-primary" fallback="" />
            <h4 class="text-base font-semibold text-foreground">Endereço</h4>
          </div>

          <!-- CEP e Estado -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="cep" class="block text-sm font-medium text-foreground mb-2">
                CEP <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <AppInput
                  id="cep"
                  v-model="cep"
                  type="text"
                  placeholder="00000-000"
                  maxlength="9"
                  @input="handleCEPInput"
                  :disabled="buscandoCEP"
                  required
                />
                <div v-if="buscandoCEP" class="absolute right-3 top-1/2 -translate-y-1/2">
                  <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              </div>
              <p v-if="erroCEP" class="text-sm text-red-500 mt-1">{{ erroCEP }}</p>
              <p v-else-if="buscandoCEP" class="text-sm text-muted-foreground mt-1">Buscando endereço...</p>
            </div>

            <div>
              <label for="estado" class="block text-sm font-medium text-foreground mb-2">
                Estado <span class="text-red-500">*</span>
              </label>
              <select
                id="estado"
                v-model="estado"
                required
                class="w-full rounded-md !bg-input hover:!bg-input focus:!bg-input text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary border border-input px-3 py-2"
              >
                <option value="" disabled>Selecione</option>
                <option v-for="uf in estados" :key="uf.value" :value="uf.value">
                  {{ uf.label }}
                </option>
              </select>
            </div>

            <div>
              <label for="pais" class="block text-sm font-medium text-foreground mb-2">
                País <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="pais"
                v-model="pais"
                type="text"
                placeholder="País"
                required
              />
            </div>
          </div>

        <!-- Endereço e Número -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label for="endereco" class="block text-sm font-medium text-foreground mb-2">
              Endereço <span class="text-red-500">*</span>
            </label>
            <AppInput
              id="endereco"
              v-model="endereco"
              type="text"
              placeholder="Rua, Avenida, etc."
              required
            />
          </div>

          <div>
            <label for="numero" class="block text-sm font-medium text-foreground mb-2">
              Número <span class="text-red-500">*</span>
            </label>
            <AppInput
              id="numero"
              v-model="numero"
              type="text"
              placeholder="Nº"
              required
            />
          </div>
        </div>

        <!-- Complemento e Bairro -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label for="complemento" class="block text-sm font-medium text-foreground mb-2">
              Complemento
            </label>
            <AppInput
              id="complemento"
              v-model="complemento"
              type="text"
              placeholder="Apto, Bloco, etc."
            />
          </div>

          <div>
            <label for="bairro" class="block text-sm font-medium text-foreground mb-2">
              Bairro <span class="text-red-500">*</span>
            </label>
            <AppInput
              id="bairro"
              v-model="bairro"
              type="text"
              placeholder="Digite o bairro"
              required
            />
          </div>
        </div>
        </div>
        </div>

        <!-- Página 2: Dados do Curso -->
        <div v-if="paginaAtualModal === 2" class="space-y-6">
          <!-- Seção: Detalhes do Curso -->
          <div class="space-y-4">
            <div class="flex items-center space-x-2 pb-2 border-b border-border">
              <Icon icon="book" class-name="w-5 h-5 text-primary" fallback="" />
              <h4 class="text-base font-semibold text-foreground">Detalhes do Curso Contratado</h4>
            </div>

            <!-- Curso Contratado -->
            <div>
              <label for="cursoContratado" class="block text-sm font-medium text-foreground mb-2">
                Curso Contratado <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="cursoContratado"
                v-model="cursoContratado"
                type="text"
                placeholder="Nome do curso"
                required
              />
            </div>

            <!-- Quantidade de Horas e Aulas -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label for="quantidadeHoras" class="block text-sm font-medium text-foreground mb-2">
                  Quantidade de Horas <span class="text-red-500">*</span>
                </label>
                <AppInput
                  id="quantidadeHoras"
                  v-model="quantidadeHoras"
                  type="number"
                  placeholder="Ex: 40"
                  required
                />
              </div>

              <div>
                <label for="quantidadeAulas" class="block text-sm font-medium text-foreground mb-2">
                  Quantidade de Aulas <span class="text-red-500">*</span>
                </label>
                <AppInput
                  id="quantidadeAulas"
                  v-model="quantidadeAulas"
                  type="number"
                  placeholder="Ex: 10"
                  required
                />
              </div>

              <div>
                <label for="aulasConcluidas" class="block text-sm font-medium text-foreground mb-2">
                  Aulas Concluídas <span class="text-red-500">*</span>
                </label>
                <AppInput
                  id="aulasConcluidas"
                  v-model="aulasConcluidas"
                  type="number"
                  placeholder="Ex: 5"
                  required
                />
              </div>
            </div>

            <!-- Dias da Semana -->
            <div>
              <label class="block text-sm font-medium text-foreground mb-2">
                Dias da Semana para Aula <span class="text-red-500">*</span>
              </label>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label
                  v-for="dia in diasDisponiveis"
                  :key="dia.value"
                  class="flex items-center space-x-2 p-2 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  :class="{ 'bg-primary/10 border-primary': diasSemana.includes(dia.value) }"
                >
                  <input
                    type="checkbox"
                    :value="dia.value"
                    v-model="diasSemana"
                    class="rounded border-border text-primary focus:ring-primary"
                  />
                  <span class="text-sm">{{ dia.label }}</span>
                </label>
              </div>
            </div>

            <!-- Local das Aulas -->
            <div>
              <label for="localAulas" class="block text-sm font-medium text-foreground mb-2">
                Local Escolhido para as Aulas <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="localAulas"
                v-model="localAulas"
                type="text"
                placeholder="Ex: Presencial - Sede Centro, Online, etc."
                required
              />
            </div>

            <!-- Horários -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="horaEntrada" class="block text-sm font-medium text-foreground mb-2">
                  Hora de Entrada na Aula <span class="text-red-500">*</span>
                </label>
                <AppInput
                  id="horaEntrada"
                  v-model="horaEntrada"
                  type="time"
                  required
                />
              </div>

              <div>
                <label for="horaSaida" class="block text-sm font-medium text-foreground mb-2">
                  Hora de Saída da Aula <span class="text-red-500">*</span>
                </label>
                <AppInput
                  id="horaSaida"
                  v-model="horaSaida"
                  type="time"
                  required
                />
              </div>
            </div>

            <!-- Multa por Falta -->
            <div>
              <label for="multaFalta" class="block text-sm font-medium text-foreground mb-2">
                Multa por Faltar a Aula <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="multaFalta"
                v-model="multaFalta"
                type="text"
                placeholder="Ex: R$ 50,00"
                required
              />
            </div>
          </div>
        </div>

        <!-- Botões -->
        <div class="flex justify-between pt-4 border-t border-border">
          <div class="flex space-x-3">
            <button
              type="button"
              @click="fecharModal"
              class="px-6 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              v-if="paginaAtualModal === 2"
              type="button"
              @click="paginaAnteriorModal"
              class="px-6 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors font-medium flex items-center space-x-2"
            >
              <Icon icon="chevron-left" class-name="w-4 h-4" fallback="" />
              <span>Anterior</span>
            </button>
          </div>
          
          <div class="flex space-x-3">
            <button
              v-if="paginaAtualModal === 1"
              type="button"
              @click="proximaPaginaModal"
              class="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium flex items-center space-x-2"
            >
              <span>Próximo</span>
              <Icon icon="chevron-right" class-name="w-4 h-4" fallback="" />
            </button>
            <button
              v-if="paginaAtualModal === 2"
              type="submit"
              class="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors font-medium"
            >
              {{ modoEdicao ? 'Atualizar' : 'Salvar' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>

  <!-- Modal de Visualização de Aluno -->
  <div
    v-if="mostrarModalVisualizacao && alunoVisualizacao"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
  >
    <div class="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <!-- Header do Modal -->
      <div class="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
        <div class="flex items-center space-x-3">
          <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Icon icon="user-graduate" class-name="w-6 h-6 text-primary" fallback="" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-foreground">Informações do Aluno</h3>
            <p class="text-sm text-muted-foreground">
              Página {{ paginaAtualVisualizacao }} de 2 - {{ paginaAtualVisualizacao === 1 ? 'Dados Pessoais' : 'Dados do Curso' }}
            </p>
          </div>
        </div>
        <button
          @click="fecharModalVisualizacao"
          class="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Icon icon="times" class-name="w-5 h-5" fallback="" />
        </button>
      </div>

      <!-- Conteúdo do Modal -->
      <div class="p-6 space-y-6">
        <!-- Status -->
        <div class="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
          <div class="flex items-center space-x-2">
            <Icon icon="info-circle" class-name="w-5 h-5 text-muted-foreground" fallback="" />
            <span class="text-sm font-medium text-foreground">Status do Aluno</span>
          </div>
          <span
            class="px-3 py-1 rounded-full text-sm font-medium"
            :class="alunoVisualizacao.ativo 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'"
          >
            {{ alunoVisualizacao.ativo ? 'Ativo' : 'Bloqueado' }}
          </span>
        </div>

        <!-- Página 1: Dados Pessoais e Endereço -->
        <div v-if="paginaAtualVisualizacao === 1" class="space-y-6">
        <!-- Dados Pessoais -->
        <div>
          <h4 class="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
            <Icon icon="user" class-name="w-4 h-4" fallback="" />
            <span>Dados Pessoais</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-3 rounded-lg bg-muted/20">
              <label class="text-xs font-medium text-muted-foreground uppercase">Nome Completo</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.nome }}</p>
            </div>
            
            <div class="p-3 rounded-lg bg-muted/20">
              <label class="text-xs font-medium text-muted-foreground uppercase">Telefone</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.telefone || 'Não informado' }}</p>
            </div>
          </div>
        </div>

        <!-- Endereço -->
        <div>
          <h4 class="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
            <Icon icon="map-marker-alt" class-name="w-4 h-4" fallback="" />
            <span>Endereço</span>
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-3 rounded-lg bg-muted/20">
              <label class="text-xs font-medium text-muted-foreground uppercase">CEP</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.cep }}</p>
            </div>
            
            <div class="p-3 rounded-lg bg-muted/20">
              <label class="text-xs font-medium text-muted-foreground uppercase">Estado</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.estado }}</p>
            </div>
            
            <div class="p-3 rounded-lg bg-muted/20 md:col-span-2">
              <label class="text-xs font-medium text-muted-foreground uppercase">Endereço Completo</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.endereco }}</p>
            </div>
            
            <div class="p-3 rounded-lg bg-muted/20">
              <label class="text-xs font-medium text-muted-foreground uppercase">Bairro</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.bairro }}</p>
            </div>
            
            <div class="p-3 rounded-lg bg-muted/20">
              <label class="text-xs font-medium text-muted-foreground uppercase">Cidade</label>
              <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.cidade }}</p>
            </div>
          </div>
        </div>
        </div>

        <!-- Página 2: Dados do Curso -->
        <div v-if="paginaAtualVisualizacao === 2" class="space-y-6">
          <div>
            <h4 class="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
              <Icon icon="book" class-name="w-4 h-4" fallback="" />
              <span>Detalhes do Curso Contratado</span>
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-3 rounded-lg bg-muted/20 md:col-span-2">
                <label class="text-xs font-medium text-muted-foreground uppercase">Curso Contratado</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.cursoContratado || 'Não informado' }}</p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20">
                <label class="text-xs font-medium text-muted-foreground uppercase">Quantidade de Horas</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.quantidadeHoras || 'Não informado' }}</p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20">
                <label class="text-xs font-medium text-muted-foreground uppercase">Quantidade de Aulas</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.quantidadeAulas || 'Não informado' }}</p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20 md:col-span-2">
                <label class="text-xs font-medium text-muted-foreground uppercase">Aulas Concluídas</label>
                <div class="flex items-center justify-between mt-1">
                  <p class="text-sm text-foreground font-medium">
                    {{ alunoVisualizacao.aulasConcluidas || '0' }} de {{ alunoVisualizacao.quantidadeAulas || '0' }} aulas
                  </p>
                  <div class="flex items-center space-x-2">
                    <div class="w-32 bg-muted rounded-full h-2">
                      <div 
                        class="h-2 rounded-full transition-all"
                        :class="parseFloat(alunoVisualizacao.aulasConcluidas || 0) >= parseFloat(alunoVisualizacao.quantidadeAulas || 1) 
                          ? 'bg-green-500' 
                          : 'bg-primary'"
                        :style="{ width: `${Math.min(100, (parseFloat(alunoVisualizacao.aulasConcluidas || 0) / parseFloat(alunoVisualizacao.quantidadeAulas || 1)) * 100)}%` }"
                      ></div>
                    </div>
                    <span class="text-xs font-medium text-muted-foreground">
                      {{ Math.round((parseFloat(alunoVisualizacao.aulasConcluidas || 0) / parseFloat(alunoVisualizacao.quantidadeAulas || 1)) * 100) }}%
                    </span>
                  </div>
                </div>
              </div>

              <div class="p-3 rounded-lg bg-muted/20 md:col-span-2">
                <label class="text-xs font-medium text-muted-foreground uppercase">Dias da Semana</label>
                <p class="text-sm text-foreground font-medium mt-1">
                  {{ alunoVisualizacao.diasSemana && alunoVisualizacao.diasSemana.length > 0 
                    ? alunoVisualizacao.diasSemana.map(d => diasDisponiveis.find(dia => dia.value === d)?.label).join(', ') 
                    : 'Não informado' }}
                </p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20 md:col-span-2">
                <label class="text-xs font-medium text-muted-foreground uppercase">Local das Aulas</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.localAulas || 'Não informado' }}</p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20">
                <label class="text-xs font-medium text-muted-foreground uppercase">Hora de Entrada</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.horaEntrada || 'Não informado' }}</p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20">
                <label class="text-xs font-medium text-muted-foreground uppercase">Hora de Saída</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.horaSaida || 'Não informado' }}</p>
              </div>

              <div class="p-3 rounded-lg bg-muted/20 md:col-span-2">
                <label class="text-xs font-medium text-muted-foreground uppercase">Multa por Falta</label>
                <p class="text-sm text-foreground font-medium mt-1">{{ alunoVisualizacao.multaFalta || 'Não informado' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer com ações e navegação -->
      <div class="flex items-center justify-between p-6 border-t border-border bg-muted/10">
        <div class="flex items-center space-x-2">
          <button
            @click="fecharModalVisualizacao"
            class="px-6 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors font-medium"
          >
            Fechar
          </button>
          <button
            v-if="paginaAtualVisualizacao === 2"
            @click="paginaAnteriorVisualizacao"
            class="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <Icon icon="chevron-left" class-name="w-4 h-4" fallback="" />
            <span>Anterior</span>
          </button>
          <button
            v-if="paginaAtualVisualizacao === 1"
            @click="proximaPaginaVisualizacao"
            class="px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <span>Próximo</span>
            <Icon icon="chevron-right" class-name="w-4 h-4" fallback="" />
          </button>
        </div>
        <div class="flex items-center space-x-2">
          <button
            @click="editarAluno(alunoVisualizacao)"
            class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <Icon icon="edit" class-name="w-4 h-4" fallback="" />
            <span>Editar</span>
          </button>
          
          <button
            @click="toggleBloqueio(alunoVisualizacao)"
            class="px-4 py-2 rounded-lg transition-colors font-medium flex items-center space-x-2"
            :class="alunoVisualizacao.ativo 
              ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
              : 'bg-green-600 text-white hover:bg-green-700'"
          >
            <Icon :icon="alunoVisualizacao.ativo ? 'ban' : 'check-circle'" class-name="w-4 h-4" fallback="" />
            <span>{{ alunoVisualizacao.ativo ? 'Bloquear' : 'Desbloquear' }}</span>
          </button>
          
          <button
            @click="excluirAluno(alunoVisualizacao.id)"
            class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <Icon icon="trash-alt" class-name="w-4 h-4" fallback="" />
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Força estilos do select */
select {
  background-color: hsl(var(--input)) !important;
}

/* Select - modo claro */
html.light select,
html.light select:hover,
html.light select:focus {
  background-color: #f5f5f5 !important;
  border-color: #d0d0d0 !important;
  color: rgb(15 23 42) !important;
}

html.light select:hover {
  background-color: #ebebeb !important;
  border-color: #c0c0c0 !important;
}

html.light select:focus {
  background-color: #ffffff !important;
  border-color: rgb(253 215 61) !important;
}

/* Modo escuro - select */
:global(html.dark) select,
:global(html:not(.light)) select,
:global(.dark) select,
:global(:root:not(.light)) select {
  background-color: rgb(38 39 43) !important;
  border-color: rgb(63 63 70) !important;
  color: rgb(255 255 255) !important;
}

/* Ícones de alunos - modo claro com cor mais escura */
html.light .text-primary {
  color: #d4a017 !important;
}
</style>
