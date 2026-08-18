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

// ------------------------------------------------- análise da falta (isenção)

/**
 * O professor classifica a falta (atestado, problema familiar...), mas o
 * débito é lançado de qualquer jeito — quem decide isentar é a escola, aqui.
 * Abonar devolve o valor ao aluno e registra o motivo no histórico, pra que o
 * relatório mostre por que aquele valor não foi cobrado.
 */
const faltaEmAnalise = ref<any>(null)
const decisaoAnalise = ref<'cobrar' | 'abonar'>('abonar')
const observacaoAnalise = ref('')
const salvandoAnalise = ref(false)

const { recarregarFaltasPendentes } = useNotificacoesAdmin()

function abrirAnalise(falta: any) {
  faltaEmAnalise.value = falta
  decisaoAnalise.value = falta.status_analise === 'cobrada' ? 'cobrar' : 'abonar'
  observacaoAnalise.value = falta.observacao_analise || ''
}

function fecharAnalise() {
  faltaEmAnalise.value = null
  observacaoAnalise.value = ''
  salvandoAnalise.value = false
}

async function confirmarAnalise() {
  if (!faltaEmAnalise.value) return

  const toast = await useToastSafe()
  salvandoAnalise.value = true

  try {
    const { error } = await supabase.rpc('analisar_falta', {
      p_falta_id: faltaEmAnalise.value.id,
      p_decisao: decisaoAnalise.value,
      p_observacao: observacaoAnalise.value.trim() || null
    })
    if (error) throw error

    toast?.success(
      decisaoAnalise.value === 'abonar'
        ? 'Falta abonada — o valor foi retirado do débito do aluno.'
        : 'Cobrança mantida.'
    )
    fecharAnalise()
    await buscarDados()
    await recarregarFaltasPendentes()
  } catch (error: any) {
    console.error('Erro ao analisar falta:', error)
    toast?.error(error.message || 'Erro ao registrar a decisão')
  } finally {
    salvandoAnalise.value = false
  }
}

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

// Tempo real: falta nova (professor finalizou aula com ausência), justificativa
// mudando de tipo, análise do admin, ou pagamento registrado — recarrega o
// relatório sozinho enquanto a página está aberta, sem precisar de F5.
let canalRelatorio: ReturnType<typeof supabase.channel> | null = null

onMounted(async () => {
  // Sem isso o canal confirma "assinado" mas o servidor não sabe quem está
  // logado e a RLS não deixa passar nenhum evento — ver app/utils/realtime.ts.
  await autenticarRealtime(supabase)
  canalRelatorio = supabase
    .channel('relatorio-faltas-pagina')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'faltas' }, () => buscarDados())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pagamentos_multas' }, () => buscarDados())
    .subscribe()
})

onUnmounted(() => {
  if (canalRelatorio) {
    supabase.removeChannel(canalRelatorio)
    canalRelatorio = null
  }
})
</script>

