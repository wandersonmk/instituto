<script setup lang="ts">
definePageMeta({
  middleware: 'professor',
  layout: 'professor'
})

// Os refs vêm antes do composable de propósito: se useAulas() lançar (ex.: cliente
// Supabase indisponível), o setup aborta e o template renderizaria com tudo
// indefinido, quebrando em "Cannot read properties of undefined".
const isLoading = ref(true)
const cursos = ref<any[]>([])
const aulasHoje = ref<Record<string, Aula>>({})
const turmas = ref<Record<string, AlunoDaTurma[]>>({})
const salvando = ref<Record<string, boolean>>({})
const erroCarregamento = ref<string | null>(null)

const {
  buscarMeusCursos,
  buscarAulasDeHoje,
  buscarTurma,
  buscarProgramacaoSemanal,
  iniciarAula,
  marcarPresenca,
  justificarFalta,
  finalizarAula
} = useAulas()

// Modal de iniciar aula
const mostrarModalIniciar = ref(false)
const cursoParaIniciar = ref<any>(null)
const temaAula = ref('')
const iniciando = ref(false)

// Modal de finalizar aula
const mostrarModalFinalizar = ref(false)
const cursoParaFinalizar = ref<any>(null)
const finalizando = ref(false)

async function carregar() {
  try {
    const [listaCursos, aulas] = await Promise.all([
      buscarMeusCursos(),
      buscarAulasDeHoje()
    ])

    cursos.value = listaCursos
    aulasHoje.value = aulas

    // Carrega a turma dos cursos que já têm aula hoje
    for (const curso of listaCursos) {
      if (aulas[curso.id]) {
        turmas.value[curso.id] = await buscarTurma(curso.id)
      }
    }

    programacao.value = await buscarProgramacaoSemanal(listaCursos.map((c: any) => c.id))
  } catch (error: any) {
    console.error('Erro ao carregar aulas:', error)
    erroCarregamento.value = error?.message || 'Não foi possível carregar suas aulas.'
  } finally {
    isLoading.value = false
  }
}

function aulaDoCurso(cursoId: string): Aula | null {
  return aulasHoje.value[cursoId] || null
}

// ------------------------------------------------------------ busca por curso

/**
 * Busca pelo nome do curso — vale pra aba Hoje e pras abas de dia da semana,
 * o mesmo texto filtra qualquer uma. Útil pro professor que leciona muitos
 * cursos e quer ir direto no que precisa sem rolar a tela toda.
 */
const buscaCurso = ref('')

const cursosFiltrados = computed(() => {
  const termo = buscaCurso.value.trim().toLowerCase()
  if (!termo) return cursos.value
  return cursos.value.filter(c => c.nome.toLowerCase().includes(termo))
})

/**
 * Com mais de um curso hoje, cada card começa fechado (mesmo padrão das abas
 * de dia da semana) pra não empilhar três listas de chamada abertas na tela.
 * Com um curso só, não faz sentido esconder — abre direto.
 */
const cursosHojeAbertos = ref<Set<string>>(new Set())

function cursoHojeAberto(cursoId: string) {
  return cursos.value.length === 1 || cursosHojeAbertos.value.has(cursoId)
}

function toggleCursoHoje(cursoId: string) {
  if (cursos.value.length === 1) return // card único fica sempre aberto
  if (cursosHojeAbertos.value.has(cursoId)) cursosHojeAbertos.value.delete(cursoId)
  else cursosHojeAbertos.value.add(cursoId)
}

// ---------------------------------------------------------------- iniciar aula

async function abrirModalIniciar(curso: any) {
  if (todosProgramadosNoCurso(curso.id).length === 0) {
    const toast = await useToastSafe()
    toast?.error('Matricule pelo menos um aluno neste curso antes de iniciar a aula')
    return
  }
  cursoParaIniciar.value = curso
  temaAula.value = ''
  mostrarModalIniciar.value = true
}

async function confirmarInicio() {
  if (!cursoParaIniciar.value) return

  const toast = await useToastSafe()
  iniciando.value = true

  try {
    const cursoId = cursoParaIniciar.value.id
    await iniciarAula(cursoId, temaAula.value)
    aulasHoje.value = await buscarAulasDeHoje()
    turmas.value[cursoId] = await buscarTurma(cursoId)
    toast?.success('Aula iniciada! Faça a chamada dos alunos.')
    mostrarModalIniciar.value = false
    cursoParaIniciar.value = null
  } catch (error: any) {
    console.error('Erro ao iniciar aula:', error)
    toast?.error(error.message || 'Erro ao iniciar a aula')
  } finally {
    iniciando.value = false
  }
}

// -------------------------------------------------------------------- chamada

