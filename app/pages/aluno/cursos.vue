<script setup lang="ts">
import { temAvaliacao } from '~/utils/avaliacoes'

definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()
const { buscarCursosDoAluno } = useAlunosCursos()
const { fazerCheckin, avaliarAula, buscarSessoesHoje } = useAulas()
const { recarregar: recarregarNotificacoes, remover: removerNotificacao } = useNotificacoes()
const route = useRoute()
const router = useRouter()

// Estado
const isLoading = ref(true)
const aluno = ref<any>(null)
const cursos = ref<any[]>([])
const sessoesHoje = ref<Record<string, PresencaAluno>>({})

// Cards de curso começam fechados (só o essencial + botão de ação
// aparecem); o aluno expande pra ver os detalhes — mesmo padrão dos
// módulos de vídeo, pra não empilhar coisa grande na tela.
const cursosAbertos = ref<Set<string>>(new Set())
function toggleCursoAberto(cursoId: string) {
  if (cursosAbertos.value.has(cursoId)) cursosAbertos.value.delete(cursoId)
  else cursosAbertos.value.add(cursoId)
}

// Avaliação pendente de QUALQUER data (não só hoje) por curso — segundo
// caminho pro aluno chegar na avaliação, além da notificação do sino.
// Mapeia curso_id -> id da presença mais antiga ainda não avaliada.
const avaliacoesPendentesPorCurso = ref<Record<string, string>>({})

async function carregarAvaliacoesPendentes(alunoId: string) {
  const { data, error } = await supabase
    .from('presencas')
    .select('id, curso_id, data_presenca, avaliacoes_aulas(id)')
    .eq('aluno_id', alunoId)
    .eq('status', 'concluida')
    .order('data_presenca', { ascending: true })

  if (error) {
    console.error('Erro ao buscar avaliações pendentes:', error)
    return
  }

  const mapa: Record<string, string> = {}
  for (const p of (data || []) as any[]) {
    // Mantém só a mais antiga de cada curso (já vem ordenado por data)
    if (!temAvaliacao(p.avaliacoes_aulas) && !mapa[p.curso_id]) {
      mapa[p.curso_id] = p.id
    }
  }
  avaliacoesPendentesPorCurso.value = mapa
}

// Tempo real: quando um curso é atualizado (progresso, horário, etc.) ou
// uma presença muda, a tela já reflete sem precisar recarregar a página.
// Só assina uma vez (não a cada atualização) pra não ficar reabrindo canal.
let canalRealtime: ReturnType<typeof supabase.channel> | null = null

/** Só recarrega os dados de curso — sem reassinar o canal, diferente de buscarDadosAluno(). */
async function recarregarCursosApósMudanca(alunoId: string) {
  cursos.value = [...(await buscarCursosDoAluno(alunoId))]
}

