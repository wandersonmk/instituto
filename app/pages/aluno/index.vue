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
const curso = ref<any>(null)

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
    
    // Buscar dados do curso se tiver curso_id
    if (alunoData?.curso_id) {
      const { data: cursoData, error: cursoError } = await supabase
        .from('cursos')
        .select('*')
        .eq('id', alunoData.curso_id)
        .single()
      
      if (!cursoError) {
        curso.value = cursoData
      }
    }
  } catch (error) {
    console.error('Erro ao buscar dados:', error)
  } finally {
    isLoading.value = false
  }
}

// Progresso do curso
const progresso = computed(() => {
  if (!aluno.value?.quantidade_aulas) return 0
  const total = parseInt(aluno.value.quantidade_aulas)
  const concluidas = parseInt(aluno.value.aulas_concluidas || 0)
  return Math.round((concluidas / total) * 100)
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
    
    <div v-else class="space-y-4 sm:space-y-6">
      <!-- Boas-vindas -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 sm:p-6 text-white">
        <h2 class="text-lg sm:text-2xl font-bold mb-1 sm:mb-2">
          Olá, {{ primeiroNome }}! 👋
        </h2>
        <p class="text-sm sm:text-base text-blue-100">
          Bem-vindo à sua área exclusiva. Aqui você pode acompanhar seu progresso e gerenciar suas indicações.
        </p>
      </div>
      
      <!-- Cards de informação -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
        <!-- Card Curso -->
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="graduation-cap" class-name="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" fallback="🎓" />
            </div>
            <div class="min-w-0">
              <h3 class="text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300">Curso Atual</h3>
              <p class="text-sm sm:text-lg font-bold text-foreground dark:text-gray-100 truncate">{{ aluno?.curso_contratado || 'Não informado' }}</p>
            </div>
          </div>
          <div v-if="curso" class="text-xs sm:text-sm text-muted-foreground dark:text-gray-300 space-y-0.5 sm:space-y-1">
            <p><strong>Carga Horária:</strong> {{ curso.carga_horaria }}h</p>
            <p><strong>Total de Aulas:</strong> {{ curso.quantidade_aulas }}</p>
          </div>
        </div>
        
        <!-- Card Progresso -->
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="check-circle" class-name="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" fallback="✓" />
            </div>
            <div class="min-w-0">
              <h3 class="text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300">Progresso</h3>
              <p class="text-sm sm:text-lg font-bold text-foreground dark:text-gray-100">{{ progresso }}%</p>
            </div>
          </div>
          <div class="space-y-1.5 sm:space-y-2">
            <div class="w-full bg-muted rounded-full h-1.5 sm:h-2">
              <div 
                class="bg-green-600 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                :style="{ width: `${progresso}%` }"
              ></div>
            </div>
            <p class="text-xs sm:text-sm text-muted-foreground dark:text-gray-300">
              {{ aluno?.aulas_concluidas || 0 }} de {{ aluno?.quantidade_aulas || 0 }} aulas concluídas
            </p>
          </div>
        </div>
        
        <!-- Card Horário -->
        <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
          <div class="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div class="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon icon="clock" class-name="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" fallback="🕐" />
            </div>
            <div class="min-w-0">
              <h3 class="text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300">Horário das Aulas</h3>
              <p class="text-sm sm:text-lg font-bold text-foreground dark:text-gray-100">
                {{ aluno?.hora_entrada || '--:--' }} - {{ aluno?.hora_saida || '--:--' }}
              </p>
            </div>
          </div>
          <p class="text-xs sm:text-sm text-muted-foreground dark:text-gray-300">
            <strong>Local:</strong> {{ aluno?.local_aulas || 'Não informado' }}
          </p>
        </div>
      </div>
      
      <!-- Alerta de Débito (se houver) -->
      <div v-if="aluno?.debito_faltas > 0" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 sm:p-6">
        <div class="flex items-start space-x-3">
          <div class="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 dark:bg-red-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon icon="exclamation-triangle" class-name="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" fallback="⚠️" />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="text-sm sm:text-base font-semibold text-red-800 dark:text-red-200 mb-1">
              Você possui débito de faltas
            </h3>
            <p class="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
              R$ {{ parseFloat(aluno.debito_faltas).toFixed(2).replace('.', ',') }}
            </p>
            <p class="text-xs sm:text-sm text-red-700 dark:text-red-300 mb-3">
              Entre em contato com a administração para regularizar sua situação.
            </p>
            <NuxtLink
              to="/aluno/faltas"
              class="inline-flex items-center space-x-2 text-xs sm:text-sm font-medium text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 transition-colors"
            >
              <span>Ver detalhes das faltas</span>
              <Icon icon="arrow-right" class-name="w-4 h-4" fallback="→" />
            </NuxtLink>
          </div>
        </div>
      </div>
      
      <!-- Informações do Curso -->
      <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
        <h3 class="text-base sm:text-lg font-semibold text-foreground dark:text-gray-100 mb-3 sm:mb-4 flex items-center">
          <Icon icon="book-open" class-name="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" fallback="📖" />
          Informações do Curso
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <h4 class="text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300 mb-2">Dias da Semana</h4>
            <div class="flex flex-wrap gap-1.5 sm:gap-2">
              <span 
                v-for="dia in aluno?.dias_semana || []"
                :key="dia"
                class="px-2 py-0.5 sm:px-3 sm:py-1 bg-primary/15 text-primary border border-primary/30 dark:bg-primary/10 dark:text-primary dark:border-primary/20 text-xs sm:text-sm rounded-full font-medium"
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
          
          <div v-if="aluno?.multa_falta">
            <h4 class="text-xs sm:text-sm font-medium text-muted-foreground dark:text-gray-300 mb-2">Multa por Falta</h4>
            <p class="text-lg sm:text-2xl font-bold text-foreground dark:text-gray-100">
              R$ {{ parseFloat(aluno.multa_falta).toFixed(2).replace('.', ',') }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Botões de Ação -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <NuxtLink
          to="/aluno/indicacoes"
          class="flex items-center justify-center space-x-2 sm:space-x-3 p-4 sm:p-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
        >
          <Icon icon="handshake" class-name="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" fallback="🤝" />
          <div class="text-left">
            <p class="text-base sm:text-xl font-bold">Indicar Amigos</p>
            <p class="text-xs sm:text-sm text-green-100">Cadastre suas indicações</p>
          </div>
        </NuxtLink>
        
        <NuxtLink
          to="/aluno/aulas"
          class="flex items-center justify-center space-x-2 sm:space-x-3 p-4 sm:p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
        >
          <Icon icon="book" class-name="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" fallback="📚" />
          <div class="text-left">
            <p class="text-base sm:text-xl font-bold">Minhas Aulas</p>
            <p class="text-xs sm:text-sm text-blue-100">Registre sua presença</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
