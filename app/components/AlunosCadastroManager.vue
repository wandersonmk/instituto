<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Buscar cursos disponíveis
const { cursosAtivos, fetchCursos: buscarCursos } = useCursos()

// Controle do modal de cadastro/edição
const mostrarModal = ref(false)
const modoEdicao = ref(false)
const alunoEditando = ref<any>(null)
const paginaAtualModal = ref(1) // Paginação do modal de cadastro

// Controle do modal de visualização
const mostrarModalVisualizacao = ref(false)
const alunoVisualizacao = ref<any>(null)
const paginaAtualVisualizacao = ref(1) // Paginação do modal de visualização
const cursosVisualizacao = ref<any[]>([]) // Cursos do aluno em visualização
const cursosExpandidos = ref<Set<string>>(new Set()) // IDs dos cursos expandidos

// Controle do modal de confirmação de exclusão
const alunoParaExcluir = ref<any>(null)

// Controle do modal de edição de multa
const mostrarModalMulta = ref(false)
const alunoEditandoMulta = ref<any>(null)
const novaMulta = ref('')
const novaMultaFormatada = ref('')

// Controle do modal de registro de falta
const mostrarModalFalta = ref(false)
const alunoRegistrandoFalta = ref<any>(null)
const dataFalta = ref('')
const motivoFalta = ref('')
const observacoesFalta = ref('')
const cursoIdFalta = ref('')
const cursosDoAluno = ref<any[]>([])

// Controle do modal de pagamento de multas
const mostrarModalPagamento = ref(false)
const alunoPagandoMulta = ref<any>(null)
const observacoesPagamento = ref('')
const valorPagamento = ref('')
const valorPagamentoFormatado = ref('')

// Filtros
const filtroNome = ref('')
const filtroTelefone = ref('')

// Estado para carregamento do CEP
const buscandoCEP = ref(false)
const erroCEP = ref('')

// Dados do formulário - Página 1 (Dados Pessoais)
const nomeCompleto = ref('')
const email = ref('')
const telefone = ref('')
const endereco = ref('')
const numero = ref('')
const complemento = ref('')
const bairro = ref('')
const cep = ref('')
const estado = ref('')
const pais = ref('Brasil')

// Dados do formulário - Página 2 (Dados do Curso) - NOVO: Múltiplos Cursos
const cursoId = ref('')
const cursoContratado = ref('')
const buscaCurso = ref('')
const mostrarListaCursos = ref(false)
const quantidadeHoras = ref('')
const quantidadeAulas = ref('')
const aulasConcluidas = ref('')
const diasSemana = ref<number[]>([])
const localAulas = ref('')
const horaEntrada = ref('')
const horaSaida = ref('')
const multaFalta = ref('')
const acessoVideos = ref(false)
const mostrarModalNovoCurso = ref(false)

// NOVO: Lista de cursos adicionados ao aluno
const cursosAdicionados = ref<any[]>([])
const cursoParaRemover = ref<any>(null)

// Dias da semana disponíveis (0=Domingo, 1=Segunda, etc.)
const diasDisponiveis = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' }
]

// Lista de alunos (do banco de dados)
const alunos = ref<any[]>([])
const carregandoAlunos = ref(false)

// Função para buscar alunos do banco
async function buscarAlunos() {
  if (!process.client) return
  
  carregandoAlunos.value = true
  const supabase = useSupabaseClient()
  
  try {
    // Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔐 Sessão atual:', session?.user?.email, session?.user?.user_metadata)
    
    if (!session) {
      console.error('❌ Usuário não autenticado')
      await useToastSafe().then(toast => toast?.error('Você precisa fazer login'))
      navigateTo('/login')
      return
    }
    
    // RLS já filtra por empresa automaticamente
    console.log('🔍 Buscando alunos...')
    
    // Criar timeout de 10 segundos
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout: A requisição demorou mais de 10 segundos')), 10000)
    )
    
    const queryPromise = supabase
      .from('alunos')
      .select('*')
      .order('created_at', { ascending: false })
    
    const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any
    
    console.log('📊 Resultado da busca:', { quantidadeAlunos: data?.length, error })
    
    if (error) {
      console.error('❌ Erro ao buscar alunos:', error)
      await useToastSafe().then(toast => toast?.error('Erro ao carregar alunos: ' + error.message))
      carregandoAlunos.value = false
      return
    }
    
    if (!data || data.length === 0) {
      console.log('ℹ️ Nenhum aluno encontrado')
      alunos.value = []
      carregandoAlunos.value = false
      return
    }
    
    // Mapear os dados do banco para o formato do componente
    alunos.value = (data || []).map((aluno: any) => ({
      id: aluno.id,
      nome: aluno.nome_completo,
      email: aluno.email || '',
      telefone: aluno.telefone || '',
      endereco: aluno.endereco && aluno.numero ? `${aluno.endereco}, ${aluno.numero}` : aluno.endereco || '',
      numero: aluno.numero || '',
      complemento: aluno.complemento || '',
      bairro: aluno.bairro || '',
      cep: aluno.cep || '',
      estado: aluno.estado || '',
      pais: aluno.pais || 'Brasil',
      ativo: aluno.ativo,
      curso_id: aluno.curso_id || '',
      cursoContratado: aluno.curso_contratado || '',
      quantidadeHoras: aluno.quantidade_horas?.toString() || '',
      quantidadeAulas: aluno.quantidade_aulas?.toString() || '',
      aulasConcluidas: aluno.aulas_concluidas?.toString() || '0',
      diasSemana: aluno.dias_semana || [],
      localAulas: aluno.local_aulas || '',
      horaEntrada: aluno.hora_entrada || '',
      horaSaida: aluno.hora_saida || '',
      multaFalta: aluno.multa_falta || '',
      debitoFaltas: aluno.debito_faltas || '0',
      acessoVideos: aluno.acesso_videos || false
    }))
    
    console.log('✅ Alunos carregados com sucesso:', alunos.value.length)
  } catch (error: any) {
    console.error('❌ Erro inesperado ao buscar alunos:', error)
    await useToastSafe().then(toast => toast?.error('Erro ao carregar: ' + (error?.message || 'Erro desconhecido')))
  } finally {
    carregandoAlunos.value = false
  }
}

// Buscar alunos e cursos ao montar o componente
onMounted(() => {
  buscarAlunos()
  buscarCursos()
})

// Computed para filtrar cursos conforme digita
const cursosFiltrados = computed(() => {
  if (!buscaCurso.value) return cursosAtivos.value
  return cursosAtivos.value.filter(curso => 
    curso.nome.toLowerCase().includes(buscaCurso.value.toLowerCase())
  )
})

// Watch para preencher campos quando o curso for selecionado
watch(cursoId, (novoId) => {
  if (novoId) {
    selecionarCurso()
  }
})

// Função para selecionar curso da lista
function selecionarCursoDaLista(curso: any) {
  cursoId.value = curso.id
  buscaCurso.value = curso.nome
  mostrarListaCursos.value = false
  selecionarCurso()
}

// Função para atualizar campos quando seleciona um curso
function selecionarCurso() {
  const cursoSelecionado = cursosAtivos.value.find(c => c.id === cursoId.value)
  
  if (cursoSelecionado) {
    // Atualizar o nome do curso
    cursoContratado.value = cursoSelecionado.nome
    
    // Preencher campos automaticamente com os valores do curso
    quantidadeHoras.value = cursoSelecionado.carga_horaria?.toString() || ''
    quantidadeAulas.value = cursoSelecionado.quantidade_aulas?.toString() || ''
    multaFalta.value = cursoSelecionado.valor_multa_falta?.toString() || ''
    
    // Formatar valor da multa
    if (cursoSelecionado.valor_multa_falta) {
      multaFormatada.value = formatarMoeda(cursoSelecionado.valor_multa_falta)
    }
    
    console.log('Curso selecionado:', cursoSelecionado)
    console.log('Campos preenchidos:', {
      horas: quantidadeHoras.value,
      aulas: quantidadeAulas.value,
      multa: multaFalta.value
    })
  }
}

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

