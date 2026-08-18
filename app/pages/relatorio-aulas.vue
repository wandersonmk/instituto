<script setup lang="ts">
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const isLoading = ref(true)
const gerandoPdf = ref(false)
const erro = ref<string | null>(null)
const aulas = ref<AulaRelatorio[]>([])
const cursos = ref<any[]>([])
const professores = ref<any[]>([])

const filtroCurso = ref<string>('')
const filtroProfessor = ref<string>('')
const filtroDe = ref<string>('')
const filtroAte = ref<string>('')

const aulaExpandida = ref<string | null>(null)
const detalhes = ref<Record<string, AlunoNaAula[]>>({})
const carregandoDetalhe = ref<string | null>(null)

const { listarAulas, detalharAula, listarCursos, listarProfessores } = useRelatorioAulas()

async function carregar() {
  erro.value = null
  try {
    aulas.value = await listarAulas({
      cursoId: filtroCurso.value || null,
      professorId: filtroProfessor.value || null,
      de: filtroDe.value || null,
      ate: filtroAte.value || null
    })
  } catch (e: any) {
    erro.value = e?.message || 'Não foi possível carregar o relatório.'
  } finally {
    isLoading.value = false
  }
}

async function alternarDetalhe(aula: AulaRelatorio) {
  if (aulaExpandida.value === aula.id) {
    aulaExpandida.value = null
    return
  }
  aulaExpandida.value = aula.id
  if (!detalhes.value[aula.id]) {
    carregandoDetalhe.value = aula.id
    detalhes.value[aula.id] = await detalharAula(aula.id)
    carregandoDetalhe.value = null
  }
}

function limparFiltros() {
  filtroCurso.value = ''
  filtroProfessor.value = ''
  filtroDe.value = ''
  filtroAte.value = ''
  carregar()
}

// ------------------------------------------------------------------ resumo

const resumo = computed(() => {
  const total = aulas.value.length
  const presencas = aulas.value.reduce((s, a) => s + (a.total_presentes || 0), 0)
  const faltas = aulas.value.reduce((s, a) => s + (a.total_faltas || 0), 0)
  const chamadas = presencas + faltas
  return {
    total,
    presencas,
    faltas,
    frequencia: chamadas > 0 ? Math.round((presencas / chamadas) * 100) : 0
  }
})

// ------------------------------------------------------------------ helpers

