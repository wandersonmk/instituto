export interface AulaRelatorio {
  id: string
  curso_id: string
  curso_nome: string | null
  professor_nome: string | null
  data_aula: string
  numero_aula: number | null
  tema: string | null
  status: 'aberta' | 'finalizada'
  iniciada_at: string | null
  finalizada_at: string | null
  total_presentes: number
  total_faltas: number
  total_sem_marcar: number
  total_matriculados: number
}

export interface AlunoNaAula {
  aluno_id: string
  nome: string
  status: string
  motivo_falta: string | null
  marcado_at: string | null
  hora_registro: string | null
}

export const useRelatorioAulas = () => {
  const db = () => useSupabaseClient()

  async function listarAulas(filtros?: {
    cursoId?: string | null
    professorId?: string | null
    de?: string | null
    ate?: string | null
  }): Promise<AulaRelatorio[]> {
    let query = db()
      .from('view_relatorio_aulas')
      .select('*')
      .order('data_aula', { ascending: false })
      .order('numero_aula', { ascending: false })

    if (filtros?.cursoId) query = query.eq('curso_id', filtros.cursoId)
    if (filtros?.professorId) query = query.eq('professor_id', filtros.professorId)
    if (filtros?.de) query = query.gte('data_aula', filtros.de)
    if (filtros?.ate) query = query.lte('data_aula', filtros.ate)

    const { data, error } = await query
    if (error) {
      console.error('Erro ao listar aulas:', error)
      throw error
    }
    return (data || []) as unknown as AulaRelatorio[]
  }

  /** Chamada detalhada de uma aula: quem esteve presente e quem faltou. */
  async function detalharAula(aulaId: string): Promise<AlunoNaAula[]> {
    const { data, error } = await db()
      .from('presencas')
      .select('aluno_id, status, motivo_falta, marcado_at, hora_registro, alunos(nome_completo)')
      .eq('aula_id', aulaId)

    if (error) {
      console.error('Erro ao detalhar aula:', error)
      return []
    }

    return ((data || []) as any[])
      .map(p => ({
        aluno_id: p.aluno_id,
        nome: p.alunos?.nome_completo || 'Aluno',
        status: p.status,
        motivo_falta: p.motivo_falta,
        marcado_at: p.marcado_at,
        hora_registro: p.hora_registro
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  async function listarCursos() {
    const { data } = await db().from('cursos').select('id, nome').eq('ativo', true).order('nome')
    return data || []
  }

  async function listarProfessores() {
    const { data } = await db()
      .from('usuarios')
      .select('id, nome')
      .in('perfil', ['professor', 'admin'])
      .order('nome')
    return data || []
  }

  return { listarAulas, detalharAula, listarCursos, listarProfessores }
}