async function assinarAtualizacoesEmTempoReal(alunoId: string) {
  if (canalRealtime) return // já assinado nesta sessão da página

  // Sem isso o canal confirma "assinado" mas o servidor não sabe quem está
  // logado e a RLS não deixa passar nenhum evento — ver app/utils/realtime.ts.
  await autenticarRealtime(supabase)

  canalRealtime = supabase
    .channel(`aluno-cursos-${alunoId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'alunos_cursos', filter: `aluno_id=eq.${alunoId}` },
      () => recarregarCursosApósMudanca(alunoId)
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'presencas', filter: `aluno_id=eq.${alunoId}` },
      () => {
        carregarSessoesHoje(alunoId)
        carregarAvaliacoesPendentes(alunoId)
        // Ex.: professor acabou de finalizar a aula — o sino já mostra a
        // avaliação pendente na hora, sem precisar trocar de página.
        recarregarNotificacoes()
      }
    )
    .subscribe()
}

function encerrarRealtime() {
  if (canalRealtime) {
    supabase.removeChannel(canalRealtime)
    canalRealtime = null
  }
}

// Modal de check-in
const cursoSelecionado = ref<any>(null)
const mostrarModalCheckin = ref(false)
const aceitouTermos = ref(false)
const enviandoCheckin = ref(false)

// Modal de avaliação
const mostrarModalAvaliacao = ref(false)
const avaliacaoCurso = ref<any>(null)
const avaliacaoSessaoId = ref<string | null>(null)
const notaProfessor = ref<number | null>(null)
const notaLocal = ref<number | null>(null)
const oQueAprendeu = ref('')
const sugestoes = ref('')
const dificuldades = ref('')
const avaliacaoProfissional = ref('')
const assinatura = ref<string | null>(null)
const enviandoAvaliacao = ref(false)

// Modal dividido em 2 abas pra não ficar enorme e cortando no celular:
// 1) feedback da aula (aprendizado, sugestões, dificuldades, professor)
// 2) nota do local + assinatura, que fecha a avaliação
const abaAvaliacao = ref<1 | 2>(1)
const abaUmValida = computed(() => notaProfessor.value !== null)

function irParaAbaAvaliacao(aba: 1 | 2) {
  if (aba === 2 && !abaUmValida.value) return
  abaAvaliacao.value = aba
}

// Enquanto o professor não marca a chamada, reconsulta o status
let pollTimer: ReturnType<typeof setInterval> | null = null

// ---------------------------------------------------------------- carregamento

async function buscarDadosAluno() {
  if (!user.value) {
    isLoading.value = false
    return
  }

  try {
    const { data: alunoData, error: alunoError } = await supabase
      .from('alunos')
      .select('*')
      .eq('user_id', user.value.id)
      .single()

    if (alunoError) throw alunoError
    aluno.value = alunoData

    if (alunoData?.id) {
      cursos.value = [...(await buscarCursosDoAluno(alunoData.id))]
      await carregarSessoesHoje(alunoData.id)
      await carregarAvaliacoesPendentes(alunoData.id)
      assinarAtualizacoesEmTempoReal(alunoData.id)
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

async function carregarSessoesHoje(alunoId: string, avisarMudancas = false) {
  const anteriores = sessoesHoje.value
  const atuais = await buscarSessoesHoje(alunoId)

  if (avisarMudancas) {
    const toast = await useToastSafe()
    for (const [cursoId, sessao] of Object.entries(atuais)) {
      const antes = anteriores[cursoId]?.status
      if (antes && antes !== sessao.status) {
        if (sessao.status === 'presente') toast?.success('O professor confirmou sua presença!')
        if (sessao.status === 'concluida') toast?.success('Aula finalizada! Conte pra gente como ela foi.')
        if (sessao.status === 'falta') toast?.warning('O professor registrou falta nesta aula.')
      }
    }
  }

  sessoesHoje.value = atuais
  ajustarPolling()
}

function ajustarPolling() {
  const emAndamento = Object.values(sessoesHoje.value)
    .some(s => s.status === 'aguardando' || s.status === 'presente')

  if (emAndamento && !pollTimer) {
    pollTimer = setInterval(() => {
      if (aluno.value?.id) carregarSessoesHoje(aluno.value.id, true)
    }, 15000)
  } else if (!emAndamento && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ---------------------------------------------------------------- estado da aula

function sessaoDoCurso(curso: any): PresencaAluno | null {
  return sessoesHoje.value[curso.curso_id] || null
}

function jaAvaliada(sessao: PresencaAluno | null) {
  return temAvaliacao(sessao?.avaliacoes_aulas)
}

function botaoDaAula(curso: any) {
  const sessao = sessaoDoCurso(curso)

  if (sessao?.status === 'aguardando') {
    return {
      label: 'Check-in feito · aguardando o professor',
      icon: 'clock', fallback: '⏳',
      classe: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      disabled: true, acao: null, pulsando: true
    }
  }

  if (sessao?.status === 'presente') {
    return {
      label: 'Presença confirmada · aula em andamento',
      icon: 'check-circle', fallback: '▶',
      classe: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
      disabled: true, acao: null, pulsando: true
    }
  }

  if (sessao?.status === 'falta') {
    return {
      label: 'Falta registrada nesta aula',
      icon: 'times-circle', fallback: '✕',
      classe: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      disabled: true, acao: null, pulsando: false
    }
  }

  if (sessao?.status === 'concluida') {
    return jaAvaliada(sessao)
      ? {
          label: 'Aula concluída e avaliada',
          icon: 'check-circle', fallback: '✓',
          classe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
          disabled: true, acao: null, pulsando: false
        }
      : {
          label: 'Avaliar Aula',
          icon: 'star', fallback: '⭐',
          classe: 'bg-amber-500 hover:bg-amber-600 text-white',
          disabled: false, acao: 'avaliar' as const, pulsando: true
        }
  }

  if (calcularAulasRestantes(curso) === 0) {
    return {
      label: 'Curso Concluído',
      icon: 'check-circle', fallback: '✓',
      classe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      disabled: true, acao: null, pulsando: false
    }
  }

  if (!ehDiaDeAula(curso.dias_semana)) {
    return {
      label: 'Hoje não é dia de aula',
      icon: 'calendar', fallback: '📅',
      classe: 'bg-muted text-muted-foreground',
      disabled: true, acao: null, pulsando: false
    }
  }

  if (horarioJaPassou(curso)) {
    return {
      label: 'Horário da aula já passou',
      icon: 'clock', fallback: '⏰',
      classe: 'bg-muted text-muted-foreground',
      disabled: true, acao: null, pulsando: false
    }
  }

  return {
    label: 'Fazer Check-in',
    icon: 'check-circle', fallback: '✓',
    classe: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    disabled: false, acao: 'checkin' as const, pulsando: false
  }
}

function acionarBotao(curso: any) {
  const { acao } = botaoDaAula(curso)
  if (acao === 'checkin') return abrirModalCheckin(curso)
  if (acao === 'avaliar') return abrirModalAvaliacao(curso)
}

// ---------------------------------------------------------------- check-in

function abrirModalCheckin(curso: any) {
  cursoSelecionado.value = curso
  aceitouTermos.value = false
  mostrarModalCheckin.value = true
}

function fecharModalCheckin() {
  mostrarModalCheckin.value = false
  cursoSelecionado.value = null
  aceitouTermos.value = false
}

async function confirmarCheckin() {
  if (!aluno.value || !cursoSelecionado.value || !aceitouTermos.value) return

  const toast = await useToastSafe()
  enviandoCheckin.value = true

  try {
    await fazerCheckin(cursoSelecionado.value.curso_id)
    toast?.success('Check-in registrado! O professor vai confirmar sua presença.')
    fecharModalCheckin()
    await carregarSessoesHoje(aluno.value.id)
  } catch (error: any) {
    console.error('Erro ao fazer check-in:', error)
    toast?.error(error.message || 'Erro ao fazer check-in')
  } finally {
    enviandoCheckin.value = false
  }
}

// ---------------------------------------------------------------- avaliação

function abrirModalAvaliacao(curso: any) {
  const sessao = sessaoDoCurso(curso)
  if (!sessao) return

  avaliacaoCurso.value = curso
  avaliacaoSessaoId.value = sessao.id
  notaProfessor.value = null
  notaLocal.value = null
  oQueAprendeu.value = ''
  sugestoes.value = ''
  dificuldades.value = ''
  avaliacaoProfissional.value = ''
  assinatura.value = null
  abaAvaliacao.value = 1
  mostrarModalAvaliacao.value = true
}

function fecharModalAvaliacao() {
  mostrarModalAvaliacao.value = false
  avaliacaoCurso.value = null
  avaliacaoSessaoId.value = null
}

/**
 * Abre o modal de avaliação a partir de uma notificação (sino), que pode
 * apontar pra uma aula de qualquer data — não só a de hoje, diferente de
 * abrirModalAvaliacao() que só enxerga a sessão do dia atual.
 */
async function abrirModalAvaliacaoPorPresenca(presencaId: string) {
  const { data, error } = await supabase
    .from('presencas')
    .select('id, status, cursos(nome)')
    .eq('id', presencaId)
    .single()

  if (error || !data) {
    console.error('Erro ao abrir avaliação pendente:', error)
    return
  }

  // Já foi avaliada ou não está mais concluída (pode ter mudado entre a
  // notificação ser gerada e o clique) — não abre o modal à toa.
  if (data.status !== 'concluida') return

  avaliacaoCurso.value = { curso_nome: (data as any).cursos?.nome || 'Curso' }
  avaliacaoSessaoId.value = data.id
  notaProfessor.value = null
  notaLocal.value = null
  oQueAprendeu.value = ''
  sugestoes.value = ''
  dificuldades.value = ''
  avaliacaoProfissional.value = ''
  assinatura.value = null
  abaAvaliacao.value = 1
  mostrarModalAvaliacao.value = true
}

const avaliacaoValida = computed(() =>
  notaProfessor.value !== null && notaLocal.value !== null && !!assinatura.value
)

async function enviarAvaliacao() {
  if (!avaliacaoSessaoId.value || !avaliacaoValida.value || !aluno.value) return

  const toast = await useToastSafe()
  enviandoAvaliacao.value = true

  try {
    await avaliarAula(avaliacaoSessaoId.value, {
      notaProfessor: notaProfessor.value as number,
      notaLocal: notaLocal.value as number,
      oQueAprendeu: oQueAprendeu.value,
      sugestoes: sugestoes.value,
      dificuldades: dificuldades.value,
      avaliacaoProfissional: avaliacaoProfissional.value,
      assinatura: assinatura.value as string
    })
    toast?.success('Obrigado! Sua avaliação foi registrada.')
    // Tira do sino na hora, sem esperar a viagem de rede do recarregar() —
    // evita mostrar por um instante (ou indefinidamente, se algo atrasar)
    // uma notificação que acabou de ser resolvida.
    removerNotificacao(`avaliacao-${avaliacaoSessaoId.value}`)
    fecharModalAvaliacao()
    await carregarSessoesHoje(aluno.value.id)
    // Confirma com o banco — cobre qualquer outra avaliação que tenha
    // ficado pendente além dessa.
    await recarregarNotificacoes()
  } catch (error: any) {
    console.error('Erro ao enviar avaliação:', error)
    toast?.error(error.message || 'Erro ao enviar avaliação')
  } finally {
    enviandoAvaliacao.value = false
  }
}

// ---------------------------------------------------------------- helpers

function ehDiaDeAula(diasSemana: number[] | string[]) {
  if (!diasSemana || diasSemana.length === 0) return false
  const diaSemana = new Date().getDay()

  if (typeof diasSemana[0] === 'number') {
    return (diasSemana as number[]).includes(diaSemana)
  }

  const mapaDias: Record<number, string> = {
    0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
    4: 'quinta', 5: 'sexta', 6: 'sabado'
  }
  return (diasSemana as string[]).includes(mapaDias[diaSemana] as string)
}

/** Verifica se o horário de término da turma já passou hoje (bate com a checagem do banco). */
function horarioJaPassou(curso: any) {
  if (!curso.hora_saida) return false
  const [h, m] = String(curso.hora_saida).split(':').map(Number)
  if (Number.isNaN(h)) return false

  const limite = new Date()
  limite.setHours(h, m || 0, 0, 0)
  return new Date() > limite
}

function formatarDiasSemana(diasSemana: number[] | string[]) {
  if (!diasSemana || diasSemana.length === 0) return ['Não definido']

  const nomesDias: Record<number, string> = {
    0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
  }

  if (typeof diasSemana[0] === 'number') {
    return (diasSemana as number[]).slice().sort().map(d => nomesDias[d])
  }

  const mapa: Record<string, string> = {
    'domingo': 'Dom', 'segunda': 'Seg', 'terca': 'Ter', 'quarta': 'Qua',
    'quinta': 'Qui', 'sexta': 'Sex', 'sabado': 'Sáb'
  }
  return (diasSemana as string[]).map(d => mapa[d] || d)
}

function getDiaAtual() {
  const nomesDias: Record<number, string> = {
    0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
  }
  return nomesDias[new Date().getDay()]
}

function calcularProgresso(curso: any) {
  return Math.round(curso.percentual_conclusao || 0)
}

function calcularAulasRestantes(curso: any) {
  return curso.aulas_restantes || 0
}

function formatarHora(iso: string | null) {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

onMounted(() => buscarDadosAluno())

// Veio de uma notificação do sino apontando pra uma avaliação pendente.
// É um watch (não só onMounted) porque, se o aluno já estiver nesta mesma
// página e clicar em outra notificação, a rota só muda a query — o Vue
// reaproveita o componente e onMounted não dispara de novo.
watch(
  () => route.query.avaliar as string | undefined,
  async (presencaId) => {
    if (!presencaId) return
    await abrirModalAvaliacaoPorPresenca(presencaId)
    // Limpa o parâmetro da URL pra um F5 não reabrir o modal sozinho
    router.replace({ path: route.path })
  },
  { immediate: true }
)
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  encerrarRealtime()
})
</script>

<template>
  <div>
    <AppLoading
      v-if="isLoading"
      title="Carregando Cursos"
      description="Buscando seus cursos matriculados..."
    />

    <div v-else class="space-y-3">
      <div>
        <h2 class="text-base sm:text-lg font-bold text-foreground">Meus Cursos</h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Faça o check-in ao chegar. O professor confirma sua presença e, ao final, você avalia a aula
        </p>
      </div>

      <div v-if="cursos.length === 0" class="bg-card border border-border rounded-lg p-8 text-center">
        <div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
          <Icon icon="book" class-name="w-6 h-6 text-muted-foreground" fallback="📚" />
        </div>
        <h3 class="text-sm font-semibold text-foreground mb-1">Nenhum curso ativo</h3>
        <p class="text-xs text-muted-foreground">
          Você não está matriculado em nenhum curso no momento.
        </p>
      </div>

      <!-- Cards de curso: lado a lado no PC, um embaixo do outro no celular -->
      <div v-else class="columns-1 md:columns-2 xl:columns-3 gap-3">
        <div
          v-for="curso in cursos"
          :key="curso.id"
          class="mb-3 break-inside-avoid bg-gradient-to-br from-white via-gray-50/50 to-slate-50/80 dark:from-slate-900/90 dark:via-gray-900/95 dark:to-black/90 border border-gray-200/60 dark:border-slate-700/40 rounded-xl shadow-sm hover:shadow-md dark:shadow-none transition-all overflow-hidden"
        >
          <!-- Cabeçalho: clique expande/colapsa os detalhes -->
          <button
            type="button"
            @click="toggleCursoAberto(curso.id)"
            class="w-full p-3 text-left"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="text-sm font-bold text-foreground truncate">{{ curso.curso_nome }}</h3>
                  <span
                    v-if="avaliacoesPendentesPorCurso[curso.curso_id]"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex-shrink-0"
                    title="Você tem uma avaliação pendente deste curso"
                  >
                    ⭐ Avaliar
                  </span>
                </div>
                <p class="text-xs text-muted-foreground">{{ curso.carga_horaria }}h</p>
              </div>
              <div class="text-right flex-shrink-0">
                <div class="text-lg font-bold text-primary leading-tight">{{ calcularProgresso(curso) }}%</div>
                <p class="text-[11px] text-muted-foreground leading-tight">Progresso</p>
              </div>
              <Icon
                :icon="cursosAbertos.has(curso.id) ? 'chevron-up' : 'chevron-down'"
                class-name="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1"
                :fallback="cursosAbertos.has(curso.id) ? '▲' : '▼'"
              />
            </div>

            <div class="w-full bg-muted rounded-full h-1.5 mt-2.5">
              <div
                class="bg-primary h-1.5 rounded-full transition-all duration-500"
                :style="{ width: `${calcularProgresso(curso)}%` }"
              ></div>
            </div>
          </button>

          <!-- Detalhes (só aparecem quando o card está aberto) -->
          <div v-show="cursosAbertos.has(curso.id)" class="px-3 pb-3 pt-3 border-t border-border/60 space-y-2.5">
            <div class="grid grid-cols-3 gap-2">
              <div class="text-center">
                <p class="text-sm font-bold text-foreground leading-tight">{{ curso.aulas_concluidas || 0 }}</p>
                <p class="text-[11px] text-muted-foreground">Concluídas</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-bold text-foreground leading-tight">{{ calcularAulasRestantes(curso) }}</p>
                <p class="text-[11px] text-muted-foreground">Restantes</p>
              </div>
              <div class="text-center">
                <p class="text-sm font-bold text-foreground leading-tight">{{ curso.quantidade_aulas || 0 }}</p>
                <p class="text-[11px] text-muted-foreground">Total</p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="flex items-center gap-1.5">
                <Icon icon="clock" class-name="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fallback="🕐" />
                <span class="text-muted-foreground">
                  {{ curso.hora_entrada || '--:--' }} - {{ curso.hora_saida || '--:--' }}
                </span>
              </div>
              <div class="flex items-center gap-1.5 min-w-0">
                <Icon icon="map-marker" class-name="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" fallback="📍" />
                <span class="text-muted-foreground truncate">
                  {{ curso.local_aulas || 'Local não definido' }}
                </span>
              </div>
            </div>

            <div class="p-2.5 rounded-lg bg-muted/30 border border-border">
              <div class="flex items-start gap-1.5">
                <Icon icon="calendar" class-name="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" fallback="📅" />
                <div class="flex-1">
                  <p class="text-[11px] font-medium text-muted-foreground mb-1">Dias de Aula:</p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="dia in formatarDiasSemana(curso.dias_semana)"
                      :key="dia"
                      class="px-1.5 py-0.5 text-[11px] font-medium rounded-md"
                      :class="ehDiaDeAula(curso.dias_semana) && dia === getDiaAtual()
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'"
                    >
                      {{ dia }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="sessaoDoCurso(curso)"
              class="p-2.5 rounded-lg border"
              :class="sessaoDoCurso(curso)?.status === 'falta'
                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
                : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'"
            >
              <p class="text-[11px] font-medium text-muted-foreground mb-1.5">Aula de hoje:</p>
              <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                <span class="text-foreground">
                  <strong>Check-in:</strong> {{ formatarHora(sessaoDoCurso(curso)?.hora_registro ?? null) }}
                </span>
                <span v-if="sessaoDoCurso(curso)?.checkout_at" class="text-foreground">
                  <strong>Encerrada:</strong> {{ formatarHora(sessaoDoCurso(curso)?.checkout_at ?? null) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Ações: continuam visíveis mesmo com o card fechado -->
          <div class="p-3 pt-0 space-y-1.5">
            <button
              @click="acionarBotao(curso)"
              :disabled="botaoDaAula(curso).disabled"
              class="w-full py-2 rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed"
              :class="[botaoDaAula(curso).classe, botaoDaAula(curso).pulsando ? 'animate-pulse' : '']"
            >
              <Icon
                :icon="botaoDaAula(curso).icon"
                class-name="w-4 h-4 inline mr-2"
                :fallback="botaoDaAula(curso).fallback"
              />
              {{ botaoDaAula(curso).label }}
            </button>

            <!-- Segundo caminho pra avaliação pendente de outro dia (a de hoje já sai no botão acima) -->
            <button
              v-if="avaliacoesPendentesPorCurso[curso.curso_id] && sessaoDoCurso(curso)?.status !== 'concluida'"
              @click="abrirModalAvaliacaoPorPresenca(avaliacoesPendentesPorCurso[curso.curso_id]!)"
              class="w-full py-1.5 rounded-lg font-medium text-xs bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>⭐</span>
              <span>Avaliar aula pendente</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Check-in -->
  <Transition name="fade">
    <div
      v-if="mostrarModalCheckin && cursoSelecionado"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="fecharModalCheckin"
    >
      <div class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl" @click.stop>
        <div class="p-6">
          <div class="text-center mb-6">
            <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon icon="check-circle" class-name="w-8 h-8 text-primary" fallback="✓" />
            </div>
            <h3 class="text-xl font-bold text-foreground mb-2">Fazer Check-in</h3>
            <p class="text-sm text-muted-foreground">{{ cursoSelecionado.curso_nome }}</p>
          </div>

          <div class="bg-muted/50 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Data:</span>
              <span class="font-medium text-foreground">{{ new Date().toLocaleDateString('pt-BR') }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Horário:</span>
              <span class="font-medium text-foreground">
                {{ cursoSelecionado.hora_entrada || '--:--' }} - {{ cursoSelecionado.hora_saida || '--:--' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Local:</span>
              <span class="font-medium text-foreground">{{ cursoSelecionado.local_aulas || 'N/A' }}</span>
            </div>
          </div>

          <div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 mb-4">
            <p class="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
              O check-in avisa que você chegou. Quem confirma a presença é o professor, na chamada.
            </p>
          </div>

          <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 mb-6">
            <label class="flex items-start space-x-3 cursor-pointer">
              <input
                v-model="aceitouTermos"
                type="checkbox"
                class="mt-1 w-5 h-5 rounded border-2 border-amber-400 text-amber-600 focus:ring-2 focus:ring-amber-500 cursor-pointer"
              />
              <span class="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                Declaro que estou presente no local da aula e confirmo a veracidade desta informação.
              </span>
            </label>
          </div>

          <div class="flex space-x-3">
            <button
              @click="fecharModalCheckin"
              class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              @click="confirmarCheckin"
              :disabled="!aceitouTermos || enviandoCheckin"
              class="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ enviandoCheckin ? 'Enviando...' : 'Fazer Check-in' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal de Avaliação (espelha o comprovante em papel) -->
  <Transition name="fade">
    <div
      v-if="mostrarModalAvaliacao && avaliacaoCurso"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      @click="fecharModalAvaliacao"
    >
      <div
        class="bg-card border border-border rounded-xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl"
        @click.stop
      >
        <div class="p-4 sm:p-5">
          <div class="text-center mb-3">
            <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <Icon icon="star" class-name="w-5 h-5 text-amber-500" fallback="⭐" />
            </div>
            <h3 class="text-lg font-bold text-foreground">Como foi sua aula de hoje?</h3>
            <p class="text-xs text-muted-foreground mt-0.5">{{ avaliacaoCurso.curso_nome }}</p>
          </div>

          <!-- Indicador das 2 etapas -->
          <div class="flex items-center gap-2 mb-4">
            <button
              type="button"
              @click="irParaAbaAvaliacao(1)"
              class="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
              :class="abaAvaliacao === 1
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                : 'border-border text-muted-foreground hover:text-foreground'"
            >
              <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                :class="abaAvaliacao === 1 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'"
              >1</span>
              Sua opinião
            </button>
            <button
              type="button"
              @click="irParaAbaAvaliacao(2)"
              :disabled="!abaUmValida"
              class="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              :class="abaAvaliacao === 2
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                : 'border-border text-muted-foreground hover:text-foreground'"
            >
              <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                :class="abaAvaliacao === 2 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'"
              >2</span>
              Nota e assinatura
            </button>
          </div>

          <!-- ==================== Etapa 1: feedback da aula ==================== -->
          <div v-show="abaAvaliacao === 1">
            <!-- O que aprendeu -->
            <div class="mb-3">
              <label class="block text-xs font-semibold text-foreground mb-1">
                O que aprendeu na aula hoje?
              </label>
              <textarea
                v-model="oQueAprendeu"
                rows="2"
                maxlength="1000"
                placeholder="Conte o que foi ensinado..."
                class="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              ></textarea>
            </div>

            <!-- Sugestões -->
            <div class="mb-3">
              <label class="block text-xs font-semibold text-foreground mb-1">
                Sugestões <span class="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                v-model="sugestoes"
                rows="1"
                maxlength="1000"
                placeholder="O que poderia melhorar?"
                class="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              ></textarea>
            </div>

            <!-- Dificuldades -->
            <div class="mb-3">
              <label class="block text-xs font-semibold text-foreground mb-1">
                Suas dificuldades <span class="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                v-model="dificuldades"
                rows="1"
                maxlength="1000"
                placeholder="Em que você sentiu dificuldade?"
                class="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              ></textarea>
            </div>

            <!-- Avaliação do profissional -->
            <div class="p-3 rounded-lg bg-muted/40 border border-border">
              <p class="text-xs font-semibold text-foreground mb-2">Avalie nosso profissional</p>

              <label class="block text-xs text-muted-foreground mb-1">
                Nota do professor <span class="text-red-500">*</span>
              </label>
              <div class="flex flex-wrap gap-1 mb-2">
                <button
                  v-for="n in 11"
                  :key="`prof-${n - 1}`"
                  type="button"
                  @click="notaProfessor = n - 1"
                  class="w-7 h-7 rounded-md text-xs font-semibold transition-all"
                  :class="notaProfessor === n - 1
                    ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                    : 'bg-background border border-border text-muted-foreground hover:border-amber-400'"
                >
                  {{ n - 1 }}
                </button>
              </div>

              <textarea
                v-model="avaliacaoProfissional"
                rows="1"
                maxlength="500"
                placeholder="Pontualidade, dedicação, ensino..."
                class="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              ></textarea>
            </div>

            <button
              type="button"
              @click="irParaAbaAvaliacao(2)"
              :disabled="!abaUmValida"
              class="w-full mt-3 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Avançar
            </button>
            <p v-if="!abaUmValida" class="text-xs text-muted-foreground text-center mt-1.5">
              Dê uma nota ao professor para avançar.
            </p>
          </div>

          <!-- ==================== Etapa 2: nota do local + assinatura ====================
               v-if (não v-show): o canvas de assinatura mede o próprio tamanho ao montar
               (offsetWidth/offsetHeight); com v-show ele nasceria escondido (display:none)
               e ficaria com 0x0px, impedindo o desenho do traço. -->
          <div v-if="abaAvaliacao === 2">
            <!-- Nota do local -->
            <div class="mb-4">
              <label class="block text-xs font-semibold text-foreground mb-1">
                Nota do local da aula <span class="text-red-500">*</span>
              </label>
              <div class="flex flex-wrap gap-1">
                <button
                  v-for="n in 11"
                  :key="`local-${n - 1}`"
                  type="button"
                  @click="notaLocal = n - 1"
                  class="w-7 h-7 rounded-md text-xs font-semibold transition-all"
                  :class="notaLocal === n - 1
                    ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                    : 'bg-background border border-border text-muted-foreground hover:border-amber-400'"
                >
                  {{ n - 1 }}
                </button>
              </div>
            </div>

            <!-- Assinatura -->
            <div class="mb-4">
              <label class="block text-xs font-semibold text-foreground mb-1">
                Assinatura do aluno <span class="text-red-500">*</span>
              </label>
              <p class="text-xs text-muted-foreground mb-1">
                Assine com o dedo no celular ou com o mouse no computador.
              </p>
              <AssinaturaCanvas v-model="assinatura" />
            </div>

            <div class="flex space-x-3">
              <button
                @click="irParaAbaAvaliacao(1)"
                class="flex-1 px-4 py-2.5 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
              >
                Voltar
              </button>
              <button
                @click="enviarAvaliacao"
                :disabled="!avaliacaoValida || enviandoAvaliacao"
                class="flex-1 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ enviandoAvaliacao ? 'Enviando...' : 'Enviar' }}
              </button>
            </div>

            <p v-if="!avaliacaoValida" class="text-xs text-muted-foreground text-center mt-1.5">
              Preencha a nota do local e assine para enviar.
            </p>
          </div>

          <button
            @click="fecharModalAvaliacao"
            class="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Agora não
          </button>
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