async function alternarPresenca(curso: any, aluno: AlunoDaTurma, presente: boolean) {
  const aula = aulaDoCurso(curso.id)
  if (!aula || aula.status !== 'aberta') return

  const chave = `${curso.id}:${aluno.aluno_id}`
  salvando.value[chave] = true

  const toast = await useToastSafe()

  try {
    await marcarPresenca(aula.id, aluno.aluno_id, presente)
    turmas.value[curso.id] = await buscarTurma(curso.id)
    // Virou presente: o aluno saiu da falta, então um painel de observação
    // aberto pra ele ficaria "órfão" — fechar evita salvar em cima disso e
    // acidentalmente marcá-lo como falta de novo.
    if (presente && chaveObservacao.value === chave) chaveObservacao.value = null
  } catch (error: any) {
    console.error('Erro ao marcar presença:', error)
    toast?.error(error.message || 'Erro ao marcar presença')
  } finally {
    salvando.value[chave] = false
  }
}

function contarPresentes(cursoId: string) {
  return (turmas.value[cursoId] || []).filter(a => a.status === 'presente' || a.status === 'concluida').length
}

function contarFaltas(cursoId: string) {
  return (turmas.value[cursoId] || []).filter(a => a.status === 'falta').length
}

function contarNaoMarcados(cursoId: string) {
  return (turmas.value[cursoId] || []).filter(a => a.status === null || a.status === 'aguardando').length
}

// --------------------------------------------------------- observação da falta

/**
 * Classificação da falta: tipo padronizado (dropdown) + observação opcional.
 *
 * O tipo é padronizado de propósito — texto livre não dá pra administração
 * filtrar/analisar depois. Justificar aqui NÃO isenta o aluno: o débito é
 * lançado de qualquer forma e a falta entra na fila de análise da escola,
 * que é quem decide abonar. Um painel aberto por vez ("cursoId:alunoId").
 */
const chaveObservacao = ref<string | null>(null)
const tipoSelecionado = ref<Record<string, TipoJustificativa>>({})
const textoObservacao = ref<Record<string, string>>({})
const salvandoObservacao = ref<Record<string, boolean>>({})

function abrirObservacao(curso: any, aluno: AlunoDaTurma) {
  const chave = `${curso.id}:${aluno.aluno_id}`
  tipoSelecionado.value[chave] = aluno.tipoJustificativa || 'injustificada'
  // Só reaproveita o texto se for uma observação escrita à mão — quando o
  // motivo é igual ao rótulo padrão, o professor não digitou nada.
  const motivo = aluno.motivoFalta || ''
  textoObservacao.value[chave] = motivo === rotuloJustificativa(aluno.tipoJustificativa) ? '' : motivo
  chaveObservacao.value = chave
}

async function salvarObservacao(curso: any, aluno: AlunoDaTurma) {
  if (!aluno.presencaId) return

  const chave = `${curso.id}:${aluno.aluno_id}`
  salvandoObservacao.value[chave] = true

  const toast = await useToastSafe()
  const tipo = tipoSelecionado.value[chave] || 'injustificada'

  try {
    await justificarFalta(aluno.presencaId, tipo, textoObservacao.value[chave])
    turmas.value[curso.id] = await buscarTurma(curso.id)

    toast?.success(
      tipo === 'injustificada'
        ? 'Falta marcada como injustificada.'
        : 'Falta justificada — a escola vai analisar a isenção do valor.'
    )
    chaveObservacao.value = null
  } catch (error: any) {
    console.error('Erro ao classificar falta:', error)
    toast?.error(error.message || 'Erro ao classificar a falta')
  } finally {
    salvandoObservacao.value[chave] = false
  }
}

// --------------------------------------------------------------------- busca

/**
 * Busca por aluno dentro de cada curso — com turma de 30 alunos, rolar a
 * lista inteira pra achar um nome é inviável. Guardado por curso pra que o
 * filtro de um card não afete o outro.
 */
const buscaAluno = ref<Record<string, string>>({})

function alunosFiltrados(cursoId: string) {
  const lista = turmas.value[cursoId] || []
  const termo = (buscaAluno.value[cursoId] || '').trim().toLowerCase()
  if (!termo) return lista
  return lista.filter(a => a.nome.toLowerCase().includes(termo))
}

