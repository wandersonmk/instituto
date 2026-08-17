<script setup lang="ts">
definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()
const { buscarCursosDoAluno } = useAlunosCursos()
const { fazerCheckin, fazerCheckout, avaliarAula, buscarSessoesHoje } = useAulas()

// Estado
const isLoading = ref(true)
const aluno = ref<any>(null)
const cursos = ref<any[]>([])
const sessoesHoje = ref<Record<string, SessaoAula>>({})

// Modal de check-in
const cursoSelecionado = ref<any>(null)
const mostrarModalCheckin = ref(false)
const aceitouTermos = ref(false)
const enviandoCheckin = ref(false)

// Modal de avaliação
const mostrarModalAvaliacao = ref(false)
const avaliacaoCurso = ref<any>(null)
const avaliacaoSessaoId = ref<string | null>(null)
const notaProfessor = ref(0)
const notaLocal = ref(0)
const comentario = ref('')
const enviandoAvaliacao = ref(false)

// Polling: enquanto houver aula aguardando o professor, reconsulta o status
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
      const cursosData = await buscarCursosDoAluno(alunoData.id)
      cursos.value = [...cursosData]
      await carregarSessoesHoje(alunoData.id)
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
      const antes = anteriores[cursoId]
      if (antes?.status === 'aguardando' && sessao.status === 'em_andamento') {
        toast?.success('O professor autorizou o início da sua aula!')
      }
      if (antes?.status === 'aguardando' && sessao.status === 'rejeitada') {
        toast?.warning('O professor não confirmou o seu check-in.')
      }
    }
  }

  sessoesHoje.value = atuais
  ajustarPolling()
}

