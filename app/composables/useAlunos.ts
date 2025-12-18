import type { PostgrestResponse } from '@supabase/supabase-js'
import { useToastSafe } from './useToastSafe'

// Interface para tipagem do aluno
export interface Aluno {
  id: string
  nome: string
  telefone: string
  empresa?: string
  created_at: string
}

// Interface para inserção/atualização de aluno
export interface ClienteInput {
  nome: string
  telefone: string
  empresa?: string
}

export const useAlunos = () => {
  let supabase: any = null
  if (typeof window !== 'undefined') {
    supabase = useSupabaseClient()
  }

  // Estados reativos
  const alunos = ref<Aluno[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Buscar todos os alunos (sem filtro por usuário)
  const fetchAlunos = async (): Promise<void> => {
    console.log('🔍 Iniciando busca de alunos...')
    isLoading.value = true
    error.value = null
    try {
      const { data, error: alunosError }: PostgrestResponse<Aluno> = await supabase
        .from('alunos')
        .select('*')
        .order('created_at', { ascending: false })

      console.log('📊 Resultado da busca:', { data, error: alunosError })

      if (alunosError) {
        console.error('❌ Erro ao buscar alunos:', alunosError)
        error.value = `Erro ao carregar alunos: ${alunosError.message}`
        return
      }

      console.log(`✅ ${data?.length || 0} alunos encontrados`)
      alunos.value = data || []
    } catch (err) {
      console.error('💥 Erro inesperado ao buscar alunos:', err)
      error.value = 'Erro inesperado ao carregar alunos'
    } finally {
      isLoading.value = false
    }
  }

  // Adicionar novo aluno (sem usuario_id)
  const addCliente = async (clienteData: ClienteInput): Promise<boolean> => {
    console.log('➕ Adicionando novo aluno:', clienteData)
    isLoading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('alunos')
        .insert([clienteData])
        .select()

      if (insertError) {
        console.error('❌ Erro ao adicionar aluno:', insertError)
        error.value = `Erro ao adicionar aluno: ${insertError.message}`
        const toast = await useToastSafe()
        toast?.error('Erro ao cadastrar aluno')
        return false
      }

      console.log('✅ Aluno adicionado com sucesso:', data)
      const toast = await useToastSafe()
      toast?.success('Aluno cadastrado com sucesso!')
      // Recarregar lista de alunos
      await fetchAlunos()
      return true
    } catch (err) {
      console.error('💥 Erro inesperado ao adicionar aluno:', err)
      error.value = 'Erro inesperado ao adicionar aluno'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Deletar aluno
  const deleteAluno = async (clienteId: string): Promise<boolean> => {
    console.log('🗑️ Deletando aluno:', clienteId)

    try {
      isLoading.value = true
      error.value = null

      const { error: deleteError } = await supabase
        .from('alunos')
        .delete()
        .eq('id', clienteId)

      if (deleteError) {
        console.error('❌ Erro ao deletar aluno:', deleteError)
        error.value = `Erro ao deletar aluno: ${deleteError.message}`
        const toast = await useToastSafe()
        toast?.error('Erro ao excluir aluno')
        return false
      }

      console.log('✅ Aluno deletado com sucesso')
      const toast = await useToastSafe()
      toast?.success('Aluno excluído com sucesso!')
      
      // Recarregar lista de alunos
      await fetchAlunos()
      return true
      
    } catch (err) {
      console.error('💥 Erro inesperado ao deletar aluno:', err)
      error.value = 'Erro inesperado ao deletar aluno'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Limpar erro
  const clearError = (): void => {
    error.value = null
  }

  // Retornar estados e funções reativas (readonly)
  return {
    alunos,
    isLoading,
    error,
    fetchAlunos,
    addCliente,
    deleteAluno,
    clearError
  }
}
