export type StatusPresenca = 'aguardando' | 'presente' | 'concluida' | 'falta'
export type StatusAula = 'aberta' | 'finalizada'

export interface Aula {
  id: string
  curso_id: string
  professor_id: string | null
  data_aula: string
  numero_aula: number | null
  tema: string | null
  status: StatusAula
  iniciada_at: string | null
  finalizada_at: string | null
}

export interface PresencaAluno {
  id: string
  aluno_id: string
  curso_id: string
  status: StatusPresenca
  hora_registro: string | null
  checkout_at: string | null
  /**
   * `avaliacoes_aulas.presenca_id` é UNIQUE, então o PostgREST embeda como
   * relação 1-para-1: vem um objeto único ou null, NUNCA um array — apesar
   * do nome no plural. Não checar `.length` nisso (ver temAvaliacao() em
   * utils/avaliacoes.ts).
   */
  avaliacoes_aulas?: { id: string } | null
}

export interface AlunoDaTurma {
  aluno_id: string
  nome: string
  telefone: string | null
  status: StatusPresenca | null
  /** Check-in do aluno pelo app. Null quando ele não fez check-in. */
  horaCheckin: string | null
  /** Momento em que o professor fez a chamada. */
  marcadoAt: string | null
  /** Horário previsto da aula, vindo da matrícula do aluno. */
  horaEntrada: string | null
  horaSaida: string | null
  /** Observação da falta (ex.: "trouxe atestado"). Presente = justificada, ausente/null = injustificada. */
  motivoFalta: string | null
  /** Classificação da falta escolhida pelo professor. Ver TIPOS_JUSTIFICATIVA. */
  tipoJustificativa: TipoJustificativa | null
  /** Id do registro de presença de hoje. Null enquanto o professor não marcou nada. */
  presencaId: string | null
}

export type TipoJustificativa =
  | 'injustificada'
  | 'atestado_medico'
  | 'problema_familiar'
  | 'problema_saude'
  | 'outro'

/**
 * Opções do dropdown de falta. Os rótulos espelham private.rotulo_justificativa()
 * no banco — mudou aqui, muda lá também, senão o texto gravado em faltas.motivo
 * (que alimenta relatórios) fica diferente do que o professor viu na tela.
 *
 * Toda falta gera débito, justificada ou não; a justificativa só marca a falta
 * para a administração decidir se isenta o aluno.
 */
export const TIPOS_JUSTIFICATIVA: { valor: TipoJustificativa; rotulo: string }[] = [
  { valor: 'injustificada', rotulo: 'Falta injustificada' },
  { valor: 'atestado_medico', rotulo: 'Atestado médico' },
  { valor: 'problema_familiar', rotulo: 'Problema familiar' },
  { valor: 'problema_saude', rotulo: 'Problema de saúde (sem atestado)' },
  { valor: 'outro', rotulo: 'Outro motivo justificado' }
]

export function rotuloJustificativa(tipo: TipoJustificativa | null | undefined) {
  return TIPOS_JUSTIFICATIVA.find(t => t.valor === tipo)?.rotulo || 'Falta injustificada'
}

/** Matrícula de um aluno num curso, com os dias da semana em que ele tem aula — usado na visão semanal do professor. */
export interface AlunoProgramado {
  aluno_id: string
  nome: string
  curso_id: string
  /** 0 = domingo, 1 = segunda, ..., 6 = sábado (mesma convenção do JS Date#getDay). */
  diasSemana: number[]
  horaEntrada: string | null
  horaSaida: string | null
}

/** Campos da avaliação, espelhando o comprovante de presença em papel. */
export interface DadosAvaliacao {
  notaProfessor: number
  notaLocal: number
  oQueAprendeu?: string
  sugestoes?: string
  dificuldades?: string
  avaliacaoProfissional?: string
  assinatura?: string
}

/**
 * Aula presencial conduzida pelo professor.
 *
 * Quem decide a presença é sempre o professor: o check-in do aluno serve apenas
 * como sinal de que ele chegou com o app aberto. Todas as transições passam por
 * funções SECURITY DEFINER no banco, então nem o aluno nem o professor conseguem
 * burlar as regras chamando a API REST direto.
 */