// Ref para valor formatado da multa
const multaFormatada = ref('')

// Funções para formatar moeda (Real Brasileiro)
function formatarMoeda(valor: number | string): string {
  const numero = typeof valor === 'string' ? parseFloat(valor) : valor
  if (isNaN(numero)) return ''
  
  return numero.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function converterParaNumero(valorFormatado: string): number {
  const numeroString = valorFormatado.replace(/\./g, '').replace(',', '.')
  return parseFloat(numeroString) || 0
}

function handleMultaInput(event: Event) {
  const input = event.target as HTMLInputElement
  let valor = input.value.replace(/\D/g, '') // Remove tudo exceto dígitos
  
  // Se vazio, limpa
  if (!valor) {
    multaFalta.value = ''
    multaFormatada.value = ''
    return
  }
  
  // Converte para centavos e depois para reais
  const valorEmCentavos = parseInt(valor)
  const valorEmReais = valorEmCentavos / 100
  
  multaFalta.value = valorEmReais.toString()
  multaFormatada.value = formatarMoeda(valorEmReais)
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

// NOVO: Adicionar curso à lista
function adicionarCursoALista() {
  if (!cursoId.value) {
    useToastSafe().then(toast => toast?.error('Selecione um curso'))
    return
  }

  if (!diasSemana.value || diasSemana.value.length === 0) {
    useToastSafe().then(toast => toast?.error('Selecione ao menos um dia da semana'))
    return
  }

  if (!localAulas.value) {
    useToastSafe().then(toast => toast?.error('Informe o local das aulas'))
    return
  }

  if (!horaEntrada.value || !horaSaida.value) {
    useToastSafe().then(toast => toast?.error('Informe os horários de entrada e saída'))
    return
  }
  
  // Verificar se o curso já foi adicionado
  if (cursosAdicionados.value.some(c => c.curso_id === cursoId.value)) {
    useToastSafe().then(toast => toast?.warning('Este curso já foi adicionado'))
    return
  }
  
  const cursoSelecionado = cursosAtivos.value.find(c => c.id === cursoId.value)
  if (!cursoSelecionado) return
  
  console.log('🔵 Adicionando curso com dias:', diasSemana.value)
  
  // Adicionar à lista
  cursosAdicionados.value.push({
    curso_id: cursoId.value,
    curso: cursoSelecionado,
    dias_semana: [...diasSemana.value], // Cria cópia do array
    local_aulas: localAulas.value,
    hora_entrada: horaEntrada.value,
    hora_saida: horaSaida.value,
    aulas_concluidas: 0,
    status: 'ativo'
  })

  console.log('✅ Curso adicionado:', cursosAdicionados.value[cursosAdicionados.value.length - 1])
  
  // Limpar campos do curso
  limparCamposCurso()
  
  useToastSafe().then(toast => toast?.success(`✓ ${cursoSelecionado.nome} adicionado!`))
}

// NOVO: Limpar apenas campos do curso
function limparCamposCurso() {
  cursoId.value = ''
  cursoContratado.value = ''
  buscaCurso.value = ''
  quantidadeHoras.value = ''
  quantidadeAulas.value = ''
  aulasConcluidas.value = ''
  diasSemana.value = []
  localAulas.value = ''
  horaEntrada.value = ''
  horaSaida.value = ''
  multaFalta.value = ''
  multaFormatada.value = ''
}

// Fechar lista de cursos com delay
function fecharListaCursos() {
  setTimeout(() => {
    mostrarListaCursos.value = false
  }, 200)
}

// NOVO: Remover curso da lista
function removerCursoDaLista(index: number) {
  cursosAdicionados.value.splice(index, 1)
  useToastSafe().then(toast => toast?.info('Curso removido da lista'))
}

// Função para formatar dias da semana
function formatarDias(dias: any): string {
  if (!dias || !Array.isArray(dias) || dias.length === 0) return 'Não definido'
  
  const nomesDias: { [key: number]: string } = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb'
  }
  
  return dias
    .filter((d: any) => d !== null && d !== undefined && d !== '')
    .sort((a: number, b: number) => a - b)
    .map((d: number) => nomesDias[d] || '')
    .filter((nome: string) => nome !== '')
    .join(', ') || 'Não definido'
}

// Função para limpar formulário
function limparFormulario() {
  // Página 1 - Dados Pessoais
  nomeCompleto.value = ''
  email.value = ''
  telefone.value = ''
  endereco.value = ''
  numero.value = ''
  complemento.value = ''
  bairro.value = ''
  cep.value = ''
  estado.value = ''
  pais.value = 'Brasil'
  
  // Página 2 - Dados do Curso
  limparCamposCurso()
  cursosAdicionados.value = []
  acessoVideos.value = false
  
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
async function editarAluno(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  modoEdicao.value = true
  alunoEditando.value = aluno
  
  // Página 1 - Dados Pessoais
  nomeCompleto.value = aluno.nome
  email.value = aluno.email || ''
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
  acessoVideos.value = aluno.acessoVideos || false
  
  // NOVO: Buscar cursos do aluno
  const { buscarCursosDoAluno } = useAlunosCursos()
  const cursosDoAlunoData = await buscarCursosDoAluno(aluno.id)
  
  console.log('📚 Cursos carregados do banco:', cursosDoAlunoData)
  
  cursosAdicionados.value = cursosDoAlunoData.map((ac: any) => ({
    id: ac.id, // ID do registro alunos_cursos
    curso_id: ac.curso_id,
    curso: ac.curso,
    dias_semana: ac.dias_semana || [],
    local_aulas: ac.local_aulas || '',
    hora_entrada: ac.hora_entrada || '',
    hora_saida: ac.hora_saida || '',
    aulas_concluidas: ac.aulas_concluidas || 0,
    status: ac.status || 'ativo'
  }))
  
  console.log('✅ cursosAdicionados.value:', cursosAdicionados.value)
  
  mostrarModal.value = true
  paginaAtualModal.value = 1
  fecharModalVisualizacao()
}

// Salvar aluno
async function salvarAluno() {
  if (!process.client) return
  
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  const toast = await useToastSafe()
  const { adicionarCurso, atualizarCurso, removerCurso, buscarCursosDoAluno } = useAlunosCursos()
  
  // Validar se há ao menos um curso (apenas para novos alunos)
  if (!modoEdicao.value && cursosAdicionados.value.length === 0) {
    toast?.error('Adicione ao menos um curso antes de salvar')
    return
  }
  
  const alunoData = {
    nome_completo: nomeCompleto.value,
    email: email.value,
    telefone: telefone.value,
    endereco: endereco.value,
    numero: numero.value,
    complemento: complemento.value,
    bairro: bairro.value,
    cep: cep.value,
    estado: estado.value,
    pais: pais.value,
    acesso_videos: acessoVideos.value
  }
  
  try {
    let alunoId: string
    
    if (modoEdicao.value && alunoEditando.value) {
      // Atualizar aluno existente
      const { error } = await supabase
        .from('alunos')
        .update(alunoData)
        .eq('id', alunoEditando.value.id)
      
      if (error) {
        console.error('Erro ao atualizar aluno:', error)
        toast?.error('Erro ao atualizar aluno')
        return
      }
      
      alunoId = alunoEditando.value.id
      
      console.log('🔄 Iniciando gerenciamento de cursos para aluno:', alunoId)
      console.log('📋 Cursos na lista para salvar:', cursosAdicionados.value)
      
      // Gerenciar cursos: buscar cursos atuais para comparar
      const cursosAtuais = await buscarCursosDoAluno(alunoId)
      console.log('💾 Cursos atuais no banco:', cursosAtuais)
      
      // Mapear cursos atuais por ID do registro (alunos_cursos.id)
      const mapaCursosAtuais = new Map(cursosAtuais.map((c: any) => [c.id, c]))
      
      // Mapear cursos adicionados que já existem (têm id de alunos_cursos)
      const idsNovos = new Set(cursosAdicionados.value.filter((c: any) => c.id).map((c: any) => c.id))
      
      // Remover cursos que não estão mais na lista
      for (const cursoAtual of cursosAtuais) {
        if (!idsNovos.has(cursoAtual.id)) {
          console.log('🗑️ Removendo curso:', cursoAtual.curso?.nome)
          await removerCurso(cursoAtual.id)
        }
      }
      
      // Atualizar ou adicionar cursos
      for (const curso of cursosAdicionados.value) {
        const dadosCurso = {
          aluno_id: alunoId,
          curso_id: curso.curso_id,
          dias_semana: curso.dias_semana,
          local_aulas: curso.local_aulas,
          hora_entrada: curso.hora_entrada,
          hora_saida: curso.hora_saida,
          aulas_concluidas: curso.aulas_concluidas || 0,
          status: curso.status || 'ativo'
        }
        
        if (curso.id) {
          // Atualizar curso existente (tem id de alunos_cursos)
          console.log('♻️ Atualizando curso:', curso.curso?.nome)
          await atualizarCurso(curso.id, dadosCurso)
        } else {
          // Adicionar novo curso (não tem id ainda)
          console.log('➕ Adicionando novo curso:', curso.curso?.nome)
          await adicionarCurso(dadosCurso)
        }
      }
      
      toast?.success('Aluno atualizado com sucesso!')
    } else {
      // Inserir novo aluno
      const { data: alunoInserido, error: erroAluno } = await supabase
        .from('alunos')
        .insert([alunoData])
        .select()
        .single()
      
      if (erroAluno) {
        console.error('Erro ao criar aluno:', erroAluno)
        toast?.error('Erro ao criar aluno')
        return
      }
      
      alunoId = alunoInserido.id
      
      // Adicionar cursos do aluno
      for (const curso of cursosAdicionados.value) {
        await adicionarCurso({
          aluno_id: alunoId,
          curso_id: curso.curso_id,
          dias_semana: curso.dias_semana,
          local_aulas: curso.local_aulas,
          hora_entrada: curso.hora_entrada,
          hora_saida: curso.hora_saida,
          aulas_concluidas: curso.aulas_concluidas || 0,
          status: curso.status || 'ativo'
        })
      }
      
      // Criar conta de autenticação para o aluno via API do servidor
      try {
        const response = await $fetch('/api/auth/create-user', {
          method: 'POST',
          body: {
            email: email.value,
            nome: nomeCompleto.value,
            aluno_id: alunoInserido.id,
            telefone: telefone.value
          }
        })
        
        if (response.success && response.user_id) {
          await supabase
            .from('alunos')
            .update({ user_id: response.user_id })
            .eq('id', alunoInserido.id)
          
          const senhaGerada = telefone.value?.replace(/\D/g, '') || 'Aluno2024'
          toast?.success(`Aluno cadastrado! Login: ${email.value} | Senha: ${senhaGerada}`, { duration: 10000 })
        } else {
          toast?.warning('Aluno cadastrado, mas houve erro ao criar conta de acesso.')
        }
      } catch (authError: any) {
        console.error('Erro ao criar autenticação:', authError)
        toast?.warning('Aluno cadastrado, mas houve erro ao criar conta de acesso: ' + authError.message)
      }
    }
    
    // Recarregar lista de alunos
    await buscarAlunos()
    fecharModal()
  } catch (error) {
    console.error('Erro inesperado ao salvar aluno:', error)
    toast?.error('Erro inesperado ao salvar aluno')
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
    console.log('🔵 Mudando para página:', paginaAtualModal.value)
    // Scroll para o topo do modal
    nextTick(() => {
      const modalContent = document.getElementById('modal-aluno-content')
      console.log('🔍 Modal content:', modalContent)
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }
}

function paginaAnteriorModal() {
  if (paginaAtualModal.value > 1) {
    paginaAtualModal.value--
    // Scroll para o topo do modal
    nextTick(() => {
      const modalContent = document.getElementById('modal-aluno-content')
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }
}

// Navegação de páginas do modal de visualização
function proximaPaginaVisualizacao() {
  if (paginaAtualVisualizacao.value < 2) {
    paginaAtualVisualizacao.value++
    // Scroll para o topo do modal
    nextTick(() => {
      const modalContent = document.getElementById('modal-visualizacao-content')
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }
}

function paginaAnteriorVisualizacao() {
  if (paginaAtualVisualizacao.value > 1) {
    paginaAtualVisualizacao.value--
    // Scroll para o topo do modal
    nextTick(() => {
      const modalContent = document.getElementById('modal-visualizacao-content')
      if (modalContent) {
        modalContent.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  }
}

// Confirmar exclusão de aluno
function confirmarExclusao(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  alunoParaExcluir.value = aluno
}

// Cancelar exclusão
function cancelarExclusao() {
  alunoParaExcluir.value = null
}

// Excluir aluno
async function excluirAluno() {
  if (!alunoParaExcluir.value) return
  
  if (!process.client) return
  
  const supabase = useSupabaseClient()
  const toast = await useToastSafe()
  
  try {
    const { error } = await supabase
      .from('alunos')
      .delete()
      .eq('id', alunoParaExcluir.value.id)
    
    if (error) {
      console.error('Erro ao excluir aluno:', error)
      toast?.error('Erro ao excluir aluno')
      return
    }
    
    toast?.success('Aluno excluído com sucesso!')
    
    // Recarregar lista de alunos
    await buscarAlunos()
    alunoParaExcluir.value = null
    fecharModalVisualizacao()
  } catch (error) {
    console.error('Erro inesperado ao excluir aluno:', error)
    toast?.error('Erro inesperado ao excluir aluno')
  }
}

// Bloquear/Desbloquear aluno
async function toggleBloqueio(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  
  if (!process.client) return
  
  const supabase = useSupabaseClient()
  const toast = await useToastSafe()
  const novoStatus = !aluno.ativo
  
  try {
    const { error } = await supabase
      .from('alunos')
      .update({ ativo: novoStatus })
      .eq('id', aluno.id)
    
    if (error) {
      console.error('Erro ao alterar status do aluno:', error)
      toast?.error('Erro ao alterar status do aluno')
      return
    }
    
    // Atualizar localmente
    aluno.ativo = novoStatus
    
    // Mostrar toast de sucesso
    if (novoStatus) {
      toast?.success('Aluno ativado com sucesso!')
    } else {
      toast?.success('Aluno bloqueado com sucesso!')
    }
  } catch (error) {
    console.error('Erro inesperado ao alterar status:', error)
    toast?.error('Erro inesperado ao alterar status')
  }
}

// Exportar para Excel
async function exportarParaExcel() {
  const toast = await useToastSafe()
  
  try {
    // Preparar dados para exportação
    const dadosExportacao = alunosFiltrados.value.map((aluno: any) => {
      // Formatar dias da semana
      const diasFormatados = aluno.diasSemana?.map((dia: string) => {
        const diaMap: Record<string, string> = {
          'segunda': 'Segunda-feira',
          'terca': 'Terça-feira',
          'quarta': 'Quarta-feira',
          'quinta': 'Quinta-feira',
          'sexta': 'Sexta-feira',
          'sabado': 'Sábado',
          'domingo': 'Domingo'
        }
        return diaMap[dia] || dia
      }).join(', ') || 'Não informado'
      
      return {
        'Nome Completo': aluno.nome,
        'Telefone': aluno.telefone || 'Não informado',
        'Endereço': aluno.endereco || 'Não informado',
        'Número': aluno.numero || 'Não informado',
        'Complemento': aluno.complemento || 'Não informado',
        'Bairro': aluno.bairro || 'Não informado',
        'CEP': aluno.cep || 'Não informado',
        'Estado': aluno.estado || 'Não informado',
        'País': aluno.pais || 'Não informado',
        'Status': aluno.ativo ? 'Ativo' : 'Bloqueado',
        'Curso Contratado': aluno.cursoContratado || 'Não informado',
        'Quantidade de Horas': aluno.quantidadeHoras || 'Não informado',
        'Quantidade de Aulas': aluno.quantidadeAulas || 'Não informado',
        'Aulas Concluídas': aluno.aulasConcluidas || '0',
        'Dias da Semana': diasFormatados,
        'Local das Aulas': aluno.localAulas || 'Não informado',
        'Hora de Entrada': aluno.horaEntrada || 'Não informado',
        'Hora de Saída': aluno.horaSaida || 'Não informado',
        'Multa por Falta': aluno.multaFalta ? `R$ ${parseFloat(aluno.multaFalta).toFixed(2).replace('.', ',')}` : 'Não informado'
      }
    })
    
    if (dadosExportacao.length === 0) {
      toast?.error('Não há alunos para exportar')
      return
    }
    
    // Criar CSV
    const headers = Object.keys(dadosExportacao[0])
    const csvContent = [
      headers.join(';'), // Cabeçalhos
      ...dadosExportacao.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          // Escapar aspas e envolver em aspas se contiver vírgula ou ponto e vírgula
          const stringValue = String(value).replace(/"/g, '""')
          return stringValue.includes(';') || stringValue.includes(',') ? `"${stringValue}"` : stringValue
        }).join(';')
      )
    ].join('\n')
    
    // Adicionar BOM para UTF-8
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // Criar link de download
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `alunos_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast?.success(`${dadosExportacao.length} alunos exportados com sucesso!`)
  } catch (error) {
    console.error('Erro ao exportar:', error)
    toast?.error('Erro ao exportar alunos')
  }
}

// Abrir modal de visualização
async function visualizarAluno(aluno: any) {
  alunoVisualizacao.value = aluno
  
  // Buscar cursos do aluno
  const { buscarCursosDoAluno } = useAlunosCursos()
  const cursos = await buscarCursosDoAluno(aluno.id)
  cursosVisualizacao.value = cursos
  
  console.log('📚 Cursos carregados para visualização:', cursos)
  
  mostrarModalVisualizacao.value = true
}

// Alternar expansão de um curso
function toggleCursoExpansao(cursoId: string) {
  if (cursosExpandidos.value.has(cursoId)) {
    cursosExpandidos.value.delete(cursoId)
  } else {
    cursosExpandidos.value.add(cursoId)
  }
}

// Fechar modal de visualização
function fecharModalVisualizacao() {
  mostrarModalVisualizacao.value = false
  alunoVisualizacao.value = null
  paginaAtualVisualizacao.value = 1
  cursosVisualizacao.value = []
  cursosExpandidos.value.clear()
}

// Abrir modal de edição de multa padrão (agora também registra falta)
async function abrirModalMulta(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  alunoEditandoMulta.value = aluno
  // Inicia com o valor padrão da multa do aluno
  novaMulta.value = aluno.multaFalta || '0'
  novaMultaFormatada.value = aluno.multaFalta ? formatarMoeda(parseFloat(aluno.multaFalta)) : '0,00'
  // Preenche com data de hoje por padrão
  dataFalta.value = new Date().toISOString().split('T')[0]
  motivoFalta.value = ''
  observacoesFalta.value = ''
  cursoIdFalta.value = ''
  
  // Buscar cursos do aluno
  await buscarCursosDoAluno(aluno.id)
  
  mostrarModalMulta.value = true
}

// Fechar modal de edição de multa
function fecharModalMulta() {
  mostrarModalMulta.value = false
  alunoEditandoMulta.value = null
  novaMulta.value = ''
  novaMultaFormatada.value = ''
  dataFalta.value = ''
  motivoFalta.value = ''
  observacoesFalta.value = ''
  cursoIdFalta.value = ''
  cursosDoAluno.value = []
}

// Manipular input da nova multa
function handleNovaMultaInput(event: Event) {
  const input = event.target as HTMLInputElement
  const valor = input.value.replace(/\D/g, '')
  
  if (!valor) {
    novaMultaFormatada.value = '0,00'
    novaMulta.value = '0'
    return
  }
  
  const valorEmReais = parseInt(valor) / 100
  novaMultaFormatada.value = formatarMoeda(valorEmReais)
  novaMulta.value = valorEmReais.toString()
}

// Handler para formatar o valor do pagamento
function handleValorPagamentoInput(event: Event) {
  const input = event.target as HTMLInputElement
  const valor = input.value.replace(/\D/g, '')
  
  if (!valor) {
    valorPagamentoFormatado.value = '0,00'
    valorPagamento.value = '0'
    return
  }
  
  const valorEmReais = parseInt(valor) / 100
  valorPagamentoFormatado.value = formatarMoeda(valorEmReais)
  valorPagamento.value = valorEmReais.toString()
}

// Salvar multa e registrar falta
async function salvarMulta() {
  if (!process.client || !alunoEditandoMulta.value || !dataFalta.value || !cursoIdFalta.value) return
  
  const supabase = useSupabaseClient()
  const toast = await useToastSafe()
  
  try {
    const valorMulta = parseFloat(novaMulta.value) || 0
    
    // Registrar a falta com o valor da multa
    const { error: erroFalta } = await supabase
      .from('faltas')
      .insert({
        aluno_id: alunoEditandoMulta.value.id,
        curso_id: cursoIdFalta.value,
        data_falta: dataFalta.value,
        valor_multa: valorMulta,
        motivo: motivoFalta.value || null,
        observacoes: observacoesFalta.value || null
      })
    
    if (erroFalta) {
      console.error('Erro ao registrar falta:', erroFalta)
      toast?.error('Erro ao registrar falta')
      return
    }
    
    // Atualizar o débito do aluno (somar a nova multa)
    const debitoAtual = parseFloat(alunoEditandoMulta.value.debitoFaltas) || 0
    const novoDebito = debitoAtual + valorMulta
    
    const { error: erroDebito } = await supabase
      .from('alunos')
      .update({ debito_faltas: novoDebito })
      .eq('id', alunoEditandoMulta.value.id)
    
    if (erroDebito) {
      console.error('Erro ao atualizar débito:', erroDebito)
      // Não bloqueia o fluxo, pois a falta já foi registrada
    }
    
    toast?.success('Falta registrada com sucesso!')
    fecharModalMulta()
    
    // Recarregar lista de alunos
    await buscarAlunos()
  } catch (error) {
    console.error('Erro inesperado ao registrar falta:', error)
    toast?.error('Erro inesperado ao registrar falta')
  }
}

// Atualizar valor padrão da multa (sem registrar falta)
async function atualizarMultaPadrao() {
  if (!process.client || !alunoEditandoMulta.value) return
  
  const supabase = useSupabaseClient()
  const toast = await useToastSafe()
  
  try {
    const { error } = await supabase
      .from('alunos')
      .update({ multa_falta: novaMulta.value })
      .eq('id', alunoEditandoMulta.value.id)
    
    if (error) {
      console.error('Erro ao atualizar multa padrão:', error)
      toast?.error('Erro ao atualizar multa padrão')
      return
    }
    
    // Atualizar localmente
    alunoEditandoMulta.value.multaFalta = novaMulta.value
    
    toast?.success('Valor padrão da multa atualizado!')
    fecharModalMulta()
    
    // Recarregar lista de alunos
    await buscarAlunos()
  } catch (error) {
    console.error('Erro inesperado ao atualizar multa:', error)
    toast?.error('Erro inesperado ao atualizar multa')
  }
}

// Buscar todos os cursos de um aluno
async function buscarCursosDoAluno(alunoId: string) {
  if (!process.client || !alunoId) return
  
  const supabase = useSupabaseClient()
  
  try {
    // Buscar histórico de cursos do aluno
    const { data, error } = await supabase
      .from('alunos')
      .select(`
        id,
        curso_id,
        cursos (
          id,
          nome
        )
      `)
      .eq('id', alunoId)
      .single()
    
    if (error) {
      console.error('Erro ao buscar cursos do aluno:', error)
      cursosDoAluno.value = []
      return
    }
    
    // Se o aluno tem curso vinculado, adicionar à lista
    if (data?.cursos) {
      cursosDoAluno.value = [{
        id: data.cursos.id,
        nome: data.cursos.nome
      }]
      // Pre-selecionar o curso atual
      cursoIdFalta.value = data.curso_id
    } else {
      cursosDoAluno.value = []
    }
  } catch (error) {
    console.error('Erro inesperado ao buscar cursos do aluno:', error)
    cursosDoAluno.value = []
  }
}

// Abrir modal de registro de falta
function abrirModalFalta(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  alunoRegistrandoFalta.value = aluno
  dataFalta.value = new Date().toISOString().split('T')[0] // Data de hoje
  motivoFalta.value = ''
  observacoesFalta.value = ''
  mostrarModalFalta.value = true
}

// Fechar modal de falta
function fecharModalFalta() {
  mostrarModalFalta.value = false
  alunoRegistrandoFalta.value = null
  dataFalta.value = ''
  motivoFalta.value = ''
  observacoesFalta.value = ''
}

// Registrar falta
async function registrarFalta() {
  if (!process.client || !alunoRegistrandoFalta.value || !dataFalta.value) return
  
  const supabase = useSupabaseClient()
  const toast = await useToastSafe()
  
  try {
    const valorMulta = alunoRegistrandoFalta.value.multaFalta ? parseFloat(alunoRegistrandoFalta.value.multaFalta) : 0
    
    const { error } = await supabase
      .from('faltas')
      .insert({
        aluno_id: alunoRegistrandoFalta.value.id,
        data_falta: dataFalta.value,
        valor_multa: valorMulta,
        motivo: motivoFalta.value || null,
        observacoes: observacoesFalta.value || null
      })
    
    if (error) {
      console.error('Erro ao registrar falta:', error)
      toast?.error('Erro ao registrar falta')
      return
    }
    
    toast?.success('Falta registrada com sucesso!')
    fecharModalFalta()
  } catch (error) {
    console.error('Erro inesperado ao registrar falta:', error)
    toast?.error('Erro inesperado ao registrar falta')
  }
}

// Abrir modal de pagamento de multas
function abrirModalPagamento(aluno: any, event?: Event) {
  if (event) event.stopPropagation()
  alunoPagandoMulta.value = aluno
  observacoesPagamento.value = ''
  
  // Inicializar valor do pagamento com o débito total
  const debitoTotal = parseFloat(aluno.debitoFaltas) || 0
  valorPagamento.value = debitoTotal.toString()
  valorPagamentoFormatado.value = formatarMoeda(debitoTotal)
  
  mostrarModalPagamento.value = true
}

// Fechar modal de pagamento
function fecharModalPagamento() {
  mostrarModalPagamento.value = false
  alunoPagandoMulta.value = null
  observacoesPagamento.value = ''
  valorPagamento.value = ''
  valorPagamentoFormatado.value = ''
}

// Registrar pagamento e zerar débito
async function registrarPagamento() {
  if (!process.client || !alunoPagandoMulta.value) return
  
  const supabase = useSupabaseClient()
  const toast = await useToastSafe()
  
  try {
    const valorPagoNum = parseFloat(valorPagamento.value) || 0
    const debitoAtual = parseFloat(alunoPagandoMulta.value.debitoFaltas) || 0
    
    // Validações
    if (valorPagoNum <= 0) {
      toast?.error('Informe um valor de pagamento válido')
      return
    }
    
    if (valorPagoNum > debitoAtual) {
      toast?.error('O valor do pagamento não pode ser maior que o débito')
      return
    }
    
    if (debitoAtual <= 0) {
      toast?.error('Não há débito para pagar')
      return
    }
    
    // Calcular novo débito
    const novoDebito = debitoAtual - valorPagoNum
    
    // Buscar empresa_id do aluno
    const { data: alunoData, error: erroAluno } = await supabase
      .from('alunos')
      .select('empresa_id')
      .eq('id', alunoPagandoMulta.value.id)
      .single()
    
    if (erroAluno || !alunoData) {
      console.error('Erro ao buscar dados do aluno:', erroAluno)
      toast?.error('Erro ao buscar dados do aluno')
      return
    }
    
    // Registrar o pagamento
    const { error: erroPagamento } = await supabase
      .from('pagamentos_multas')
      .insert({
        aluno_id: alunoPagandoMulta.value.id,
        empresa_id: alunoData.empresa_id,
        valor_pago: valorPagoNum,
        observacoes: observacoesPagamento.value || null
      })
    
    if (erroPagamento) {
      console.error('Erro ao registrar pagamento:', erroPagamento)
      toast?.error('Erro ao registrar pagamento')
      return
    }
    
    // Atualizar o débito do aluno
    const { error: erroUpdate } = await supabase
      .from('alunos')
      .update({ debito_faltas: novoDebito })
      .eq('id', alunoPagandoMulta.value.id)
    
    if (erroUpdate) {
      console.error('Erro ao atualizar débito:', erroUpdate)
      toast?.error('Erro ao atualizar débito')
      return
    }
    
    // Atualizar localmente
    alunoPagandoMulta.value.debitoFaltas = novoDebito.toString()
    
    // Mensagem de sucesso diferente para pagamento parcial ou total
    if (novoDebito === 0) {
      toast?.success('Débito quitado com sucesso!')
    } else {
      toast?.success(`Pagamento registrado! Saldo devedor: R$ ${novoDebito.toFixed(2).replace('.', ',')}`)
    }
    
    fecharModalPagamento()
    
    // Recarregar lista de alunos
    await buscarAlunos()
  } catch (error) {
    console.error('Erro inesperado ao registrar pagamento:', error)
    toast?.error('Erro inesperado ao registrar pagamento')
  }
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
      
      <div class="flex items-center space-x-3">
        <button
          @click="exportarParaExcel"
          class="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
          title="Exportar alunos para Excel"
        >
          <Icon icon="file-excel" class-name="w-4 h-4" fallback="📊" />
          <span>Exportar Excel</span>
        </button>
        
        <button
          @click="abrirModalNovo"
          class="flex items-center space-x-2 px-4 py-2 btn-gradient text-gray-800 hover:opacity-90 rounded-lg transition-all shadow-lg hover:shadow-xl"
        >
          <Icon icon="plus" class-name="w-4 h-4" fallback="" />
          <span>Novo Aluno</span>
        </button>
      </div>
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
                  <span
                    v-if="aluno.acessoVideos"
                    class="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs rounded-full font-medium flex items-center space-x-1"
                    title="Tem acesso à área de vídeos"
                  >
                    <Icon icon="video" class-name="w-3 h-3" fallback="🎥" />
                    <span>Vídeos</span>
                  </span>
                </div>
                
                <div class="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div class="flex items-center space-x-2">
                    <Icon icon="phone" class-name="w-4 h-4" fallback="" />
                    <span>{{ aluno.telefone || 'Sem telefone' }}</span>
                  </div>
                  
                  <div 
                    v-if="parseFloat(aluno.debitoFaltas) > 0"
                    class="flex items-center space-x-2 text-red-600 dark:text-red-400 font-semibold"
                  >
                    <Icon icon="dollar-sign" class-name="w-4 h-4" fallback="💰" />
                    <span>Débito: R$ {{ parseFloat(aluno.debitoFaltas).toFixed(2).replace('.', ',') }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botões rápidos -->
            <div class="flex items-center space-x-2 ml-4" @click.stop>
              <button
                v-if="parseFloat(aluno.debitoFaltas) > 0"
                @click="abrirModalPagamento(aluno, $event)"
                class="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                title="Marcar como Pago"
              >
                <span class="text-lg">✅</span>
              </button>
              
              <button
                @click="abrirModalMulta(aluno, $event)"
                class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Registrar Falta"
              >
                <Icon icon="calendar-times" class-name="w-5 h-5" fallback="📅" />
              </button>
              
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
                <span class="text-lg">{{ aluno.ativo ? '🚫' : '✅' }}</span>
              </button>
              
              <button
                @click="confirmarExclusao(aluno, $event)"
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
    <div id="modal-aluno-content" class="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
      <!-- Header do Modal -->
      <div class="flex items-center justify-between p-6 border-b border-border bg-card sticky top-0 z-10">
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

          <!-- Nome Completo -->
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

          <!-- Email e Telefone -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="email" class="block text-sm font-medium text-foreground mb-2">
                Email <span class="text-red-500">*</span>
              </label>
              <AppInput
                id="email"
                v-model="email"
                type="email"
                placeholder="email@exemplo.com"
                required
              />
              <p class="text-xs text-muted-foreground mt-1">
                🔑 Conta criada automaticamente. Senha padrão = telefone do aluno (só números)
              </p>
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
        <div v-if="paginaAtualModal === 2" class="space-y-6 pb-8">
          
          <!-- Lista de Cursos Adicionados (Topo) -->
          <div v-if="cursosAdicionados.length > 0" class="space-y-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border-2 border-green-200 dark:border-green-800">
            <div class="flex items-center justify-between pb-2 border-b border-green-200 dark:border-green-800">
              <div class="flex items-center space-x-2">
                <span class="text-xl">✅</span>
                <h4 class="text-base font-semibold text-green-900 dark:text-green-100">
                  {{ cursosAdicionados.length }} Curso{{ cursosAdicionados.length > 1 ? 's' : '' }} Adicionado{{ cursosAdicionados.length > 1 ? 's' : '' }}
                </h4>
              </div>
              <span class="text-xs text-green-700 dark:text-green-300">
                Pronto para salvar
              </span>
            </div>

            <div class="space-y-2">
              <div
                v-for="(curso, index) in cursosAdicionados"
                :key="index"
                class="p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1 space-y-2">
                    <div class="flex items-center space-x-2">
                      <Icon icon="book" class-name="w-4 h-4 text-primary" fallback="📚" />
                      <h5 class="font-semibold text-foreground">{{ curso.curso.nome }}</h5>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div class="flex items-center space-x-1" v-if="curso.dias_semana && curso.dias_semana.length > 0">
                        <span>🗓️</span>
                        <span>{{ formatarDias(curso.dias_semana) }}</span>
                      </div>
                      <div class="flex items-center space-x-1">
                        <span>⏰</span>
                        <span>{{ curso.hora_entrada }} - {{ curso.hora_saida }}</span>
                      </div>
                      <div class="flex items-center space-x-1 col-span-2">
                        <span class="w-3 h-3">📍</span>
                        <span>{{ curso.local_aulas }}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    @click="removerCursoDaLista(index)"
                    class="ml-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remover curso"
                  >
                    <Icon icon="trash" class-name="w-4 h-4" fallback="🗑️" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Seção: Adicionar Novo Curso -->
          <div class="space-y-4 p-4 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border">
            <div class="flex items-center space-x-2 pb-2 border-b border-border">
              <Icon icon="plus" class-name="w-5 h-5 text-primary" fallback="+" />
              <h4 class="text-base font-semibold text-foreground">
                {{ cursosAdicionados.length > 0 ? 'Adicionar Outro Curso' : 'Adicionar Curso' }}
              </h4>
            </div>

            <!-- Curso Contratado -->
            <div class="relative">
              <label for="buscaCurso" class="block text-sm font-medium text-foreground mb-2">
                Curso Contratado <span class="text-red-500">*</span>
              </label>
              <input
                id="buscaCurso"
                v-model="buscaCurso"
                @focus="mostrarListaCursos = true"
                @blur="fecharListaCursos"
                type="text"
                placeholder="Digite para buscar um curso..."
                autocomplete="off"
                class="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              />
              
              <!-- Lista de cursos filtrados -->
              <div
                v-if="mostrarListaCursos && cursosFiltrados.length > 0"
                class="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                <button
                  v-for="curso in cursosFiltrados"
                  :key="curso.id"
                  type="button"
                  @click="selecionarCursoDaLista(curso)"
                  class="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-center justify-between"
                >
                  <span class="text-foreground">{{ curso.nome }}</span>
                  <span class="text-xs text-muted-foreground">{{ curso.carga_horaria }}h</span>
                </button>
              </div>
              
              <!-- Mensagem quando não encontra cursos -->
              <div
                v-if="mostrarListaCursos && buscaCurso && cursosFiltrados.length === 0"
                class="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg p-4 text-center"
              >
                <p class="text-sm text-muted-foreground mb-2">Nenhum curso encontrado</p>
                <button
                  type="button"
                  @click="$router.push('/cursos')"
                  class="text-sm text-primary hover:underline"
                >
                  + Cadastrar novo curso
                </button>
              </div>
              
              <p v-if="cursoId" class="text-xs text-muted-foreground mt-2">
                💡 Os campos abaixo foram preenchidos automaticamente. Você pode ajustá-los se necessário.
              </p>
              <button
                v-if="cursosAtivos.length === 0"
                type="button"
                @click="$router.push('/cursos')"
                class="mt-2 text-sm text-primary hover:underline"
              >
                + Cadastrar novo curso
              </button>
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
                  placeholder="Ex: 0"
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
                />
              </div>
            </div>

            <!-- Multa por Falta -->
            <div>
              <label for="multaFalta" class="block text-sm font-medium text-foreground mb-2">
                Multa por Faltar a Aula <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground font-medium">
                  R$
                </span>
                <input
                  id="multaFalta"
                  :value="multaFormatada"
                  @input="handleMultaInput"
                  type="text"
                  placeholder="0,00"
                  class="w-full pl-12 pr-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                />
              </div>
            </div>
          </div>

          <!-- Botão Adicionar Curso -->
          <div class="flex justify-center pt-2">
            <button
              type="button"
              @click="adicionarCursoALista"
              class="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <Icon icon="plus" class-name="w-5 h-5" fallback="+" />
              <span class="text-base">{{ cursosAdicionados.length > 0 ? 'Adicionar Mais Um Curso' : 'Adicionar à Lista' }}</span>
            </button>
          </div>
          </div>

          <!-- Mensagem quando não há cursos -->
          <div v-if="cursosAdicionados.length === 0" class="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
            <p class="text-sm text-blue-700 dark:text-blue-300 text-center">
              ℹ️ Adicione ao menos um curso antes de salvar
            </p>
          </div>

          <!-- Seção: Recursos Adicionais -->
          <div class="space-y-4">
            <div class="flex items-center space-x-2 pb-2 border-b border-border">
              <Icon icon="video" class-name="w-5 h-5 text-primary" fallback="" />
              <h4 class="text-base font-semibold text-foreground">Recursos Adicionais</h4>
            </div>

            <!-- Acesso a Vídeos -->
            <div class="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border border-border">
              <input
                id="acessoVideos"
                v-model="acessoVideos"
                type="checkbox"
                class="mt-1 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 w-5 h-5 cursor-pointer"
              />
              <div class="flex-1">
                <label for="acessoVideos" class="block text-sm font-medium text-foreground cursor-pointer">
                  Permitir Acesso à Área de Vídeos
                </label>
                <p class="text-xs text-muted-foreground mt-1">
                  Ao ativar, o aluno verá uma aba "Vídeos" no menu com aulas gravadas
                </p>
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
    <div id="modal-visualizacao-content" class="bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" @click.stop>
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

        <!-- Página 2: Cursos do Aluno -->
        <div v-if="paginaAtualVisualizacao === 2" class="space-y-4">
          <div>
            <h4 class="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
              <span class="text-lg">📚</span>
              <span>Cursos Matriculados ({{ cursosVisualizacao.length }})</span>
            </h4>
            
            <!-- Lista de Cursos -->
            <div v-if="cursosVisualizacao.length > 0" class="space-y-3">
              <div
                v-for="curso in cursosVisualizacao"
                :key="curso.id"
                class="border border-border rounded-lg overflow-hidden transition-all"
              >
                <!-- Cabeçalho do Curso (sempre visível) -->
                <button
                  @click="toggleCursoExpansao(curso.id)"
                  class="w-full p-4 flex items-center justify-between bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div class="flex items-center space-x-3 flex-1 text-left">
                    <span class="text-2xl">📖</span>
                    <div class="flex-1">
                      <p class="font-semibold text-foreground">{{ curso.curso?.nome }}</p>
                      <div class="flex items-center space-x-4 mt-1">
                        <span class="text-xs text-muted-foreground">
                          {{ curso.aulas_concluidas || 0 }}/{{ curso.curso?.quantidade_aulas || 0 }} aulas
                        </span>
                        <span class="text-xs px-2 py-0.5 rounded-full" :class="curso.status === 'ativo' ? 'bg-green-100 dark:bg-green-900/20 text-green-600' : 'bg-gray-100 text-gray-600'">
                          {{ curso.status }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span class="text-xl transition-transform" :class="{ 'rotate-180': cursosExpandidos.has(curso.id) }">
                    ▼
                  </span>
                </button>

                <!-- Detalhes Expandidos -->
                <div
                  v-if="cursosExpandidos.has(curso.id)"
                  class="p-4 bg-background border-t border-border space-y-3"
                >
                  <!-- Progresso -->
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-muted-foreground">Progresso</span>
                    <div class="flex items-center space-x-2">
                      <div class="w-32 bg-muted rounded-full h-2">
                        <div 
                          class="h-2 rounded-full transition-all bg-primary"
                          :style="{ width: `${Math.min(100, ((curso.aulas_concluidas || 0) / (curso.curso?.quantidade_aulas || 1)) * 100)}%` }"
                        ></div>
                      </div>
                      <span class="text-xs font-medium text-muted-foreground">
                        {{ Math.round(((curso.aulas_concluidas || 0) / (curso.curso?.quantidade_aulas || 1)) * 100) }}%
                      </span>
                    </div>
                  </div>

                  <!-- Dias da Semana -->
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs font-medium text-muted-foreground uppercase">Dias da Semana</label>
                      <p class="text-sm text-foreground font-medium mt-1">
                        {{ formatarDias(curso.dias_semana) }}
                      </p>
                    </div>

                    <div>
                      <label class="text-xs font-medium text-muted-foreground uppercase">Local</label>
                      <p class="text-sm text-foreground font-medium mt-1">
                        📍 {{ curso.local_aulas || 'Não informado' }}
                      </p>
                    </div>

                    <div>
                      <label class="text-xs font-medium text-muted-foreground uppercase">Horário</label>
                      <p class="text-sm text-foreground font-medium mt-1">
                        ⏰ {{ curso.hora_entrada?.substring(0, 5) || '00:00' }} - {{ curso.hora_saida?.substring(0, 5) || '00:00' }}
                      </p>
                    </div>

                    <div>
                      <label class="text-xs font-medium text-muted-foreground uppercase">Carga Horária</label>
                      <p class="text-sm text-foreground font-medium mt-1">
                        {{ curso.curso?.carga_horaria || 0 }}h
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mensagem se não houver cursos -->
            <div v-else class="p-8 text-center bg-muted/20 rounded-lg">
              <span class="text-4xl mb-3 block">📚</span>
              <p class="text-muted-foreground">Nenhum curso matriculado</p>
            </div>
          </div>
          
          <!-- Recursos Adicionais -->
          <div>
            <h4 class="text-sm font-semibold text-foreground mb-3 flex items-center space-x-2">
              <Icon icon="video" class-name="w-4 h-4" fallback="" />
              <span>Recursos Adicionais</span>
            </h4>
            <div class="p-4 rounded-lg border border-border" :class="alunoVisualizacao.acessoVideos ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800/30' : 'bg-muted/20'">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 rounded-full flex items-center justify-center" :class="alunoVisualizacao.acessoVideos ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'">
                  <Icon icon="video" class-name="w-5 h-5" :class-name="alunoVisualizacao.acessoVideos ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'" fallback="🎥" />
                </div>
                <div class="flex-1">
                  <p class="text-sm font-medium" :class="alunoVisualizacao.acessoVideos ? 'text-purple-900 dark:text-purple-100' : 'text-foreground'">
                    Acesso à Área de Vídeos
                  </p>
                  <p class="text-xs" :class="alunoVisualizacao.acessoVideos ? 'text-purple-700 dark:text-purple-300' : 'text-muted-foreground'">
                    {{ alunoVisualizacao.acessoVideos ? 'Aluno tem permissão para acessar vídeos' : 'Aluno não tem acesso a vídeos' }}
                  </p>
                </div>
                <span 
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="alunoVisualizacao.acessoVideos 
                    ? 'bg-purple-600 dark:bg-purple-500 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
                >
                  {{ alunoVisualizacao.acessoVideos ? 'Ativo' : 'Inativo' }}
                </span>
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
            <span>{{ alunoVisualizacao.ativo ? '🚫' : '✅' }}</span>
            <span>{{ alunoVisualizacao.ativo ? 'Bloquear' : 'Desbloquear' }}</span>
          </button>
          
          <button
            @click="confirmarExclusao(alunoVisualizacao)"
            class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors font-medium flex items-center space-x-2"
          >
            <Icon icon="trash-alt" class-name="w-4 h-4" fallback="" />
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  </div>

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
      v-if="alunoParaExcluir"
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
          <!-- Header com gradiente -->
          <div class="bg-gradient-to-br from-red-500 to-red-600 p-6 text-center relative">
            <div class="flex items-center justify-center w-16 h-16 mx-auto mb-3 bg-white/20 backdrop-blur-sm rounded-full border-2 border-white/30">
              <Icon icon="exclamation-triangle" class-name="w-8 h-8 text-white" fallback="" />
            </div>
            <h3 class="text-xl font-bold text-white">
              Confirmar Exclusão
            </h3>
          </div>

          <!-- Conteúdo -->
          <div class="p-6">
            <p class="text-muted-foreground text-center mb-2">
              Tem certeza que deseja excluir o aluno
            </p>
            <p class="text-center mb-4">
              <strong class="text-foreground text-lg">{{ alunoParaExcluir.nome }}</strong>?
            </p>
            <div class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-3 mb-6">
              <p class="text-red-800 dark:text-red-200 text-sm text-center">
                ⚠️ Esta ação não pode ser desfeita
              </p>
            </div>
            
            <!-- Botões -->
            <div class="flex space-x-3">
              <button
                @click="cancelarExclusao"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200 hover:scale-105"
              >
                Cancelar
              </button>
              <button
                @click="excluirAluno"
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

  <!-- Modal de Registro de Falta com Multa -->
  <Transition name="fade">
    <div
      v-if="mostrarModalMulta"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      @click="fecharModalMulta"
    >
      <Transition name="scale">
        <div
          v-if="mostrarModalMulta"
          class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          @click.stop
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Icon icon="calendar-times" class-name="w-5 h-5 text-red-600 dark:text-red-400" fallback="📅" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">
                    Registrar Falta
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ alunoEditandoMulta?.nome }}
                  </p>
                </div>
              </div>
              <button
                @click="fecharModalMulta"
                class="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
              </button>
            </div>

            <!-- Formulário -->
            <div class="space-y-4 mb-6">
              <!-- Curso -->
              <div>
                <label for="cursoFalta" class="block text-sm font-medium text-foreground mb-2">
                  Curso <span class="text-red-500">*</span>
                </label>
                <select
                  id="cursoFalta"
                  v-model="cursoIdFalta"
                  required
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                >
                  <option value="" disabled>Selecione o curso</option>
                  <option
                    v-for="curso in cursosDoAluno"
                    :key="curso.id"
                    :value="curso.id"
                  >
                    {{ curso.nome }}
                  </option>
                </select>
                <p v-if="cursosDoAluno.length === 0" class="text-xs text-red-500 mt-1">
                  ⚠️ Aluno não possui curso vinculado
                </p>
              </div>

              <!-- Data da Falta -->
              <div>
                <label for="dataFaltaMulta" class="block text-sm font-medium text-foreground mb-2">
                  Data da Falta <span class="text-red-500">*</span>
                </label>
                <input
                  id="dataFaltaMulta"
                  v-model="dataFalta"
                  type="date"
                  required
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>

              <!-- Valor da Multa -->
              <div>
                <label for="novaMulta" class="block text-sm font-medium text-foreground mb-2">
                  Valor da Multa <span class="text-red-500">*</span>
                </label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground font-medium">
                    R$
                  </span>
                  <input
                    id="novaMulta"
                    :value="novaMultaFormatada"
                    @input="handleNovaMultaInput"
                    type="text"
                    placeholder="0,00"
                    class="w-full pl-12 pr-3 py-2.5 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-lg font-semibold"
                  />
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                  Valor padrão: R$ {{ alunoEditandoMulta?.multaFalta ? parseFloat(alunoEditandoMulta.multaFalta).toFixed(2).replace('.', ',') : '0,00' }}
                </p>
              </div>

              <!-- Motivo -->
              <div>
                <label for="motivoFaltaMulta" class="block text-sm font-medium text-foreground mb-2">
                  Motivo (opcional)
                </label>
                <input
                  id="motivoFaltaMulta"
                  v-model="motivoFalta"
                  type="text"
                  placeholder="Ex: Não compareceu, Falta injustificada"
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>

              <!-- Observações -->
              <div>
                <label for="observacoesFaltaMulta" class="block text-sm font-medium text-foreground mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  id="observacoesFaltaMulta"
                  v-model="observacoesFalta"
                  rows="2"
                  placeholder="Informações adicionais sobre a falta..."
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                ></textarea>
              </div>
            </div>
            
            <!-- Botões -->
            <div class="flex space-x-3">
              <button
                @click="fecharModalMulta"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                @click="salvarMulta"
                :disabled="!dataFalta || !cursoIdFalta"
                class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- Modal de Registro de Falta -->
  <Transition name="fade">
    <div
      v-if="mostrarModalFalta"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      @click="fecharModalFalta"
    >
      <Transition name="scale">
        <div
          v-if="mostrarModalFalta"
          class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl"
          @click.stop
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                  <Icon icon="calendar-times" class-name="w-5 h-5 text-red-600 dark:text-red-400" fallback="📅" />
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">
                    Registrar Falta
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ alunoRegistrandoFalta?.nome }}
                  </p>
                </div>
              </div>
              <button
                @click="fecharModalFalta"
                class="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
              </button>
            </div>

            <!-- Formulário -->
            <div class="space-y-4 mb-6">
              <!-- Data da Falta -->
              <div>
                <label for="dataFalta" class="block text-sm font-medium text-foreground mb-2">
                  Data da Falta <span class="text-red-500">*</span>
                </label>
                <input
                  id="dataFalta"
                  v-model="dataFalta"
                  type="date"
                  required
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>

              <!-- Motivo -->
              <div>
                <label for="motivoFalta" class="block text-sm font-medium text-foreground mb-2">
                  Motivo (opcional)
                </label>
                <input
                  id="motivoFalta"
                  v-model="motivoFalta"
                  type="text"
                  placeholder="Ex: Não compareceu"
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>

              <!-- Observações -->
              <div>
                <label for="observacoesFalta" class="block text-sm font-medium text-foreground mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  id="observacoesFalta"
                  v-model="observacoesFalta"
                  rows="3"
                  placeholder="Informações adicionais..."
                  class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                ></textarea>
              </div>

              <!-- Info Multa -->
              <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                <div class="flex items-center space-x-2 text-sm">
                  <Icon icon="info-circle" class-name="w-4 h-4 text-amber-600 dark:text-amber-400" fallback="ℹ️" />
                  <span class="text-amber-800 dark:text-amber-200">
                    Multa que será aplicada: <strong>R$ {{ alunoRegistrandoFalta?.multaFalta ? parseFloat(alunoRegistrandoFalta.multaFalta).toFixed(2).replace('.', ',') : '0,00' }}</strong>
                  </span>
                </div>
              </div>
            </div>
            
            <!-- Botões -->
            <div class="flex space-x-3">
              <button
                @click="fecharModalFalta"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                @click="registrarFalta"
                :disabled="!dataFalta"
                class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- Modal de Pagamento de Multas -->
  <Transition name="fade">
    <div
      v-if="mostrarModalPagamento"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
      @click="fecharModalPagamento"
    >
      <Transition name="scale">
        <div
          v-if="mostrarModalPagamento"
          class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl"
          @click.stop
        >
          <div class="p-6">
            <!-- Header -->
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <span class="text-2xl">✅</span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-foreground">
                    Registrar Pagamento
                  </h3>
                  <p class="text-sm text-muted-foreground">
                    {{ alunoPagandoMulta?.nome }}
                  </p>
                </div>
              </div>
              <button
                @click="fecharModalPagamento"
                class="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <Icon icon="times" class-name="w-5 h-5 text-muted-foreground" fallback="✕" />
              </button>
            </div>

            <!-- Valor do Débito -->
            <div class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p class="text-sm text-red-800 dark:text-red-200 mb-1">Débito Atual:</p>
              <p class="text-3xl font-bold text-red-600 dark:text-red-400">
                R$ {{ alunoPagandoMulta?.debitoFaltas ? parseFloat(alunoPagandoMulta.debitoFaltas).toFixed(2).replace('.', ',') : '0,00' }}
              </p>
            </div>

            <!-- Valor do Pagamento -->
            <div class="mb-6">
              <label for="valorPagamento" class="block text-sm font-medium text-foreground mb-2">
                Valor a pagar <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-medium">R$</span>
                <input
                  id="valorPagamento"
                  type="text"
                  :value="valorPagamentoFormatado"
                  @input="handleValorPagamentoInput"
                  placeholder="0,00"
                  class="w-full pl-10 pr-4 py-2.5 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
                />
              </div>
              <p class="text-xs text-muted-foreground mt-1.5">
                Informe o valor que está sendo pago. Pode ser parcial ou total.
              </p>
            </div>

            <!-- Observações -->
            <div class="mb-6">
              <label for="observacoesPagamento" class="block text-sm font-medium text-foreground mb-2">
                Observações (opcional)
              </label>
              <textarea
                id="observacoesPagamento"
                v-model="observacoesPagamento"
                rows="3"
                placeholder="Ex: Pago em dinheiro, PIX, etc..."
                class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none"
              ></textarea>
            </div>

            <!-- Aviso -->
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
              <p class="text-xs text-blue-800 dark:text-blue-200">
                ℹ️ O pagamento será registrado no histórico. Se o valor for parcial, o débito restante ficará pendente. As faltas permanecerão registradas.
              </p>
            </div>
            
            <!-- Botões -->
            <div class="flex space-x-3">
              <button
                @click="fecharModalPagamento"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                @click="registrarPagamento"
                class="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
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

/* Botão gradiente dourado */
.btn-gradient {
  background: radial-gradient(circle at top left, #ffd700 0%, #f0c000 50%, #daa520 100%);
  box-shadow: 0 4px 8px rgba(255, 215, 0, 0.5);
}

.btn-gradient:hover {
  background: radial-gradient(circle at top left, #ffe44d 0%, #ffd700 45%, #f0c000 100%);
  box-shadow: 0 6px 12px rgba(255, 215, 0, 0.6);
  transform: translateY(-1px);
}
</style>
