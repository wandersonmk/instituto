<script setup lang="ts">
definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()
const { buscarCursosDoAluno, registrarPresenca: registrarPresencaCurso } = useAlunosCursos()

// Estado
const isLoading = ref(true)
const aluno = ref<any>(null)
const cursos = ref<any[]>([])
const cursoSelecionado = ref<any>(null)
const mostrarModalConfirmacao = ref(false)
const aceitouTermos = ref(false)
const presencasRegistradas = ref<Set<string>>(new Set())

// Buscar dados do aluno e seus cursos
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
    
    // Buscar cursos do aluno
    if (alunoData?.id) {
      const cursosData = await buscarCursosDoAluno(alunoData.id)
      
      console.log('🔄 Cursos carregados:', cursosData.map(c => ({
        nome: c.curso_nome,
        aulas_concluidas: c.aulas_concluidas,
        total: c.quantidade_aulas,
        progresso: c.percentual_conclusao + '%'
      })))
      
      // Forçar reatividade criando novo array
      cursos.value = [...cursosData]
      
      // Verificar presenças de hoje
      await verificarPresencasHoje(alunoData.id)
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Verificar se já registrou presença hoje em cada curso
async function verificarPresencasHoje(alunoId: string) {
  const hoje = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('presencas')
    .select('curso_id')
    .eq('aluno_id', alunoId)
    .eq('data_presenca', hoje)
  
  if (!error && data) {
    presencasRegistradas.value = new Set(data.map(p => p.curso_id))
  }
}

// Verificar se hoje é dia de aula para um curso específico
function ehDiaDeAula(diasSemana: number[] | string[]) {
  if (!diasSemana || diasSemana.length === 0) return false
  
  const hoje = new Date()
  const diaSemana = hoje.getDay() // 0 = Domingo, 1 = Segunda, etc.
  
  // Suporta tanto números quanto strings (para compatibilidade)
  if (typeof diasSemana[0] === 'number') {
    return (diasSemana as number[]).includes(diaSemana)
  }
  
  // Fallback para strings antigas
  const mapaDias: Record<number, string> = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado'
  }
  
  const diaHoje = mapaDias[diaSemana]
  return (diasSemana as string[]).includes(diaHoje)
}

// Formatar dias da semana para exibição
function formatarDiasSemana(diasSemana: number[] | string[]) {
  if (!diasSemana || diasSemana.length === 0) return ['Não definido']
  
  const nomesDias: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb'
  }
  
  // Se for array de números
  if (typeof diasSemana[0] === 'number') {
    return (diasSemana as number[]).sort().map(d => nomesDias[d])
  }
  
  // Se for array de strings (fallback)
  const mapaDiasString: Record<string, string> = {
    'domingo': 'Dom',
    'segunda': 'Seg',
    'terca': 'Ter',
    'quarta': 'Qua',
    'quinta': 'Qui',
    'sexta': 'Sex',
    'sabado': 'Sáb'
  }
  
  return (diasSemana as string[]).map(d => mapaDiasString[d] || d)
}

// Obter nome do dia atual
function getDiaAtual() {
  const nomesDias: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sáb'
  }
  
  return nomesDias[new Date().getDay()]
}

// Calcular progresso de um curso (já vem calculado da view)
function calcularProgresso(curso: any) {
  return Math.round(curso.percentual_conclusao || 0)
}

// Calcular aulas restantes (já vem calculado da view)
function calcularAulasRestantes(curso: any) {
  return curso.aulas_restantes || 0
}

// Abrir modal de confirmação de presença
function abrirModalConfirmacao(curso: any) {
  if (presencasRegistradas.value.has(curso.curso_id)) {
    useToastSafe().then(toast => {
      toast?.info('Você já confirmou sua presença hoje neste curso!')
    })
    return
  }
  
  if (!ehDiaDeAula(curso.dias_semana)) {
    useToastSafe().then(toast => {
      toast?.warning('Hoje não é dia de aula para este curso!')
    })
    return
  }
  
  if (calcularAulasRestantes(curso) === 0) {
    useToastSafe().then(toast => {
      toast?.warning('Você já completou todas as aulas deste curso!')
    })
    return
  }
  
  cursoSelecionado.value = curso
  aceitouTermos.value = false
  mostrarModalConfirmacao.value = true
}

// Fechar modal
function fecharModal() {
  mostrarModalConfirmacao.value = false
  cursoSelecionado.value = null
  aceitouTermos.value = false
}

