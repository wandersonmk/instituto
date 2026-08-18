export interface Professor {
  id: string
  nome: string
  email: string
  perfil: string
  created_at: string
  cursos: { id: string; nome: string }[]
}

export const useProfessores = () => {
  // Resolve o cliente sob demanda: se resolvermos aqui e ele faltar, a exceção
  // aborta o <script setup> da página e TODOS os bindings ficam indefinidos
  // (o compilador só monta o objeto de retorno no fim da função).
  const db = () => useSupabaseClient()

  /** Professores da empresa, já com os cursos que cada um leciona. */
  async function listarProfessores(): Promise<Professor[]> {
    const [{ data: usuarios, error: erroUsuarios }, { data: vinculos, error: erroVinculos }] =
      await Promise.all([
        db()
          .from('usuarios')
          .select('id, nome, email, perfil, created_at')
          .eq('perfil', 'professor')
          .order('nome'),
        db()
          .from('cursos_professores')
          .select('professor_id, cursos(id, nome)')
      ])

    if (erroUsuarios) {
      console.error('Erro ao listar professores:', erroUsuarios)
      return []
    }
    if (erroVinculos) console.error('Erro ao buscar vínculos:', erroVinculos)

    const cursosPorProfessor = new Map<string, { id: string; nome: string }[]>()
    for (const v of (vinculos || []) as any[]) {
      if (!v.cursos) continue
      const lista = cursosPorProfessor.get(v.professor_id) || []
      lista.push({ id: v.cursos.id, nome: v.cursos.nome })
      cursosPorProfessor.set(v.professor_id, lista)
    }

    return ((usuarios || []) as any[]).map(u => ({
      ...u,
      cursos: (cursosPorProfessor.get(u.id) || []).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    }))
  }

  async function listarCursos() {
    const { data, error } = await db()
      .from('cursos')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')

    if (error) {
      console.error('Erro ao listar cursos:', error)
      return []
    }
    return data || []
  }

  /** Cria a conta do professor (já confirmada) e devolve a senha gerada. */
  async function criarProfessor(dados: {
    nome: string
    email: string
    senha?: string
    cursoIds: string[]
  }) {
    const { data: sessao } = await db().auth.getSession()
    const token = sessao?.session?.access_token

    if (!token) throw new Error('Sessão expirada. Entre novamente.')

    return await $fetch<{ success: boolean; senha: string; professor_id: string | null }>(
      '/api/professores/create',
      {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: dados
      }
    )
  }

  /** Substitui os cursos de um professor pelo conjunto informado. */
  async function definirCursosDoProfessor(professorId: string, cursoIds: string[], empresaId: string) {
    const { error: erroRemocao } = await db()
      .from('cursos_professores')
      .delete()
      .eq('professor_id', professorId)

    if (erroRemocao) throw erroRemocao

    if (cursoIds.length === 0) return

    const { error: erroInsercao } = await db()
      .from('cursos_professores')
      .insert(cursoIds.map(curso_id => ({
        curso_id,
        professor_id: professorId,
        empresa_id: empresaId
      })))

    if (erroInsercao) throw erroInsercao
  }

  async function buscarEmpresaId(): Promise<string | null> {
    const { data } = await db().auth.getUser()
    if (!data?.user) return null

    const { data: usuario } = await db()
      .from('usuarios')
      .select('empresa_id')
      .eq('user_id', data.user.id)
      .single()

    return usuario?.empresa_id ?? null
  }

  return {
    listarProfessores,
    listarCursos,
    criarProfessor,
    definirCursosDoProfessor,
    buscarEmpresaId
  }
}
