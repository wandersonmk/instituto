<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { user } = useAuth()

// Estado
const isLoading = ref(true)
const indicacoes = ref<any[]>([])

// Buscar todas as indicações (admin)
async function buscarIndicacoes() {
  if (!user.value) return
  
  try {
    const { data, error } = await supabase
      .from('indicacoes')
      .select(`
        *,
        aluno:alunos!inner(nome_completo, telefone)
      `)
      .order('data_indicacao', { ascending: false })
    
    if (error) throw error
    
    indicacoes.value = data || []
  } catch (error) {
    console.error('Erro ao buscar indicações:', error)
  } finally {
    isLoading.value = false
  }
}

// Atualizar status
async function atualizarStatus(id: string, novoStatus: string) {
  const toast = await useToastSafe()
  
  try {
    const { error } = await supabase
      .from('indicacoes')
      .update({ status: novoStatus })
      .eq('id', id)
    
    if (error) throw error
    
    toast?.success('Status atualizado!')
    await buscarIndicacoes()
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    toast?.error('Erro ao atualizar status')
  }
}

// Formatação
function formatarTelefone(telefone: string) {
  if (!telefone) return ''
  const numeros = telefone.replace(/\D/g, '')
  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`
  }
  return telefone
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    contatado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    matriculado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    recusado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    contatado: 'Contatado',
    matriculado: 'Matriculado',
    recusado: 'Recusado'
  }
  return labels[status] || status
}

onMounted(() => {
  buscarIndicacoes()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Indicações"
      description="Buscando indicações recebidas..."
    />
    
    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-foreground">Indicações Recebidas</h2>
        <p class="text-muted-foreground mt-1">
          Gerencie as indicações feitas pelos alunos
        </p>
      </div>
      
      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-card border border-border rounded-lg p-4">
          <p class="text-sm text-muted-foreground">Total</p>
          <p class="text-2xl font-bold text-foreground">{{ indicacoes.length }}</p>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <p class="text-sm text-muted-foreground">Pendentes</p>
          <p class="text-2xl font-bold text-yellow-600">
            {{ indicacoes.filter(i => i.status === 'pendente').length }}
          </p>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <p class="text-sm text-muted-foreground">Contatados</p>
          <p class="text-2xl font-bold text-blue-600">
            {{ indicacoes.filter(i => i.status === 'contatado').length }}
          </p>
        </div>
        <div class="bg-card border border-border rounded-lg p-4">
          <p class="text-sm text-muted-foreground">Matriculados</p>
          <p class="text-2xl font-bold text-green-600">
            {{ indicacoes.filter(i => i.status === 'matriculado').length }}
          </p>
        </div>
      </div>
      
      <!-- Lista -->
      <div v-if="indicacoes.length === 0" class="bg-card border border-border rounded-lg p-12 text-center">
        <Icon icon="users" class-name="w-16 h-16 text-muted-foreground mx-auto mb-4" fallback="👥" />
        <h3 class="text-lg font-semibold text-foreground mb-2">Nenhuma indicação ainda</h3>
        <p class="text-muted-foreground">
          As indicações feitas pelos alunos aparecerão aqui
        </p>
      </div>
      
      <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-muted/50 border-b border-border">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Aluno que Indicou
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Nome Indicado
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Telefone
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Data
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="indicacao in indicacoes" :key="indicacao.id" class="hover:bg-muted/30">
              <td class="px-6 py-4 text-sm text-foreground">
                {{ indicacao.aluno.nome_completo }}
              </td>
              <td class="px-6 py-4 text-sm text-foreground">
                {{ indicacao.nome_indicado }}
              </td>
              <td class="px-6 py-4 text-sm text-foreground">
                {{ formatarTelefone(indicacao.telefone_indicado) }}
              </td>
              <td class="px-6 py-4 text-sm text-muted-foreground">
                {{ new Date(indicacao.data_indicacao).toLocaleDateString('pt-BR') }}
              </td>
              <td class="px-6 py-4">
                <span :class="getStatusColor(indicacao.status)" class="px-2 py-1 rounded-full text-xs font-medium">
                  {{ getStatusLabel(indicacao.status) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <select
                  :value="indicacao.status"
                  @change="atualizarStatus(indicacao.id, ($event.target as HTMLSelectElement).value)"
                  class="text-sm border border-border rounded px-2 py-1 bg-background text-foreground"
                >
                  <option value="pendente">Pendente</option>
                  <option value="contatado">Contatado</option>
                  <option value="matriculado">Matriculado</option>
                  <option value="recusado">Recusado</option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
