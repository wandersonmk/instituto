<template>
  <div class="bg-card text-card-foreground rounded-lg border border-border shadow-sm">
    <!-- Header -->
    <div class="flex items-center gap-3 px-5 py-3.5 border-b border-border">
      <div class="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon icon="cog" class-name="w-4 h-4 text-white" fallback="" />
      </div>
      <div>
        <h2 class="text-base font-semibold text-foreground leading-tight">Configurações do Sistema</h2>
        <p class="text-xs text-muted-foreground leading-tight">Gerencie as configurações e dados do sistema</p>
      </div>
    </div>

    <!-- Conteúdo -->
    <div class="p-4 space-y-4">

      <!-- Seção: Gerenciamento de Dados -->
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <Icon icon="database" class-name="w-4 h-4 text-muted-foreground" fallback="" />
          <h3 class="text-sm font-semibold text-foreground">Gerenciamento de Dados</h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">

          <!-- Limpar Lista de Alunos -->
          <div class="bg-muted/30 border border-border rounded-lg p-3">
            <div class="flex items-start gap-2.5">
              <div class="w-7 h-7 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="users" class-name="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fallback="" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-foreground mb-0.5">Limpar Lista de Alunos</h4>
                <p class="text-xs text-muted-foreground mb-2">
                  Remove todos os alunos cadastrados no sistema. Esta ação não pode ser desfeita.
                </p>
                <button
                  @click="confirmarLimpezaAlunos"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-xs font-medium"
                >
                  <Icon icon="trash-alt" class-name="w-3.5 h-3.5" fallback="" />
                  <span>Limpar Alunos</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Limpar Relatórios -->
          <div class="bg-muted/30 border border-border rounded-lg p-3">
            <div class="flex items-start gap-2.5">
              <div class="w-7 h-7 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon icon="file-alt" class-name="w-3.5 h-3.5 text-red-600 dark:text-red-400" fallback="" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-medium text-foreground mb-0.5">Limpar Todos os Relatórios</h4>
                <p class="text-xs text-muted-foreground mb-2">
                  Remove todos os relatórios do sistema. Esta ação não pode ser desfeita.
                </p>
                <button
                  @click="confirmarLimpezaRelatorios"
                  class="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-xs font-medium"
                >
                  <Icon icon="trash-alt" class-name="w-3.5 h-3.5" fallback="" />
                  <span>Limpar Relatórios</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Aviso importante -->
      <div class="flex items-start gap-2.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <Icon icon="exclamation-triangle" class-name="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fallback="" />
        <div>
          <h4 class="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-0.5">
            Atenção - Ações Irreversíveis
          </h4>
          <p class="text-xs text-yellow-700 dark:text-yellow-300">
            As ações de limpeza são permanentes e não podem ser desfeitas.
            Certifique-se de fazer um backup dos dados importantes antes de prosseguir.
          </p>
        </div>
      </div>

    </div>
  </div>

  <!-- Modal de Confirmação para Alunos -->
  <div v-if="mostrarModalAlunos" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-card border border-border rounded-lg p-5 max-w-md w-full">
      <div class="flex items-center gap-2.5 mb-3">
        <div class="w-9 h-9 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon icon="users" class-name="w-4 h-4 text-blue-600 dark:text-blue-400" fallback="" />
        </div>
        <h3 class="text-base font-semibold text-foreground">Confirmar Limpeza de Alunos</h3>
      </div>

      <p class="text-sm text-muted-foreground mb-4">
        Tem certeza que deseja remover todos os alunos do sistema? Esta ação não pode ser desfeita.
      </p>

      <div class="flex gap-2">
        <button
          @click="mostrarModalAlunos = false"
          class="flex-1 px-4 py-2 text-sm border border-border text-foreground hover:bg-muted rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="limparAlunos"
          class="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
        >
          Confirmar
        </button>
      </div>
    </div>
  </div>

  <!-- Modal de Confirmação para Relatórios -->
  <div v-if="mostrarModalRelatorios" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-card border border-border rounded-lg p-5 max-w-md w-full">
      <div class="flex items-center gap-2.5 mb-3">
        <div class="w-9 h-9 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon icon="file-alt" class-name="w-4 h-4 text-red-600 dark:text-red-400" fallback="" />
        </div>
        <h3 class="text-base font-semibold text-foreground">Confirmar Limpeza de Relatórios</h3>
      </div>

      <p class="text-sm text-muted-foreground mb-4">
        Tem certeza que deseja remover todos os relatórios do sistema? Esta ação não pode ser desfeita.
      </p>

      <div class="flex gap-2">
        <button
          @click="mostrarModalRelatorios = false"
          class="flex-1 px-4 py-2 text-sm border border-border text-foreground hover:bg-muted rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          @click="limparRelatorios"
          class="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
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

