<script setup lang="ts">
import type { VideoComCategoria } from '~/composables/useVideos'

definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()
const { buscarCursosDoAluno } = useAlunosCursos()
const { buscarUltimoVideoAssistido } = useVideos()

// Estado
const isLoading = ref(true)
const aluno = ref<any>(null)
const cursos = ref<any[]>([])
const ultimoVideo = ref<VideoComCategoria | null>(null)

// Buscar dados do aluno
async function buscarDadosAluno() {
  if (!user.value) {
    isLoading.value = false
    return
  }
  
  try {
    // Buscar dados do aluno
    const { data: alunoData, error: alunoError } = await supabase
      .from('alunos')
      .select('*')
      .eq('user_id', user.value.id)
      .single()
    
    if (alunoError) throw alunoError
    
    aluno.value = alunoData
    
    // Buscar todos os cursos do aluno
    if (alunoData?.id) {
      const cursosData = await buscarCursosDoAluno(alunoData.id)
      cursos.value = cursosData || []
    }

    // Buscar último vídeo assistido (se aluno tem acesso)
    if (alunoData?.acesso_videos) {
      ultimoVideo.value = await buscarUltimoVideoAssistido()
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

const formatarDuracao = (segundos: number) => {
  const minutos = Math.floor(segundos / 60)
  const segs = segundos % 60
  return `${minutos}:${segs.toString().padStart(2, '0')}`
}

// Estatísticas dos cursos
const totalCursos = computed(() => cursos.value.length)

const totalAulasConcluidas = computed(() => 
  cursos.value.reduce((total, curso) => total + (curso.aulas_concluidas || 0), 0)
)

const totalAulas = computed(() => 
  cursos.value.reduce((total, curso) => total + (curso.quantidade_aulas || 0), 0)
)

const progressoGeral = computed(() => {
  if (totalAulas.value === 0) return 0
  return Math.round((totalAulasConcluidas.value / totalAulas.value) * 100)
})

const cursoProximo = computed(() => {
  // Encontrar o curso do dia atual
  const hoje = new Date().getDay()
  return cursos.value.find(curso => 
    curso.dias_semana && curso.dias_semana.includes(hoje)
  ) || cursos.value[0]
})

// Pegar apenas o primeiro nome
const primeiroNome = computed(() => {
  try {
    const nomeCompleto = aluno.value?.nome_completo || user.value?.user_metadata?.nome || 'Aluno'
    return nomeCompleto.split(' ')[0] || 'Aluno'
  } catch (error) {
    console.error('Erro ao extrair primeiro nome:', error)
    return 'Aluno'
  }
})

// Buscar dados ao montar
onMounted(() => {
  buscarDadosAluno()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Dashboard"
      description="Buscando suas informações..."
    />
    
    <div v-else class="space-y-3">
      <!-- Boas-vindas -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-3 sm:p-4 text-white">
        <h2 class="text-base sm:text-lg font-bold mb-0.5">
          Olá, {{ primeiroNome }}! 👋
        </h2>
        <p class="text-xs text-blue-100">
          Bem-vindo à sua área exclusiva. Aqui você pode acompanhar seu progresso e gerenciar suas indicações.
        </p>
      </div>

      <!-- Cards de informação -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
        <!-- Card Total de Cursos -->
        <div class="bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/80 dark:from-amber-900/25 dark:via-yellow-900/15 dark:to-orange-900/20 backdrop-blur-sm border border-amber-200/60 dark:border-amber-700/40 rounded-lg p-3">
          <div class="flex items-center gap-2.5 mb-1.5">
            <div class="w-8 h-8 bg-gradient-to-br from-amber-100/70 to-yellow-100/50 dark:from-amber-800/40 dark:to-yellow-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="graduation-cap" class-name="w-4 h-4 text-amber-700 dark:text-amber-400" fallback="🎓" />
            </div>
            <div class="min-w-0">
              <h3 class="text-[11px] font-medium text-blue-600 dark:text-blue-400 leading-tight">Cursos Ativos</h3>
              <p class="text-lg font-bold text-blue-900 dark:text-blue-100 leading-tight">{{ totalCursos }}</p>
            </div>
          </div>
          <div class="text-xs text-blue-700 dark:text-blue-300 truncate">
            <p v-if="totalCursos === 0">Nenhum curso matriculado</p>
            <p v-else-if="totalCursos === 1">{{ cursos[0].curso_nome }}</p>
            <p v-else>{{ totalCursos }} cursos em andamento</p>
          </div>
        </div>

        <!-- Card Progresso Geral -->
        <div class="bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-cyan-50/80 dark:from-emerald-900/25 dark:via-teal-900/15 dark:to-cyan-900/20 backdrop-blur-sm border border-emerald-200/60 dark:border-emerald-700/40 rounded-lg p-3">
          <div class="flex items-center gap-2.5 mb-1.5">
            <div class="w-8 h-8 bg-gradient-to-br from-emerald-100/70 to-teal-100/50 dark:from-emerald-800/40 dark:to-teal-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="check-circle" class-name="w-4 h-4 text-emerald-700 dark:text-emerald-400" fallback="✓" />
            </div>
            <div class="min-w-0">
              <h3 class="text-[11px] font-medium text-green-600 dark:text-green-400 leading-tight">Progresso Geral</h3>
              <p class="text-lg font-bold text-green-900 dark:text-green-100 leading-tight">{{ progressoGeral }}%</p>
            </div>
          </div>
          <div class="space-y-1">
            <div class="w-full bg-green-200/40 dark:bg-green-800/20 rounded-full h-1.5">
              <div
                class="bg-gradient-to-r from-green-500 to-green-600 h-1.5 rounded-full transition-all duration-500"
                :style="{ width: `${progressoGeral}%` }"
              ></div>
            </div>
            <p class="text-xs text-green-700 dark:text-green-300">
              {{ totalAulasConcluidas }} de {{ totalAulas }} aulas concluídas
            </p>
          </div>
        </div>

        <!-- Card Próxima Aula -->
        <div class="bg-gradient-to-br from-violet-50/90 via-fuchsia-50/70 to-pink-50/80 dark:from-violet-900/25 dark:via-fuchsia-900/15 dark:to-pink-900/20 backdrop-blur-sm border border-violet-200/60 dark:border-violet-700/40 rounded-lg p-3">
          <div class="flex items-center gap-2.5 mb-1.5">
            <div class="w-8 h-8 bg-gradient-to-br from-violet-100/70 to-fuchsia-100/50 dark:from-violet-800/40 dark:to-fuchsia-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="clock" class-name="w-4 h-4 text-violet-700 dark:text-violet-400" fallback="🕐" />
            </div>
            <div class="min-w-0">
              <h3 class="text-[11px] font-medium text-purple-600 dark:text-purple-400 leading-tight">Próxima Aula</h3>
              <p v-if="cursoProximo" class="text-sm font-bold text-purple-900 dark:text-purple-100 truncate">
                {{ cursoProximo.curso_nome }}
              </p>
              <p v-else class="text-sm text-purple-600 dark:text-purple-400">Sem aulas</p>
            </div>
          </div>
          <p v-if="cursoProximo" class="text-xs text-purple-700 dark:text-purple-300 leading-snug">
            <strong>Horário:</strong> {{ cursoProximo.hora_entrada || '--:--' }} - {{ cursoProximo.hora_saida || '--:--' }}<br>
            <strong>Local:</strong> {{ cursoProximo.local_aulas || 'Não informado' }}
          </p>
        </div>
      </div>
      
      <!-- Card Continuar Assistindo (se houver último vídeo) -->
      <div v-if="ultimoVideo" class="bg-gradient-to-br from-orange-50 via-amber-50/80 to-yellow-50/90 dark:from-orange-900/20 dark:via-amber-900/15 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-700/40 rounded-lg p-3">
        <div class="flex items-start gap-2.5 mb-2.5">
          <div class="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-800/40 dark:to-amber-800/30 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="play-circle" class-name="w-5 h-5 text-orange-600 dark:text-orange-400" fallback="▶️" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-[11px] font-medium text-orange-700 dark:text-orange-400 leading-tight">Continue Assistindo</h3>
            <p class="text-sm font-bold text-orange-900 dark:text-orange-100 line-clamp-2 leading-tight">
              {{ ultimoVideo.titulo }}
            </p>
            <p v-if="ultimoVideo.categoria" class="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
              {{ ultimoVideo.categoria.icone }} {{ ultimoVideo.categoria.nome }}
            </p>
          </div>
        </div>

        <!-- Botão continuar -->
        <NuxtLink
          :to="`/aluno/videos?video=${ultimoVideo.id}&continuar=true`"
          class="flex items-center justify-center gap-2 w-full px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-lg transition-all shadow-sm font-semibold text-sm"
        >
          <Icon icon="play" class-name="w-3.5 h-3.5" fallback="▶" />
          Continuar Assistindo
        </NuxtLink>
      </div>

      <!-- Alerta de Débito (se houver) -->
      <div v-if="aluno?.debito_faltas > 0" class="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3">
        <div class="flex items-start gap-2.5">
          <div class="w-9 h-9 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="exclamation-triangle" class-name="w-4 h-4 text-red-600 dark:text-red-400" fallback="⚠️" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm font-semibold text-red-800 dark:text-red-200 leading-tight">
              Você possui débito de faltas
            </h3>
            <p class="text-xl font-bold text-red-600 dark:text-red-400 mt-1 mb-1">
              R$ {{ parseFloat(aluno.debito_faltas).toFixed(2).replace('.', ',') }}
            </p>
            <p class="text-xs text-red-700 dark:text-red-300 mb-1.5">
              Entre em contato com a administração para regularizar sua situação.
            </p>
            <NuxtLink
              to="/aluno/faltas"
              class="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 transition-colors"
            >
              <span>Ver detalhes das faltas</span>
              <Icon icon="arrow-right" class-name="w-3 h-3" fallback="→" />
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Lista de Cursos -->
      <div v-if="cursos.length > 0" class="bg-card border border-border rounded-lg p-3">
        <h3 class="text-sm font-semibold text-foreground dark:text-gray-100 mb-2 flex items-center">
          <Icon icon="book-open" class-name="w-4 h-4 mr-1.5 text-primary" fallback="📖" />
          Meus Cursos ({{ totalCursos }})
        </h3>

        <div class="space-y-2">
          <div
            v-for="curso in cursos"
            :key="curso.id"
            class="p-3 bg-gradient-to-br from-white via-slate-50/80 to-gray-100/90 dark:from-slate-900/90 dark:via-gray-900/95 dark:to-black/90 rounded-lg border border-slate-200/70 dark:border-slate-700/40 hover:border-primary/50 transition-colors"
          >
            <div class="flex items-start justify-between mb-1.5">
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-foreground truncate">{{ curso.curso_nome }}</h4>
                <p class="text-xs text-muted-foreground">{{ curso.carga_horaria }}h • {{ curso.quantidade_aulas }} aulas</p>
              </div>
              <div class="text-right ml-2 flex-shrink-0">
                <div class="text-lg font-bold text-primary leading-tight">{{ Math.round(curso.percentual_conclusao || 0) }}%</div>
                <p class="text-[11px] text-muted-foreground leading-tight">Progresso</p>
              </div>
            </div>

            <!-- Barra de Progresso -->
            <div class="w-full bg-muted rounded-full h-1.5 mb-2">
              <div
                class="bg-primary h-1.5 rounded-full transition-all duration-500"
                :style="{ width: `${Math.round(curso.percentual_conclusao || 0)}%` }"
              ></div>
            </div>

            <!-- Informações Adicionais -->
            <div class="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
              <div>
                <strong>Concluídas:</strong> {{ curso.aulas_concluidas || 0 }} de {{ curso.quantidade_aulas }}
              </div>
              <div>
                <strong>Horário:</strong> {{ curso.hora_entrada || '--:--' }} - {{ curso.hora_saida || '--:--' }}
              </div>
              <div class="col-span-2 truncate">
                <strong>Local:</strong> {{ curso.local_aulas || 'Não informado' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Botões de Ação -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        <NuxtLink
          to="/aluno/indicacoes"
          class="flex items-center gap-2.5 p-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
        >
          <Icon icon="handshake" class-name="w-6 h-6 flex-shrink-0" fallback="🤝" />
          <div class="text-left">
            <p class="text-sm font-bold leading-tight">Indicar Amigos</p>
            <p class="text-xs text-green-100">Cadastre suas indicações</p>
          </div>
        </NuxtLink>

        <NuxtLink
          to="/aluno/cursos"
          class="flex items-center gap-2.5 p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
        >
          <Icon icon="book" class-name="w-6 h-6 flex-shrink-0" fallback="📚" />
          <div class="text-left">
            <p class="text-sm font-bold leading-tight">Meus Cursos</p>
            <p class="text-xs text-blue-100">Registre sua presença</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
