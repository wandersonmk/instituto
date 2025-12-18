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

// Buscar dados do aluno
async function buscarDadosAluno() {
  if (!user.value) return
  
  try {
    const { data, error } = await supabase
      .from('alunos')
      .select('*')
      .eq('user_id', user.value.id)
      .single()
    
    if (error) throw error
    
    aluno.value = data
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Registrar presença
async function registrarPresenca() {
  if (!aluno.value) return
  
  const toast = await useToastSafe()
  
  try {
    // Incrementar aulas_concluidas
    const novoTotal = (aluno.value.aulas_concluidas || 0) + 1
    
    // Verificar se não ultrapassa o total
    if (novoTotal > aluno.value.quantidade_aulas) {
      toast?.warning('Você já completou todas as aulas do curso!')
      return
    }
    
    const { error } = await supabase
      .from('alunos')
      .update({ aulas_concluidas: novoTotal })
      .eq('id', aluno.value.id)
    
    if (error) throw error
    
    toast?.success(`Presença registrada! Total: ${novoTotal} aulas`)
    
    // Atualizar dados locais
    aluno.value.aulas_concluidas = novoTotal
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
    
    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-foreground">Minhas Aulas</h2>
        <p class="text-muted-foreground mt-1">
          Registre sua presença e acompanhe seu progresso no curso
        </p>
      </div>
      
      <!-- Card de Progresso Grande -->
      <div class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-8 text-white">
        <div class="text-center mb-6">
          <h3 class="text-4xl font-bold mb-2">{{ progresso }}%</h3>
          <p class="text-blue-100">Progresso no Curso</p>
        </div>
        
        <div class="w-full bg-blue-800/50 rounded-full h-4 mb-4">
          <div 
            class="bg-white h-4 rounded-full transition-all duration-500"
            :style="{ width: `${progresso}%` }"
          ></div>
        </div>
        
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <p class="text-2xl font-bold">{{ aluno?.aulas_concluidas || 0 }}</p>
            <p class="text-sm text-blue-100">Concluídas</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ aulasRestantes }}</p>
            <p class="text-sm text-blue-100">Restantes</p>
          </div>
          <div>
            <p class="text-2xl font-bold">{{ aluno?.quantidade_aulas || 0 }}</p>
            <p class="text-sm text-blue-100">Total</p>
          </div>
        </div>
      </div>
      
      <!-- Check-in -->
      <div class="bg-card border border-border rounded-lg p-6">
        <div class="text-center max-w-md mx-auto">
          <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon icon="check-circle" class-name="w-10 h-10 text-green-600 dark:text-green-400" fallback="✓" />
          </div>
          
          <h3 class="text-xl font-bold text-foreground mb-2">Registrar Presença</h3>
          <p class="text-muted-foreground mb-6">
            Clique no botão abaixo para confirmar sua presença na aula de hoje
          </p>
          
          <button
            @click="registrarPresenca"
            :disabled="aulasRestantes === 0"
            class="w-full py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon icon="check-circle" class-name="w-6 h-6 inline mr-2" fallback="✓" />
            {{ aulasRestantes > 0 ? 'Confirmar Presença' : 'Curso Concluído!' }}
          </button>
          
          <p v-if="aulasRestantes === 0" class="text-sm text-green-600 dark:text-green-400 mt-4">
            🎉 Parabéns! Você completou todas as aulas do curso!
          </p>
        </div>
      </div>
      
      <!-- Informações do Curso -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-card border border-border rounded-lg p-6">
          <h3 class="font-semibold text-foreground mb-4">Informações do Curso</h3>
          <div class="space-y-3 text-sm">
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
        
        <div class="bg-card border border-border rounded-lg p-6">
          <h3 class="font-semibold text-foreground mb-4">Horários</h3>
          <div class="space-y-3 text-sm">
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
      <div class="bg-card border border-border rounded-lg p-6">
        <h3 class="font-semibold text-foreground mb-4">Dias de Aula</h3>
        <div class="flex flex-wrap gap-2">
          <span 
            v-for="dia in aluno?.dias_semana || []"
            :key="dia"
            class="px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium"
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
</template>
