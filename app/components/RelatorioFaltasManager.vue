<script setup lang="ts">
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const supabase = useSupabaseClient()

// Estado
const isLoading = ref(true)
const faltas = ref<any[]>([])
const pagamentos = ref<any[]>([])
const alunos = ref<any[]>([])
const cursos = ref<any[]>([])

// Filtros
const filtroAluno = ref('')
const filtroCurso = ref('')
const filtroDataInicio = ref('')
const filtroDataFim = ref('')
const filtroPagamento = ref<'todos' | 'pagos' | 'pendentes'>('todos')
const filtroPagamentoTexto = ref('')

// Sugestões de curso
const mostrarSugestoesCurso = ref(false)

// Sugestões de pagamento
const mostrarSugestoesPagamento = ref(false)
const opcoesPagamento = [
  { valor: 'todos', label: 'Todos os alunos' },
  { valor: 'pagos', label: 'Alunos com pagamento' },
  { valor: 'pendentes', label: 'Alunos sem pagamento' }
]

// Ordenação
const ordenarPor = ref<'data' | 'aluno' | 'curso' | 'valor'>('data')
const ordenarDirecao = ref<'asc' | 'desc'>('desc')

// Buscar dados
async function buscarDados() {
  isLoading.value = true
  
  try {
    // Buscar faltas com informações de aluno e curso
    const { data: faltasData, error: faltasError } = await supabase
      .from('faltas')
      .select(`
        *,
        alunos (
          id,
          nome_completo,
          telefone,
          email
        ),
        cursos (
          id,
          nome
        )
      `)
      .order('data_falta', { ascending: false })
    
    if (faltasError) throw faltasError
    faltas.value = faltasData || []
    
    // Buscar todos os alunos para o filtro
    const { data: alunosData, error: alunosError } = await supabase
      .from('alunos')
      .select('id, nome_completo')
      .order('nome_completo')
    
    if (!alunosError) {
      alunos.value = alunosData || []
    }
    
    // Buscar todos os cursos para o filtro
    const { data: cursosData, error: cursosError } = await supabase
      .from('cursos')
      .select('id, nome')
      .order('nome')
    
    if (!cursosError) {
      cursos.value = cursosData || []
    }
    
    // Buscar todos os pagamentos
    const { data: pagamentosData, error: pagamentosError } = await supabase
      .from('pagamentos_multas')
      .select(`
        *,
        alunos (
          id,
          nome_completo
        )
      `)
      .order('data_pagamento', { ascending: false })
    
    if (!pagamentosError) {
      pagamentos.value = pagamentosData || []
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Faltas filtradas
const faltasFiltradas = computed(() => {
  let resultado = [...faltas.value]
  
  // Filtro por aluno (busca por nome)
  if (filtroAluno.value) {
    const termoBusca = filtroAluno.value.toLowerCase()
    resultado = resultado.filter(f => 
      f.alunos?.nome_completo?.toLowerCase().includes(termoBusca)
    )
  }
  
  // Filtro por curso (busca por nome)
  if (filtroCurso.value) {
    const termoCurso = filtroCurso.value.toLowerCase()
    resultado = resultado.filter(f => 
      f.cursos?.nome?.toLowerCase().includes(termoCurso)
    )
  }
  
  // Filtro por data início
  if (filtroDataInicio.value) {
    resultado = resultado.filter(f => f.data_falta >= filtroDataInicio.value)
  }
  
  // Filtro por data fim
  if (filtroDataFim.value) {
    resultado = resultado.filter(f => f.data_falta <= filtroDataFim.value)
  }
  
  // Filtro por pagamento
  if (filtroPagamento.value !== 'todos') {
    // Buscar IDs de alunos com ou sem pagamentos
    const alunosComPagamento = new Set(pagamentos.value.map(p => p.aluno_id))
    
    if (filtroPagamento.value === 'pagos') {
      resultado = resultado.filter(f => alunosComPagamento.has(f.aluno_id))
    } else if (filtroPagamento.value === 'pendentes') {
      resultado = resultado.filter(f => !alunosComPagamento.has(f.aluno_id))
    }
  }
  
  // Ordenação
  resultado.sort((a, b) => {
    let comparacao = 0
    
    switch (ordenarPor.value) {
      case 'data':
        comparacao = new Date(a.data_falta).getTime() - new Date(b.data_falta).getTime()
        break
      case 'aluno':
        comparacao = (a.alunos?.nome_completo || '').localeCompare(b.alunos?.nome_completo || '')
        break
      case 'curso':
        comparacao = (a.cursos?.nome || '').localeCompare(b.cursos?.nome || '')
        break
      case 'valor':
        comparacao = (parseFloat(a.valor_multa) || 0) - (parseFloat(b.valor_multa) || 0)
        break
    }
    
    return ordenarDirecao.value === 'asc' ? comparacao : -comparacao
  })
  
  return resultado
})

// Cursos filtrados para sugestões
const cursosFiltrados = computed(() => {
  if (!filtroCurso.value) return cursos.value
  
  const termo = filtroCurso.value.toLowerCase()
  return cursos.value.filter(c => 
    c.nome?.toLowerCase().includes(termo)
  )
})

// Opções de pagamento filtradas para sugestões
const opcoesPagamentoFiltradas = computed(() => {
  if (!filtroPagamentoTexto.value) return opcoesPagamento
  
  const termo = filtroPagamentoTexto.value.toLowerCase()
  return opcoesPagamento.filter(op => 
    op.label.toLowerCase().includes(termo)
  )
})

// Estatísticas
const estatisticas = computed(() => {
  const totalFaltas = faltasFiltradas.value.length
  const totalMultas = faltasFiltradas.value.reduce((sum, f) => sum + (parseFloat(f.valor_multa) || 0), 0)
  
  // Agrupar por aluno
  const porAluno: Record<string, { nome: string, faltas: number, total: number }> = {}
  faltasFiltradas.value.forEach(f => {
    const alunoId = f.aluno_id
    const nomeAluno = f.alunos?.nome_completo || 'Desconhecido'
    
    if (!porAluno[alunoId]) {
      porAluno[alunoId] = { nome: nomeAluno, faltas: 0, total: 0 }
    }
    
    porAluno[alunoId].faltas++
    porAluno[alunoId].total += parseFloat(f.valor_multa) || 0
  })
  
  // Agrupar por curso
  const porCurso: Record<string, { nome: string, faltas: number, total: number }> = {}
  faltasFiltradas.value.forEach(f => {
    const cursoId = f.curso_id || 'sem-curso'
    const nomeCurso = f.cursos?.nome || 'Sem curso'
    
    if (!porCurso[cursoId]) {
      porCurso[cursoId] = { nome: nomeCurso, faltas: 0, total: 0 }
    }
    
    porCurso[cursoId].faltas++
    porCurso[cursoId].total += parseFloat(f.valor_multa) || 0
  })
  
  // Calcular total pago apenas dos alunos que aparecem nas faltas filtradas
  const alunosComFaltas = new Set(faltasFiltradas.value.map(f => f.aluno_id))
  const totalPago = pagamentos.value
    .filter(p => alunosComFaltas.has(p.aluno_id))
    .reduce((sum, p) => sum + (parseFloat(p.valor_pago) || 0), 0)
  
  // Garantir que débito não seja negativo
  const debitoPendente = Math.max(0, totalMultas - totalPago)
  
  return {
    totalFaltas,
    totalMultas,
    totalPago,
    debitoPendente,
    mediaMultaPorFalta: totalFaltas > 0 ? totalMultas / totalFaltas : 0,
    porAluno: Object.values(porAluno).sort((a, b) => b.total - a.total),
    porCurso: Object.values(porCurso).sort((a, b) => b.total - a.total)
  }
})

// Formatar data
function formatarData(data: string) {
  // Garantir que a data seja exibida corretamente sem problemas de timezone
  const [ano, mes, dia] = data.split('T')[0].split('-')
  const date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
  return date.toLocaleDateString('pt-BR')
}

// Função auxiliar para criar data sem timezone
function criarDataLocal(data: string) {
  const [ano, mes, dia] = data.split('T')[0].split('-')
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
}

// Formatar moeda
function formatarMoeda(valor: number) {
  return valor.toFixed(2).replace('.', ',')
}

// Selecionar curso da sugestão
function selecionarCurso(nomeCurso: string) {
  filtroCurso.value = nomeCurso
  mostrarSugestoesCurso.value = false
}

// Ocultar sugestões com delay para permitir o click
function ocultarSugestoesCurso() {
  setTimeout(() => {
    mostrarSugestoesCurso.value = false
  }, 200)
}

// Selecionar pagamento da sugestão
function selecionarPagamento(opcao: { valor: string; label: string }) {
  filtroPagamentoTexto.value = opcao.label
  filtroPagamento.value = opcao.valor as 'todos' | 'pagos' | 'pendentes'
  mostrarSugestoesPagamento.value = false
}

// Detectar quando o campo é limpo manualmente
function onPagamentoInput() {
  if (filtroPagamentoTexto.value === '') {
    filtroPagamento.value = 'todos'
  }
}

// Ocultar sugestões de pagamento com delay
function ocultarSugestoesPagamento() {
  setTimeout(() => {
    mostrarSugestoesPagamento.value = false
  }, 200)
}

// Limpar filtros
function limparFiltros() {
  filtroAluno.value = ''
  filtroCurso.value = ''
  filtroDataInicio.value = ''
  filtroDataFim.value = ''
  filtroPagamento.value = 'todos'
  filtroPagamentoTexto.value = ''
}

// Gerar PDF do relatório
function gerarPDF() {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  let yPos = 20
  
  // Título
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório Geral de Faltas', pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 10
  
  // Data de emissão
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 10
  
  // Estatísticas gerais
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo Geral', 14, yPos)
  
  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total de Faltas: ${estatisticas.value.totalFaltas}`, 14, yPos)
  
  yPos += 5
  doc.text(`Total em Multas: R$ ${formatarMoeda(estatisticas.value.totalMultas)}`, 14, yPos)
  
  yPos += 5
  doc.text(`Média por Falta: R$ ${formatarMoeda(estatisticas.value.mediaMultaPorFalta)}`, 14, yPos)
  
  yPos += 10
  
  // Resumo por Aluno
  if (estatisticas.value.porAluno.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Faltas por Aluno', 14, yPos)
    
    yPos += 7
    
    const alunosData = estatisticas.value.porAluno.map(a => [
      a.nome,
      a.faltas.toString(),
      `R$ ${formatarMoeda(a.total)}`
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Aluno', 'Faltas', 'Total em Multas']],
      body: alunosData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })
    
    yPos = (doc as any).lastAutoTable.finalY + 10
  }
  
  // Adicionar nova página se necessário
  if (yPos > 250) {
    doc.addPage()
    yPos = 20
  }
  
  // Resumo por Curso
  if (estatisticas.value.porCurso.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Faltas por Curso', 14, yPos)
    
    yPos += 7
    
    const cursosData = estatisticas.value.porCurso.map(c => [
      c.nome,
      c.faltas.toString(),
      `R$ ${formatarMoeda(c.total)}`
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Curso', 'Faltas', 'Total em Multas']],
      body: cursosData,
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })
    
    yPos = (doc as any).lastAutoTable.finalY + 10
  }
  
  // Adicionar nova página para detalhes
  doc.addPage()
  yPos = 20
  
  // Histórico detalhado
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Histórico Detalhado de Faltas', 14, yPos)
  
  yPos += 7
  
  const faltasData = faltasFiltradas.value.map(f => [
    formatarData(f.data_falta),
    f.alunos?.nome_completo || 'Desconhecido',
    f.cursos?.nome || 'Sem curso',
    `R$ ${formatarMoeda(parseFloat(f.valor_multa) || 0)}`,
    f.motivo || '-'
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Aluno', 'Curso', 'Multa', 'Motivo']],
    body: faltasData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 45 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 48 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  })
  
  // Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  // Salvar PDF
  const dataHora = new Date().toISOString().split('T')[0]
  doc.save(`relatorio_faltas_${dataHora}.pdf`)
}

// Buscar dados ao montar
onMounted(() => {
  buscarDados()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Relatório"
      description="Buscando dados de faltas..."
    />
    
    <div v-else class="space-y-6">
      <!-- Botões de Ação -->
      <div class="flex items-center justify-end gap-3">
        <button
          @click="buscarDados"
          class="flex items-center gap-2 px-4 py-2 border-2 border-border rounded-lg hover:bg-muted transition-colors"
        >
          <Icon icon="sync-alt" class-name="w-4 h-4" fallback="🔄" />
          <span class="hidden sm:inline">Atualizar</span>
        </button>
        
        <button
          v-if="faltasFiltradas.length > 0"
          @click="gerarPDF"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-lg hover:shadow-red-500/50"
        >
          <Icon icon="file-pdf" class-name="w-4 h-4" fallback="📄" />
          <span>Exportar PDF</span>
        </button>
      </div>
      
      <!-- Cards de Estatísticas -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Total de Faltas -->
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="calendar-times" class-name="w-6 h-6 text-red-600 dark:text-red-400" fallback="📅" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-muted-foreground">Total de Faltas</p>
              <p class="text-3xl font-bold text-foreground">{{ estatisticas.totalFaltas }}</p>
            </div>
          </div>
        </div>
        
        <!-- Total em Multas -->
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="dollar-sign" class-name="w-6 h-6 text-amber-600 dark:text-amber-400" fallback="💰" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-muted-foreground">Total em Multas</p>
              <p class="text-2xl font-bold text-foreground truncate">
                R$ {{ formatarMoeda(estatisticas.totalMultas) }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Total Pago -->
        <div class="bg-card border-2 border-green-500 bg-green-50 dark:bg-green-900/10 rounded-lg p-6">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="check-circle" class-name="w-6 h-6 text-green-600 dark:text-green-400" fallback="✅" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-green-700 dark:text-green-300">Total Pago</p>
              <p class="text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                R$ {{ formatarMoeda(estatisticas.totalPago) }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Débito Pendente -->
        <div class="bg-card border-2 border-orange-500 bg-orange-50 dark:bg-orange-900/10 rounded-lg p-6">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="exclamation-triangle" class-name="w-6 h-6 text-orange-600 dark:text-orange-400" fallback="⚠️" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-orange-700 dark:text-orange-300">Pendente</p>
              <p class="text-2xl font-bold text-orange-600 dark:text-orange-400 truncate">
                R$ {{ formatarMoeda(estatisticas.debitoPendente) }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Média por Falta -->
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="calculator" class-name="w-6 h-6 text-blue-600 dark:text-blue-400" fallback="🧮" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-muted-foreground">Média por Falta</p>
              <p class="text-2xl font-bold text-foreground truncate">
                R$ {{ formatarMoeda(estatisticas.mediaMultaPorFalta) }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Filtros -->
      <div class="bg-card border border-border rounded-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-foreground">Filtros</h2>
          <button
            v-if="filtroAluno || filtroCurso || filtroDataInicio || filtroDataFim || filtroMotivo"
            @click="limparFiltros"
            class="text-sm text-primary hover:underline"
          >
            Limpar filtros
          </button>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <!-- Filtro por Aluno -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Aluno</label>
            <input
              v-model="filtroAluno"
              type="text"
              placeholder="Buscar por nome..."
              class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>
          
          <!-- Filtro por Curso -->
          <div class="relative">
            <label class="block text-sm font-medium text-foreground mb-2">Curso</label>
            <input
              v-model="filtroCurso"
              type="text"
              placeholder="Buscar por curso..."
              class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              @focus="mostrarSugestoesCurso = true"
              @blur="ocultarSugestoesCurso"
            />
            
            <!-- Sugestões de Cursos -->
            <div
              v-if="mostrarSugestoesCurso && cursosFiltrados.length > 0"
              class="absolute z-50 w-full mt-1 bg-background border-2 border-input rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-for="curso in cursosFiltrados"
                :key="curso.id"
                @mousedown.prevent="selecionarCurso(curso.nome)"
                class="px-3 py-2 hover:bg-muted cursor-pointer text-foreground"
              >
                {{ curso.nome }}
              </div>
            </div>
          </div>
          
          <!-- Data Início -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Data Início</label>
            <input
              v-model="filtroDataInicio"
              type="date"
              class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <!-- Data Fim -->
          <div>
            <label class="block text-sm font-medium text-foreground mb-2">Data Fim</label>
            <input
              v-model="filtroDataFim"
              type="date"
              class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <!-- Filtro por Pagamento -->
          <div class="relative">
            <label class="block text-sm font-medium text-foreground mb-2">Pagamentos</label>
            <input
              v-model="filtroPagamentoTexto"
              type="text"
              placeholder="Buscar status..."
              class="w-full px-3 py-2 border-2 border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              @focus="mostrarSugestoesPagamento = true"
              @blur="ocultarSugestoesPagamento"
              @input="onPagamentoInput"
            />
            
            <!-- Sugestões de Status de Pagamento -->
            <div
              v-if="mostrarSugestoesPagamento && opcoesPagamentoFiltradas.length > 0"
              class="absolute z-50 w-full mt-1 bg-background border-2 border-input rounded-lg shadow-lg"
            >
              <div
                v-for="opcao in opcoesPagamentoFiltradas"
                :key="opcao.valor"
                @mousedown.prevent="selecionarPagamento(opcao)"
                class="px-3 py-2 hover:bg-muted cursor-pointer text-foreground"
              >
                {{ opcao.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Resumos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Por Aluno -->
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h3 class="font-semibold text-foreground">Top Alunos com Faltas</h3>
          </div>
          <div class="p-4 space-y-3 max-h-80 overflow-y-auto">
            <div
              v-for="(item, index) in estatisticas.porAluno.slice(0, 10)"
              :key="index"
              class="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-xs font-bold text-red-600 dark:text-red-400">
                  {{ index + 1 }}
                </div>
                <div>
                  <p class="font-medium text-foreground">{{ item.nome }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.faltas }} falta(s)</p>
                </div>
              </div>
              <p class="font-bold text-red-600 dark:text-red-400">
                R$ {{ formatarMoeda(item.total) }}
              </p>
            </div>
            
            <div v-if="estatisticas.porAluno.length === 0" class="text-center py-8 text-muted-foreground">
              Nenhuma falta registrada
            </div>
          </div>
        </div>
        
        <!-- Por Curso -->
        <div class="bg-card border border-border rounded-lg">
          <div class="p-4 border-b border-border">
            <h3 class="font-semibold text-foreground">Faltas por Curso</h3>
          </div>
          <div class="p-4 space-y-3 max-h-80 overflow-y-auto">
            <div
              v-for="(item, index) in estatisticas.porCurso"
              :key="index"
              class="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Icon icon="book" class-name="w-4 h-4 text-primary" fallback="📚" />
                </div>
                <div>
                  <p class="font-medium text-foreground">{{ item.nome }}</p>
                  <p class="text-xs text-muted-foreground">{{ item.faltas }} falta(s)</p>
                </div>
              </div>
              <p class="font-bold text-red-600 dark:text-red-400">
                R$ {{ formatarMoeda(item.total) }}
              </p>
            </div>
            
            <div v-if="estatisticas.porCurso.length === 0" class="text-center py-8 text-muted-foreground">
              Nenhuma falta registrada
            </div>
          </div>
        </div>
      </div>
      
      <!-- Tabela de Faltas -->
      <div class="bg-card border border-border rounded-lg">
        <div class="p-4 border-b border-border flex items-center justify-between">
          <h3 class="font-semibold text-foreground">
            Histórico de Faltas ({{ faltasFiltradas.length }})
          </h3>
          
          <!-- Ordenação -->
          <div class="flex items-center gap-2">
            <label class="text-sm text-muted-foreground">Ordenar:</label>
            <select
              v-model="ordenarPor"
              class="px-3 py-1 border border-input bg-background text-foreground rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="data">Data</option>
              <option value="aluno">Aluno</option>
              <option value="curso">Curso</option>
              <option value="valor">Valor</option>
            </select>
            
            <button
              @click="ordenarDirecao = ordenarDirecao === 'asc' ? 'desc' : 'asc'"
              class="p-1 hover:bg-muted rounded transition-colors"
            >
              <Icon 
                :icon="ordenarDirecao === 'asc' ? 'arrow-up' : 'arrow-down'" 
                class-name="w-4 h-4 text-muted-foreground" 
                :fallback="ordenarDirecao === 'asc' ? '↑' : '↓'" 
              />
            </button>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Aluno</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Curso</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Motivo</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Multa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="falta in faltasFiltradas"
                :key="falta.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {{ formatarData(falta.data_falta) }}
                </td>
                <td class="px-4 py-3 text-sm text-foreground">
                  {{ falta.alunos?.nome_completo || 'Desconhecido' }}
                </td>
                <td class="px-4 py-3 text-sm text-foreground">
                  <span class="inline-flex items-center gap-1">
                    <Icon icon="book" class-name="w-3 h-3 text-primary" fallback="📚" />
                    {{ falta.cursos?.nome || 'Sem curso' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ falta.motivo || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-red-600 dark:text-red-400 text-right">
                  R$ {{ formatarMoeda(parseFloat(falta.valor_multa) || 0) }}
                </td>
              </tr>
              
              <tr v-if="faltasFiltradas.length === 0">
                <td colspan="5" class="px-4 py-12 text-center text-muted-foreground">
                  <Icon icon="info-circle" class-name="w-12 h-12 mx-auto mb-3 opacity-50" fallback="ℹ️" />
                  <p>Nenhuma falta encontrada com os filtros aplicados</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Histórico de Pagamentos -->
      <div v-if="pagamentos.length > 0" class="bg-card border border-border rounded-lg p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Icon icon="money-bill-wave" class-name="w-5 h-5 text-green-600 dark:text-green-400" fallback="💵" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-foreground">Histórico de Pagamentos</h3>
              <p class="text-sm text-muted-foreground">{{ pagamentos.length }} pagamento(s) registrado(s)</p>
            </div>
          </div>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Data</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Aluno</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Observações</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Valor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="pagamento in pagamentos"
                :key="pagamento.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {{ formatarData(pagamento.data_pagamento) }}
                </td>
                <td class="px-4 py-3 text-sm text-foreground">
                  {{ pagamento.alunos?.nome_completo || 'Desconhecido' }}
                </td>
                <td class="px-4 py-3 text-sm text-muted-foreground">
                  {{ pagamento.observacoes || '-' }}
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400 text-right">
                  R$ {{ formatarMoeda(parseFloat(pagamento.valor_pago) || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Remover aparência padrão que causa o amarelo/dourado */
.select-fixed {
  -webkit-appearance: none !important;
  -moz-appearance: none !important;
  appearance: none !important;
}

/* Modo claro - sempre branco */
.select-fixed {
  background-color: white !important;
  color: black !important;
}

.select-fixed:hover,
.select-fixed:focus,
.select-fixed:active {
  background-color: white !important;
  color: black !important;
}

.select-fixed option {
  background-color: white !important;
  color: black !important;
}

/* Modo escuro - forçar fundo escuro no select e options */
@media (prefers-color-scheme: dark) {
  .select-fixed,
  .select-fixed:hover,
  .select-fixed:focus,
  .select-fixed:active {
    background-color: rgb(31, 41, 55) !important;
    color: white !important;
  }
  
  .select-fixed option {
    background-color: rgb(31, 41, 55) !important;
    color: white !important;
  }
}

html.dark .select-fixed,
html.dark .select-fixed:hover,
html.dark .select-fixed:focus,
html.dark .select-fixed:active {
  background-color: rgb(31, 41, 55) !important;
  color: white !important;
}

html.dark .select-fixed option {
  background-color: rgb(31, 41, 55) !important;
  color: white !important;
}
</style>
