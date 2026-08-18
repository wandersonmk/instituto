<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { user } = useAuth()
const { marcarIndicacoesVistas } = useNotificacoesAdmin()

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
  // Admin abriu a página = já viu as indicações — some o badge do menu,
  // igual a notificação de falta no painel do aluno (informativa, não
  // depende de resolver nada; o status 'pendente' de cada uma continua
  // visível normalmente aqui na página).
  marcarIndicacoesVistas()
})

// Tempo real: indicação nova (ou status mudando) enquanto a página está
// aberta — recarrega a lista sozinha, sem precisar de F5.
let canalIndicacoes: ReturnType<typeof supabase.channel> | null = null

onMounted(async () => {
  // Sem isso o canal confirma "assinado" mas o servidor não sabe quem está
  // logado e a RLS não deixa passar nenhum evento — ver app/utils/realtime.ts.
  await autenticarRealtime(supabase)
  canalIndicacoes = supabase
    .channel('indicacoes-pagina')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'indicacoes' }, () => buscarIndicacoes())
    .subscribe()
})

onUnmounted(() => {
  if (canalIndicacoes) {
    supabase.removeChannel(canalIndicacoes)
    canalIndicacoes = null
  }
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Indicações"
      description="Buscando indicações recebidas..."
    />
    
    <div v-else class="space-y-3">
      <!-- Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div class="bg-card border border-border rounded-lg px-3 py-2.5">
          <p class="text-[11px] text-muted-foreground leading-tight">Total</p>
          <p class="text-lg font-bold text-foreground leading-tight">{{ indicacoes.length }}</p>
        </div>
        <div class="bg-card border border-border rounded-lg px-3 py-2.5">
          <p class="text-[11px] text-muted-foreground leading-tight">Pendentes</p>
          <p class="text-lg font-bold text-yellow-600 leading-tight">
            {{ indicacoes.filter(i => i.status === 'pendente').length }}
          </p>
        </div>
        <div class="bg-card border border-border rounded-lg px-3 py-2.5">
          <p class="text-[11px] text-muted-foreground leading-tight">Contatados</p>
          <p class="text-lg font-bold text-blue-600 leading-tight">
            {{ indicacoes.filter(i => i.status === 'contatado').length }}
          </p>
        </div>
        <div class="bg-card border border-border rounded-lg px-3 py-2.5">
          <p class="text-[11px] text-muted-foreground leading-tight">Matriculados</p>
          <p class="text-lg font-bold text-green-600 leading-tight">
            {{ indicacoes.filter(i => i.status === 'matriculado').length }}
          </p>
        </div>
      </div>

      <!-- Lista -->
      <div v-if="indicacoes.length === 0" class="bg-card border border-border rounded-lg p-10 text-center">
        <Icon icon="users" class-name="w-12 h-12 text-muted-foreground mx-auto mb-3" fallback="👥" />
        <h3 class="text-sm font-semibold text-foreground mb-1">Nenhuma indicação ainda</h3>
        <p class="text-xs text-muted-foreground">
          As indicações feitas pelos alunos aparecerão aqui
        </p>
      </div>

      <div v-else class="bg-card border border-border rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted/50 border-b border-border">
              <tr>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                  Aluno que Indicou
                </th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                  Nome Indicado
                </th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                  Telefone
                </th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                  Data
                </th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th class="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="indicacao in indicacoes" :key="indicacao.id" class="hover:bg-muted/30">
                <td class="px-3 py-2 text-foreground">
                  {{ indicacao.aluno.nome_completo }}
                </td>
                <td class="px-3 py-2 text-foreground">
                  {{ indicacao.nome_indicado }}
                </td>
                <td class="px-3 py-2 text-foreground">
                  {{ formatarTelefone(indicacao.telefone_indicado) }}
                </td>
                <td class="px-3 py-2 text-muted-foreground">
                  {{ new Date(indicacao.data_indicacao).toLocaleDateString('pt-BR') }}
                </td>
                <td class="px-3 py-2">
                  <span :class="getStatusColor(indicacao.status)" class="px-1.5 py-0.5 rounded text-[11px] font-semibold leading-none whitespace-nowrap">
                    {{ getStatusLabel(indicacao.status) }}
                  </span>
                </td>
                <td class="px-3 py-2">
                  <select
                    :value="indicacao.status"
                    @change="atualizarStatus(indicacao.id, ($event.target as HTMLSelectElement).value)"
                    class="text-xs border border-border rounded-md px-2 py-1 bg-background text-foreground"
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
  </div>
</template>
