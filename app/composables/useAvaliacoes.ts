export interface AvaliacaoAula {
  id: string
  created_at: string
  nota_professor: number
  nota_local: number
  o_que_aprendeu: string | null
  sugestoes: string | null
  dificuldades: string | null
  avaliacao_profissional: string | null
  assinatura: string | null
  aluno_nome: string
  curso_nome: string | null
  professor_nome: string | null
  data_aula: string | null
  numero_aula: number | null
  tema: string | null
}

export interface FiltrosAvaliacoes {
  cursoId?: string | null
  professorId?: string | null
  de?: string | null
  ate?: string | null
  /** Só avaliações em que o aluno relatou dificuldade (campo preenchido). */
  somenteComDificuldade?: boolean
}

export interface ResumoAvaliacoes {
  total: number
  mediaProfessor: string
  mediaLocal: string
  comDificuldade: number
}

/** Teto de segurança pra exportação "tudo" — acima disso o PDF fica pesado/lento sem ganho real. */
export const LIMITE_EXPORTACAO_AVALIACOES = 3000
const LIMITE_EXPORTACAO = LIMITE_EXPORTACAO_AVALIACOES

export const useAvaliacoes = () => {
  const db = () => useSupabaseClient()

  function mapear(a: any): AvaliacaoAula {
    return {
      id: a.id,
      created_at: a.created_at,
      nota_professor: a.nota_professor,
      nota_local: a.nota_local,
      o_que_aprendeu: a.o_que_aprendeu,
      sugestoes: a.sugestoes,
      dificuldades: a.dificuldades,
      avaliacao_profissional: a.avaliacao_profissional,
      assinatura: a.assinatura,
      aluno_nome: a.alunos?.nome_completo || 'Aluno',
      curso_nome: a.cursos?.nome ?? null,
      professor_nome: a.aulas?.usuarios?.nome ?? null,
      data_aula: a.aulas?.data_aula ?? null,
      numero_aula: a.aulas?.numero_aula ?? null,
      tema: a.aulas?.tema ?? null
    }
  }

  /**
   * Filtro por professor não dá pra fazer direto no embed (avaliacoes_aulas
   * não tem professor_id, só chega nele via aula_id -> aulas.professor_id) —
   * filtrar embed com PostgREST tem letra miúda demais (precisa de !inner e
   * ainda assim já vimos embed se comportar diferente do esperado nesta
   * base algumas vezes hoje). Mais simples e à prova de surpresa: busca os
   * aula_id desse professor à parte e usa .in() na query principal.
   */
  async function idsDeAulasDoProfessor(professorId: string): Promise<string[]> {
    const { data, error } = await db().from('aulas').select('id').eq('professor_id', professorId)
    if (error) {
      console.error('Erro ao buscar aulas do professor:', error)
      return []
    }
    return (data || []).map(a => a.id)
  }

  /**
   * Devolve o builder embrulhado num objeto ({ query }), não puro — se essa
   * função (async, porque precisa do await de idsDeAulasDoProfessor) desse
   * `return query` direto, o `await construirQuery(...)` do lugar que chama
   * executaria a query sozinho: builders do Supabase são "thenable" (têm
   * .then), e o JS "achata" automaticamente uma Promise que resolve para
   * outro thenable. O resultado vira {data,error,count} em vez do builder, e
   * a chamada seguinte (`.range(...)`) quebra com "query.range is not a
   * function". Embrulhando num objeto comum isso não acontece.
   */
  async function construirQuery(filtros?: FiltrosAvaliacoes) {
    let query = db()
      .from('avaliacoes_aulas')
      .select(`
        id, created_at, nota_professor, nota_local,
        o_que_aprendeu, sugestoes, dificuldades, avaliacao_profissional, assinatura,
        curso_id, aula_id,
        alunos(nome_completo),
        cursos(nome),
        aulas(data_aula, numero_aula, tema, usuarios(nome))
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filtros?.cursoId) query = query.eq('curso_id', filtros.cursoId)
    if (filtros?.de) query = query.gte('created_at', filtros.de)
    if (filtros?.ate) query = query.lte('created_at', `${filtros.ate}T23:59:59`)
    if (filtros?.somenteComDificuldade) query = query.not('dificuldades', 'is', null)

    if (filtros?.professorId) {
      const ids = await idsDeAulasDoProfessor(filtros.professorId)
      // Lista vazia faria o .in() virar "sem filtro" em alguns drivers — força zero resultados.
      query = query.in('aula_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
    }

    return { query }
  }

  /** Uma página de avaliações + o total que bate com os filtros (pra paginação e pro "carregar mais"). */
  async function listarAvaliacoes(
    filtros?: FiltrosAvaliacoes,
    pagina?: { offset: number; limite: number }
  ): Promise<{ dados: AvaliacaoAula[]; total: number }> {
    const { query: base } = await construirQuery(filtros)
    const query = pagina ? base.range(pagina.offset, pagina.offset + pagina.limite - 1) : base

    const { data, error, count } = await query
    if (error) {
      console.error('Erro ao listar avaliações:', error)
      throw error
    }

    return { dados: ((data || []) as any[]).map(mapear), total: count ?? 0 }
  }

  /** Todas as avaliações que batem com o filtro, sem paginação — só pra exportar o relatório. */
  async function listarTodasParaExportar(filtros?: FiltrosAvaliacoes): Promise<{ dados: AvaliacaoAula[]; truncado: boolean }> {
    const { query } = await construirQuery(filtros)
    const { data, error, count } = await query.range(0, LIMITE_EXPORTACAO - 1)
    if (error) {
      console.error('Erro ao exportar avaliações:', error)
      throw error
    }
    return {
      dados: ((data || []) as any[]).map(mapear),
      truncado: (count ?? 0) > LIMITE_EXPORTACAO
    }
  }

  async function listarCursos() {
    const { data } = await db().from('cursos').select('id, nome').eq('ativo', true).order('nome')
    return data || []
  }

  async function listarProfessoresComAvaliacao() {
    const { data } = await db().from('usuarios').select('id, nome').eq('perfil', 'professor').order('nome')
    return data || []
  }

  /**
   * Totais/médias calculados no banco (RPC resumo_avaliacoes), não no
   * cliente — a listagem é paginada, então somar só o que está carregado na
   * tela daria números errados quando há mais avaliações do que a página atual.
   */
  async function buscarResumo(filtros?: FiltrosAvaliacoes): Promise<ResumoAvaliacoes> {
    const { data, error } = await db().rpc('resumo_avaliacoes', {
      p_curso_id: filtros?.cursoId || null,
      p_professor_id: filtros?.professorId || null,
      p_de: filtros?.de || null,
      p_ate: filtros?.ate ? `${filtros.ate}T23:59:59` : null,
      p_somente_dificuldade: filtros?.somenteComDificuldade || false
    })

    if (error) {
      console.error('Erro ao buscar resumo de avaliações:', error)
      return { total: 0, mediaProfessor: '–', mediaLocal: '–', comDificuldade: 0 }
    }

    const linha = (data as any[])?.[0]
    if (!linha || linha.total === 0) return { total: 0, mediaProfessor: '–', mediaLocal: '–', comDificuldade: 0 }

    return {
      total: linha.total,
      mediaProfessor: linha.media_professor != null ? String(linha.media_professor) : '–',
      mediaLocal: linha.media_local != null ? String(linha.media_local) : '–',
      comDificuldade: linha.com_dificuldade
    }
  }

  return { listarAvaliacoes, listarTodasParaExportar, listarCursos, listarProfessoresComAvaliacao, buscarResumo }
}