<template>
  <div>
    <AppLoading
      v-if="isLoading"
      title="Carregando Relatório"
      description="Buscando dados de faltas..."
    />

    <div v-else class="space-y-3">
      <!-- Botões de Ação -->
      <div class="flex items-center justify-end gap-2">
        <button
          @click="buscarDados"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          <Icon icon="sync-alt" class-name="w-3.5 h-3.5" fallback="🔄" />
          <span class="hidden sm:inline">Atualizar</span>
        </button>

        <button
          v-if="faltasFiltradas.length > 0"
          @click="gerarPDF"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        >
          <Icon icon="file-pdf" class-name="w-3.5 h-3.5" fallback="📄" />
          <span>Exportar PDF</span>
        </button>
      </div>

      <!-- Cards de Estatísticas -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div class="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3 py-2.5">
          <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="calendar-times" class-name="w-4 h-4 text-red-600 dark:text-red-400" fallback="📅" />
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-foreground leading-tight">{{ estatisticas.totalFaltas }}</p>
            <p class="text-[11px] text-muted-foreground leading-tight">Total de Faltas</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3 py-2.5">
          <div class="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="dollar-sign" class-name="w-4 h-4 text-amber-600 dark:text-amber-400" fallback="💰" />
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-foreground leading-tight truncate">R$ {{ formatarMoeda(estatisticas.totalMultas) }}</p>
            <p class="text-[11px] text-muted-foreground leading-tight">Total em Multas</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg px-3 py-2.5">
          <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="check-circle" class-name="w-4 h-4 text-green-600 dark:text-green-400" fallback="✅" />
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-green-700 dark:text-green-400 leading-tight truncate">R$ {{ formatarMoeda(estatisticas.totalPago) }}</p>
            <p class="text-[11px] text-green-700/80 dark:text-green-300/80 leading-tight">Total Pago</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/30 rounded-lg px-3 py-2.5">
          <div class="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="exclamation-triangle" class-name="w-4 h-4 text-orange-600 dark:text-orange-400" fallback="⚠️" />
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-orange-700 dark:text-orange-400 leading-tight truncate">R$ {{ formatarMoeda(estatisticas.debitoPendente) }}</p>
            <p class="text-[11px] text-orange-700/80 dark:text-orange-300/80 leading-tight">Pendente</p>
          </div>
        </div>

        <div class="flex items-center gap-2.5 bg-card border border-border rounded-lg px-3 py-2.5">
          <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="calculator" class-name="w-4 h-4 text-blue-600 dark:text-blue-400" fallback="🧮" />
          </div>
          <div class="min-w-0">
            <p class="text-lg font-bold text-foreground leading-tight truncate">R$ {{ formatarMoeda(estatisticas.mediaMultaPorFalta) }}</p>
            <p class="text-[11px] text-muted-foreground leading-tight">Média por Falta</p>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-card border border-border rounded-lg p-3">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtros</h2>
          <button
            v-if="filtroAluno || filtroCurso || filtroDataInicio || filtroDataFim || filtroPagamento !== 'todos'"
            @click="limparFiltros"
            class="text-xs text-primary hover:underline"
          >
            Limpar filtros
          </button>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
          <!-- Filtro por Aluno -->
          <div>
            <label class="block text-[11px] font-medium text-muted-foreground mb-1">Aluno</label>
            <input
              v-model="filtroAluno"
              type="text"
              placeholder="Buscar por nome..."
              class="w-full px-2.5 py-1.5 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
            />
          </div>

          <!-- Filtro por Curso -->
          <div class="relative">
            <label class="block text-[11px] font-medium text-muted-foreground mb-1">Curso</label>
            <input
              v-model="filtroCurso"
              type="text"
              placeholder="Buscar por curso..."
              class="w-full px-2.5 py-1.5 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              @focus="mostrarSugestoesCurso = true"
              @blur="ocultarSugestoesCurso"
            />

            <!-- Sugestões de Cursos -->
            <div
              v-if="mostrarSugestoesCurso && cursosFiltrados.length > 0"
              class="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg max-h-60 overflow-y-auto"
            >
              <div
                v-for="curso in cursosFiltrados"
                :key="curso.id"
                @mousedown.prevent="selecionarCurso(curso.nome)"
                class="px-2.5 py-1.5 text-sm hover:bg-muted cursor-pointer text-foreground"
              >
                {{ curso.nome }}
              </div>
            </div>
          </div>

          <!-- Data Início -->
          <div>
            <label class="block text-[11px] font-medium text-muted-foreground mb-1">Data Início</label>
            <input
              v-model="filtroDataInicio"
              type="date"
              class="w-full px-2.5 py-1.5 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Data Fim -->
          <div>
            <label class="block text-[11px] font-medium text-muted-foreground mb-1">Data Fim</label>
            <input
              v-model="filtroDataFim"
              type="date"
              class="w-full px-2.5 py-1.5 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Filtro por Pagamento -->
          <div class="relative">
            <label class="block text-[11px] font-medium text-muted-foreground mb-1">Pagamentos</label>
            <input
              v-model="filtroPagamentoTexto"
              type="text"
              placeholder="Buscar status..."
              class="w-full px-2.5 py-1.5 text-sm border border-input bg-background text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground"
              @focus="mostrarSugestoesPagamento = true"
              @blur="ocultarSugestoesPagamento"
              @input="onPagamentoInput"
            />

            <!-- Sugestões de Status de Pagamento -->
            <div
              v-if="mostrarSugestoesPagamento && opcoesPagamentoFiltradas.length > 0"
              class="absolute z-50 w-full mt-1 bg-background border border-input rounded-md shadow-lg"
            >
              <div
                v-for="opcao in opcoesPagamentoFiltradas"
                :key="opcao.valor"
                @mousedown.prevent="selecionarPagamento(opcao)"
                class="px-2.5 py-1.5 text-sm hover:bg-muted cursor-pointer text-foreground"
              >
                {{ opcao.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <!-- Por Aluno -->
        <div class="bg-card border border-border rounded-lg">
          <div class="px-3 py-2 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Top Alunos com Faltas</h3>
          </div>
          <div class="p-2 space-y-1 max-h-72 overflow-y-auto">
            <div
              v-for="(item, index) in estatisticas.porAluno.slice(0, 10)"
              :key="index"
              class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-[11px] font-bold text-red-600 dark:text-red-400 flex-shrink-0">
                  {{ index + 1 }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">{{ item.nome }}</p>
                  <p class="text-[11px] text-muted-foreground">{{ item.faltas }} falta(s)</p>
                </div>
              </div>
              <p class="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                R$ {{ formatarMoeda(item.total) }}
              </p>
            </div>

            <div v-if="estatisticas.porAluno.length === 0" class="text-center py-6 text-sm text-muted-foreground">
              Nenhuma falta registrada
            </div>
          </div>
        </div>

        <!-- Por Curso -->
        <div class="bg-card border border-border rounded-lg">
          <div class="px-3 py-2 border-b border-border">
            <h3 class="text-sm font-semibold text-foreground">Faltas por Curso</h3>
          </div>
          <div class="p-2 space-y-1 max-h-72 overflow-y-auto">
            <div
              v-for="(item, index) in estatisticas.porCurso"
              :key="index"
              class="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
            >
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon icon="book" class-name="w-3 h-3 text-primary" fallback="📚" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-foreground truncate">{{ item.nome }}</p>
                  <p class="text-[11px] text-muted-foreground">{{ item.faltas }} falta(s)</p>
                </div>
              </div>
              <p class="text-sm font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                R$ {{ formatarMoeda(item.total) }}
              </p>
            </div>

            <div v-if="estatisticas.porCurso.length === 0" class="text-center py-6 text-sm text-muted-foreground">
              Nenhuma falta registrada
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela de Faltas -->
      <div class="bg-card border border-border rounded-lg">
        <div class="px-3 py-2 border-b border-border flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold text-foreground">
            Histórico de Faltas ({{ faltasFiltradas.length }})
          </h3>

          <!-- Ordenação -->
          <div class="flex items-center gap-1.5">
            <select
              v-model="ordenarPor"
              class="px-2 py-1 border border-input bg-background text-foreground rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="data">Data</option>
              <option value="aluno">Aluno</option>
              <option value="curso">Curso</option>
              <option value="valor">Valor</option>
            </select>

            <button
              @click="ordenarDirecao = ordenarDirecao === 'asc' ? 'desc' : 'asc'"
              class="p-1 hover:bg-muted rounded-md transition-colors"
              title="Inverter ordenação"
            >
              <Icon
                :icon="ordenarDirecao === 'asc' ? 'arrow-up' : 'arrow-down'"
                class-name="w-3.5 h-3.5 text-muted-foreground"
                :fallback="ordenarDirecao === 'asc' ? '↑' : '↓'"
              />
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Data</th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Aluno</th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Curso</th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Motivo</th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Situação</th>
                <th class="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground uppercase">Multa</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="falta in faltasFiltradas"
                :key="falta.id"
                class="hover:bg-muted/30 transition-colors"
                :class="falta.status_analise === 'pendente' ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''"
              >
                <td class="px-3 py-2 whitespace-nowrap text-foreground">
                  {{ formatarData(falta.data_falta) }}
                </td>
                <td class="px-3 py-2 text-foreground">
                  {{ falta.alunos?.nome_completo || 'Desconhecido' }}
                </td>
                <td class="px-3 py-2 text-foreground">
                  <span class="inline-flex items-center gap-1">
                    <Icon icon="book" class-name="w-3 h-3 text-primary" fallback="📚" />
                    {{ falta.cursos?.nome || 'Sem curso' }}
                  </span>
                </td>
                <td class="px-3 py-2 text-muted-foreground">
                  {{ falta.motivo || '-' }}
                </td>

                <!-- Situação da análise: só faltas justificadas passam por aqui -->
                <td class="px-3 py-2 whitespace-nowrap">
                  <button
                    v-if="falta.status_analise === 'pendente'"
                    @click="abrirAnalise(falta)"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                    title="Falta justificada — decida se cobra ou isenta"
                  >
                    <Icon icon="triangle-exclamation" class-name="w-3 h-3" fallback="⚠️" />
                    Analisar
                  </button>
                  <button
                    v-else-if="falta.status_analise === 'abonada'"
                    @click="abrirAnalise(falta)"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:opacity-80 transition-opacity"
                    :title="falta.observacao_analise || 'Isento pela escola'"
                  >
                    <Icon icon="gift" class-name="w-3 h-3" fallback="🎁" />
                    Abonada
                  </button>
                  <button
                    v-else-if="falta.status_analise === 'cobrada'"
                    @click="abrirAnalise(falta)"
                    class="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-muted text-muted-foreground hover:opacity-80 transition-opacity"
                    :title="falta.observacao_analise || 'Cobrança mantida'"
                  >
                    Cobrada
                  </button>
                  <span v-else class="text-[11px] text-muted-foreground">—</span>
                </td>

                <td class="px-3 py-2 whitespace-nowrap font-medium text-right">
                  <span
                    :class="falta.status_analise === 'abonada'
                      ? 'text-muted-foreground line-through'
                      : 'text-red-600 dark:text-red-400'"
                  >
                    R$ {{ formatarMoeda(parseFloat(falta.valor_multa) || 0) }}
                  </span>
                </td>
              </tr>

              <tr v-if="faltasFiltradas.length === 0">
                <td colspan="6" class="px-4 py-10 text-center text-muted-foreground">
                  <Icon icon="info-circle" class-name="w-10 h-10 mx-auto mb-2 opacity-50" fallback="ℹ️" />
                  <p class="text-sm">Nenhuma falta encontrada com os filtros aplicados</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Histórico de Pagamentos -->
      <div v-if="pagamentos.length > 0" class="bg-card border border-border rounded-lg p-3">
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="money-bill-wave" class-name="w-4 h-4 text-green-600 dark:text-green-400" fallback="💵" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-foreground">Histórico de Pagamentos</h3>
            <p class="text-[11px] text-muted-foreground">{{ pagamentos.length }} pagamento(s) registrado(s)</p>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Data</th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Aluno</th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">Observações</th>
                <th class="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground uppercase">Valor</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="pagamento in pagamentos"
                :key="pagamento.id"
                class="hover:bg-muted/30 transition-colors"
              >
                <td class="px-3 py-2 whitespace-nowrap text-foreground">
                  {{ formatarData(pagamento.data_pagamento) }}
                </td>
                <td class="px-3 py-2 text-foreground">
                  {{ pagamento.alunos?.nome_completo || 'Desconhecido' }}
                </td>
                <td class="px-3 py-2 text-muted-foreground">
                  {{ pagamento.observacoes || '-' }}
                </td>
                <td class="px-3 py-2 whitespace-nowrap font-medium text-green-600 dark:text-green-400 text-right">
                  R$ {{ formatarMoeda(parseFloat(pagamento.valor_pago) || 0) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: analisar falta justificada (cobrar ou abonar) -->
  <Transition name="fade">
    <div
      v-if="faltaEmAnalise"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="fecharAnalise"
    >
      <div class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl" @click.stop>
        <div class="p-5">
          <h3 class="text-lg font-bold text-foreground mb-1">Analisar falta justificada</h3>
          <p class="text-xs text-muted-foreground mb-4">
            {{ faltaEmAnalise.alunos?.nome_completo }} ·
            {{ faltaEmAnalise.cursos?.nome }} ·
            {{ formatarData(faltaEmAnalise.data_falta) }}
          </p>

          <div class="bg-muted/50 rounded-lg p-3 mb-4 space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Motivo informado:</span>
              <span class="font-medium text-foreground text-right">{{ faltaEmAnalise.motivo || '—' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Valor da multa:</span>
              <span class="font-medium text-foreground">R$ {{ formatarMoeda(parseFloat(faltaEmAnalise.valor_multa) || 0) }}</span>
            </div>
          </div>

          <p class="text-sm font-medium text-foreground mb-2">O que fazer com esse valor?</p>
          <div class="space-y-2 mb-4">
            <label
              class="flex items-start gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all"
              :class="decisaoAnalise === 'abonar' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-border hover:bg-muted/40'"
            >
              <input v-model="decisaoAnalise" type="radio" value="abonar" class="mt-0.5" />
              <span>
                <span class="block text-sm font-medium text-foreground">Abonar (isentar o aluno)</span>
                <span class="block text-xs text-muted-foreground">
                  Retira R$ {{ formatarMoeda(parseFloat(faltaEmAnalise.valor_multa) || 0) }} do débito do aluno.
                  Fica registrado como bonificação no histórico.
                </span>
              </span>
            </label>

            <label
              class="flex items-start gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all"
              :class="decisaoAnalise === 'cobrar' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-border hover:bg-muted/40'"
            >
              <input v-model="decisaoAnalise" type="radio" value="cobrar" class="mt-0.5" />
              <span>
                <span class="block text-sm font-medium text-foreground">Manter a cobrança</span>
                <span class="block text-xs text-muted-foreground">
                  O aluno continua devendo o valor da multa.
                </span>
              </span>
            </label>
          </div>

          <label class="block text-sm font-medium text-foreground mb-1.5">
            Motivo da decisão
            <span class="text-muted-foreground font-normal">(fica no histórico)</span>
          </label>
          <textarea
            v-model="observacaoAnalise"
            rows="2"
            maxlength="300"
            :placeholder="decisaoAnalise === 'abonar'
              ? 'Ex.: aluno apresentou atestado médico válido'
              : 'Ex.: justificativa não comprovada'"
            class="w-full px-3 py-2 mb-4 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          ></textarea>

          <div class="flex gap-3">
            <button
              @click="fecharAnalise"
              class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              @click="confirmarAnalise"
              :disabled="salvandoAnalise"
              class="flex-1 px-4 py-2.5 font-medium rounded-lg text-white transition-all disabled:opacity-50"
              :class="decisaoAnalise === 'abonar' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'"
            >
              {{ salvandoAnalise ? 'Salvando...' : (decisaoAnalise === 'abonar' ? 'Abonar' : 'Manter cobrança') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>

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