// Registrar presença
async function registrarPresenca() {
  if (!aluno.value || !cursoSelecionado.value || !aceitouTermos.value) return
  
  const toast = await useToastSafe()
  
  try {
    await registrarPresencaCurso(aluno.value.id, cursoSelecionado.value.curso_id)
    
    // Adicionar à lista de presenças registradas
    presencasRegistradas.value.add(cursoSelecionado.value.curso_id)
    
    // Atualizar o curso localmente para feedback imediato
    const cursoIndex = cursos.value.findIndex(c => c.id === cursoSelecionado.value.id)
    if (cursoIndex !== -1) {
      const aulasConcluidasAtual = cursos.value[cursoIndex].aulas_concluidas || 0
      const novasAulasConcluidas = aulasConcluidasAtual + 1
      const quantidadeAulas = cursos.value[cursoIndex].quantidade_aulas || 1
      const novoProgresso = Math.round((novasAulasConcluidas / quantidadeAulas) * 100)
      
      // Criar novo objeto para forçar reatividade
      const cursoAtualizado = {
        ...cursos.value[cursoIndex],
        aulas_concluidas: novasAulasConcluidas,
        percentual_conclusao: novoProgresso,
        aulas_restantes: quantidadeAulas - novasAulasConcluidas
      }
      
      // Substituir no array
      cursos.value[cursoIndex] = cursoAtualizado
      
      console.log(`📚 Aula concluída! Progresso: ${novoProgresso}% (${novasAulasConcluidas}/${quantidadeAulas} aulas)`)
    }
    
    toast?.success(`✓ Presença confirmada! Aula concluída com sucesso.`)
    
    // Fechar modal
    fecharModal()
    
    // Recarregar dados do servidor para sincronizar
    await buscarDadosAluno()
  } catch (error: any) {
    console.error('Erro ao registrar presença:', error)
    toast?.error(error.message || 'Erro ao registrar presença')
  }
}

// Formatar dias da semana
// Buscar ao montar
onMounted(() => {
  buscarDadosAluno()
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
          Registre sua presença e acompanhe seu progresso em cada curso
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
          class="bg-card border border-border rounded-lg p-4 sm:p-6"
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
          
          <!-- Botão de Registrar Presença -->
          <button
            @click="abrirModalConfirmacao(curso)"
            :disabled="presencasRegistradas.has(curso.curso_id) || !ehDiaDeAula(curso.dias_semana) || calcularAulasRestantes(curso) === 0"
            class="w-full py-2.5 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :class="presencasRegistradas.has(curso.curso_id) 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'"
          >
            <Icon icon="check-circle" class-name="w-4 h-4 inline mr-2" fallback="✓" />
            {{
              presencasRegistradas.has(curso.curso_id)
                ? 'Presença Confirmada Hoje'
                : calcularAulasRestantes(curso) === 0
                  ? 'Curso Concluído'
                  : ehDiaDeAula(curso.dias_semana)
                    ? 'Registrar Presença'
                    : 'Hoje não é dia de aula'
            }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação -->
  <Transition name="fade">
    <div
      v-if="mostrarModalConfirmacao && cursoSelecionado"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="fecharModal"
    >
      <Transition name="scale">
        <div
          v-if="mostrarModalConfirmacao"
          class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl"
          @click.stop
        >
          <div class="p-6">
            <!-- Header -->
            <div class="text-center mb-6">
              <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon icon="check-circle" class-name="w-8 h-8 text-green-600 dark:text-green-400" fallback="✓" />
              </div>
              <h3 class="text-xl font-bold text-foreground mb-2">
                Confirmar Presença
              </h3>
              <p class="text-sm text-muted-foreground">
                {{ cursoSelecionado.curso_nome }}
              </p>
            </div>

            <!-- Informações -->
            <div class="bg-muted/50 rounded-lg p-4 mb-6 space-y-2 text-sm">
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

            <!-- Termos -->
            <div class="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg p-4 mb-6">
              <label class="flex items-start space-x-3 cursor-pointer group">
                <input
                  v-model="aceitouTermos"
                  type="checkbox"
                  class="mt-1 w-5 h-5 rounded border-2 border-amber-400 text-amber-600 focus:ring-2 focus:ring-amber-500 cursor-pointer"
                />
                <span class="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                  Declaro que estou presente na aula e confirmo a veracidade desta informação.
                </span>
              </label>
            </div>
            
            <!-- Botões -->
            <div class="flex space-x-3">
              <button
                @click="fecharModal"
                class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
              >
                Cancelar
              </button>
              <button
                @click="registrarPresenca"
                :disabled="!aceitouTermos"
                class="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
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
