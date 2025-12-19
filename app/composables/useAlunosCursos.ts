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
    dias_semana?: string[]
    local_aulas?: string
    hora_entrada?: string
    hora_saida?: string
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
    dias_semana?: string[]
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

  // Registrar presença em um curso específico
  async function registrarPresenca(alunoId: string, cursoId: string) {
    const hoje = new Date().toISOString().split('T')[0]

    // Buscar empresa_id do aluno
    const { data: alunoData } = await supabase
      .from('alunos')
      .select('empresa_id')
      .eq('id', alunoId)
      .single()

    // Verificar se já registrou hoje neste curso
    const { data: presencaExistente } = await supabase
      .from('presencas')
      .select('id')
      .eq('aluno_id', alunoId)
      .eq('curso_id', cursoId)
      .eq('data_presenca', hoje)
      .maybeSingle()

    if (presencaExistente) {
      throw new Error('Presença já registrada hoje para este curso')
    }

    // Registrar presença
    const { error: presencaError } = await supabase
      .from('presencas')
      .insert({
        aluno_id: alunoId,
        curso_id: cursoId,
        empresa_id: alunoData?.empresa_id,
        data_presenca: hoje
      })

    if (presencaError) throw presencaError

    console.log('✅ Presença registrada, agora incrementando aulas_concluidas...')

    // Incrementar aulas_concluidas na matrícula
    const { data: matricula, error: matriculaError } = await supabase
      .from('alunos_cursos')
      .select('id, aulas_concluidas')
      .eq('aluno_id', alunoId)
      .eq('curso_id', cursoId)
      .single()

    if (matriculaError) {
      console.error('❌ Erro ao buscar matrícula:', matriculaError)
      throw matriculaError
    }

    console.log('📋 Matrícula encontrada:', { id: matricula.id, aulas_concluidas_atual: matricula.aulas_concluidas })

    if (matricula) {
      const novoValor = (matricula.aulas_concluidas || 0) + 1
      
      const { error: updateError } = await supabase
        .from('alunos_cursos')
        .update({ aulas_concluidas: novoValor })
        .eq('id', matricula.id)
      
      if (updateError) {
        console.error('❌ Erro ao atualizar aulas_concluidas:', updateError)
        throw updateError
      }
      
      console.log(`✅ Aulas concluídas atualizada: ${matricula.aulas_concluidas} → ${novoValor}`)
    }
  }

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
    registrarPresenca,
    buscarViewCompleta
  }
}
