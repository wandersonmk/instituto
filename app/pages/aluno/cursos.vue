<script setup lang="ts">
definePageMeta({
  middleware: 'aluno',
  layout: 'aluno'
})

const { user } = useAuth()
const supabase = useSupabaseClient()

// Estado
const isLoading = ref(true)
const aluno = ref<any>(null)
const mostrarModalConfirmacao = ref(false)
const aceitouTermos = ref(false)
const jaRegistrouHoje = ref(false)

// Buscar dados do aluno
async function buscarDadosAluno() {
  if (!user.value) {
    isLoading.value = false
    return
  }
  
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('user_id', user.value.id)
      .single()
    
    if (error) throw error
    
    aluno.value = data
    
    // Verificar se já registrou presença hoje
    if (data?.id) {
      await verificarPresencaHoje(data.id)
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Verificar se já registrou presença hoje
async function verificarPresencaHoje(alunoId: string) {
  const hoje = new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
  
  const { data, error } = await supabase
    .from('presencas')
    .select('id')
    .eq('aluno_id', alunoId)
    .eq('data_presenca', hoje)
    .maybeSingle()
  
  if (!error && data) {
    jaRegistrouHoje.value = true
  }
}

// Verificar se hoje é dia de aula
const ehDiaDeAula = computed(() => {
  if (!aluno.value?.dias_semana || aluno.value.dias_semana.length === 0) {
    return false
  }
  
  const hoje = new Date()
  const diaSemana = hoje.getDay() // 0 = Domingo, 1 = Segunda, etc.
  
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
  return aluno.value.dias_semana.includes(diaHoje)
})

// Abrir modal de confirmação
function abrirModalConfirmacao() {
  if (jaRegistrouHoje.value) {
    useToastSafe().then(toast => {
      toast?.info('Você já confirmou sua presença hoje!')
    })
    return
  }
  
  if (!ehDiaDeAula.value) {
    useToastSafe().then(toast => {
      toast?.warning('Hoje não é dia de aula!')
    })
    return
  }
  
  if (aulasRestantes.value === 0) {
    useToastSafe().then(toast => {
      toast?.warning('Você já completou todas as aulas do curso!')
    })
    return
  }
  
  aceitouTermos.value = false
  mostrarModalConfirmacao.value = true
}

// Fechar modal
function fecharModal() {
  mostrarModalConfirmacao.value = false
  aceitouTermos.value = false
}

// Registrar presença
async function registrarPresenca() {
  if (!aluno.value || !aceitouTermos.value) return
  
  const toast = await useToastSafe()
  
  try {
    const hoje = new Date().toISOString().split('T')[0]
    
    // Registrar presença na tabela de presenças
    const { error: erroPresenca } = await supabase
      .from('presencas')
      .insert({
        aluno_id: aluno.value.id,
        data_presenca: hoje
      })
    
    if (erroPresenca) {
      console.error('Erro ao registrar presença:', erroPresenca)
      toast?.error('Erro ao registrar presença')
      return
    }
    
    // Incrementar aulas_concluidas
    const novoTotal = (aluno.value.aulas_concluidas || 0) + 1
    
    const { error } = await supabase
      .from('alunos')
      .update({ aulas_concluidas: novoTotal })
      .eq('id', aluno.value.id)
    
    if (error) throw error
    
    toast?.success(`Presença registrada! Total: ${novoTotal} aulas`)
    
    // Atualizar dados locais
    aluno.value.aulas_concluidas = novoTotal
    jaRegistrouHoje.value = true
    
    // Fechar modal
    fecharModal()
  } catch (error) {
    console.error('Erro ao registrar presença:', error)
    toast?.error('Erro ao registrar presença')
  }
}

// Progresso
const progresso = computed(() => {
  if (!aluno.value?.quantidade_aulas) return 0
  const total = parseInt(aluno.value.quantidade_aulas)
  const concluidas = parseInt(aluno.value.aulas_concluidas || 0)
  return Math.round((concluidas / total) * 100)
})

const aulasRestantes = computed(() => {
  if (!aluno.value) return 0
  return (aluno.value.quantidade_aulas || 0) - (aluno.value.aulas_concluidas || 0)
})

// Buscar ao montar
onMounted(() => {
  buscarDadosAluno()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Aulas"
      description="Buscando informações do seu curso..."
    />
    
    <div v-else class="space-y-4">
      <!-- Header -->
      <div>
        <h2 class="text-lg sm:text-2xl font-bold text-foreground">Meus Cursos</h2>
        <p class="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Registre sua presença e acompanhe seu progresso no curso
        </p>
      </div>
      
      <!-- Card de Progresso Grande -->
      <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 sm:p-8 text-white">
        <div class="text-center mb-4 sm:mb-6">
          <h3 class="text-3xl sm:text-4xl font-bold mb-1 sm:mb-2">{{ progresso }}%</h3>
          <p class="text-xs sm:text-sm text-blue-100">Progresso no Curso</p>
        </div>
        
        <div class="w-full bg-blue-800/50 rounded-full h-2 sm:h-4 mb-3 sm:mb-4">
          <div 
            class="bg-white h-2 sm:h-4 rounded-full transition-all duration-500"
            :style="{ width: `${progresso}%` }"
          ></div>
        </div>
        
        <div class="grid grid-cols-3 gap-2 sm:gap-4 text-center">
          <div>
            <p class="text-lg sm:text-2xl font-bold">{{ aluno?.aulas_concluidas || 0 }}</p>
            <p class="text-xs sm:text-sm text-blue-100">Concluídas</p>
          </div>
          <div>
            <p class="text-lg sm:text-2xl font-bold">{{ aulasRestantes }}</p>
            <p class="text-xs sm:text-sm text-blue-100">Restantes</p>
          </div>
          <div>
            <p class="text-lg sm:text-2xl font-bold">{{ aluno?.quantidade_aulas || 0 }}</p>
            <p class="text-xs sm:text-sm text-blue-100">Total</p>
          </div>
        </div>
      </div>
      
      <!-- Check-in -->
      <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div class="text-center max-w-md mx-auto">
          <div class="w-14 h-14 sm:w-20 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Icon icon="check-circle" class-name="w-7 h-7 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" fallback="✓" />
          </div>
          
          <h3 class="text-base sm:text-xl font-bold text-foreground mb-1 sm:mb-2">Registrar Presença</h3>
          <p class="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
            Clique no botão abaixo para confirmar sua presença na aula de hoje
          </p>
          
          <button
            @click="abrirModalConfirmacao"
            :disabled="jaRegistrouHoje || !ehDiaDeAula || aulasRestantes === 0"
            class="w-full py-2.5 sm:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-sm sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="check-circle" class-name="w-4 h-4 sm:w-6 sm:h-6 inline mr-1 sm:mr-2" fallback="✓" />
            {{ jaRegistrouHoje ? 'Presença Confirmada Hoje!' : aulasRestantes === 0 ? 'Curso Concluído!' : ehDiaDeAula ? 'Confirmar Presença' : 'Hoje não é dia de aula' }}
          </button>
          
          <p v-if="jaRegistrouHoje" class="text-xs text-green-600 dark:text-green-400 mt-3 sm:mt-4">
            ✅ Você já registrou sua presença hoje!
          </p>
          
          <p v-else-if="aulasRestantes === 0" class="text-xs text-green-600 dark:text-green-400 mt-3 sm:mt-4">
            🎉 Parabéns! Você completou todas as aulas do curso!
          </p>
          
          <p v-else-if="!ehDiaDeAula" class="text-xs text-amber-600 dark:text-amber-400 mt-3 sm:mt-4">
            ⚠️ A confirmação de presença só está disponível nos dias de aula
          </p>
        </div>
      </div>
      
      <!-- Informações do Curso -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h3 class="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Informações do Curso</h3>
          <div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Curso:</span>
              <span class="font-medium text-foreground">{{ aluno?.curso_contratado || 'N/A' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Carga Horária:</span>
              <span class="font-medium text-foreground">{{ aluno?.quantidade_horas || 0 }}h</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Local:</span>
              <span class="font-medium text-foreground">{{ aluno?.local_aulas || 'N/A' }}</span>
            </div>
          </div>
        </div>
        
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <h3 class="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Horários</h3>
          <div class="space-y-2 sm:space-y-3 text-xs sm:text-sm">
            <div class="flex justify-between">
              <span class="text-muted-foreground">Entrada:</span>
              <span class="font-medium text-foreground">{{ aluno?.hora_entrada || '--:--' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Saída:</span>
              <span class="font-medium text-foreground">{{ aluno?.hora_saida || '--:--' }}</span>
            </div>
            <div v-if="aluno?.multa_falta" class="flex justify-between pt-2 border-t border-border">
              <span class="text-muted-foreground">Multa por Falta:</span>
              <span class="font-medium text-red-600">R$ {{ parseFloat(aluno.multa_falta).toFixed(2).replace('.', ',') }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Dias da Semana -->
      <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Dias de Aula</h3>
        <div class="flex flex-wrap gap-1.5 sm:gap-2">
          <span 
            v-for="dia in aluno?.dias_semana || []"
            :key="dia"
            class="px-3 py-1.5 sm:px-4 sm:py-2 bg-primary/10 text-primary rounded-lg font-medium text-xs sm:text-sm"
          >
            {{ {
              'segunda': 'Segunda-feira',
              'terca': 'Terça-feira',
              'quarta': 'Quarta-feira',
              'quinta': 'Quinta-feira',
              'sexta': 'Sexta-feira',
              'sabado': 'Sábado',
              'domingo': 'Domingo'
            }[dia] || dia }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação -->
  <Transition name="fade">
    <div
      v-if="mostrarModalConfirmacao"
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
                Você está prestes a registrar sua presença na aula de hoje
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
                <span class="font-medium text-foreground">{{ aluno?.hora_entrada || '--:--' }} - {{ aluno?.hora_saida || '--:--' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted-foreground">Aula:</span>
                <span class="font-medium text-foreground">{{ (aluno?.aulas_concluidas || 0) + 1 }} de {{ aluno?.quantidade_aulas || 0 }}</span>
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
                  Estou ciente de que declarações falsas podem resultar em penalidades.
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
                class="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