function formatarData(iso: string | null) {
  if (!iso) return '--'
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

function formatarHora(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function duracao(inicio: string | null, fim: string | null) {
  if (!inicio || !fim) return null
  const min = Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000)
  if (min < 60) return `${min}min`
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

// --------------------------------------------------------------------- PDF

function exportarPdf() {
  if (gerandoPdf.value) return
  gerandoPdf.value = true

  try {
    const doc = new jsPDF()
    const largura = doc.internal.pageSize.width
    const altura = doc.internal.pageSize.height
    // Só pula de página quando o que vem a seguir realmente não cabe mais —
    // nada de addPage() incondicional, que espalha um relatório pequeno em
    // várias folhas quase vazias.
    const espacoParaProximaSecao = (yAtual: number) => {
      if (yAtual > altura - 55) {
        doc.addPage()
        return 20
      }
      return yAtual
    }
    let y = 20

    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text('Relatório de Aulas', largura / 2, y, { align: 'center' })
    y += 7

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120)
    doc.text('Instituto Fios de Ouro', largura / 2, y, { align: 'center' })
    y += 5
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, largura / 2, y, { align: 'center' })
    y += 8

    const nomeCurso = filtroCurso.value ? cursos.value.find((c: any) => c.id === filtroCurso.value)?.nome : null
    const nomeProfessor = filtroProfessor.value ? professores.value.find((p: any) => p.id === filtroProfessor.value)?.nome : null
    const partesFiltro: string[] = []
    if (nomeCurso) partesFiltro.push(`Curso: ${nomeCurso}`)
    if (nomeProfessor) partesFiltro.push(`Professor: ${nomeProfessor}`)
    if (filtroDe.value) partesFiltro.push(`De: ${formatarData(filtroDe.value)}`)
    if (filtroAte.value) partesFiltro.push(`Até: ${formatarData(filtroAte.value)}`)

    if (partesFiltro.length > 0) {
      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`Filtros aplicados: ${partesFiltro.join(' · ')}`, 14, y)
      y += 8
    } else {
      y += 3
    }

    doc.setDrawColor(230)
    doc.line(14, y, largura - 14, y)
    y += 8

    // Resumo geral
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text('Resumo Geral', 14, y)
    y += 7

    autoTable(doc, {
      startY: y,
      head: [['Total de Aulas', 'Presenças', 'Faltas', 'Frequência']],
      body: [[String(resumo.value.total), String(resumo.value.presencas), String(resumo.value.faltas), `${resumo.value.frequencia}%`]],
      theme: 'grid',
      headStyles: { fillColor: [217, 164, 6], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 9, cellPadding: 3, halign: 'center' }
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // O que o dono do negócio realmente quer daqui: por curso, quantas
    // aulas aconteceram no período filtrado e quantos faltaram — não uma
    // lista única misturando todos os cursos. Por isso agrupa e dá uma
    // seção (com o próprio mini-resumo) pra cada curso, na ordem alfabética.
    const porCurso = new Map<string, { nome: string; aulas: AulaRelatorio[] }>()
    for (const a of aulas.value) {
      const chave = a.curso_id || 'sem-curso'
      const grupo = porCurso.get(chave) || { nome: a.curso_nome || 'Curso removido', aulas: [] }
      grupo.aulas.push(a)
      porCurso.set(chave, grupo)
    }

    const gruposOrdenados = Array.from(porCurso.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    for (const grupo of gruposOrdenados) {
      y = espacoParaProximaSecao(y)

      const totalPresentes = grupo.aulas.reduce((s, a) => s + (a.total_presentes || 0), 0)
      const totalFaltas = grupo.aulas.reduce((s, a) => s + (a.total_faltas || 0), 0)
      const totalSemMarcar = grupo.aulas.reduce((s, a) => s + (a.total_sem_marcar || 0), 0)
      const chamadas = totalPresentes + totalFaltas
      const frequencia = chamadas > 0 ? Math.round((totalPresentes / chamadas) * 100) : 0

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30)
      doc.text(grupo.nome, 14, y)
      y += 5.5

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100)
      const linhaResumo = `${grupo.aulas.length} aula(s) · ${totalPresentes} presente(s) · ${totalFaltas} falta(s)`
        + (totalSemMarcar > 0 ? ` · ${totalSemMarcar} sem marcar` : '')
        + ` · ${frequencia}% de frequência`
      doc.text(linhaResumo, 14, y)
      y += 6

      autoTable(doc, {
        startY: y,
        head: [['Data', 'Aula', 'Professor', 'Status', 'Presentes', 'Faltas', 'Sem marcar']],
        body: grupo.aulas.map(a => [
          formatarData(a.data_aula),
          a.numero_aula != null ? String(a.numero_aula) : '-',
          a.professor_nome || '-',
          a.status === 'aberta' ? 'Em andamento' : 'Finalizada',
          String(a.total_presentes),
          String(a.total_faltas),
          String(a.total_sem_marcar)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 16, halign: 'center' },
          2: { cellWidth: 40 },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 24, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 28, halign: 'center' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }

    const totalPaginas = doc.getNumberOfPages()
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Página ${i} de ${totalPaginas}`, largura / 2, doc.internal.pageSize.height - 10, { align: 'center' })
    }

    const dataArquivo = new Date().toISOString().split('T')[0]
    doc.save(`relatorio_aulas_${dataArquivo}.pdf`)
  } finally {
    gerandoPdf.value = false
  }
}

onMounted(async () => {
  // listas dos filtros carregam junto, senão os selects ficam vazios
  const [c, p] = await Promise.all([listarCursos(), listarProfessores()])
  cursos.value = c
  professores.value = p
  await carregar()
})
</script>

<template>
  <div>
    <AppLoading v-if="isLoading" title="Carregando Relatório" description="Buscando as aulas..." />

    <div v-else class="space-y-3">
      <!-- Cabeçalho + resumo compacto -->
      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 class="text-lg font-bold text-foreground">Relatório de Aulas</h2>
            <p class="text-xs text-muted-foreground">Histórico de todas as aulas dadas</p>
          </div>
          <button
            @click="exportarPdf"
            :disabled="gerandoPdf || aulas.length === 0"
            class="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-50 flex-shrink-0"
          >
            <Icon icon="file-pdf" class-name="w-4 h-4" fallback="📄" />
            <span class="hidden sm:inline">{{ gerandoPdf ? 'Gerando...' : 'Exportar PDF' }}</span>
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="rounded-lg bg-muted/50 px-3 py-2">
            <p class="text-lg font-bold text-foreground leading-tight">{{ resumo.total }}</p>
            <p class="text-[11px] text-muted-foreground">Aulas</p>
          </div>
          <div class="rounded-lg bg-emerald-50 dark:bg-emerald-900/15 px-3 py-2">
            <p class="text-lg font-bold text-emerald-700 dark:text-emerald-300 leading-tight">{{ resumo.presencas }}</p>
            <p class="text-[11px] text-muted-foreground">Presenças</p>
          </div>
          <div class="rounded-lg bg-red-50 dark:bg-red-900/15 px-3 py-2">
            <p class="text-lg font-bold text-red-700 dark:text-red-300 leading-tight">{{ resumo.faltas }}</p>
            <p class="text-[11px] text-muted-foreground">Faltas</p>
          </div>
          <div class="rounded-lg bg-primary/10 px-3 py-2">
            <p class="text-lg font-bold text-primary leading-tight">{{ resumo.frequencia }}%</p>
            <p class="text-[11px] text-muted-foreground">Frequência</p>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-card border border-border rounded-lg p-3">
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select v-model="filtroCurso" @change="carregar" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground">
            <option value="">Todos os cursos</option>
            <option v-for="c in cursos" :key="c.id" :value="c.id">{{ c.nome }}</option>
          </select>
          <select v-model="filtroProfessor" @change="carregar" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground">
            <option value="">Todos os professores</option>
            <option v-for="p in professores" :key="p.id" :value="p.id">{{ p.nome }}</option>
          </select>
          <input v-model="filtroDe" @change="carregar" type="date" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground" />
          <input v-model="filtroAte" @change="carregar" type="date" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground" />
          <button @click="limparFiltros" class="px-3 py-1.5 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors">
            Limpar
          </button>
        </div>
      </div>

      <div v-if="erro" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-3">
        <p class="text-sm text-red-800 dark:text-red-200">{{ erro }}</p>
      </div>

      <div v-else-if="aulas.length === 0" class="bg-card border border-border rounded-lg p-8 text-center">
        <Icon icon="calendar" class-name="w-10 h-10 text-muted-foreground mx-auto mb-3" fallback="📅" />
        <h3 class="font-semibold text-foreground mb-1">Nenhuma aula encontrada</h3>
        <p class="text-sm text-muted-foreground">Ajuste os filtros ou aguarde os professores registrarem aulas.</p>
      </div>

      <!-- Lista de aulas -->
      <div v-else class="space-y-2">
        <div
          v-for="aula in aulas"
          :key="aula.id"
          class="bg-card border border-border rounded-lg overflow-hidden"
        >
          <button
            @click="alternarDetalhe(aula)"
            class="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
          >
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="text-sm font-semibold text-foreground">{{ aula.curso_nome || 'Curso removido' }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Aula {{ aula.numero_aula }}</span>
              <span
                class="text-xs px-1.5 py-0.5 rounded"
                :class="aula.status === 'aberta'
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground'"
              >
                {{ aula.status === 'aberta' ? 'em andamento' : 'finalizada' }}
              </span>
              <span class="ml-auto text-xs text-muted-foreground">{{ formatarData(aula.data_aula) }}</span>
            </div>

            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
              <span>{{ aula.professor_nome || 'Sem professor' }}</span>
              <span>
                {{ formatarHora(aula.iniciada_at) }}
                <template v-if="aula.finalizada_at">→ {{ formatarHora(aula.finalizada_at) }}</template>
                <template v-if="duracao(aula.iniciada_at, aula.finalizada_at)">
                  ({{ duracao(aula.iniciada_at, aula.finalizada_at) }})
                </template>
              </span>
              <span v-if="aula.tema" class="italic truncate max-w-[16rem]">{{ aula.tema }}</span>

              <span class="ml-auto flex items-center gap-2">
                <span class="text-emerald-600 dark:text-emerald-400 font-medium">{{ aula.total_presentes }} presentes</span>
                <span class="text-red-600 dark:text-red-400 font-medium">{{ aula.total_faltas }} faltas</span>
                <span v-if="aula.total_sem_marcar > 0" class="text-amber-600 dark:text-amber-400">
                  {{ aula.total_sem_marcar }} sem marcar
                </span>
                <span class="text-muted-foreground">de {{ aula.total_matriculados }}</span>
              </span>
            </div>
          </button>

          <!-- Detalhe da chamada -->
          <div v-if="aulaExpandida === aula.id" class="border-t border-border bg-muted/20 px-4 py-3">
            <p v-if="carregandoDetalhe === aula.id" class="text-xs text-muted-foreground">Carregando chamada...</p>
            <p v-else-if="(detalhes[aula.id] || []).length === 0" class="text-xs text-muted-foreground">
              Nenhuma marcação de presença nesta aula.
            </p>
            <div v-else class="grid gap-1.5 sm:grid-cols-2">
              <div
                v-for="a in detalhes[aula.id]"
                :key="a.aluno_id"
                class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-background border border-border"
              >
                <div class="min-w-0">
                  <p class="text-xs font-medium text-foreground truncate">{{ a.nome }}</p>
                  <p v-if="a.motivo_falta" class="text-[11px] text-amber-600 dark:text-amber-400 truncate">
                    {{ a.motivo_falta }}
                  </p>
                </div>
                <span
                  class="text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap"
                  :class="a.status === 'concluida' || a.status === 'presente'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : a.status === 'falta'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-muted text-muted-foreground'"
                >
                  {{ a.status === 'falta' ? 'Falta' : a.status === 'aguardando' ? 'Sem marcar' : 'Presente' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
