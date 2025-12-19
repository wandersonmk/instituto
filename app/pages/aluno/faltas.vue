<script setup lang="ts">
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()

// Estado
const isLoading = ref(true)
const faltas = ref<any[]>([])
const pagamentos = ref<any[]>([])
const aluno = ref<any>(null)
const mostrarPagamentos = ref(true)

// Buscar dados do aluno e suas faltas
async function buscarDados() {
  if (!user.value) {
    isLoading.value = false
    return
  }
  
  try {
    // Buscar aluno
    const { data: alunoData, error: alunoError } = await supabase
      .from('alunos')
      .select('*')
      .eq('user_id', user.value.id)
      .single()
    
    if (alunoError) throw alunoError
    aluno.value = alunoData
    
    // Buscar faltas com informações do curso
    if (alunoData?.id) {
      const { data: faltasData, error: faltasError } = await supabase
        .from('faltas')
        .select(`
          *,
          cursos (
            id,
            nome
          )
        `)
        .eq('aluno_id', alunoData.id)
        .order('data_falta', { ascending: false })
      
      if (!faltasError) {
        faltas.value = faltasData || []
      }
      
      // Buscar pagamentos
      console.log('🔍 Buscando pagamentos para aluno:', alunoData.id)
      const { data: pagamentosData, error: pagamentosError } = await supabase
        .from('pagamentos_multas')
        .select('*')
        .eq('aluno_id', alunoData.id)
        .order('data_pagamento', { ascending: false })
      
      if (pagamentosError) {
        console.error('❌ Erro ao buscar pagamentos:', pagamentosError)
        console.error('Código do erro:', pagamentosError.code)
        console.error('Mensagem:', pagamentosError.message)
        console.error('Detalhes:', pagamentosError.details)
      } else {
        pagamentos.value = pagamentosData || []
        console.log('✅ Pagamentos encontrados:', pagamentos.value.length, 'registros')
        console.log('Dados:', pagamentos.value)
      }
    }
  } catch (error) {
    console.error('❌ Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Formatar data
function formatarData(data: string) {
  // Garantir que a data seja exibida corretamente sem problemas de timezone
  const [ano, mes, dia] = data.split('T')[0].split('-')
  const date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

// Função auxiliar para criar data sem timezone
function criarDataLocal(data: string) {
  const [ano, mes, dia] = data.split('T')[0].split('-')
  return new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia))
}

// Formatar hora
function formatarDiaSemana(data: string) {
  return new Date(data).toLocaleDateString('pt-BR', {
    weekday: 'long'
  })
}

// Total de multas
const totalMultas = computed(() => {
  return faltas.value.reduce((total, falta) => {
    return total + (parseFloat(falta.valor_multa) || 0)
  }, 0)
})

// Total pago
const totalPago = computed(() => {
  return pagamentos.value.reduce((total, pagamento) => {
    return total + (parseFloat(pagamento.valor_pago) || 0)
  }, 0)
})

// Faltas agrupadas por curso
const faltasPorCurso = computed(() => {
  const grupos: Record<string, { nomeCurso: string, faltas: any[], total: number }> = {}
  
  faltas.value.forEach(falta => {
    const cursoId = falta.curso_id || 'sem-curso'
    const nomeCurso = falta.cursos?.nome || 'Sem curso vinculado'
    
    if (!grupos[cursoId]) {
      grupos[cursoId] = {
        nomeCurso,
        faltas: [],
        total: 0
      }
    }
    
    grupos[cursoId].faltas.push(falta)
    grupos[cursoId].total += parseFloat(falta.valor_multa) || 0
  })
  
  return Object.values(grupos)
})

// Gerar PDF das faltas
function gerarPDF() {
  if (!aluno.value || faltas.value.length === 0) {
    return
  }

  console.log('📄 Gerando PDF...')
  console.log('Pagamentos disponíveis:', pagamentos.value.length)
  console.log('Dados dos pagamentos:', pagamentos.value)

  const doc = new jsPDF()
  
  // Configurações
  const pageWidth = doc.internal.pageSize.width
  let yPos = 20
  
  // Título
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Relatório de Faltas', pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 10
  
  // Dados do aluno
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Aluno: ${aluno.value.nome_completo}`, 14, yPos)
  
  yPos += 7
  doc.setFontSize(10)
  doc.text(`Data de emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, yPos)
  
  yPos += 10
  
  // Resumo geral
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Resumo Geral', 14, yPos)
  
  yPos += 7
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total de Faltas: ${faltas.value.length}`, 14, yPos)
  
  yPos += 5
  doc.text(`Total em Multas: R$ ${totalMultas.value.toFixed(2).replace('.', ',')}`, 14, yPos)
  
  yPos += 5
  doc.text(`Valor Padrão por Falta: R$ ${aluno.value.multa_falta ? parseFloat(aluno.value.multa_falta).toFixed(2).replace('.', ',') : '0,00'}`, 14, yPos)
  
  yPos += 10
  
  // Resumo por curso
  if (faltasPorCurso.value.length > 0) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Resumo por Curso', 14, yPos)
    
    yPos += 7
    
    const resumoData = faltasPorCurso.value.map(grupo => [
      grupo.nomeCurso,
      grupo.faltas.length.toString(),
      `R$ ${grupo.total.toFixed(2).replace('.', ',')}`
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Curso', 'Faltas', 'Total em Multas']],
      body: resumoData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    })
    
    yPos = (doc as any).lastAutoTable.finalY + 10
  }
  
  // Histórico detalhado de faltas
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Histórico Detalhado', 14, yPos)
  
  yPos += 7
  
  const faltasData = faltas.value.map(falta => {
    const date = criarDataLocal(falta.data_falta)
    const dataFormatada = date.toLocaleDateString('pt-BR')
    const diaSemana = date.toLocaleDateString('pt-BR', { weekday: 'short' })
    const curso = falta.cursos?.nome || 'Sem curso'
    const valor = `R$ ${parseFloat(falta.valor_multa || 0).toFixed(2).replace('.', ',')}`
    const motivo = falta.motivo || '-'
    
    return [dataFormatada, diaSemana, curso, valor, motivo]
  })
  
  autoTable(doc, {
    startY: yPos,
    head: [['Data', 'Dia', 'Curso', 'Multa', 'Motivo']],
    body: faltasData,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 20 },
      2: { cellWidth: 50 },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 60 }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  })
  
  yPos = (doc as any).lastAutoTable.finalY + 15
  
  // Histórico de Pagamentos (se houver)
  if (pagamentos.value.length > 0) {
    // Verificar se precisa de nova página
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Histórico de Pagamentos', 14, yPos)
    
    yPos += 7
    
    const pagamentosData = pagamentos.value.map(pagamento => {
      const date = criarDataLocal(pagamento.data_pagamento)
      const dataFormatada = date.toLocaleDateString('pt-BR')
      const diaSemana = date.toLocaleDateString('pt-BR', { weekday: 'short' })
      const valor = `R$ ${parseFloat(pagamento.valor_pago || 0).toFixed(2).replace('.', ',')}`
      const obs = pagamento.observacoes || '-'
      
      return [dataFormatada, diaSemana, valor, obs]
    })
    
    autoTable(doc, {
      startY: yPos,
      head: [['Data', 'Dia', 'Valor Pago', 'Observações']],
      body: pagamentosData,
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 105 }
      },
      alternateRowStyles: { fillColor: [240, 253, 244] }
    })
  }
  
  // Rodapé
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
  const nomeArquivo = `faltas_${aluno.value.nome_completo.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(nomeArquivo)
}

// Buscar ao montar
onMounted(() => {
  buscarDados()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Faltas"
      description="Buscando histórico de faltas..."
    />
    
    <div v-else class="space-y-4 sm:space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-foreground">Calendário de Faltas</h2>
          <p class="text-sm sm:text-base text-muted-foreground mt-1">
            Histórico de faltas registradas no seu curso
          </p>
        </div>
        
        <!-- Botão Exportar PDF -->
        <button
          v-if="faltas.length > 0"
          @click="gerarPDF"
          class="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/50 text-sm sm:text-base whitespace-nowrap"
        >
          <Icon icon="file-pdf" class-name="w-4 h-4 sm:w-5 sm:h-5" fallback="📄" />
          <span class="hidden sm:inline">Exportar PDF</span>
          <span class="sm:hidden">PDF</span>
        </button>
      </div>
      
      <!-- Cards de Resumo -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <!-- Total de Faltas -->
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="calendar-times" class-name="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" fallback="📅" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total de Faltas</p>
              <p class="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{{ faltas.length }}</p>
            </div>
          </div>
        </div>
        
        <!-- Débito Atual -->
        <div class="bg-card border-2 rounded-lg p-4 sm:p-6" :class="aluno?.debito_faltas > 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-green-500 bg-green-50 dark:bg-green-900/10'">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0" :class="aluno?.debito_faltas > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'">
              <Icon :icon="aluno?.debito_faltas > 0 ? 'exclamation-triangle' : 'check-circle'" class-name="w-5 h-5 sm:w-6 sm:h-6" :class="aluno?.debito_faltas > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'" :fallback="aluno?.debito_faltas > 0 ? '⚠️' : '✅'" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium truncate" :class="aluno?.debito_faltas > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'">
                {{ aluno?.debito_faltas > 0 ? 'Débito Atual' : 'Quitado' }}
              </p>
              <p class="text-xl sm:text-2xl font-bold truncate" :class="aluno?.debito_faltas > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
                R$ {{ aluno?.debito_faltas ? parseFloat(aluno.debito_faltas).toFixed(2).replace('.', ',') : '0,00' }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Total em Multas (Histórico) -->
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="dollar-sign" class-name="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" fallback="💰" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Histórico</p>
              <p class="text-xl sm:text-2xl font-bold text-foreground truncate">
                R$ {{ totalMultas.toFixed(2).replace('.', ',') }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Valor Padrão por Falta -->
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="info-circle" class-name="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fallback="ℹ️" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-muted-foreground truncate">Valor Padrão</p>
              <p class="text-xl sm:text-2xl font-bold text-foreground truncate">
                R$ {{ aluno?.multa_falta ? parseFloat(aluno.multa_falta).toFixed(2).replace('.', ',') : '0,00' }}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Total Pago -->
        <div class="bg-card border-2 border-green-500 bg-green-50 dark:bg-green-900/10 rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="check-circle" class-name="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" fallback="✅" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300 truncate">
                Total Pago
                <span v-if="pagamentos.length > 0" class="ml-1">({{ pagamentos.length }}x)</span>
              </p>
              <p class="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                R$ {{ totalPago.toFixed(2).replace('.', ',') }}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Alerta se não houver pagamentos mas deveria ter -->
      <div v-if="pagamentos.length === 0 && totalMultas > 0 && aluno?.debito_faltas === 0" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <Icon icon="exclamation-triangle" class-name="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fallback="⚠️" />
          <div class="text-sm text-yellow-800 dark:text-yellow-200">
            <p class="font-semibold mb-1">Atenção: Histórico de pagamentos não encontrado</p>
            <p>Você tem débito quitado mas não encontramos registros de pagamento. Isso pode indicar:</p>
            <ul class="list-disc ml-5 mt-2 space-y-1">
              <li>Os pagamentos ainda não foram registrados no sistema</li>
              <li>Problema de permissão ao acessar o histórico</li>
              <li>Abra o Console do navegador (F12) para ver detalhes técnicos</li>
            </ul>
          </div>
        </div>
      </div>
      

      
      <!-- Nota Explicativa sobre Débito -->
      <div v-if="aluno?.debito_faltas > 0 || (totalMultas > 0 && aluno?.debito_faltas === 0)" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <Icon icon="info-circle" class-name="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fallback="ℹ️" />
          <div class="text-sm text-blue-800 dark:text-blue-200">
            <p v-if="aluno?.debito_faltas > 0">
              <strong>Débito Atual:</strong> É o valor que você ainda deve pagar. Esse valor é atualizado quando você faz pagamentos.
            </p>
            <p v-else class="text-green-700 dark:text-green-300 font-semibold">
              ✅ Parabéns! Seu débito está quitado. Continue assim!
            </p>
            <p v-if="totalMultas !== aluno?.debito_faltas" class="mt-1">
              <strong>Total Histórico:</strong> É a soma de todas as multas já registradas (inclui valores já pagos).
            </p>
          </div>
        </div>
      </div>
      
      <!-- Faltas por Curso -->
      <div v-if="faltasPorCurso.length > 0" class="bg-card border border-border rounded-lg">
        <div class="p-4 sm:p-6 border-b border-border">
          <h3 class="text-base sm:text-lg font-semibold text-foreground">Resumo por Curso</h3>
        </div>
        
        <div class="divide-y divide-border">
          <div
            v-for="(grupo, index) in faltasPorCurso"
            :key="index"
            class="p-4 sm:p-6 hover:bg-muted/30 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon icon="book" class-name="w-5 h-5 text-primary" fallback="📚" />
                </div>
                <div>
                  <p class="font-semibold text-foreground">{{ grupo.nomeCurso }}</p>
                  <p class="text-xs sm:text-sm text-muted-foreground">
                    {{ grupo.faltas.length }} falta{{ grupo.faltas.length !== 1 ? 's' : '' }} registrada{{ grupo.faltas.length !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                  R$ {{ grupo.total.toFixed(2).replace('.', ',') }}
                </p>
                <p class="text-xs text-muted-foreground">em multas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Histórico de Pagamentos -->
      <div v-if="pagamentos.length > 0" class="bg-card border border-border rounded-lg">
        <button
          @click="mostrarPagamentos = !mostrarPagamentos"
          class="w-full p-4 sm:p-6 border-b border-border hover:bg-muted/30 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="check-circle" class-name="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" fallback="✓" />
              </div>
              <div class="text-left">
                <h3 class="text-base sm:text-lg font-semibold text-foreground flex items-center">
                  Histórico de Pagamentos
                  <span class="ml-2 px-2 py-0.5 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                    {{ pagamentos.length }}
                  </span>
                </h3>
                <p class="text-xs sm:text-sm text-muted-foreground mt-1">
                  Total pago: <span class="font-semibold text-green-600 dark:text-green-400">R$ {{ totalPago.toFixed(2).replace('.', ',') }}</span>
                </p>
              </div>
            </div>
            <Icon 
              :icon="mostrarPagamentos ? 'chevron-up' : 'chevron-down'" 
              class-name="w-5 h-5 text-muted-foreground transition-transform" 
              :fallback="mostrarPagamentos ? '▲' : '▼'" 
            />
          </div>
        </button>
        
        <Transition name="fade">
          <div v-show="mostrarPagamentos" class="divide-y divide-border">
            <div
              v-for="pagamento in pagamentos"
              :key="pagamento.id"
              class="p-4 sm:p-6 hover:bg-muted/30 transition-colors"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <!-- Data do Pagamento -->
                  <div class="flex items-center flex-wrap gap-2 mb-2">
                    <Icon icon="calendar-check" class-name="w-4 h-4 text-green-600 dark:text-green-400" fallback="✅" />
                    <p class="font-semibold text-foreground">
                      {{ formatarData(pagamento.data_pagamento) }}
                    </p>
                    <span class="text-xs sm:text-sm text-muted-foreground capitalize">
                      ({{ formatarDiaSemana(pagamento.data_pagamento) }})
                    </span>
                  </div>
                  
                  <!-- Observações -->
                  <div v-if="pagamento.observacoes" class="flex items-start space-x-2 mt-2">
                    <Icon icon="comment" class-name="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fallback="💬" />
                    <p class="text-xs sm:text-sm text-muted-foreground">
                      {{ pagamento.observacoes }}
                    </p>
                  </div>
                </div>
                
                <!-- Valor Pago -->
                <div class="ml-4 flex-shrink-0 text-right">
                  <p class="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                    R$ {{ parseFloat(pagamento.valor_pago || 0).toFixed(2).replace('.', ',') }}
                  </p>
                  <p class="text-xs text-muted-foreground">pago</p>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
      
      <!-- Lista de Faltas -->
      <div class="bg-card border border-border rounded-lg">
        <div class="p-4 sm:p-6 border-b border-border">
          <h3 class="text-base sm:text-lg font-semibold text-foreground">Histórico de Faltas</h3>
        </div>
        
        <div v-if="faltas.length === 0" class="p-8 sm:p-12 text-center">
          <Icon icon="check-circle" class-name="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" fallback="✓" />
          <h3 class="text-base sm:text-lg font-medium text-foreground mb-2">Nenhuma falta registrada</h3>
          <p class="text-sm text-muted-foreground">
            Continue mantendo sua frequência! 🎉
          </p>
        </div>
        
        <div v-else class="divide-y divide-border">
          <div
            v-for="falta in faltas"
            :key="falta.id"
            class="p-4 sm:p-6 hover:bg-muted/30 transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <!-- Data -->
                <div class="flex items-center space-x-2 mb-2">
                  <Icon icon="calendar" class-name="w-4 h-4 text-muted-foreground" fallback="📅" />
                  <p class="font-semibold text-foreground">
                    {{ formatarData(falta.data_falta) }}
                  </p>
                  <span class="text-xs sm:text-sm text-muted-foreground capitalize">
                    ({{ formatarDiaSemana(falta.data_falta) }})
                  </span>
                </div>
                
                <!-- Curso -->
                <div v-if="falta.cursos?.nome" class="flex items-center space-x-2 mb-2">
                  <Icon icon="book" class-name="w-4 h-4 text-primary" fallback="📚" />
                  <p class="text-xs sm:text-sm font-medium text-primary">
                    {{ falta.cursos.nome }}
                  </p>
                </div>
                
                <!-- Motivo -->
                <div v-if="falta.motivo" class="flex items-start space-x-2 mb-1">
                  <Icon icon="info-circle" class-name="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fallback="ℹ️" />
                  <p class="text-xs sm:text-sm text-muted-foreground">
                    <strong>Motivo:</strong> {{ falta.motivo }}
                  </p>
                </div>
                
                <!-- Observações -->
                <div v-if="falta.observacoes" class="flex items-start space-x-2">
                  <Icon icon="file-alt" class-name="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" fallback="📄" />
                  <p class="text-xs sm:text-sm text-muted-foreground">
                    {{ falta.observacoes }}
                  </p>
                </div>
              </div>
              
              <!-- Valor da Multa -->
              <div class="ml-4 flex-shrink-0 text-right">
                <p class="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                  R$ {{ parseFloat(falta.valor_multa || 0).toFixed(2).replace('.', ',') }}
                </p>
                <p class="text-xs text-muted-foreground">multa</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  max-height: 0;
  overflow: hidden;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  max-height: 2000px;
}
</style>
