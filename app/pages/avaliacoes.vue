<script setup lang="ts">
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

/** Quantas avaliações buscar por vez — "carregar mais" evita puxar milhares de cards de uma vez. */
const PAGE_SIZE = 24

const isLoading = ref(true)
const carregandoMais = ref(false)
const gerandoPdf = ref(false)
const erro = ref<string | null>(null)

const avaliacoes = ref<AvaliacaoAula[]>([])
const totalFiltrado = ref(0)

const cursos = ref<{ id: string; nome: string }[]>([])
const professores = ref<{ id: string; nome: string }[]>([])

const filtroCurso = ref('')
const filtroProfessor = ref('')
const filtroDe = ref('')
const filtroAte = ref('')
const somenteComDificuldade = ref(false)
const busca = ref('')

const avaliacaoAberta = ref<AvaliacaoAula | null>(null)
const abaModal = ref<1 | 2>(1)

const resumo = ref<ResumoAvaliacoes>({ total: 0, mediaProfessor: '–', mediaLocal: '–', comDificuldade: 0 })

const { listarAvaliacoes, listarTodasParaExportar, listarCursos, listarProfessoresComAvaliacao, buscarResumo } = useAvaliacoes()
const { marcarAvaliacoesVistas } = useNotificacoesAdmin()

function filtrosAtuais(): FiltrosAvaliacoes {
  return {
    cursoId: filtroCurso.value || null,
    professorId: filtroProfessor.value || null,
    de: filtroDe.value || null,
    ate: filtroAte.value || null,
    somenteComDificuldade: somenteComDificuldade.value
  }
}

async function carregar() {
  erro.value = null
  isLoading.value = true
  try {
    const [{ dados, total }, resumoNovo] = await Promise.all([
      listarAvaliacoes(filtrosAtuais(), { offset: 0, limite: PAGE_SIZE }),
      buscarResumo(filtrosAtuais())
    ])
    avaliacoes.value = dados
    totalFiltrado.value = total
    resumo.value = resumoNovo
  } catch (e: any) {
    erro.value = e?.message || 'Não foi possível carregar as avaliações.'
  } finally {
    isLoading.value = false
  }
}

async function carregarMais() {
  if (carregandoMais.value) return
  carregandoMais.value = true
  try {
    const { dados } = await listarAvaliacoes(filtrosAtuais(), { offset: avaliacoes.value.length, limite: PAGE_SIZE })
    avaliacoes.value = [...avaliacoes.value, ...dados]
  } catch (e: any) {
    const toast = await useToastSafe()
    toast?.error(e?.message || 'Não foi possível carregar mais avaliações.')
  } finally {
    carregandoMais.value = false
  }
}

function limparFiltros() {
  filtroCurso.value = ''
  filtroProfessor.value = ''
  filtroDe.value = ''
  filtroAte.value = ''
  somenteComDificuldade.value = false
  busca.value = ''
  carregar()
}

// A busca livre só procura dentro do que já foi carregado na tela — os
// filtros estruturados (curso, professor, período, dificuldade) acima são
// quem garante o resultado certo mesmo com milhares de avaliações no banco.
const listaFiltrada = computed(() => {
  const termo = busca.value.trim().toLowerCase()
  if (!termo) return avaliacoes.value
  return avaliacoes.value.filter(a =>
    [a.aluno_nome, a.curso_nome, a.professor_nome, a.o_que_aprendeu, a.sugestoes, a.dificuldades, a.avaliacao_profissional]
      .filter(Boolean)
      .some(campo => String(campo).toLowerCase().includes(termo))
  )
})

// Enquanto há busca livre ativa, "carregar mais" ficaria confuso (o texto só
// filtra o que já está na tela) — some o botão nesse caso.
const podeCarregarMais = computed(() => !busca.value.trim() && avaliacoes.value.length < totalFiltrado.value)

