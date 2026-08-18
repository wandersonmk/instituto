export const useAlunosCursos = () => {
  const supabase = useSupabaseClient()

  // Buscar cursos de um aluno com progresso calculado
  async function buscarCursosDoAluno(alunoId: string) {
    const { data, error } = await supabase
      .from('view_alunos_cursos_completo')
      .select('*')
      .eq('aluno_id', alunoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar cursos do aluno:', error)
      return []
    }

    console.log('📊 Cursos carregados com progresso:', data?.map(c => ({
      curso: c.curso_nome,
      aulas_concluidas: c.aulas_concluidas,
      quantidade_aulas: c.quantidade_aulas,
      percentual: c.percentual_conclusao
    })))

    return data || []
  }

  // Buscar curso específico do aluno
  async function buscarCursoEspecifico(alunoId: string, cursoId: string) {
    const { data, error } = await supabase
      .from('alunos_cursos')
      .select(`
        *,
        curso:cursos(*)
      `)
      .eq('aluno_id', alunoId)
      .eq('curso_id', cursoId)
      .single()

    if (error) {
      console.error('Erro ao buscar curso específico:', error)
      return null
    }

    return data
  }

  // Adicionar curso ao aluno
  async function adicionarCurso(dados: {
    aluno_id: string
    curso_id: string
    dias_semana?: number[]
    local_aulas?: string
    hora_entrada?: string
    hora_saida?: string
    // Aceitos por compatibilidade com o chamador (AlunosCadastroManager),
    // mas ignorados aqui de propósito: todo curso novo sempre nasce
    // status 'ativo' e 0 aulas concluídas, veja o insert abaixo.
    status?: string
    aulas_concluidas?: number
  }) {
    // Buscar empresa_id do aluno para evitar recursão
    const { data: alunoData } = await supabase
      .from('alunos')
      .select('empresa_id')
      .eq('id', dados.aluno_id)
      .single()

    const { data, error } = await supabase
      .from('alunos_cursos')
      .insert({
        ...dados,
        empresa_id: alunoData?.empresa_id,
        status: 'ativo',
        aulas_concluidas: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao adicionar curso:', error)
      throw error
    }

    return data
  }

  // Atualizar curso do aluno
  async function atualizarCurso(matriculaId: string, dados: {
    dias_semana?: number[]
    local_aulas?: string
    hora_entrada?: string
    hora_saida?: string
    status?: string
    aulas_concluidas?: number
  }) {
    const { data, error } = await supabase
      .from('alunos_cursos')
      .update(dados)
      .eq('id', matriculaId)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar curso:', error)
      throw error
    }

    return data
  }

  // Remover curso do aluno
  async function removerCurso(matriculaId: string) {
    const { error } = await supabase
      .from('alunos_cursos')
      .delete()
      .eq('id', matriculaId)

    if (error) {
      console.error('Erro ao remover curso:', error)
      throw error
    }
  }

  // A presença agora é a chamada feita pelo professor: o aluno só faz check-in
  // (useAulas().fazerCheckin) e quem marca presente/falta e finaliza a aula é o
  // professor, através das funções do banco.

  // Buscar view completa (aluno + curso + progresso)
  async function buscarViewCompleta(alunoId?: string) {
    let query = supabase
      .from('view_alunos_cursos_completo')
      .select('*')

    if (alunoId) {
      query = query.eq('aluno_id', alunoId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar view completa:', error)
      return []
    }

    return data || []
  }

  return {
    buscarCursosDoAluno,
    buscarCursoEspecifico,
    adicionarCurso,
    atualizarCurso,
    removerCurso,
    buscarViewCompleta
  }
}