/** Alunos com aula programada hoje, pra mostrar horário antes da aula começar. */
function programadosHoje(cursoId: string) {
  const diaHoje = new Date().getDay()
  return programacao.value
    .filter(m => m.curso_id === cursoId && m.diasSemana.includes(diaHoje))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Todo mundo matriculado no curso, independente do dia — só usado pra achar a próxima aula. */
function todosProgramadosNoCurso(cursoId: string) {
  return programacao.value.filter(m => m.curso_id === cursoId)
}

/**
 * Quando não tem ninguém programado HOJE (0 alunos hoje), o card ficava sem
 * nenhuma pista de horário — curso não tem horário fixo próprio (é por aluno),
 * mas dá pra achar a próxima ocorrência olhando o dia mais próximo entre todo
 * mundo matriculado. Sem matrícula nenhuma, não tem o que mostrar (null).
 */
function proximaAula(cursoId: string): { diaLabel: string; horario: string | null } | null {
  const diaHoje = new Date().getDay()
  let melhorDistancia = Infinity
  let melhorDia = -1
  let melhorHorario: string | null = null

  for (const aluno of todosProgramadosNoCurso(cursoId)) {
    for (const dia of aluno.diasSemana) {
      const distancia = (dia - diaHoje + 7) % 7 || 7 // já sabemos que hoje não tem ninguém, então 0 vira 7 (próxima semana)
      if (distancia < melhorDistancia) {
        melhorDistancia = distancia
        melhorDia = dia
        melhorHorario = aluno.horaEntrada
      }
    }
  }

  if (melhorDia === -1) return null
  return { diaLabel: DIAS_SEMANA.find(d => d.valor === melhorDia)?.label || '', horario: melhorHorario }
}

// ------------------------------------------------------------------ finalizar

function abrirModalFinalizar(curso: any) {
  cursoParaFinalizar.value = curso
  mostrarModalFinalizar.value = true
}

async function confirmarFinalizacao() {
  if (!cursoParaFinalizar.value) return

  const aula = aulaDoCurso(cursoParaFinalizar.value.id)
  if (!aula) return

  const toast = await useToastSafe()
  finalizando.value = true

  try {
    const cursoId = cursoParaFinalizar.value.id
    const presentes = await finalizarAula(aula.id)
    aulasHoje.value = await buscarAulasDeHoje()
    turmas.value[cursoId] = await buscarTurma(cursoId)
    toast?.success(`Aula finalizada com ${presentes} aluno(s) presente(s).`)
    mostrarModalFinalizar.value = false
    cursoParaFinalizar.value = null
  } catch (error: any) {
    console.error('Erro ao finalizar aula:', error)
    toast?.error(error.message || 'Erro ao finalizar a aula')
  } finally {
    finalizando.value = false
  }
}

// ------------------------------------------------------------- visão semanal

/**
 * Cursos não têm um horário fixo próprio — cada aluno escolhe seus dias na
 * matrícula (alunos_cursos.dias_semana). Por isso a aba de um dia mostra os
 * cursos que têm pelo menos um aluno ativo programado naquele dia, e a lista
 * de quem são eles — só informativo (chamada de verdade só existe pra hoje,
 * já que iniciar_aula sempre usa a data atual no banco).
 */
const programacao = ref<AlunoProgramado[]>([])

const DIAS_SEMANA = [
  { valor: 1, label: 'Segunda', curto: 'Seg' },
  { valor: 2, label: 'Terça', curto: 'Ter' },
  { valor: 3, label: 'Quarta', curto: 'Qua' },
  { valor: 4, label: 'Quinta', curto: 'Qui' },
  { valor: 5, label: 'Sexta', curto: 'Sex' },
  { valor: 6, label: 'Sábado', curto: 'Sáb' },
  { valor: 0, label: 'Domingo', curto: 'Dom' }
] as const

const abaSelecionada = ref<'hoje' | number>('hoje')

const diasComAula = computed(() => {
  const dias = new Set<number>()
  for (const m of programacao.value) for (const d of m.diasSemana) dias.add(d)
  return dias
})

/** Só mostra abas dos dias que realmente têm algum aluno programado — domingo some se ninguém tiver aula nele. */
const abasSemana = computed(() => DIAS_SEMANA.filter(d => diasComAula.value.has(d.valor)))

function labelDoDia(dia: 'hoje' | number) {
  if (dia === 'hoje') return 'Hoje'
  return DIAS_SEMANA.find(d => d.valor === dia)?.label || ''
}

/** Versão só-número de abaSelecionada, pra usar nas funções abaixo sem `as number` espalhado pelo template — só é lida no ramo em que abaSelecionada já não é 'hoje'. */
const diaSemanaAtivo = computed(() => (typeof abaSelecionada.value === 'number' ? abaSelecionada.value : -1))

function cursosDoDia(dia: number) {
  const idsComAula = new Set(programacao.value.filter(m => m.diasSemana.includes(dia)).map(m => m.curso_id))
  return cursosFiltrados.value.filter(c => idsComAula.has(c.id))
}

function alunosDoCursoNoDia(cursoId: string, dia: number) {
  return programacao.value
    .filter(m => m.curso_id === cursoId && m.diasSemana.includes(dia))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Cards da visão semanal começam fechados, só o resumo aparece — mesmo padrão
// dos módulos de vídeo do aluno, pra não empilhar lista grande na tela.
const cursosSemanaAbertos = ref<Set<string>>(new Set())
function toggleCursoSemana(cursoId: string) {
  if (cursosSemanaAbertos.value.has(cursoId)) cursosSemanaAbertos.value.delete(cursoId)
  else cursosSemanaAbertos.value.add(cursoId)
}

// -------------------------------------------------------------------- helpers

/** Timestamp completo (check-in, chamada) → HH:MM */
function formatarHora(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** Coluna "time" do Postgres ("15:00:00") → HH:MM, sem passar por Date */
function formatarHorario(hora: string | null) {
  if (!hora) return null
  return hora.slice(0, 5)
}

const dataHoje = computed(() =>
  new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
)

onMounted(carregar)
</script>

<template>
  <div>
    <AppLoading
      v-if="isLoading"
      title="Carregando Aulas"
      description="Buscando os cursos e as aulas de hoje..."
    />

    <div v-else class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {{ abaSelecionada === 'hoje' ? 'Aulas de Hoje' : `Programação de ${labelDoDia(abaSelecionada)}` }}
          </h2>
          <p class="text-xs sm:text-sm text-muted-foreground mt-1 capitalize">
            {{ abaSelecionada === 'hoje' ? dataHoje : 'Alunos com aula programada neste dia' }}
          </p>
        </div>

        <!-- Abas dos dias da semana (desktop): controle segmentado, só aparece se
             existir algum dia com aula programada além de hoje -->
        <div v-if="abasSemana.length > 0" class="hidden sm:inline-flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
          <button
            @click="abaSelecionada = 'hoje'"
            class="px-3.5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5"
            :class="abaSelecionada === 'hoje'
              ? 'bg-card text-amber-600 dark:text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
          >
            <Icon icon="calendar-check" class-name="w-4 h-4" fallback="📋" />
            Hoje
          </button>
          <button
            v-for="dia in abasSemana"
            :key="dia.valor"
            @click="abaSelecionada = dia.valor"
            class="px-3.5 py-2 text-sm font-medium rounded-lg transition-all"
            :class="abaSelecionada === dia.valor
              ? 'bg-card text-amber-600 dark:text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground'"
          >
            {{ dia.label }}
          </button>
        </div>
      </div>

      <div
        v-if="erroCarregamento"
        class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg p-4"
      >
        <p class="text-sm font-medium text-red-800 dark:text-red-200">Erro ao carregar</p>
        <p class="text-xs text-red-700 dark:text-red-300 mt-1">{{ erroCarregamento }}</p>
      </div>

      <div v-else-if="cursos.length === 0" class="bg-card border border-border rounded-lg p-6 text-center">
        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon="book" class-name="w-8 h-8 text-muted-foreground" fallback="📚" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-2">Nenhum curso vinculado a você</h3>
        <p class="text-sm text-muted-foreground">
          Peça para a administração vincular você aos cursos que vai lecionar,
          em <strong>Professores → Gerenciar cursos</strong>.
        </p>
      </div>

      <template v-else>
        <!-- Busca por curso: vale pra aba Hoje e pras abas de dia da semana,
             útil pra quem leciona muitos cursos e quer ir direto no que precisa. -->
        <div v-if="cursos.length > 1" class="relative">
          <Icon icon="search" class-name="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" fallback="🔍" />
          <input
            v-model="buscaCurso"
            type="text"
            placeholder="Buscar curso pelo nome..."
            class="w-full pl-10 pr-9 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          />
          <button
            v-if="buscaCurso"
            @click="buscaCurso = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Limpar busca"
          >
            <Icon icon="xmark" class-name="w-4 h-4" fallback="✕" />
          </button>
        </div>

        <div v-if="buscaCurso.trim() && cursosFiltrados.length === 0" class="bg-card border border-border rounded-lg p-6 text-center">
          <Icon icon="search" class-name="w-8 h-8 text-muted-foreground mx-auto mb-3" fallback="🔍" />
          <p class="text-sm text-muted-foreground">Nenhum curso encontrado com "{{ buscaCurso }}".</p>
        </div>

        <!-- ================================================== Aba: Hoje
             columns (não grid) porque expandir um card não pode esticar a altura
             do card vizinho — mesmo padrão já usado nos cursos do aluno. -->
        <div v-else-if="abaSelecionada === 'hoje'" :class="cursosFiltrados.length > 1 ? 'columns-1 xl:columns-2 gap-5' : ''">
        <div
          v-for="curso in cursosFiltrados"
          :key="curso.id"
          class="break-inside-avoid mb-5 bg-card border border-border/70 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
        >
          <!-- Barra de status no topo: verde = em andamento, âmbar = não iniciada, neutra = finalizada -->
          <div
            class="h-1"
            :class="!aulaDoCurso(curso.id)
              ? 'bg-amber-400'
              : aulaDoCurso(curso.id)?.status === 'aberta' ? 'bg-emerald-500' : 'bg-border'"
          ></div>

          <!-- Cabeçalho do curso: clicável quando há mais de um curso hoje -->
          <button
            @click="toggleCursoHoje(curso.id)"
            class="w-full flex items-start justify-between gap-3 p-4 sm:p-5 pb-4 text-left"
            :class="cursos.length > 1 ? 'cursor-pointer' : 'cursor-default'"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/20 ring-1 ring-inset ring-white/10">
                <Icon icon="book" class-name="w-5 h-5 text-white" fallback="📚" />
              </div>
              <div class="min-w-0">
                <h3 class="text-base sm:text-lg font-bold text-foreground truncate leading-tight">{{ curso.nome }}</h3>
                <p class="text-xs text-muted-foreground mt-0.5">
                  <template v-if="aulaDoCurso(curso.id)">
                    {{ contarPresentes(curso.id) }} presente(s) · {{ contarFaltas(curso.id) }} falta(s)
                    <template v-if="contarNaoMarcados(curso.id) > 0"> · {{ contarNaoMarcados(curso.id) }} sem marcar</template>
                  </template>
                  <template v-else>
                    {{ curso.carga_horaria }}h · {{ curso.quantidade_aulas }} aulas
                  </template>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <span
                v-if="aulaDoCurso(curso.id)"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap border"
                :class="aulaDoCurso(curso.id)?.status === 'aberta'
                  ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300'
                  : 'border-border bg-muted/40 text-muted-foreground'"
              >
                <span
                  class="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  :class="aulaDoCurso(curso.id)?.status === 'aberta' ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/50'"
                ></span>
                Aula {{ aulaDoCurso(curso.id)?.numero_aula }} ·
                {{ aulaDoCurso(curso.id)?.status === 'aberta' ? 'em andamento' : 'finalizada' }}
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap border border-amber-200 dark:border-amber-800/60 bg-amber-50/60 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300"
              >
                <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-amber-500"></span>
                não iniciada
              </span>
              <Icon
                v-if="cursos.length > 1"
                icon="chevron-down"
                :class-name="`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${cursoHojeAberto(curso.id) ? 'rotate-180' : ''}`"
                fallback="▾"
              />
            </div>
          </button>

          <div class="px-4 sm:px-5 pb-4 sm:pb-5">

          <!-- Sem aula hoje: mostra o que está programado antes de começar -->
          <div v-if="!aulaDoCurso(curso.id)">
            <div v-show="cursoHojeAberto(curso.id)" class="mb-4">
              <div class="grid grid-cols-3 gap-2.5 mb-4">
                <div class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 py-3">
                  <p class="text-lg font-bold text-foreground leading-none">{{ curso.carga_horaria }}h</p>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mt-1">Carga horária</p>
                </div>
                <div class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 py-3">
                  <p class="text-lg font-bold text-foreground leading-none">{{ curso.quantidade_aulas }}</p>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mt-1">Total de aulas</p>
                </div>
                <div class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 py-3">
                  <p class="text-lg font-bold text-foreground leading-none">{{ programadosHoje(curso.id).length }}</p>
                  <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mt-1">Alunos hoje</p>
                </div>
              </div>

              <div v-if="programadosHoje(curso.id).length > 0">
                <p class="text-xs font-semibold text-foreground mb-2">Alunos programados para hoje</p>
                <div class="space-y-1.5">
                  <div
                    v-for="aluno in programadosHoje(curso.id)"
                    :key="aluno.aluno_id"
                    class="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg bg-background border border-border/70"
                  >
                    <span class="text-foreground font-medium truncate">{{ aluno.nome }}</span>
                    <span v-if="aluno.horaEntrada" class="text-muted-foreground flex-shrink-0">
                      {{ formatarHorario(aluno.horaEntrada) }}<template v-if="aluno.horaSaida">–{{ formatarHorario(aluno.horaSaida) }}</template>
                    </span>
                  </div>
                </div>
              </div>
              <div v-else-if="proximaAula(curso.id)" class="text-center py-2">
                <p class="text-xs text-muted-foreground">Nenhum aluno programado para hoje neste curso.</p>
                <p class="text-xs text-foreground font-medium mt-1 flex items-center justify-center gap-1">
                  <Icon icon="clock" class-name="w-3 h-3 text-muted-foreground" fallback="🕒" />
                  Próxima aula: {{ proximaAula(curso.id)?.diaLabel
                  }}<template v-if="proximaAula(curso.id)?.horario"> às {{ formatarHorario(proximaAula(curso.id)?.horario ?? null) }}</template>
                </p>
              </div>
              <p v-else class="text-xs text-muted-foreground text-center py-2">
                Nenhum aluno matriculado neste curso ainda.
              </p>
            </div>

            <button
              @click="abrirModalIniciar(curso)"
              :disabled="todosProgramadosNoCurso(curso.id).length === 0"
              :title="todosProgramadosNoCurso(curso.id).length === 0 ? 'Matricule pelo menos um aluno neste curso para poder iniciar a aula' : ''"
              class="w-full py-3 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm shadow-primary/30 ring-1 ring-inset ring-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:shadow-none disabled:active:scale-100"
            >
              <Icon icon="play" class-name="w-4 h-4" fallback="▶" />
              Iniciar Aula
            </button>
          </div>

          <!-- Aula existente -->
          <div v-else v-show="cursoHojeAberto(curso.id)">
            <p v-if="aulaDoCurso(curso.id)?.tema" class="text-sm text-foreground mb-3 px-3 py-2 rounded-lg bg-muted/40">
              <span class="text-muted-foreground">Tema:</span> <span class="font-medium">{{ aulaDoCurso(curso.id)?.tema }}</span>
            </p>

            <!-- Resumo da chamada -->
            <div class="grid grid-cols-3 gap-2.5 mb-4">
              <div class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-900/10 py-3">
                <Icon icon="check" class-name="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fallback="✓" />
                <p class="text-xl font-bold text-emerald-700 dark:text-emerald-300 leading-none mt-1">{{ contarPresentes(curso.id) }}</p>
                <p class="text-[10px] font-medium uppercase tracking-wide text-emerald-700/70 dark:text-emerald-400/70">Presentes</p>
              </div>
              <div class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-red-200/70 dark:border-red-900/40 bg-red-50/60 dark:bg-red-900/10 py-3">
                <Icon icon="xmark" class-name="w-3.5 h-3.5 text-red-600 dark:text-red-400" fallback="✕" />
                <p class="text-xl font-bold text-red-700 dark:text-red-300 leading-none mt-1">{{ contarFaltas(curso.id) }}</p>
                <p class="text-[10px] font-medium uppercase tracking-wide text-red-700/70 dark:text-red-400/70">Faltas</p>
              </div>
              <div class="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 py-3">
                <Icon icon="clock" class-name="w-3.5 h-3.5 text-muted-foreground" fallback="…" />
                <p class="text-xl font-bold text-foreground leading-none mt-1">{{ contarNaoMarcados(curso.id) }}</p>
                <p class="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Sem marcar</p>
              </div>
            </div>

            <!-- Lista de alunos -->
            <div v-if="(turmas[curso.id] || []).length === 0" class="text-sm text-muted-foreground text-center py-4">
              Nenhum aluno matriculado neste curso.
            </div>

            <template v-else>
              <!-- Busca: sempre visível — o professor pode digitar o nome pra
                   ir direto no aluno em vez de rolar a lista, mesmo com poucos -->
              <div class="relative mb-3">
                <Icon icon="search" class-name="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" fallback="🔍" />
                <input
                  v-model="buscaAluno[curso.id]"
                  type="text"
                  placeholder="Buscar aluno pelo nome..."
                  class="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-muted/30 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-background transition-colors"
                />
                <button
                  v-if="buscaAluno[curso.id]"
                  @click="buscaAluno[curso.id] = ''"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  title="Limpar busca"
                >
                  <Icon icon="xmark" class-name="w-3.5 h-3.5" fallback="✕" />
                </button>
              </div>

              <p
                v-if="buscaAluno[curso.id] && alunosFiltrados(curso.id).length === 0"
                class="text-xs text-muted-foreground text-center py-3"
              >
                Nenhum aluno encontrado com "{{ buscaAluno[curso.id] }}".
              </p>

            <div class="space-y-2 mb-4">
              <div
                v-for="aluno in alunosFiltrados(curso.id)"
                :key="aluno.aluno_id"
                class="rounded-xl border bg-background p-3 transition-colors"
                :class="aluno.status === 'falta'
                  ? 'border-red-200 dark:border-red-900/40'
                  : (aluno.status === 'presente' || aluno.status === 'concluida')
                    ? 'border-emerald-200 dark:border-emerald-900/40'
                    : 'border-border/70'"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0 flex-1 flex items-center gap-2.5">
                    <div
                      class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      :class="aluno.status === 'falta'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : (aluno.status === 'presente' || aluno.status === 'concluida')
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'"
                    >
                      {{ aluno.nome.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-foreground truncate">{{ aluno.nome }}</p>
                      <p class="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                        <span v-if="aluno.horaEntrada">
                          Aula {{ formatarHorario(aluno.horaEntrada) }}<template v-if="aluno.horaSaida">–{{ formatarHorario(aluno.horaSaida) }}</template>
                        </span>
                        <span v-if="aluno.horaCheckin" class="text-emerald-600 dark:text-emerald-400">
                          · Check-in {{ formatarHora(aluno.horaCheckin) }}
                        </span>
                        <span v-if="aluno.marcadoAt" class="text-foreground/70">
                          · Chamada {{ formatarHora(aluno.marcadoAt) }}
                        </span>
                      </p>
                    </div>
                  </div>

                  <!-- Aula aberta: professor faz a chamada (par conectado, estilo toggle) -->
                  <div v-if="aulaDoCurso(curso.id)?.status === 'aberta'" class="inline-flex rounded-lg border border-border overflow-hidden flex-shrink-0">
                    <button
                      @click="alternarPresenca(curso, aluno, true)"
                      :disabled="salvando[`${curso.id}:${aluno.aluno_id}`]"
                      class="px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                      :class="aluno.status === 'presente' || aluno.status === 'concluida'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-card text-muted-foreground hover:bg-emerald-50 dark:hover:bg-emerald-900/20'"
                    >
                      Presente
                    </button>
                    <button
                      @click="alternarPresenca(curso, aluno, false)"
                      :disabled="salvando[`${curso.id}:${aluno.aluno_id}`]"
                      class="px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 border-l border-border"
                      :class="aluno.status === 'falta'
                        ? 'bg-red-600 text-white'
                        : 'bg-card text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20'"
                    >
                      Falta
                    </button>
                  </div>

                  <!-- Aula finalizada: só o resultado -->
                  <span
                    v-else
                    class="px-2.5 py-1 text-xs font-medium rounded-full flex-shrink-0"
                    :class="aluno.status === 'concluida'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : aluno.status === 'falta'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-muted text-muted-foreground'"
                  >
                    {{ aluno.status === 'concluida' ? 'Presente' : aluno.status === 'falta' ? 'Falta' : 'Não marcado' }}
                  </span>
                </div>

                <!-- Situação da falta + ação de classificar (aula aberta OU finalizada) -->
                <div v-if="aluno.status === 'falta' && chaveObservacao !== `${curso.id}:${aluno.aluno_id}`" class="mt-2">
                  <div
                    v-if="aluno.tipoJustificativa && aluno.tipoJustificativa !== 'injustificada'"
                    class="flex items-start justify-between gap-2 text-xs bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300 rounded-md px-2.5 py-1.5"
                  >
                    <span class="min-w-0">
                      <Icon icon="circle-info" class-name="w-3 h-3 inline mr-1" fallback="ℹ️" />
                      <strong>{{ rotuloJustificativa(aluno.tipoJustificativa) }}</strong>
                      <template v-if="aluno.motivoFalta && aluno.motivoFalta !== rotuloJustificativa(aluno.tipoJustificativa)">
                        · {{ aluno.motivoFalta }}
                      </template>
                      <em class="block not-italic opacity-80 mt-0.5">A escola vai analisar a isenção do valor.</em>
                    </span>
                    <button @click="abrirObservacao(curso, aluno)" class="underline hover:no-underline flex-shrink-0">
                      Editar
                    </button>
                  </div>
                  <div
                    v-else
                    class="flex items-center justify-between gap-2 text-xs bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 rounded-md px-2.5 py-1.5"
                  >
                    <span>Falta injustificada</span>
                    <button @click="abrirObservacao(curso, aluno)" class="font-medium underline hover:no-underline flex-shrink-0">
                      Justificar
                    </button>
                  </div>
                </div>

                <!-- Painel de classificação da falta -->
                <div v-if="chaveObservacao === `${curso.id}:${aluno.aluno_id}`" class="mt-2 p-2.5 rounded-md bg-muted/40 border border-border">
                  <label class="block text-[11px] font-semibold text-foreground mb-1">Motivo da falta</label>
                  <select
                    v-model="tipoSelecionado[`${curso.id}:${aluno.aluno_id}`]"
                    class="w-full px-2.5 py-1.5 mb-2 rounded-md border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option v-for="t in TIPOS_JUSTIFICATIVA" :key="t.valor" :value="t.valor">{{ t.rotulo }}</option>
                  </select>

                  <input
                    v-model="textoObservacao[`${curso.id}:${aluno.aluno_id}`]"
                    type="text"
                    maxlength="140"
                    placeholder="Observação (opcional)"
                    class="w-full px-2.5 py-1.5 mb-2 rounded-md border border-border bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                    @keyup.enter="salvarObservacao(curso, aluno)"
                  />

                  <p class="text-[11px] text-muted-foreground mb-2">
                    <template v-if="(tipoSelecionado[`${curso.id}:${aluno.aluno_id}`] || 'injustificada') === 'injustificada'">
                      A multa do curso é cobrada normalmente.
                    </template>
                    <template v-else>
                      A multa continua lançada — a administração decide se isenta o aluno.
                    </template>
                  </p>

                  <div class="flex gap-2">
                    <button
                      @click="salvarObservacao(curso, aluno)"
                      :disabled="salvandoObservacao[`${curso.id}:${aluno.aluno_id}`]"
                      class="flex-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      @click="chaveObservacao = null"
                      class="px-2.5 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground hover:bg-muted/70 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            </div>
            </template>

            <!-- Finalizar -->
            <button
              v-if="aulaDoCurso(curso.id)?.status === 'aberta'"
              @click="abrirModalFinalizar(curso)"
              class="w-full py-3 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/30 ring-1 ring-inset ring-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Icon icon="check-circle" class-name="w-4 h-4" fallback="✓" />
              Finalizar Aula
            </button>

            <div
              v-else
              class="w-full py-3 rounded-xl font-medium text-sm bg-muted text-muted-foreground text-center flex items-center justify-center gap-2"
            >
              <Icon icon="circle-check" class-name="w-4 h-4" fallback="✓" />
              Aula finalizada às {{ formatarHora(aulaDoCurso(curso.id)?.finalizada_at ?? null) }}
            </div>
          </div>
          </div>
        </div>
      </div>

      <!-- ================================================== Aba: dia da semana -->
      <div v-else class="space-y-3">
        <div v-if="cursosDoDia(diaSemanaAtivo).length === 0" class="bg-card border border-border rounded-lg p-6 text-center">
          <p class="text-sm text-muted-foreground">Nenhum aluno com aula programada neste dia.</p>
        </div>

        <div v-else class="columns-1 md:columns-2 gap-4">
          <div
            v-for="curso in cursosDoDia(diaSemanaAtivo)"
            :key="curso.id"
            class="break-inside-avoid mb-4 bg-card border border-border/70 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            <button
              @click="toggleCursoSemana(curso.id)"
              class="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/20 ring-1 ring-inset ring-white/10">
                  <Icon icon="book" class-name="w-5 h-5 text-white" fallback="📚" />
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-foreground truncate">{{ curso.nome }}</p>
                  <p class="text-xs text-muted-foreground mt-0.5">
                    {{ alunosDoCursoNoDia(curso.id, diaSemanaAtivo).length }} aluno(s)
                  </p>
                </div>
              </div>
              <Icon
                icon="chevron-down"
                :class-name="`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${cursosSemanaAbertos.has(curso.id) ? 'rotate-180' : ''}`"
                fallback="▾"
              />
            </button>

            <div v-show="cursosSemanaAbertos.has(curso.id)" class="px-4 pb-4 space-y-1.5 border-t border-border/70 pt-3">
              <div
                v-for="aluno in alunosDoCursoNoDia(curso.id, diaSemanaAtivo)"
                :key="aluno.aluno_id"
                class="flex items-center justify-between gap-2 text-sm px-3 py-2 rounded-lg bg-muted/30"
              >
                <span class="text-foreground font-medium truncate">{{ aluno.nome }}</span>
                <span v-if="aluno.horaEntrada" class="text-xs text-muted-foreground flex-shrink-0">
                  {{ formatarHorario(aluno.horaEntrada) }}<template v-if="aluno.horaSaida">–{{ formatarHorario(aluno.horaSaida) }}</template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </template>
    </div>

    <!-- Menu flutuante fixo embaixo (só no celular) — mesmo padrão do painel do aluno.
         Só aparece se existir alguma aba de dia além de hoje. -->
    <nav
      v-if="abasSemana.length > 0"
      class="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="flex items-stretch px-1 pt-1">
        <button
          @click="abaSelecionada = 'hoje'"
          class="flex-1 flex flex-col items-center justify-center gap-1 py-2 mx-0.5 rounded-xl transition-colors"
          :class="abaSelecionada === 'hoje' ? 'text-amber-600 dark:text-primary bg-primary/10' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="calendar-check" class-name="w-5 h-5" fallback="📋" />
          <span class="text-[10px] font-semibold">Hoje</span>
        </button>
        <button
          v-for="dia in abasSemana"
          :key="dia.valor"
          @click="abaSelecionada = dia.valor"
          class="flex-1 flex flex-col items-center justify-center gap-1 py-2 mx-0.5 rounded-xl transition-colors"
          :class="abaSelecionada === dia.valor ? 'text-amber-600 dark:text-primary bg-primary/10' : 'text-muted-foreground dark:text-gray-400'"
        >
          <Icon icon="calendar-day" class-name="w-5 h-5" fallback="📅" />
          <span class="text-[10px] font-semibold">{{ dia.curto }}</span>
        </button>
      </div>
    </nav>
  </div>

  <!-- Modal: iniciar aula -->
  <Transition name="fade">
    <div
      v-if="mostrarModalIniciar && cursoParaIniciar"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="mostrarModalIniciar = false"
    >
      <div class="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl" @click.stop>
        <div class="p-6">
          <h3 class="text-xl font-bold text-foreground mb-1">Iniciar Aula</h3>
          <p class="text-sm text-muted-foreground mb-5">{{ cursoParaIniciar.nome }}</p>

          <label class="block text-sm font-medium text-foreground mb-2">
            Tema da aula <span class="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            v-model="temaAula"
            type="text"
            maxlength="120"
            placeholder="Ex.: Botox capilar"
            class="w-full px-3 py-2 mb-5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div class="flex space-x-3">
            <button
              @click="mostrarModalIniciar = false"
              class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              @click="confirmarInicio"
              :disabled="iniciando"
              class="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-sm shadow-primary/30 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {{ iniciando ? 'Iniciando...' : 'Iniciar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal: finalizar aula -->
  <Transition name="fade">
    <div
      v-if="mostrarModalFinalizar && cursoParaFinalizar"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="mostrarModalFinalizar = false"
    >
      <div class="bg-card border border-border rounded-2xl max-w-md w-full shadow-2xl" @click.stop>
        <div class="p-6">
          <h3 class="text-xl font-bold text-foreground mb-1">Finalizar Aula</h3>
          <p class="text-sm text-muted-foreground mb-4">{{ cursoParaFinalizar.nome }}</p>

          <div class="bg-muted/50 rounded-lg p-4 mb-4 space-y-1.5 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Presentes:</span>
              <span class="font-medium text-foreground">{{ contarPresentes(cursoParaFinalizar.id) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Faltas:</span>
              <span class="font-medium text-foreground">{{ contarFaltas(cursoParaFinalizar.id) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Sem marcar:</span>
              <span class="font-medium text-foreground">{{ contarNaoMarcados(cursoParaFinalizar.id) }}</span>
            </div>
          </div>

          <div
            v-if="contarNaoMarcados(cursoParaFinalizar.id) > 0"
            class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 mb-4"
          >
            <p class="text-xs text-amber-800 dark:text-amber-200">
              Alunos sem marcação não contarão presença nem falta. Marque todos antes de finalizar.
            </p>
          </div>

          <p class="text-sm text-muted-foreground mb-5">
            Ao finalizar, os presentes ganham +1 aula concluída e poderão avaliar a aula. Não é possível reabrir.
          </p>

          <div class="flex space-x-3">
            <button
              @click="mostrarModalFinalizar = false"
              class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              @click="confirmarFinalizacao"
              :disabled="finalizando"
              class="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm shadow-blue-600/30 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {{ finalizando ? 'Finalizando...' : 'Finalizar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
