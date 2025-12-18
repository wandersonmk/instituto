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
  if (!user.value) return
  
  try {
    // Buscar dados do aluno
    const { data: alunoData, error: alunoError } = await supabase
      .from('alunos')
      .select('*, cursos(*)')
      .eq('user_id', user.value.id)
      .single()
    
    if (alunoError) throw alunoError
    
    aluno.value = alunoData
    curso.value = alunoData.cursos
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
    
    <div v-else class="space-y-6">
      <!-- Boas-vindas -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 class="text-2xl font-bold mb-2">
          Olá, {{ user?.user_metadata?.nome || 'Aluno' }}! 👋
        </h2>
        <p class="text-blue-100">
          Bem-vindo à sua área exclusiva. Aqui você pode acompanhar seu progresso e gerenciar suas indicações.
        </p>
      </div>
      
      <!-- Cards de informação -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Card Curso -->
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Icon icon="graduation-cap" class-name="w-6 h-6 text-blue-600 dark:text-blue-400" fallback="🎓" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-muted-foreground">Curso Atual</h3>
              <p class="text-lg font-bold text-foreground">{{ aluno?.curso_contratado || 'Não informado' }}</p>
            </div>
          </div>
          <div v-if="curso" class="text-sm text-muted-foreground space-y-1">
            <p><strong>Carga Horária:</strong> {{ curso.carga_horaria }}h</p>
            <p><strong>Total de Aulas:</strong> {{ curso.quantidade_aulas }}</p>
          </div>
        </div>
        
        <!-- Card Progresso -->
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Icon icon="check-circle" class-name="w-6 h-6 text-green-600 dark:text-green-400" fallback="✓" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-muted-foreground">Progresso</h3>
              <p class="text-lg font-bold text-foreground">{{ progresso }}%</p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="w-full bg-muted rounded-full h-2">
              <div 
                class="bg-green-600 h-2 rounded-full transition-all duration-500"
                :style="{ width: `${progresso}%` }"
              ></div>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ aluno?.aulas_concluidas || 0 }} de {{ aluno?.quantidade_aulas || 0 }} aulas concluídas
            </p>
          </div>
        </div>
        
        <!-- Card Horário -->
        <div class="bg-card border border-border rounded-lg p-6">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Icon icon="clock" class-name="w-6 h-6 text-purple-600 dark:text-purple-400" fallback="🕐" />
            </div>
            <div>
              <h3 class="text-sm font-medium text-muted-foreground">Horário das Aulas</h3>
              <p class="text-lg font-bold text-foreground">
                {{ aluno?.hora_entrada || '--:--' }} - {{ aluno?.hora_saida || '--:--' }}
              </p>
            </div>
          </div>
          <p class="text-sm text-muted-foreground">
            <strong>Local:</strong> {{ aluno?.local_aulas || 'Não informado' }}
          </p>
        </div>
      </div>
      
      <!-- Informações do Curso -->
      <div class="bg-card border border-border rounded-lg p-6">
        <h3 class="text-lg font-semibold text-foreground mb-4 flex items-center">
          <Icon icon="book-open" class-name="w-5 h-5 mr-2 text-primary" fallback="📖" />
          Informações do Curso
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="text-sm font-medium text-muted-foreground mb-2">Dias da Semana</h4>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="dia in aluno?.dias_semana || []"
                :key="dia"
                class="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
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
            <h4 class="text-sm font-medium text-muted-foreground mb-2">Multa por Falta</h4>
            <p class="text-2xl font-bold text-foreground">
              R$ {{ parseFloat(aluno.multa_falta).toFixed(2).replace('.', ',') }}
            </p>
          </div>
        </div>
      </div>
      
      <!-- Botões de Ação -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NuxtLink
          to="/aluno/indicacoes"
          class="flex items-center justify-center space-x-3 p-6 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
        >
          <Icon icon="handshake" class-name="w-8 h-8" fallback="🤝" />
          <div class="text-left">
            <p class="text-xl font-bold">Indicar Amigos</p>
            <p class="text-sm text-green-100">Cadastre suas indicações</p>
          </div>
        </NuxtLink>
        
        <NuxtLink
          to="/aluno/aulas"
          class="flex items-center justify-center space-x-3 p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
        >
          <Icon icon="book" class-name="w-8 h-8" fallback="📚" />
          <div class="text-left">
            <p class="text-xl font-bold">Minhas Aulas</p>
            <p class="text-sm text-blue-100">Registre sua presença</p>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
