export type StatusAula = 'aguardando' | 'em_andamento' | 'concluida' | 'rejeitada'

export interface SessaoAula {
  id: string
  curso_id: string
  aluno_id: string
  status: StatusAula
  hora_registro: string | null
  confirmado_at: string | null
  checkout_at: string | null
  avaliacoes_aulas?: { id: string }[]
}

/**
 * Fluxo de check-in / check-out da aula.
 *
 * Todas as transições passam por funções no banco (RPC) em vez de UPDATE direto:
 * é o que impede o aluno de autorizar a própria aula chamando a API REST.
 */
export const useAulas = () => {
  const supabase = useSupabaseClient()

  // --- Aluno ---------------------------------------------------------------

  /** Aluno faz check-in; a aula fica aguardando autorização do professor. */
  async function fazerCheckin(cursoId: string): Promise<string> {
    const { data, error } = await supabase.rpc('fazer_checkin', { p_curso_id: cursoId })
    if (error) throw error
    return data as unknown as string
  }

  /** Aluno encerra a aula. É aqui que a aula passa a contar como concluída. */
  async function fazerCheckout(presencaId: string): Promise<void> {
    const { error } = await supabase.rpc('fazer_checkout', { p_presenca_id: presencaId })
    if (error) throw error
  }

  /** Avaliação do aluno após a aula. */
  async function avaliarAula(
    presencaId: string,
    notaProfessor: number,
    notaLocal: number,
    comentario?: string | null
  ): Promise<string> {
    const { data, error } = await supabase.rpc('avaliar_aula', {
      p_presenca_id: presencaId,
      p_nota_professor: notaProfessor,
      p_nota_local: notaLocal,
      p_comentario: comentario?.trim() || null
    })
    if (error) throw error
    return data as unknown as string
  }

  /** Sessões de aula do aluno no dia, indexadas por curso. */
  async function buscarSessoesHoje(alunoId: string): Promise<Record<string, SessaoAula>> {
    const hoje = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('presencas')
      .select('id, curso_id, aluno_id, status, hora_registro, confirmado_at, checkout_at, avaliacoes_aulas(id)')
      .eq('aluno_id', alunoId)
      .eq('data_presenca', hoje)

    if (error) {
      console.error('Erro ao buscar sessões de hoje:', error)
      return {}
    }

    const porCurso: Record<string, SessaoAula> = {}
    for (const sessao of (data || []) as unknown as SessaoAula[]) {
      if (sessao.curso_id) porCurso[sessao.curso_id] = sessao
    }
    return porCurso
  }

  // --- Professor / admin ---------------------------------------------------

  /** Check-ins do dia aguardando autorização, com nome do aluno e do curso. */
  async function buscarCheckinsPendentes() {
    const hoje = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('presencas')
      .select('id, status, hora_registro, confirmado_at, checkout_at, alunos(id, nome_completo, telefone), cursos(id, nome)')
      .eq('data_presenca', hoje)
      .order('hora_registro', { ascending: true })

    if (error) {
      console.error('Erro ao buscar check-ins do dia:', error)
      return []
    }
    return data || []
  }

  async function confirmarCheckin(presencaId: string): Promise<void> {
    const { error } = await supabase.rpc('confirmar_checkin', { p_presenca_id: presencaId })
    if (error) throw error
  }

  async function recusarCheckin(presencaId: string): Promise<void> {
    const { error } = await supabase.rpc('recusar_checkin', { p_presenca_id: presencaId })
    if (error) throw error
  }

  return {
    fazerCheckin,
    fazerCheckout,
    avaliarAula,
    buscarSessoesHoje,
    buscarCheckinsPendentes,
    confirmarCheckin,
    recusarCheckin
  }
}
