import { temAvaliacao } from '~/utils/avaliacoes'

export interface NotificacaoAluno {
  /** 'falta' = cobrança/débito (vermelho) · 'avaliacao' = aula pendente de avaliação (verde) */
  tipo: 'falta' | 'avaliacao'
  id: string
  titulo: string
  descricao: string
  data: string
  /** Só existe para tipo 'avaliacao': id da presença a avaliar */
  presencaId?: string
}

/**
 * Notificações do aluno: junta duas fontes que já existem no banco —
 * débito de faltas (alunos.debito_faltas) e aulas concluídas sem avaliação
 * (presencas.status = 'concluida' sem registro correspondente em
 * avaliacoes_aulas). Não depende de nenhuma tabela nova.
 *
 * Estado compartilhado (useState) de propósito: o sino mora no layout, mas
 * quem resolve a pendência (ex.: enviar a avaliação) é a página — com
 * estado global, a página só chama recarregar() e o sino atualiza sozinho,
 * sem precisar de evento entre componentes.
 */
export const useNotificacoes = () => {
  const db = () => useSupabaseClient()
  const notificacoes = useState<NotificacaoAluno[]>('notificacoes-aluno', () => [])
  const alunoIdAtual = useState<string | null>('notificacoes-aluno-id', () => null)

  // "Dispensar" é só pra notificação de DÉBITO: ela é um aviso, não a
  // pendência em si — clicar já leva pra página de faltas, então não faz
  // sentido continuar ocupando o sino depois disso. A dívida em si só
  // resolve quando for paga (isso continua checando o banco). O id inclui o
  // valor da dívida, então se ela mudar (nova falta ou pagamento parcial) a
  // notificação volta a aparecer — dispensar não esconde uma dívida NOVA.
  //
  // Avaliação fica de fora de propósito: só sai do sino quando o aluno
  // realmente termina e envia o formulário (buscarNotificacoes já não
  // inclui mais aulas com avaliação salva).
  const dispensadas = useState<Set<string>>('notificacoes-dispensadas', () => new Set())

  function chaveDispensadas(alunoId: string) {
    return `notificacoes-dispensadas-${alunoId}`
  }

  function carregarDispensadas(alunoId: string) {
    if (!process.client) return
    try {
      const bruto = localStorage.getItem(chaveDispensadas(alunoId))
      dispensadas.value = new Set(bruto ? (JSON.parse(bruto) as string[]) : [])
    } catch {
      dispensadas.value = new Set()
    }
  }

  function salvarDispensadas(alunoId: string) {
    if (!process.client) return
    try {
      localStorage.setItem(chaveDispensadas(alunoId), JSON.stringify([...dispensadas.value]))
    } catch {
      // localStorage indisponível (modo privado, etc.) — a dispensa só dura a sessão atual
    }
  }

  /** Remove a notificação da lista na hora (sino atualiza sem esperar recarregar). */
  function dispensar(id: string) {
    if (!alunoIdAtual.value) return
    dispensadas.value.add(id)
    salvarDispensadas(alunoIdAtual.value)
    notificacoes.value = notificacoes.value.filter(n => n.id !== id)
  }

  /**
   * Tira uma notificação da lista na hora, sem persistir dispensa — usado
   * quando a pendência foi mesmo resolvida (ex.: avaliação enviada com
   * sucesso). O recarregar() feito logo em seguida confirma com o banco;
   * isso aqui só evita o sino ficar mostrando algo já resolvido enquanto
   * essa nova busca ainda não voltou.
   */
  function remover(id: string) {
    notificacoes.value = notificacoes.value.filter(n => n.id !== id)
  }

  function formatarDataCurta(iso: string) {
    const [ano, mes, dia] = iso.split('T')[0]!.split('-')
    return `${dia}/${mes}/${ano}`
  }

  async function buscarNotificacoes(alunoId: string): Promise<NotificacaoAluno[]> {
    const notificacoes: NotificacaoAluno[] = []

    // Aulas concluídas que o aluno ainda não avaliou (qualquer data, não só hoje)
    const { data: presencas, error: erroPresencas } = await db()
      .from('presencas')
      .select('id, data_presenca, curso_id, cursos(nome), avaliacoes_aulas(id)')
      .eq('aluno_id', alunoId)
      .eq('status', 'concluida')
      .order('data_presenca', { ascending: false })

    if (erroPresencas) {
      console.error('Erro ao buscar avaliações pendentes:', erroPresencas)
    } else {
      for (const p of (presencas || []) as any[]) {
        if (temAvaliacao(p.avaliacoes_aulas)) continue

        notificacoes.push({
          tipo: 'avaliacao',
          id: `avaliacao-${p.id}`,
          presencaId: p.id,
          titulo: 'Avalie sua aula',
          descricao: `${p.cursos?.nome || 'Curso'} · ${formatarDataCurta(p.data_presenca)}`,
          data: p.data_presenca
        })
      }
    }

    // Débito de faltas
    const { data: aluno, error: erroAluno } = await db()
      .from('alunos')
      .select('debito_faltas')
      .eq('id', alunoId)
      .single()

    if (erroAluno) {
      console.error('Erro ao verificar débito de faltas:', erroAluno)
    } else if (aluno && parseFloat(aluno.debito_faltas || '0') > 0) {
      const valorNumero = parseFloat(aluno.debito_faltas)
      const valor = valorNumero.toFixed(2).replace('.', ',')
      notificacoes.push({
        tipo: 'falta',
        // Valor no id: se a dívida mudar (nova falta ou pagamento parcial),
        // vira um id novo e a notificação reaparece mesmo já tendo sido dispensada antes.
        id: `debito-faltas-${valorNumero.toFixed(2)}`,
        titulo: 'Você tem débito de faltas',
        descricao: `R$ ${valor} pendente de pagamento`,
        data: new Date().toISOString()
      })
    }

    return notificacoes
  }

  /** Chamado uma vez, quando o layout descobre o id do aluno logado. */
  function definirAluno(alunoId: string) {
    alunoIdAtual.value = alunoId
    carregarDispensadas(alunoId)
  }

  /**
   * Refaz a busca e atualiza o estado compartilhado — o sino (em qualquer
   * tela) reflete na hora. Chame depois de qualquer ação que resolva uma
   * pendência: enviar avaliação, pagar débito, etc.
   */
  async function recarregar() {
    if (!alunoIdAtual.value) return
    const brutas = await buscarNotificacoes(alunoIdAtual.value)
    notificacoes.value = brutas.filter(n => !dispensadas.value.has(n.id))
  }

  return { notificacoes, buscarNotificacoes, definirAluno, recarregar, dispensar, remover }
}