function corDaNota(nota: number) {
  if (nota >= 8) return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
  if (nota >= 6) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function abrirDetalhes(av: AvaliacaoAula) {
  avaliacaoAberta.value = av
  abaModal.value = 1
}

function fecharDetalhes() {
  avaliacaoAberta.value = null
}

// --------------------------------------------------------------------- PDF

function gerarPdfRelatorio(dados: AvaliacaoAula[], resumoGeral: ResumoAvaliacoes, filtros: FiltrosAvaliacoes) {
  const doc = new jsPDF()
  const largura = doc.internal.pageSize.width
  const altura = doc.internal.pageSize.height
  // Só pula de página quando o que vem a seguir realmente não cabe mais —
  // nada de addPage() incondicional, que era o que espalhava um relatório
  // pequeno em 3 folhas quase vazias.
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
  doc.text('Relatório de Avaliações', largura / 2, y, { align: 'center' })
  y += 7

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120)
  doc.text('Instituto Fios de Ouro', largura / 2, y, { align: 'center' })
  y += 5
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, largura / 2, y, { align: 'center' })
  y += 8

  const nomeCurso = filtros.cursoId ? cursos.value.find(c => c.id === filtros.cursoId)?.nome : null
  const nomeProfessor = filtros.professorId ? professores.value.find(p => p.id === filtros.professorId)?.nome : null
  const partesFiltro: string[] = []
  if (nomeCurso) partesFiltro.push(`Curso: ${nomeCurso}`)
  if (nomeProfessor) partesFiltro.push(`Professor: ${nomeProfessor}`)
  if (filtros.de) partesFiltro.push(`De: ${new Date(`${filtros.de}T00:00:00`).toLocaleDateString('pt-BR')}`)
  if (filtros.ate) partesFiltro.push(`Até: ${new Date(`${filtros.ate}T00:00:00`).toLocaleDateString('pt-BR')}`)
  if (filtros.somenteComDificuldade) partesFiltro.push('Somente com dificuldade relatada')

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
    head: [['Total de Respostas', 'Média Professor', 'Média Local', 'Relataram Dificuldade']],
    body: [[String(resumoGeral.total), resumoGeral.mediaProfessor, resumoGeral.mediaLocal, String(resumoGeral.comDificuldade)]],
    theme: 'grid',
    headStyles: { fillColor: [217, 164, 6], textColor: 255, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' }
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Resumo por Professor e Curso — junto, não separado, porque é isso que
  // realmente responde "qual professor, qual curso, qual nota" numa olhada só.
  const porProfessorCurso = new Map<string, { professor: string; curso: string; qtd: number; somaProf: number; somaLocal: number }>()
  for (const a of dados) {
    const professor = a.professor_nome || 'Professor não registrado'
    const curso = a.curso_nome || 'Curso removido'
    const chave = `${professor}|${curso}`
    const atual = porProfessorCurso.get(chave) || { professor, curso, qtd: 0, somaProf: 0, somaLocal: 0 }
    atual.qtd++
    atual.somaProf += a.nota_professor
    atual.somaLocal += a.nota_local
    porProfessorCurso.set(chave, atual)
  }

  if (porProfessorCurso.size > 0) {
    y = espacoParaProximaSecao(y)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30)
    doc.text('Resumo por Professor e Curso', 14, y)
    y += 7

    const linhas = Array.from(porProfessorCurso.values())
      .sort((a, b) => b.qtd - a.qtd)
      .map(p => [p.professor, p.curso, String(p.qtd), (p.somaProf / p.qtd).toFixed(1), (p.somaLocal / p.qtd).toFixed(1)])

    autoTable(doc, {
      startY: y,
      head: [['Professor', 'Curso', 'Avaliações', 'Nota Professor', 'Nota Local']],
      body: linhas,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 55 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 27, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' }
      }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Dificuldades relatadas
  const comDificuldade = dados.filter(a => a.dificuldades)
  if (comDificuldade.length > 0) {
    y = espacoParaProximaSecao(y)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9)
    doc.text(`Dificuldades Relatadas (${comDificuldade.length})`, 14, y)
    y += 7

    autoTable(doc, {
      startY: y,
      head: [['Data', 'Aluno', 'Curso', 'Professor', 'Dificuldade relatada']],
      body: comDificuldade.map(a => [
        formatarDataHora(a.created_at), a.aluno_nome, a.curso_nome || '-', a.professor_nome || '-', a.dificuldades || '-'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 26 },
        4: { cellWidth: 'auto' }
      },
      alternateRowStyles: { fillColor: [255, 251, 235] }
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Histórico completo — só entra se sobrar espaço/fizer sentido; o autoTable
  // já sabe quebrar página sozinho se a tabela continuar além disso.
  y = espacoParaProximaSecao(y)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30)
  doc.text(`Histórico Completo (${dados.length} avaliações)`, 14, y)
  y += 7

  autoTable(doc, {
    startY: y,
    head: [['Data', 'Aluno', 'Curso', 'Professor', 'Nota Prof.', 'Nota Local']],
    body: dados.map(a => [
      formatarDataHora(a.created_at), a.aluno_nome, a.curso_nome || '-', a.professor_nome || '-', String(a.nota_professor), String(a.nota_local)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 36 },
      2: { cellWidth: 36 },
      3: { cellWidth: 30 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  })

  const totalPaginas = doc.getNumberOfPages()
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Página ${i} de ${totalPaginas}`, largura / 2, doc.internal.pageSize.height - 10, { align: 'center' })
  }

  const dataArquivo = new Date().toISOString().split('T')[0]
  doc.save(`relatorio_avaliacoes_${dataArquivo}.pdf`)
}

async function exportarPdf() {
  if (gerandoPdf.value) return
  gerandoPdf.value = true
  const toast = await useToastSafe()
  try {
    const { dados, truncado } = await listarTodasParaExportar(filtrosAtuais())
    if (dados.length === 0) {
      toast?.warning('Não há avaliações pra exportar com esses filtros.')
      return
    }
    gerarPdfRelatorio(dados, resumo.value, filtrosAtuais())
    toast?.success('PDF gerado com sucesso!')
    if (truncado) {
      toast?.warning(`O relatório tem mais de ${LIMITE_EXPORTACAO_AVALIACOES} avaliações — reduza o período pra exportar tudo.`)
    }
  } catch (e: any) {
    toast?.error(e?.message || 'Erro ao gerar o PDF.')
  } finally {
    gerandoPdf.value = false
  }
}

onMounted(async () => {
  const [listaCursos, listaProfessores] = await Promise.all([listarCursos(), listarProfessoresComAvaliacao()])
  cursos.value = listaCursos
  professores.value = listaProfessores
  await carregar()
  // Admin abriu a página = já viu as avaliações — some o badge do menu.
  // Se quem estiver logado não for admin, a RPC recusa e isso só loga o erro.
  await marcarAvaliacoesVistas()
})
</script>

<template>
  <div>
    <AppLoading v-if="isLoading" title="Carregando Avaliações" description="Buscando o que os alunos responderam..." />

    <div v-else class="space-y-3">
      <!-- Cabeçalho + resumo -->
      <div class="bg-card border border-border rounded-lg p-4">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 class="text-lg font-bold text-foreground">Avaliações dos Alunos</h2>
            <p class="text-xs text-muted-foreground">O que os alunos responderam ao final de cada aula</p>
          </div>
          <button
            @click="exportarPdf"
            :disabled="gerandoPdf"
            class="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-50 flex-shrink-0"
          >
            <Icon icon="file-pdf" class-name="w-4 h-4" fallback="📄" />
            <span class="hidden sm:inline">{{ gerandoPdf ? 'Gerando...' : 'Exportar PDF' }}</span>
          </button>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div class="rounded-lg bg-muted/50 px-3 py-2">
            <p class="text-lg font-bold text-foreground leading-tight">{{ resumo.total }}</p>
            <p class="text-[11px] text-muted-foreground">Respostas</p>
          </div>
          <div class="rounded-lg bg-primary/10 px-3 py-2">
            <p class="text-lg font-bold text-primary leading-tight">{{ resumo.mediaProfessor }}</p>
            <p class="text-[11px] text-muted-foreground">Média professor</p>
          </div>
          <div class="rounded-lg bg-primary/10 px-3 py-2">
            <p class="text-lg font-bold text-primary leading-tight">{{ resumo.mediaLocal }}</p>
            <p class="text-[11px] text-muted-foreground">Média local</p>
          </div>
          <div class="rounded-lg bg-amber-50 dark:bg-amber-900/15 px-3 py-2">
            <p class="text-lg font-bold text-amber-700 dark:text-amber-300 leading-tight">{{ resumo.comDificuldade }}</p>
            <p class="text-[11px] text-muted-foreground">Relataram dificuldade</p>
          </div>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-card border border-border rounded-lg p-3 space-y-2">
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input v-model="busca" type="text" placeholder="Buscar nos carregados..." class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground" />
          <select v-model="filtroCurso" @change="carregar" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground">
            <option value="">Todos os cursos</option>
            <option v-for="c in cursos" :key="c.id" :value="c.id">{{ c.nome }}</option>
          </select>
          <select v-model="filtroProfessor" @change="carregar" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground">
            <option value="">Todos os professores</option>
            <option v-for="p in professores" :key="p.id" :value="p.id">{{ p.nome }}</option>
          </select>
          <label class="flex items-center gap-2 px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground cursor-pointer">
            <input v-model="somenteComDificuldade" @change="carregar" type="checkbox" class="rounded border-border" />
            Só com dificuldade relatada
          </label>
        </div>
        <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <input v-model="filtroDe" @change="carregar" type="date" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground" />
          <input v-model="filtroAte" @change="carregar" type="date" class="px-2.5 py-1.5 text-sm rounded-md border border-border bg-background text-foreground" />
          <button @click="limparFiltros" class="px-3 py-1.5 text-sm rounded-md border border-border text-foreground hover:bg-muted transition-colors">
            Limpar filtros
          </button>
        </div>
      </div>

      <div v-if="erro" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-3">
        <p class="text-sm text-red-800 dark:text-red-200">{{ erro }}</p>
      </div>

      <div v-else-if="listaFiltrada.length === 0" class="bg-card border border-border rounded-lg p-8 text-center">
        <Icon icon="star" class-name="w-10 h-10 text-muted-foreground mx-auto mb-3" fallback="⭐" />
        <h3 class="font-semibold text-foreground mb-1">Nenhuma avaliação encontrada</h3>
        <p class="text-sm text-muted-foreground">
          As respostas aparecem aqui assim que os alunos avaliarem as aulas finalizadas.
        </p>
      </div>

      <!-- Lista: cards resumidos, clique abre os detalhes -->
      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <button
            v-for="av in listaFiltrada"
            :key="av.id"
            @click="abrirDetalhes(av)"
            class="text-left bg-card border border-border rounded-lg p-3 hover:border-primary/60 hover:shadow-md transition-all"
          >
            <div class="flex items-start justify-between gap-2 mb-1.5">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-foreground truncate">{{ av.aluno_nome }}</p>
                <p class="text-[11px] text-muted-foreground truncate">
                  {{ av.curso_nome || 'Curso removido' }}
                  <template v-if="av.numero_aula"> · Aula {{ av.numero_aula }}</template>
                </p>
              </div>
              <span v-if="av.dificuldades" class="flex-shrink-0" title="Relatou dificuldade">
                <Icon icon="triangle-exclamation" class-name="w-4 h-4 text-amber-500" fallback="⚠️" />
              </span>
            </div>

            <p class="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2 truncate">
              <Icon icon="chalkboard-teacher" class-name="w-3 h-3 flex-shrink-0" fallback="👩‍🏫" />
              {{ av.professor_nome || 'Professor não registrado' }}
            </p>

            <div class="flex items-center justify-between gap-2 pt-2 border-t border-border">
              <div class="flex gap-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold" :class="corDaNota(av.nota_professor)">
                  Prof {{ av.nota_professor }}
                </span>
                <span class="text-[10px] px-1.5 py-0.5 rounded font-semibold" :class="corDaNota(av.nota_local)">
                  Local {{ av.nota_local }}
                </span>
              </div>
              <span class="text-[10px] text-muted-foreground flex-shrink-0">{{ formatarDataHora(av.created_at) }}</span>
            </div>
          </button>
        </div>

        <div v-if="podeCarregarMais" class="text-center pt-1">
          <button
            @click="carregarMais"
            :disabled="carregandoMais"
            class="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {{ carregandoMais ? 'Carregando...' : `Carregar mais (${avaliacoes.length} de ${totalFiltrado})` }}
          </button>
        </div>
        <p v-else-if="!busca.trim()" class="text-center text-[11px] text-muted-foreground pt-1">
          Mostrando {{ listaFiltrada.length }} de {{ totalFiltrado }} avaliações.
        </p>
      </template>
    </div>
  </div>

  <!-- Modal de detalhes: 2 abas (Respostas / Notas e assinatura) -->
  <Transition name="fade">
    <div
      v-if="avaliacaoAberta"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      @click="fecharDetalhes"
    >
      <div class="bg-card border border-border rounded-xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl" @click.stop>
        <div class="p-4 sm:p-5">
          <!-- Cabeçalho -->
          <div class="mb-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="text-base font-bold text-foreground truncate">{{ avaliacaoAberta.aluno_nome }}</h3>
                <p class="text-xs text-muted-foreground truncate">
                  {{ avaliacaoAberta.curso_nome || 'Curso removido' }}
                  <template v-if="avaliacaoAberta.numero_aula"> · Aula {{ avaliacaoAberta.numero_aula }}</template>
                </p>
              </div>
              <button @click="fecharDetalhes" class="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
                <Icon icon="xmark" class-name="w-4 h-4 text-muted-foreground" fallback="✕" />
              </button>
            </div>
            <p class="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
              <Icon icon="chalkboard-teacher" class-name="w-3.5 h-3.5 flex-shrink-0" fallback="👩‍🏫" />
              {{ avaliacaoAberta.professor_nome || 'Professor não registrado' }}
              <span class="text-border">·</span>
              {{ formatarDataHora(avaliacaoAberta.created_at) }}
            </p>
          </div>

          <!-- Abas -->
          <div class="flex items-center gap-2 mb-4">
            <button
              type="button"
              @click="abaModal = 1"
              class="flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
              :class="abaModal === 1
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                : 'border-border text-muted-foreground hover:text-foreground'"
            >
              Respostas
            </button>
            <button
              type="button"
              @click="abaModal = 2"
              class="flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
              :class="abaModal === 2
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                : 'border-border text-muted-foreground hover:text-foreground'"
            >
              Notas e assinatura
            </button>
          </div>

          <!-- Aba 1: respostas em texto -->
          <div v-show="abaModal === 1" class="space-y-3">
            <div v-if="avaliacaoAberta.o_que_aprendeu">
              <p class="text-xs font-semibold text-foreground mb-1">O que aprendeu</p>
              <p class="text-sm text-foreground bg-muted/40 rounded-lg p-2.5">{{ avaliacaoAberta.o_que_aprendeu }}</p>
            </div>
            <div v-if="avaliacaoAberta.dificuldades">
              <p class="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Dificuldades relatadas</p>
              <p class="text-sm text-foreground bg-amber-50 dark:bg-amber-900/10 rounded-lg p-2.5">{{ avaliacaoAberta.dificuldades }}</p>
            </div>
            <div v-if="avaliacaoAberta.sugestoes">
              <p class="text-xs font-semibold text-foreground mb-1">Sugestões</p>
              <p class="text-sm text-foreground bg-muted/40 rounded-lg p-2.5">{{ avaliacaoAberta.sugestoes }}</p>
            </div>
            <div v-if="avaliacaoAberta.avaliacao_profissional">
              <p class="text-xs font-semibold text-foreground mb-1">Sobre o profissional</p>
              <p class="text-sm text-foreground bg-muted/40 rounded-lg p-2.5">{{ avaliacaoAberta.avaliacao_profissional }}</p>
            </div>
            <p
              v-if="!avaliacaoAberta.o_que_aprendeu && !avaliacaoAberta.dificuldades && !avaliacaoAberta.sugestoes && !avaliacaoAberta.avaliacao_profissional"
              class="text-sm text-muted-foreground text-center py-4"
            >
              O aluno não escreveu nenhuma resposta em texto nesta avaliação.
            </p>
          </div>

          <!-- Aba 2: notas + assinatura -->
          <div v-show="abaModal === 2" class="space-y-4">
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-lg p-3 text-center" :class="corDaNota(avaliacaoAberta.nota_professor)">
                <p class="text-2xl font-bold leading-tight">{{ avaliacaoAberta.nota_professor }}</p>
                <p class="text-[11px] font-medium">Nota do professor</p>
              </div>
              <div class="rounded-lg p-3 text-center" :class="corDaNota(avaliacaoAberta.nota_local)">
                <p class="text-2xl font-bold leading-tight">{{ avaliacaoAberta.nota_local }}</p>
                <p class="text-[11px] font-medium">Nota do local</p>
              </div>
            </div>

            <div>
              <p class="text-xs font-semibold text-foreground mb-1.5">Assinatura do aluno</p>
              <div v-if="avaliacaoAberta.assinatura" class="rounded-lg border border-border bg-white p-2">
                <img :src="avaliacaoAberta.assinatura" alt="Assinatura" class="w-full" />
              </div>
              <p v-else class="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                Sem assinatura registrada.
              </p>
            </div>
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
