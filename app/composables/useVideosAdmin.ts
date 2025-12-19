import type { Database } from '~/utils/supabase.types'

type Video = Database['public']['Tables']['videos']['Insert']
type VideoRow = Database['public']['Tables']['videos']['Row']
type CategoriaVideo = Database['public']['Tables']['categorias_videos']['Row']
type CategoriaVideoInsert = Database['public']['Tables']['categorias_videos']['Insert']

export const useVideosAdmin = () => {
  const supabase = useSupabaseClient<Database>()
  const { user } = useAuth()

  const isLoading = useState<boolean>('videos-admin-loading', () => false)
  const erro = useState<string | null>('videos-admin-erro', () => null)

  /**
   * Obter empresa_id do usuário logado
   */
  const obterEmpresaId = async (): Promise<string | null> => {
    if (!user.value) return null

    try {
      // Primeiro tentar buscar da tabela usuarios (admin)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.value.id)
        .maybeSingle()

      if (usuarioData?.empresa_id) {
        return usuarioData.empresa_id
      }

      // Se não encontrou, buscar da tabela alunos
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('empresa_id')
        .eq('user_id', user.value.id)
        .maybeSingle()

      if (alunoData?.empresa_id) {
        return alunoData.empresa_id
      }

      // Última tentativa: pegar do metadata do usuário
      const empresaIdMetadata = user.value.user_metadata?.empresa_id
      if (empresaIdMetadata) {
        return empresaIdMetadata
      }

      // Fallback: buscar primeira empresa ativa do banco
      console.warn('empresa_id não encontrado para o usuário, usando empresa padrão')
      const { data: empresaPadrao } = await supabase
        .from('empresas')
        .select('id')
        .eq('ativo', true)
        .limit(1)
        .single()

      return empresaPadrao?.id || null
    } catch (e) {
      console.error('Erro ao obter empresa_id:', e)
      return null
    }
  }

  /**
   * Criar novo vídeo
   */
  const criarVideo = async (dadosVideo: {
    titulo: string
    descricao: string
    url_video: string
    thumbnail?: string
    duracao: number
    categoria_id: string
    curso_id?: string
    ordem?: number
    nivel?: 'iniciante' | 'intermediario' | 'avancado'
    tags?: string[]
    ativo?: boolean
  }) => {
    try {
      isLoading.value = true
      erro.value = null

      const empresa_id = await obterEmpresaId()
      if (!empresa_id) {
        throw new Error('Empresa não encontrada')
      }

      const { data, error } = await supabase
        .from('videos')
        .insert({
          ...dadosVideo,
          empresa_id,
          ativo: dadosVideo.ativo ?? true
        })
        .select()
        .single()

      if (error) throw error

      console.log('Vídeo criado com sucesso:', data)
      return { success: true, data }
    } catch (e: any) {
      console.error('Erro ao criar vídeo:', e)
      erro.value = e.message || 'Erro ao criar vídeo'
      return { success: false, error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Atualizar vídeo existente
   */
  const atualizarVideo = async (videoId: string, dadosVideo: Partial<Video>) => {
    try {
      isLoading.value = true
      erro.value = null

      const { data, error } = await supabase
        .from('videos')
        .update(dadosVideo)
        .eq('id', videoId)
        .select()
        .single()

      if (error) throw error

      console.log('Vídeo atualizado com sucesso:', data)
      return { success: true, data }
    } catch (e: any) {
      console.error('Erro ao atualizar vídeo:', e)
      erro.value = e.message || 'Erro ao atualizar vídeo'
      return { success: false, error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Excluir vídeo
   */
  const excluirVideo = async (videoId: string) => {
    try {
      isLoading.value = true
      erro.value = null

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId)

      if (error) throw error

      console.log('Vídeo excluído com sucesso')
      return { success: true }
    } catch (e: any) {
      console.error('Erro ao excluir vídeo:', e)
      erro.value = e.message || 'Erro ao excluir vídeo'
      return { success: false, error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Listar todos os vídeos da empresa
   */
  const listarVideos = async () => {
    try {
      isLoading.value = true
      erro.value = null

      const empresa_id = await obterEmpresaId()
      if (!empresa_id) {
        throw new Error('Empresa não encontrada')
      }

      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          categoria:categorias_videos(*)
        `)
        .eq('empresa_id', empresa_id)
        .order('ordem', { ascending: true })

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (e: any) {
      console.error('Erro ao listar vídeos:', e)
      erro.value = e.message || 'Erro ao listar vídeos'
      return { success: false, data: [], error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Criar categoria
   */
  const criarCategoria = async (dadosCategoria: {
    nome: string
    descricao?: string
    icone?: string
    ordem?: number
    ativo?: boolean
  }) => {
    try {
      isLoading.value = true
      erro.value = null

      const empresa_id = await obterEmpresaId()
      if (!empresa_id) {
        throw new Error('Empresa não encontrada')
      }

      const { data, error } = await supabase
        .from('categorias_videos')
        .insert({
          ...dadosCategoria,
          empresa_id,
          ativo: dadosCategoria.ativo ?? true
        })
        .select()
        .single()

      if (error) throw error

      console.log('Categoria criada com sucesso:', data)
      return { success: true, data }
    } catch (e: any) {
      console.error('Erro ao criar categoria:', e)
      erro.value = e.message || 'Erro ao criar categoria'
      return { success: false, error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Atualizar categoria
   */
  const atualizarCategoria = async (categoriaId: string, dadosCategoria: Partial<CategoriaVideoInsert>) => {
    try {
      isLoading.value = true
      erro.value = null

      const { data, error } = await supabase
        .from('categorias_videos')
        .update(dadosCategoria)
        .eq('id', categoriaId)
        .select()
        .single()

      if (error) throw error

      console.log('Categoria atualizada com sucesso:', data)
      return { success: true, data }
    } catch (e: any) {
      console.error('Erro ao atualizar categoria:', e)
      erro.value = e.message || 'Erro ao atualizar categoria'
      return { success: false, error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Excluir categoria
   */
  const excluirCategoria = async (categoriaId: string) => {
    try {
      isLoading.value = true
      erro.value = null

      const { error } = await supabase
        .from('categorias_videos')
        .delete()
        .eq('id', categoriaId)

      if (error) throw error

      console.log('Categoria excluída com sucesso')
      return { success: true }
    } catch (e: any) {
      console.error('Erro ao excluir categoria:', e)
      erro.value = e.message || 'Erro ao excluir categoria'
      return { success: false, error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Listar categorias da empresa
   */
  const listarCategorias = async () => {
    try {
      isLoading.value = true
      erro.value = null

      const empresa_id = await obterEmpresaId()
      if (!empresa_id) {
        throw new Error('Empresa não encontrada')
      }

      const { data, error } = await supabase
        .from('categorias_videos')
        .select('*')
        .eq('empresa_id', empresa_id)
        .order('ordem', { ascending: true })

      if (error) throw error

      return { success: true, data: data || [] }
    } catch (e: any) {
      console.error('Erro ao listar categorias:', e)
      erro.value = e.message || 'Erro ao listar categorias'
      return { success: false, data: [], error: erro.value }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    erro,
    criarVideo,
    atualizarVideo,
    excluirVideo,
    listarVideos,
    criarCategoria,
    atualizarCategoria,
    excluirCategoria,
    listarCategorias
  }
}
