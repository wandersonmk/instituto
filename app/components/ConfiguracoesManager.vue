<template>
  <div class="bg-card text-card-foreground rounded-lg border border-border shadow-sm">
    <!-- Header com ícone e descrição -->
    <div class="flex items-center justify-between p-6 border-b border-border">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
          <Icon icon="cog" class-name="w-5 h-5 text-white" fallback="" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-foreground">Configurações do Sistema</h2>
          <p class="text-sm text-muted-foreground">Gerencie as configurações e dados do sistema</p>
        </div>
      </div>
    </div>

    <!-- Conteúdo das configurações -->
    <div class="p-6 space-y-6">
      
      <!-- Seção: Gerenciamento de Dados -->
      <div class="space-y-4">
        <div class="flex items-center space-x-2 mb-4">
          <Icon icon="database" class-name="w-5 h-5 text-muted-foreground" fallback="" />
          <h3 class="text-lg font-medium text-foreground">Gerenciamento de Dados</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <!-- Limpar Lista de Alunos -->
          <div class="bg-muted/30 border border-border rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mt-1">
                <Icon icon="users" class-name="w-4 h-4 text-blue-600 dark:text-blue-400" fallback="" />
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-foreground mb-1">Limpar Lista de Alunos</h4>
                <p class="text-sm text-muted-foreground mb-3">
                  Remove todos os alunos cadastrados no sistema. Esta ação não pode ser desfeita.
                </p>
                <button
                  @click="confirmarLimpezaAlunos"
                  class="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Icon icon="trash-alt" class-name="w-4 h-4" fallback="" />
                  <span>Limpar Alunos</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Limpar Relatórios -->
          <div class="bg-muted/30 border border-border rounded-lg p-4">
            <div class="flex items-start space-x-3">
              <div class="w-8 h-8 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center mt-1">
                <Icon icon="file-alt" class-name="w-4 h-4 text-red-600 dark:text-red-400" fallback="" />
              </div>
              <div class="flex-1">
                <h4 class="font-medium text-foreground mb-1">Limpar Todos os Relatórios</h4>
                <p class="text-sm text-muted-foreground mb-3">
                  Remove todos os relatórios do sistema. Esta ação não pode ser desfeita.
                </p>
                <button
                  @click="confirmarLimpezaRelatorios"
                  class="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Icon icon="trash-alt" class-name="w-4 h-4" fallback="" />
                  <span>Limpar Relatórios</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Aviso importante -->
      <div class="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <Icon icon="exclamation-triangle" class-name="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" fallback="" />
          <div>
            <h4 class="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Atenção - Ações Irreversíveis
            </h4>
            <p class="text-sm text-yellow-700 dark:text-yellow-300">
              As ações de limpeza são permanentes e não podem ser desfeitas. 
              Certifique-se de fazer um backup dos dados importantes antes de prosseguir.
            </p>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Modal de Confirmação para Alunos -->
  <div v-if="mostrarModalAlunos" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
          <Icon icon="users" class-name="w-5 h-5 text-blue-600 dark:text-blue-400" fallback="" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Confirmar Limpeza de Alunos</h3>
      </div>
      
      <p class="text-muted-foreground mb-6">
        Tem certeza que deseja remover todos os alunos do sistema? Esta ação não pode ser desfeita.
      </p>
      
      <div class="flex space-x-3">
        <button
          @click="mostrarModalAlunos = false"
          class="flex-1 px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="limparAlunos"
          class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação para Relatórios -->
  <div v-if="mostrarModalRelatorios" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex items-center space-x-3 mb-4">
        <div class="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
          <Icon icon="file-alt" class-name="w-5 h-5 text-red-600 dark:text-red-400" fallback="" />
        </div>
        <h3 class="text-lg font-semibold text-foreground">Confirmar Limpeza de Relatórios</h3>
      </div>
      
      <p class="text-muted-foreground mb-6">
        Tem certeza que deseja remover todos os relatórios do sistema? Esta ação não pode ser desfeita.
      </p>
      
      <div class="flex space-x-3">
        <button
          @click="mostrarModalRelatorios = false"
          class="flex-1 px-4 py-2 border border-border text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="limparRelatorios"
          class="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSupabaseClient } from '../composables/useSupabaseClient'
import { useToastSafe } from '../composables/useToastSafe'

const supabase = useSupabaseClient()

// Estados dos modais
const mostrarModalAlunos = ref(false)
const mostrarModalRelatorios = ref(false)

// Função para confirmar limpeza de alunos
function confirmarLimpezaAlunos() {
  mostrarModalAlunos.value = true
}

// Função para confirmar limpeza de relatórios
function confirmarLimpezaRelatorios() {
  mostrarModalRelatorios.value = true
}

// Função para limpar alunos (placeholder - sem ação de banco ainda)
async function limparAlunos() {
  const toast = await useToastSafe();
  try {
    // Buscar todos os IDs dos alunos
    const { data, error: selectError } = await supabase.from('alunos').select('id')
    if (selectError) throw selectError
    if (data && data.length) {
      const { error: deleteError } = await supabase.from('alunos').delete().in('id', data.map(c => c.id))
      if (deleteError) throw deleteError
      toast?.success('Todos os alunos foram removidos com sucesso!')
    } else {
      toast?.info('Nenhum aluno para remover.')
    }
    mostrarModalAlunos.value = false
  } catch (err) {
    toast?.error('Erro ao limpar alunos: ' + String(err))
  }
}

// Função para Limpar Relatórios
async function limparRelatorios() {
  const toast = await useToastSafe();
  try {
    const { data, error: selectError } = await supabase.from('relatorios').select('id')
    if (selectError) throw selectError
    if (data && data.length) {
      const { error: deleteError } = await supabase.from('relatorios').delete().in('id', data.map(r => r.id))
      if (deleteError) throw deleteError
      toast?.success('Todos os relatórios foram removidos com sucesso!')
    } else {
      toast?.info('Nenhum relatório para remover.')
    }
    mostrarModalRelatorios.value = false
  } catch (err) {
    toast?.error('Erro ao limpar relatórios: ' + String(err))
    mostrarModalRelatorios.value = false
  }
}
</script>