function ajustarPolling() {
  const temAguardando = Object.values(sessoesHoje.value).some(s => s.status === 'aguardando')

  if (temAguardando && !pollTimer) {
    pollTimer = setInterval(() => {
      if (aluno.value?.id) carregarSessoesHoje(aluno.value.id, true)
    }, 10000)
  } else if (!temAguardando && pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// ---------------------------------------------------------------- estado da aula

function sessaoDoCurso(curso: any): SessaoAula | null {
  return sessoesHoje.value[curso.curso_id] || null
}

function jaAvaliada(sessao: SessaoAula | null) {
  return (sessao?.avaliacoes_aulas?.length ?? 0) > 0
}

type AcaoAula = 'checkin' | 'checkout' | 'avaliar' | null

function botaoDaAula(curso: any): {
  label: string
  icon: string
  fallback: string
  classe: string
  disabled: boolean
  acao: AcaoAula
  pulsando: boolean
} {
  const sessao = sessaoDoCurso(curso)

  if (sessao?.status === 'aguardando') {
    return {
      label: 'Aguardando o professor autorizar...',
      icon: 'clock',
      fallback: '⏳',
      classe: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      disabled: true,
      acao: null,
      pulsando: true
    }
  }

  if (sessao?.status === 'em_andamento') {
    return {
      label: 'Encerrar Aula',
      icon: 'check-circle',
      fallback: '⏹',
      classe: 'bg-blue-600 hover:bg-blue-700 text-white',
      disabled: false,
      acao: 'checkout',
      pulsando: false
    }
  }

  if (sessao?.status === 'rejeitada') {
    return {
      label: 'Check-in não confirmado pelo professor',
      icon: 'times-circle',
      fallback: '✕',
      classe: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      disabled: true,
      acao: null,
      pulsando: false
    }
  }

  if (sessao?.status === 'concluida') {
    return jaAvaliada(sessao)
      ? {
          label: 'Aula concluída e avaliada',
          icon: 'check-circle',
          fallback: '✓',
          classe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
          disabled: true,
          acao: null,
          pulsando: false
        }
      : {
          label: 'Avaliar Aula',
          icon: 'star',
          fallback: '⭐',
          classe: 'bg-amber-500 hover:bg-amber-600 text-white',
          disabled: false,
          acao: 'avaliar',
          pulsando: true
        }
  }

  // Sem sessão hoje
  if (calcularAulasRestantes(curso) === 0) {
    return {
      label: 'Curso Concluído',
      icon: 'check-circle',
      fallback: '✓',
      classe: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      disabled: true,
      acao: null,
      pulsando: false
    }
  }

  if (!ehDiaDeAula(curso.dias_semana)) {
    return {
      label: 'Hoje não é dia de aula',
      icon: 'calendar',
      fallback: '📅',
      classe: 'bg-muted text-muted-foreground',
      disabled: true,
      acao: null,
      pulsando: false
    }
  }

  return {
    label: 'Fazer Check-in',
    icon: 'check-circle',
    fallback: '✓',
    classe: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    disabled: false,
    acao: 'checkin',
    pulsando: false
  }
}

function acionarBotao(curso: any) {
  const { acao } = botaoDaAula(curso)
  if (acao === 'checkin') return abrirModalCheckin(curso)
  if (acao === 'checkout') return encerrarAula(curso)
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
    toast?.success('Check-in enviado! Aguarde o professor autorizar o início da aula.')
    fecharModalCheckin()
    await carregarSessoesHoje(aluno.value.id)
  } catch (error: any) {
    console.error('Erro ao fazer check-in:', error)
    toast?.error(error.message || 'Erro ao fazer check-in')
  } finally {
    enviandoCheckin.value = false
  }
}

// ---------------------------------------------------------------- check-out

async function encerrarAula(curso: any) {
  const sessao = sessaoDoCurso(curso)
  if (!sessao || !aluno.value) return

  const toast = await useToastSafe()

  try {
    await fazerCheckout(sessao.id)
    toast?.success('Aula encerrada! Conte pra gente como ela foi.')
    await buscarDadosAluno()
    abrirModalAvaliacao(curso)
  } catch (error: any) {
    console.error('Erro ao encerrar aula:', error)
    toast?.error(error.message || 'Erro ao encerrar a aula')
  }
}

// ---------------------------------------------------------------- avaliação

function abrirModalAvaliacao(curso: any) {
  const sessao = sessaoDoCurso(curso)
  if (!sessao) return

  avaliacaoCurso.value = curso
  avaliacaoSessaoId.value = sessao.id
  notaProfessor.value = 0
  notaLocal.value = 0
  comentario.value = ''
  mostrarModalAvaliacao.value = true
}

function fecharModalAvaliacao() {
  mostrarModalAvaliacao.value = false
  avaliacaoCurso.value = null
  avaliacaoSessaoId.value = null
}

const avaliacaoValida = computed(() => notaProfessor.value > 0 && notaLocal.value > 0)

async function enviarAvaliacao() {
  if (!avaliacaoSessaoId.value || !avaliacaoValida.value || !aluno.value) return

  const toast = await useToastSafe()
  enviandoAvaliacao.value = true

  try {
    await avaliarAula(avaliacaoSessaoId.value, notaProfessor.value, notaLocal.value, comentario.value)
    toast?.success('Obrigado pela sua avaliação!')
    fecharModalAvaliacao()
    await carregarSessoesHoje(aluno.value.id)
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

  const diaSemana = new Date().getDay() // 0 = Domingo

  if (typeof diasSemana[0] === 'number') {
    return (diasSemana as number[]).includes(diaSemana)
  }

  const mapaDias: Record<number, string> = {
    0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta',
    4: 'quinta', 5: 'sexta', 6: 'sabado'
  }

  return (diasSemana as string[]).includes(mapaDias[diaSemana] as string)
}

function formatarDiasSemana(diasSemana: number[] | string[]) {
  if (!diasSemana || diasSemana.length === 0) return ['Não definido']

  const nomesDias: Record<number, string> = {
    0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb'
  }

  if (typeof diasSemana[0] === 'number') {
    return (diasSemana as number[]).slice().sort().map(d => nomesDias[d])
  }

  const mapaDiasString: Record<string, string> = {
    'domingo': 'Dom', 'segunda': 'Seg', 'terca': 'Ter', 'quarta': 'Qua',
    'quinta': 'Qui', 'sexta': 'Sex', 'sabado': 'Sáb'
  }

  return (diasSemana as string[]).map(d => mapaDiasString[d] || d)
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

onMounted(() => {
  buscarDadosAluno()
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div>
    <AppLoading
      v-if="isLoading"
      title="Carregando Cursos"
      description="Buscando seus cursos matriculados..."
    />

    <div v-else class="space-y-4">
      <!-- Header -->
      <div>
        <h2 class="text-lg sm:text-2xl font-bold text-foreground">Meus Cursos</h2>
        <p class="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Faça o check-in ao chegar, aguarde a autorização do professor e encerre a aula ao final
        </p>
      </div>

      <!-- Mensagem se não tiver cursos -->
      <div v-if="cursos.length === 0" class="bg-card border border-border rounded-lg p-6 text-center">
        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon="book" class-name="w-8 h-8 text-muted-foreground" fallback="📚" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-2">Nenhum curso ativo</h3>
        <p class="text-sm text-muted-foreground">
          Você não está matriculado em nenhum curso no momento.
        </p>
      </div>

      <!-- Lista de Cursos -->
      <div v-else class="space-y-4">
        <div
          v-for="curso in cursos"
          :key="curso.id"
          class="bg-gradient-to-br from-white via-gray-50/50 to-slate-50/80 dark:from-slate-900/90 dark:via-gray-900/95 dark:to-black/90 border border-gray-200/60 dark:border-slate-700/40 rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-slate-900/50 transition-all"
        >
          <!-- Header do Curso -->
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-base sm:text-xl font-bold text-foreground mb-1">
                {{ curso.curso_nome }}
              </h3>
              <p class="text-xs sm:text-sm text-muted-foreground">
                {{ curso.carga_horaria }}h
              </p>
            </div>
            <div class="text-right">
              <div class="text-2xl sm:text-3xl font-bold text-primary">
                {{ calcularProgresso(curso) }}%
              </div>
              <p class="text-xs text-muted-foreground">Progresso</p>
            </div>
          </div>

          <!-- Barra de Progresso -->
          <div class="w-full bg-muted rounded-full h-2 mb-4">
            <div
              class="bg-primary h-2 rounded-full transition-all duration-500"
              :style="{ width: `${calcularProgresso(curso)}%` }"
            ></div>
          </div>

          <!-- Estatísticas -->
          <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
            <div class="text-center">
              <p class="text-lg sm:text-xl font-bold text-foreground">{{ curso.aulas_concluidas || 0 }}</p>
              <p class="text-xs text-muted-foreground">Concluídas</p>
            </div>
            <div class="text-center">
              <p class="text-lg sm:text-xl font-bold text-foreground">{{ calcularAulasRestantes(curso) }}</p>
              <p class="text-xs text-muted-foreground">Restantes</p>
            </div>
            <div class="text-center">
              <p class="text-lg sm:text-xl font-bold text-foreground">{{ curso.quantidade_aulas || 0 }}</p>
              <p class="text-xs text-muted-foreground">Total</p>
            </div>
          </div>

          <!-- Informações Adicionais -->
          <div class="grid grid-cols-2 gap-3 mb-3 text-xs sm:text-sm">
            <div class="flex items-center space-x-2">
              <Icon icon="clock" class-name="w-4 h-4 text-muted-foreground" fallback="🕐" />
              <span class="text-muted-foreground">
                {{ curso.hora_entrada || '--:--' }} - {{ curso.hora_saida || '--:--' }}
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <Icon icon="map-marker" class-name="w-4 h-4 text-muted-foreground" fallback="📍" />
              <span class="text-muted-foreground truncate">
                {{ curso.local_aulas || 'Local não definido' }}
              </span>
            </div>
          </div>

          <!-- Dias da Semana -->
          <div class="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
            <div class="flex items-start space-x-2">
              <Icon icon="calendar" class-name="w-4 h-4 text-primary mt-0.5" fallback="📅" />
              <div class="flex-1">
                <p class="text-xs font-medium text-muted-foreground mb-1">Dias de Aula:</p>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="dia in formatarDiasSemana(curso.dias_semana)"
                    :key="dia"
                    class="px-2 py-1 text-xs font-medium rounded-md"
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

          <!-- Linha do tempo da aula de hoje -->
          <div
            v-if="sessaoDoCurso(curso)"
            class="mb-4 p-3 rounded-lg border"
            :class="sessaoDoCurso(curso)?.status === 'rejeitada'
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30'
              : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/30'"
          >
            <p class="text-xs font-medium text-muted-foreground mb-2">Aula de hoje:</p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span class="text-foreground">
                <strong>Check-in:</strong> {{ formatarHora(sessaoDoCurso(curso)?.hora_registro ?? null) }}
              </span>
              <span v-if="sessaoDoCurso(curso)?.confirmado_at" class="text-foreground">
                <strong>{{ sessaoDoCurso(curso)?.status === 'rejeitada' ? 'Recusada' : 'Autorizada' }}:</strong>
                {{ formatarHora(sessaoDoCurso(curso)?.confirmado_at ?? null) }}
              </span>
              <span v-if="sessaoDoCurso(curso)?.checkout_at" class="text-foreground">
                <strong>Check-out:</strong> {{ formatarHora(sessaoDoCurso(curso)?.checkout_at ?? null) }}
              </span>
            </div>
          </div>

          <!-- Botão da aula -->
          <button
            @click="acionarBotao(curso)"
            :disabled="botaoDaAula(curso).disabled"
            class="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:cursor-not-allowed"
            :class="[botaoDaAula(curso).classe, botaoDaAula(curso).pulsando ? 'animate-pulse' : '']"
          >
            <Icon
              :icon="botaoDaAula(curso).icon"
              class-name="w-4 h-4 inline mr-2"
              :fallback="botaoDaAula(curso).fallback"
            />
            {{ botaoDaAula(curso).label }}
          </button>
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
      <Transition name="scale">
        <div
          v-if="mostrarModalCheckin"
          class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl"
          @click.stop
        >
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
                <span class="text-muted-foreground">Aula:</span>
                <span class="font-medium text-foreground">
                  {{ (cursoSelecionado.aulas_concluidas || 0) + 1 }} de {{ cursoSelecionado.quantidade_aulas || 0 }}
                </span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Local:</span>
                <span class="font-medium text-foreground">{{ cursoSelecionado.local_aulas || 'N/A' }}</span>
              </div>
            </div>

            <div class="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-lg p-3 mb-4">
              <p class="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                <Icon icon="clock" class-name="w-4 h-4 inline mr-1" fallback="⏳" />
                Após o check-in, o professor precisa autorizar o início da aula.
              </p>
            </div>

            <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 mb-6">
              <label class="flex items-start space-x-3 cursor-pointer group">
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
      </Transition>
    </div>
  </Transition>

  <!-- Modal de Avaliação -->
  <Transition name="fade">
    <div
      v-if="mostrarModalAvaliacao && avaliacaoCurso"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="fecharModalAvaliacao"
    >
      <Transition name="scale">
        <div
          v-if="mostrarModalAvaliacao"
          class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          @click.stop
        >
          <div class="p-6">
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="star" class-name="w-8 h-8 text-amber-500" fallback="⭐" />
              </div>
              <h3 class="text-xl font-bold text-foreground mb-2">Como foi sua aula de hoje?</h3>
              <p class="text-sm text-muted-foreground">{{ avaliacaoCurso.curso_nome }}</p>
            </div>

            <!-- Nota do professor -->
            <div class="mb-5">
              <p class="text-sm font-medium text-foreground mb-2">Nota para o professor</p>
              <div class="flex justify-center space-x-2">
                <button
                  v-for="n in 5"
                  :key="`prof-${n}`"
                  type="button"
                  @click="notaProfessor = n"
                  class="text-3xl transition-transform hover:scale-110 focus:outline-none"
                  :class="n <= notaProfessor ? 'text-amber-400' : 'text-muted-foreground/30'"
                  :aria-label="`${n} de 5 para o professor`"
                >
                  ★
                </button>
              </div>
            </div>

            <!-- Nota do local -->
            <div class="mb-5">
              <p class="text-sm font-medium text-foreground mb-2">Nota para o local da aula</p>
              <div class="flex justify-center space-x-2">
                <button
                  v-for="n in 5"
                  :key="`local-${n}`"
                  type="button"
                  @click="notaLocal = n"
                  class="text-3xl transition-transform hover:scale-110 focus:outline-none"
                  :class="n <= notaLocal ? 'text-amber-400' : 'text-muted-foreground/30'"
                  :aria-label="`${n} de 5 para o local`"
                >
                  ★
                </button>
              </div>
            </div>

            <!-- Comentário -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-foreground mb-2">
                Comentário <span class="text-muted-foreground font-normal">(opcional)</span>
              </label>
              <textarea
                v-model="comentario"
                rows="3"
                maxlength="500"
                placeholder="Conte como foi a aula..."
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              ></textarea>
              <p class="text-xs text-muted-foreground mt-1 text-right">{{ comentario.length }}/500</p>
            </div>

            <div class="flex space-x-3">
              <button
                @click="fecharModalAvaliacao"
                class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
              >
                Agora não
              </button>
              <button
                @click="enviarAvaliacao"
                :disabled="!avaliacaoValida || enviandoAvaliacao"
                class="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ enviandoAvaliacao ? 'Enviando...' : 'Enviar Avaliação' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
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

.scale-enter-active,
.scale-leave-active {
  transition: all 0.3s ease;
}

.scale-enter-from,
.scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