export const useAulas = () => {
  // Resolvido sob demanda: se resolvêssemos aqui e o cliente faltasse, a exceção
  // abortaria o <script setup> da página e TODOS os bindings ficariam indefinidos
  // (o compilador só monta o objeto de retorno no fim da função).
  const db = () => useSupabaseClient()

  const hojeISO = () => new Date().toISOString().split('T')[0] as string

  // ----------------------------------------------------------------- professor

  /**
   * Cursos que o usuário logado leciona.
   * Professor vê apenas os cursos vinculados a ele; admin vê todos os da empresa.
   */
  async function buscarMeusCursos() {
    const { data, error } = await db().rpc('meus_cursos_professor')

    if (error) {
      console.error('Erro ao buscar cursos do professor:', error)
      throw error
    }
    return (data || []) as any[]
  }

  /** Aulas de hoje, indexadas por curso. */
  async function buscarAulasDeHoje(): Promise<Record<string, Aula>> {
    const { data, error } = await db()
      .from('aulas')
      .select('id, curso_id, professor_id, data_aula, numero_aula, tema, status, iniciada_at, finalizada_at')
      .eq('data_aula', hojeISO())

    if (error) {
      console.error('Erro ao buscar aulas de hoje:', error)
      throw error
    }

    const porCurso: Record<string, Aula> = {}
    for (const aula of (data || []) as unknown as Aula[]) porCurso[aula.curso_id] = aula
    return porCurso
  }

  /** Alunos matriculados no curso, já com a situação de hoje (check-in / chamada). */
  async function buscarTurma(cursoId: string): Promise<AlunoDaTurma[]> {
    const supabase = db()

    const [{ data: matriculas, error: erroMat }, { data: presencas, error: erroPres }] = await Promise.all([
      supabase
        .from('alunos_cursos')
        .select('aluno_id, hora_entrada, hora_saida, alunos(id, nome_completo, telefone)')
        .eq('curso_id', cursoId)
        .eq('status', 'ativo'),
      supabase
        .from('presencas')
        .select('id, aluno_id, status, hora_registro, marcado_at, motivo_falta, tipo_justificativa')
        .eq('curso_id', cursoId)
        .eq('data_presenca', hojeISO())
    ])

    if (erroMat) {
      console.error('Erro ao buscar turma:', erroMat)
      return []
    }
    if (erroPres) console.error('Erro ao buscar presenças:', erroPres)

    const porAluno = new Map<string, any>()
    for (const p of (presencas || []) as any[]) porAluno.set(p.aluno_id, p)

    return ((matriculas || []) as any[])
      .map(m => {
        const registro = porAluno.get(m.aluno_id)
        return {
          aluno_id: m.aluno_id,
          nome: m.alunos?.nome_completo || 'Aluno',
          telefone: m.alunos?.telefone || null,
          status: registro?.status ?? null,
          horaCheckin: registro?.hora_registro ?? null,
          marcadoAt: registro?.marcado_at ?? null,
          horaEntrada: m.hora_entrada ?? null,
          horaSaida: m.hora_saida ?? null,
          motivoFalta: registro?.motivo_falta ?? null,
          tipoJustificativa: registro?.tipo_justificativa ?? null,
          presencaId: registro?.id ?? null
        }
      })
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }

  /**
   * Matrículas ativas dos cursos informados, com os dias da semana de cada
   * aluno — base da visão semanal do professor (quem tem aula programada em
   * cada dia, além de hoje). Uma linha por aluno matriculado.
   */
  async function buscarProgramacaoSemanal(cursoIds: string[]): Promise<AlunoProgramado[]> {
    if (cursoIds.length === 0) return []

    const { data, error } = await db()
      .from('alunos_cursos')
      .select('aluno_id, curso_id, dias_semana, hora_entrada, hora_saida, alunos(nome_completo)')
      .in('curso_id', cursoIds)
      .eq('status', 'ativo')

    if (error) {
      console.error('Erro ao buscar programação semanal:', error)
      return []
    }

    return ((data || []) as any[]).map(m => ({
      aluno_id: m.aluno_id,
      nome: m.alunos?.nome_completo || 'Aluno',
      curso_id: m.curso_id,
      diasSemana: (m.dias_semana || []) as number[],
      horaEntrada: m.hora_entrada ?? null,
      horaSaida: m.hora_saida ?? null
    }))
  }

  async function iniciarAula(cursoId: string, tema?: string | null): Promise<string> {
    const { data, error } = await db().rpc('iniciar_aula', {
      p_curso_id: cursoId,
      p_tema: tema?.trim() || null
    })
    if (error) throw error
    return data as unknown as string
  }

  /**
   * `motivo` é a observação da falta (ex.: "trouxe atestado") — só faz sentido
   * quando `presente` é false; o banco descarta o valor quando presente é true.
   * Vira a base de "justificada" quando a aula é finalizada e a falta gera cobrança.
   */
  async function marcarPresenca(aulaId: string, alunoId: string, presente: boolean, motivo?: string | null): Promise<void> {
    const { error } = await db().rpc('marcar_presenca', {
      p_aula_id: aulaId,
      p_aluno_id: alunoId,
      p_presente: presente,
      p_motivo: motivo?.trim() || null
    })
    if (error) throw error
  }

  /**
   * Classifica a falta (dropdown de tipo + observação opcional). Funciona com
   * a aula aberta E depois de finalizada.
   *
   * Justificar NÃO tira o débito do aluno: a multa é lançada de qualquer jeito
   * e a falta só entra na fila de análise da administração, que é quem decide
   * isentar (analisar_falta). Isso mantém a régua financeira com a escola, não
   * com o professor.
   */
  async function justificarFalta(
    presencaId: string,
    tipo: TipoJustificativa,
    observacao?: string | null
  ): Promise<void> {
    const { error } = await db().rpc('justificar_falta', {
      p_presenca_id: presencaId,
      p_tipo: tipo,
      p_observacao: observacao?.trim() || null
    })
    if (error) throw error
  }

  /** Fecha a aula e devolve quantos alunos ficaram como presentes. */
  async function finalizarAula(aulaId: string): Promise<number> {
    const { data, error } = await db().rpc('finalizar_aula', { p_aula_id: aulaId })
    if (error) throw error
    return (data as unknown as number) ?? 0
  }

  async function atualizarAula(aulaId: string, tema?: string | null, observacoes?: string | null) {
    const { error } = await db().rpc('atualizar_aula', {
      p_aula_id: aulaId,
      p_tema: tema?.trim() || null,
      p_observacoes: observacoes?.trim() || null
    })
    if (error) throw error
  }

  // --------------------------------------------------------------------- aluno

  /** Check-in do aluno ao chegar. É só um sinal: quem marca presença é o professor. */
  async function fazerCheckin(cursoId: string): Promise<string> {
    const { data, error } = await db().rpc('fazer_checkin', { p_curso_id: cursoId })
    if (error) throw error
    return data as unknown as string
  }

  async function avaliarAula(presencaId: string, dados: DadosAvaliacao): Promise<string> {
    const { data, error } = await db().rpc('avaliar_aula', {
      p_presenca_id: presencaId,
      p_nota_professor: dados.notaProfessor,
      p_nota_local: dados.notaLocal,
      p_o_que_aprendeu: dados.oQueAprendeu?.trim() || null,
      p_sugestoes: dados.sugestoes?.trim() || null,
      p_dificuldades: dados.dificuldades?.trim() || null,
      p_avaliacao_profissional: dados.avaliacaoProfissional?.trim() || null,
      p_assinatura: dados.assinatura || null,
      p_comentario: null
    })
    if (error) throw error
    return data as unknown as string
  }

  /** Situação do aluno hoje em cada curso. */
  async function buscarSessoesHoje(alunoId: string): Promise<Record<string, PresencaAluno>> {
    const { data, error } = await db()
      .from('presencas')
      .select('id, aluno_id, curso_id, status, hora_registro, checkout_at, avaliacoes_aulas(id)')
      .eq('aluno_id', alunoId)
      .eq('data_presenca', hojeISO())

    if (error) {
      console.error('Erro ao buscar sessões de hoje:', error)
      return {}
    }

    const porCurso: Record<string, PresencaAluno> = {}
    for (const p of (data || []) as unknown as PresencaAluno[]) {
      if (p.curso_id) porCurso[p.curso_id] = p
    }
    return porCurso
  }

  return {
    // professor
    buscarMeusCursos,
    buscarAulasDeHoje,
    buscarTurma,
    buscarProgramacaoSemanal,
    iniciarAula,
    marcarPresenca,
    justificarFalta,
    finalizarAula,
    atualizarAula,
    // aluno
    fazerCheckin,
    avaliarAula,
    buscarSessoesHoje
  }
}
