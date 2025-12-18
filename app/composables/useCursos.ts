import type { PostgrestResponse } from '@supabase/supabase-js'

// Interface para tipagem do curso
export interface Curso {
  id: string
  nome: string
  descricao?: string
  carga_horaria?: number
  quantidade_aulas?: number
  valor?: number
  valor_multa_falta?: number
  ativo: boolean
  created_at: string
  updated_at: string
  user_id?: string
}

// Interface para inserção/atualização de curso
export interface CursoInput {
  nome: string
  descricao?: string
  carga_horaria?: number
  quantidade_aulas?: number
  valor?: number
  valor_multa_falta?: number
  ativo?: boolean
}

export const useCursos = () => {
  let supabase: any = null
  if (typeof window !== 'undefined') {
    supabase = useSupabaseClient()
  }

  // Estados reativos
  const cursos = ref<Curso[]>([])
  const cursosAtivos = computed(() => cursos.value.filter(c => c.ativo))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Buscar todos os cursos do usuário
  const fetchCursos = async (): Promise<void> => {
    console.log('🔍 Iniciando busca de cursos...')
    isLoading.value = true
    error.value = null
    
    try {
      const { user } = useAuth()
      
      const { data, error: cursosError }: PostgrestResponse<Curso> = await supabase
        .from('cursos')
        .select('*')
        .eq('user_id', user.value?.id)
        .order('nome', { ascending: true })

      console.log('📊 Resultado da busca:', { data, error: cursosError })

      if (cursosError) {
        console.error('❌ Erro ao buscar cursos:', cursosError)
        error.value = `Erro ao carregar cursos: ${cursosError.message}`
        return
      }

      console.log(`✅ ${data?.length || 0} cursos encontrados`)
      cursos.value = data || []
    } catch (err) {
      console.error('💥 Erro inesperado ao buscar cursos:', err)
      error.value = 'Erro inesperado ao carregar cursos'
    } finally {
      isLoading.value = false
    }
  }

  // Adicionar novo curso
  const addCurso = async (cursoData: CursoInput): Promise<boolean> => {
    console.log('➕ Adicionando novo curso:', cursoData)
    isLoading.value = true
    error.value = null
    
    try {
      const { user } = useAuth()
      const toast = await useToastSafe()
      
      const { data, error: insertError } = await supabase
        .from('cursos')
        .insert([{
          ...cursoData,
          user_id: user.value?.id,
          ativo: cursoData.ativo ?? true
        }])
        .select()

      if (insertError) {
        console.error('❌ Erro ao adicionar curso:', insertError)
        error.value = `Erro ao adicionar curso: ${insertError.message}`
        toast?.error('Erro ao cadastrar curso')
        return false
      }

      console.log('✅ Curso adicionado com sucesso:', data)
      toast?.success('Curso cadastrado com sucesso!')
      
      // Recarregar lista de cursos
      await fetchCursos()
      return true
    } catch (err) {
      console.error('💥 Erro inesperado ao adicionar curso:', err)
      error.value = 'Erro inesperado ao adicionar curso'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Atualizar curso existente
  const updateCurso = async (id: string, cursoData: CursoInput): Promise<boolean> => {
    console.log('📝 Atualizando curso:', id, cursoData)
    isLoading.value = true
    error.value = null
    
    try {
      const toast = await useToastSafe()
      
      const { error: updateError } = await supabase
        .from('cursos')
        .update({
          ...cursoData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('❌ Erro ao atualizar curso:', updateError)
        error.value = `Erro ao atualizar curso: ${updateError.message}`
        toast?.error('Erro ao atualizar curso')
        return false
      }

      console.log('✅ Curso atualizado com sucesso')
      toast?.success('Curso atualizado com sucesso!')
      
      // Recarregar lista de cursos
      await fetchCursos()
      return true
    } catch (err) {
      console.error('💥 Erro inesperado ao atualizar curso:', err)
      error.value = 'Erro inesperado ao atualizar curso'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Deletar curso
  const deleteCurso = async (id: string): Promise<boolean> => {
    console.log('🗑️ Deletando curso:', id)

    try {
      isLoading.value = true
      error.value = null
      const toast = await useToastSafe()

      const { error: deleteError } = await supabase
        .from('cursos')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('❌ Erro ao deletar curso:', deleteError)
        error.value = `Erro ao deletar curso: ${deleteError.message}`
        toast?.error('Erro ao excluir curso')
        return false
      }

      console.log('✅ Curso deletado com sucesso')
      toast?.success('Curso excluído com sucesso!')
      
      // Recarregar lista de cursos
      await fetchCursos()
      return true
      
    } catch (err) {
      console.error('💥 Erro inesperado ao deletar curso:', err)
      error.value = 'Erro inesperado ao deletar curso'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Alternar status ativo/inativo
  const toggleAtivo = async (id: string, ativo: boolean): Promise<boolean> => {
    console.log('🔄 Alterando status do curso:', id, ativo)
    
    try {
      const toast = await useToastSafe()
      
      const { error: updateError } = await supabase
        .from('cursos')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) {
        console.error('❌ Erro ao alterar status:', updateError)
        toast?.error('Erro ao alterar status do curso')
        return false
      }

      toast?.success(ativo ? 'Curso ativado com sucesso!' : 'Curso desativado com sucesso!')
      
      // Recarregar lista
      await fetchCursos()
      return true
    } catch (err) {
      console.error('💥 Erro inesperado:', err)
      return false
    }
  }

  // Buscar curso por ID
  const getCursoById = (id: string): Curso | undefined => {
    return cursos.value.find(c => c.id === id)
  }

  // Limpar erro
  const clearError = (): void => {
    error.value = null
  }

  // Retornar estados e funções reativas
  return {
    cursos,
    cursosAtivos,
    isLoading,
    error,
    fetchCursos,
    addCurso,
    updateCurso,
    deleteCurso,
    toggleAtivo,
    getCursoById,
    clearError
  }
}
