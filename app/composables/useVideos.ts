import type { Database } from '~/utils/supabase.types'

// Tipos baseados no banco de dados
type CategoriaVideo = Database['public']['Tables']['categorias_videos']['Row']
type Video = Database['public']['Tables']['videos']['Row']
type VideoVisualizacao = Database['public']['Tables']['videos_visualizacoes']['Row']

// Tipos enriquecidos para o frontend
export interface VideoComCategoria extends Video {
  categoria?: CategoriaVideo
  progresso?: number
  concluido?: boolean
  tempo_assistido?: number
  ultima_posicao?: number
}

export interface CategoriaComVideos extends CategoriaVideo {
  videos_count?: number
  videos?: VideoComCategoria[]
}

export const useVideos = () => {
  const supabase = useSupabaseClient<Database>()
  const { user } = useAuth()

  // Estados reativos
  const categorias = useState<CategoriaComVideos[]>('categorias-videos', () => [])
  const videos = useState<VideoComCategoria[]>('videos', () => [])
  const videoAtual = useState<VideoComCategoria | null>('video-atual', () => null)
  const isLoading = useState<boolean>('videos-loading', () => false)
  const erro = useState<string | null>('videos-erro', () => null)

  /**
   * Buscar ID do aluno a partir do user_id autenticado
   */
  const buscarAlunoId = async (): Promise<string | null> => {
    if (!user.value) return null

    try {
      const { data: aluno, error } = await supabase
        .from('alunos')
        .select('id')
        .eq('user_id', user.value.id)
        .single()

      if (error || !aluno) {
        console.error('Aluno não encontrado:', error)
        return null
      }

      return aluno.id
    } catch (e) {
      console.error('Erro ao buscar aluno:', e)
      return null
    }
  }

  /**
   * Buscar todas as categorias ativas
   */
  const buscarCategorias = async () => {
    try {
      isLoading.value = true
      erro.value = null

      const { data, error } = await supabase
        .from('categorias_videos')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (error) throw error

      categorias.value = data || []
      return data
    } catch (e: any) {
      console.error('Erro ao buscar categorias:', e)
      erro.value = e.message || 'Erro ao carregar categorias'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Buscar vídeos de uma categoria específica
   */
  const buscarVideosPorCategoria = async (categoriaId: string) => {
    try {
      isLoading.value = true
      erro.value = null

      // Buscar vídeos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          categoria:categorias_videos(*)
        `)
        .eq('categoria_id', categoriaId)
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      if (videosError) throw videosError

      // Se usuário logado, buscar progresso
      if (user.value) {
        const alunoId = await buscarAlunoId()
        if (!alunoId) {
          videos.value = videosData || []
          return videosData
        }

        const videosIds = videosData?.map(v => v.id) || []
        
        const { data: progressoData, error: progressoError } = await supabase
          .from('videos_visualizacoes')
          .select('*')
          .eq('aluno_id', alunoId)
          .in('video_id', videosIds)

        if (progressoError) throw progressoError

        // Enriquecer vídeos com progresso
        const videosEnriquecidos = videosData?.map(video => {
          const progresso = progressoData?.find(p => p.video_id === video.id)
          return {
            ...video,
            progresso: progresso?.progresso || 0,
            concluido: progresso?.concluido || false,
            tempo_assistido: progresso?.tempo_assistido || 0,
            ultima_posicao: progresso?.ultima_posicao || 0
          }
        }) || []

        videos.value = videosEnriquecidos
        return videosEnriquecidos
      }

      videos.value = videosData || []
      return videosData
    } catch (e: any) {
      console.error('Erro ao buscar vídeos:', e)
      erro.value = e.message || 'Erro ao carregar vídeos'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Buscar todos os vídeos (com filtros opcionais)
   */
  const buscarTodosVideos = async (filtros?: {
    nivel?: 'iniciante' | 'intermediario' | 'avancado'
    curso_id?: string
    tags?: string[]
  }) => {
    try {
      isLoading.value = true
      erro.value = null

      let query = supabase
        .from('videos')
        .select(`
          *,
          categoria:categorias_videos(*)
        `)
        .eq('ativo', true)
        .order('ordem', { ascending: true })

      // Aplicar filtros
      if (filtros?.nivel) {
        query = query.eq('nivel', filtros.nivel)
      }
      if (filtros?.curso_id) {
        query = query.eq('curso_id', filtros.curso_id)
      }
      if (filtros?.tags && filtros.tags.length > 0) {
        query = query.contains('tags', filtros.tags)
      }

      const { data: videosData, error: videosError } = await query

      if (videosError) throw videosError

      // Se usuário logado, buscar progresso
      if (user.value && videosData) {
        const alunoId = await buscarAlunoId()
        if (!alunoId) {
          videos.value = videosData
          return videosData
        }

        const videosIds = videosData.map(v => v.id)
        
        const { data: progressoData, error: progressoError } = await supabase
          .from('videos_visualizacoes')
          .select('*')
          .eq('aluno_id', alunoId)
          .in('video_id', videosIds)

        if (progressoError) throw progressoError

        // Enriquecer vídeos com progresso
        const videosEnriquecidos = videosData.map(video => {
          const progresso = progressoData?.find(p => p.video_id === video.id)
          return {
            ...video,
            progresso: progresso?.progresso || 0,
            concluido: progresso?.concluido || false,
            tempo_assistido: progresso?.tempo_assistido || 0,
            ultima_posicao: progresso?.ultima_posicao || 0
          }
        })

        videos.value = videosEnriquecidos
        return videosEnriquecidos
      }

      videos.value = videosData || []
      return videosData
    } catch (e: any) {
      console.error('Erro ao buscar vídeos:', e)
      erro.value = e.message || 'Erro ao carregar vídeos'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Buscar um vídeo específico por ID
   */
  const buscarVideoPorId = async (videoId: string) => {
    try {
      isLoading.value = true
      erro.value = null

      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          *,
          categoria:categorias_videos(*)
        `)
        .eq('id', videoId)
        .single()

      if (videoError) throw videoError

      // Se usuário logado, buscar progresso
      if (user.value) {
        const alunoId = await buscarAlunoId()
        if (!alunoId) {
          videoAtual.value = videoData
          return videoData
        }

        const { data: progressoData, error: progressoError } = await supabase
          .from('videos_visualizacoes')
          .select('*')
          .eq('video_id', videoId)
          .eq('aluno_id', alunoId)
          .maybeSingle()

        if (progressoError) throw progressoError

        const videoEnriquecido = {
          ...videoData,
          progresso: progressoData?.progresso || 0,
          concluido: progressoData?.concluido || false,
          tempo_assistido: progressoData?.tempo_assistido || 0,
          ultima_posicao: progressoData?.ultima_posicao || 0
        }

        videoAtual.value = videoEnriquecido
        return videoEnriquecido
      }

      videoAtual.value = videoData
      return videoData
    } catch (e: any) {
      console.error('Erro ao buscar vídeo:', e)
      erro.value = e.message || 'Erro ao carregar vídeo'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Registrar/Atualizar progresso de visualização
   */
  const atualizarProgresso = async (
    videoId: string,
    progressoAtual: number,
    tempoAssistido: number,
    ultimaPosicao: number
  ) => {
    if (!user.value) return

    try {
      const concluido = progressoAtual >= 90 // Considera concluído se assistiu 90%+

      const { error } = await supabase
        .from('videos_visualizacoes')
        .upsert({
          video_id: videoId,
          aluno_id: user.value.id,
          progresso: progressoAtual,
          tempo_assistido: tempoAssistido,
          ultima_posicao: ultimaPosicao,
          concluido,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'video_id,aluno_id'
        })

      if (error) throw error

      // Atualizar estado local
      if (videoAtual.value?.id === videoId) {
        videoAtual.value = {
          ...videoAtual.value,
          progresso: progressoAtual,
          concluido,
          tempo_assistido: tempoAssistido,
          ultima_posicao: ultimaPosicao
        }
      }

      return true
    } catch (e: any) {
      console.error('Erro ao atualizar progresso:', e)
      return false
    }
  }

  /**
   * Marcar vídeo como concluído
   */
  const marcarConcluido = async (videoId: string) => {
    if (!user.value) {
      console.error('Usuário não autenticado')
      return false
    }

    try {
      // Buscar ID do aluno a partir do user_id
      const { data: aluno, error: erroAluno } = await supabase
        .from('alunos')
        .select('id')
        .eq('user_id', user.value.id)
        .single()

      if (erroAluno || !aluno) {
        console.error('Aluno não encontrado:', erroAluno)
        return false
      }

      const alunoId = aluno.id

      // Verificar se já existe um registro
      const { data: existente, error: erroConsulta } = await supabase
        .from('videos_visualizacoes')
        .select('id')
        .eq('video_id', videoId)
        .eq('aluno_id', alunoId)
        .maybeSingle()

      if (erroConsulta) throw erroConsulta

      const agora = new Date().toISOString()

      if (existente) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('videos_visualizacoes')
          .update({
            progresso: 100,
            concluido: true,
            data_conclusao: agora,
            updated_at: agora
          })
          .eq('id', existente.id)

        if (error) throw error
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('videos_visualizacoes')
          .insert({
            video_id: videoId,
            aluno_id: alunoId,
            progresso: 100,
            concluido: true,
            data_inicio: agora,
            data_conclusao: agora,
            tempo_assistido: 0,
            ultima_posicao: 0,
            updated_at: agora
          })

        if (error) throw error
      }

      return true
    } catch (e: any) {
      console.error('Erro ao marcar como concluído:', e)
      return false
    }
  }

  /**
   * Buscar estatísticas de visualização do aluno
   */
  const buscarEstatisticas = async () => {
    if (!user.value) return null

    try {
      const alunoId = await buscarAlunoId()
      if (!alunoId) return null

      const { data, error } = await supabase
        .from('videos_visualizacoes')
        .select('*')
        .eq('aluno_id', alunoId)

      if (error) throw error

      const totalVideos = data?.length || 0
      const videosConcluidos = data?.filter(v => v.concluido).length || 0
      const tempoTotal = data?.reduce((acc, v) => acc + (v.tempo_assistido || 0), 0) || 0

      return {
        total_videos: totalVideos,
        videos_concluidos: videosConcluidos,
        tempo_total_minutos: Math.round(tempoTotal / 60),
        percentual_conclusao: totalVideos > 0 ? Math.round((videosConcluidos / totalVideos) * 100) : 0
      }
    } catch (e: any) {
      console.error('Erro ao buscar estatísticas:', e)
      return null
    }
  }

  return {
    // Estados
    categorias,
    videos,
    videoAtual,
    isLoading,
    erro,
    
    // Funções
    buscarCategorias,
    buscarVideosPorCategoria,
    buscarTodosVideos,
    buscarVideoPorId,
    atualizarProgresso,
    marcarConcluido,
    buscarEstatisticas
  }
}
