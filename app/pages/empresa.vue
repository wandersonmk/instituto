<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

const supabase = useSupabaseClient()
const { empresaId, isAdmin, empresa } = useEmpresa()

// Estado
const isLoading = ref(true)
const isSaving = ref(false)

// Dados da empresa
const nome = ref('')
const cnpj = ref('')
const email = ref('')
const telefone = ref('')
const endereco = ref('')
const plano = ref('basico')

// Buscar dados da empresa
async function buscarEmpresa() {
  if (!empresaId.value) {
    isLoading.value = false
    return
  }

  try {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId.value)
      .single()

    if (error) throw error

    if (data) {
      nome.value = data.nome || ''
      cnpj.value = data.cnpj || ''
      email.value = data.email || ''
      telefone.value = data.telefone || ''
      endereco.value = data.endereco || ''
      plano.value = data.plano || 'basico'
    }
  } catch (error) {
    console.error('Erro ao buscar empresa:', error)
  } finally {
    isLoading.value = false
  }
}

// Salvar alterações
async function salvarEmpresa() {
  const toast = await useToastSafe()
  
  if (!isAdmin.value) {
    toast?.error('Apenas administradores podem editar a empresa')
    return
  }

  if (!nome.value.trim()) {
    toast?.error('Nome da empresa é obrigatório')
    return
  }

  isSaving.value = true

  try {
    const { error } = await supabase
      .from('empresas')
      .update({
        nome: nome.value,
        cnpj: cnpj.value || null,
        email: email.value || null,
        telefone: telefone.value || null,
        endereco: endereco.value || null,
        plano: plano.value
      })
      .eq('id', empresaId.value)

    if (error) throw error

    toast?.success('Empresa atualizada com sucesso!')
  } catch (error: any) {
    console.error('Erro ao salvar empresa:', error)
    toast?.error('Erro ao salvar empresa: ' + error.message)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  buscarEmpresa()
})
</script>

<template>
  <div>
    <AppLoading 
      v-if="isLoading" 
      title="Carregando Empresa"
      description="Buscando informações da empresa..."
    />
    
    <div v-else class="space-y-6">
      <!-- Header -->
      <div>
        <h2 class="text-2xl font-bold text-foreground">Configurações da Empresa</h2>
        <p class="text-muted-foreground mt-1">
          Gerencie as informações da sua empresa
        </p>
      </div>

      <!-- Formulário -->
      <div class="bg-card border border-border rounded-lg p-6">
        <form @submit.prevent="salvarEmpresa" class="space-y-6">
          <!-- Nome -->
          <div>
            <label for="nome" class="block text-sm font-medium text-foreground mb-2">
              Nome da Empresa <span class="text-red-500">*</span>
            </label>
            <AppInput
              id="nome"
              v-model="nome"
              type="text"
              placeholder="Instituto Fios de Ouro"
              required
              :disabled="!isAdmin"
            />
          </div>

          <!-- CNPJ -->
          <div>
            <label for="cnpj" class="block text-sm font-medium text-foreground mb-2">
              CNPJ
            </label>
            <AppInput
              id="cnpj"
              v-model="cnpj"
              type="text"
              placeholder="00.000.000/0000-00"
              :disabled="!isAdmin"
            />
          </div>

          <!-- Email -->
          <div>
            <label for="email" class="block text-sm font-medium text-foreground mb-2">
              Email
            </label>
            <AppInput
              id="email"
              v-model="email"
              type="email"
              placeholder="contato@empresa.com"
              :disabled="!isAdmin"
            />
          </div>

          <!-- Telefone -->
          <div>
            <label for="telefone" class="block text-sm font-medium text-foreground mb-2">
              Telefone
            </label>
            <AppInput
              id="telefone"
              v-model="telefone"
              type="text"
              placeholder="(11) 98765-4321"
              :disabled="!isAdmin"
            />
          </div>

          <!-- Endereço -->
          <div>
            <label for="endereco" class="block text-sm font-medium text-foreground mb-2">
              Endereço
            </label>
            <AppInput
              id="endereco"
              v-model="endereco"
              type="text"
              placeholder="Rua, número, bairro, cidade - UF"
              :disabled="!isAdmin"
            />
          </div>

          <!-- Plano -->
          <div>
            <label for="plano" class="block text-sm font-medium text-foreground mb-2">
              Plano
            </label>
            <select
              id="plano"
              v-model="plano"
              :disabled="!isAdmin"
              class="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <!-- Botão Salvar -->
          <div v-if="isAdmin" class="flex justify-end">
            <AppButton
              type="submit"
              :disabled="isSaving"
              class="min-w-[200px]"
            >
              {{ isSaving ? 'Salvando...' : 'Salvar Alterações' }}
            </AppButton>
          </div>

          <!-- Aviso para não-admin -->
          <div v-else class="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
            <p class="text-sm text-yellow-800 dark:text-yellow-400">
              ⚠️ Apenas administradores podem editar as informações da empresa
            </p>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
