/**
 * Badges de "coisa nova" no menu do admin: avaliações e indicações ainda
 * não vistas. Mesma lógica do sino do aluno para notificação "informativa"
 * (ex.: débito de faltas): o badge não fica preso a um fluxo de trabalho —
 * ele some assim que o admin clica e a página abre, independente de ele
 * já ter processado tudo que tinha lá dentro (o status 'pendente' da
 * indicação continua existindo e visível na própria página; o badge do
 * menu é só "avise que tem algo novo pra olhar").
 *
 * Tempo real via postgres_changes (WAL) — o Broadcast do Supabase
 * (realtime.messages) não está disponível neste projeto: schema sem
 * partições provisionadas e sem permissão de criar (ver migração
 * remove_broadcast_quebrado_usa_postgres_changes). O postgres_changes não
 * precisa de nada disso e já respeita as RLS existentes — cada admin só
 * recebe eventos da própria empresa.
 *
 * Estado compartilhado (useState) de propósito: quem assina o canal é o
 * AppSidebar (monta uma vez, sobrevive à troca de página), mas quem
 * resolve a pendência (abrir a página de Avaliações/Indicações) é outra
 * página — com estado global, ela só chama marcar*Vistas() e o badge do
 * menu atualiza sozinho.
 */
export const useNotificacoesAdmin = () => {
  const db = () => useSupabaseClient()

  const avaliacoesNovas = useState<number>('admin-avaliacoes-novas', () => 0)
  const indicacoesNovas = useState<number>('admin-indicacoes-novas', () => 0)
  /** Faltas justificadas pelo professor esperando a escola decidir se isenta o aluno. */
  const faltasPendentes = useState<number>('admin-faltas-pendentes', () => 0)

  async function recarregarFaltasPendentes() {
    const { count, error } = await db()
      .from('faltas')
      .select('id', { count: 'exact', head: true })
      .eq('status_analise', 'pendente')

    if (error) {
      console.error('Erro ao contar faltas pendentes:', error)
      return
    }
    faltasPendentes.value = count ?? 0
  }

  async function recarregarAvaliacoes() {
    const { count, error } = await db()
      .from('avaliacoes_aulas')
      .select('id', { count: 'exact', head: true })
      .is('visualizado_em', null)

    if (error) {
      console.error('Erro ao contar avaliações novas:', error)
      return
    }
    avaliacoesNovas.value = count ?? 0
  }

  async function recarregarIndicacoes() {
    const { count, error } = await db()
      .from('indicacoes')
      .select('id', { count: 'exact', head: true })
      .is('visualizado_em', null)

    if (error) {
      console.error('Erro ao contar indicações novas:', error)
      return
    }
    indicacoesNovas.value = count ?? 0
  }

  async function recarregarTudo() {
    await Promise.all([recarregarAvaliacoes(), recarregarIndicacoes(), recarregarFaltasPendentes()])
  }

  /** Marca todas as avaliações da empresa como vistas — chame ao abrir a página de Avaliações. */
  async function marcarAvaliacoesVistas() {
    if (avaliacoesNovas.value === 0) return
    const { error } = await db().rpc('marcar_avaliacoes_vistas')
    if (error) {
      // Ex.: usuário logado não é admin (RPC recusa) — não é um erro fatal pra tela.
      console.error('Erro ao marcar avaliações como vistas:', error)
      return
    }
    avaliacoesNovas.value = 0
  }

  /** Marca todas as indicações da empresa como vistas — chame ao abrir a página de Indicações. */
  async function marcarIndicacoesVistas() {
    if (indicacoesNovas.value === 0) return
    const { error } = await db().rpc('marcar_indicacoes_vistas')
    if (error) {
      console.error('Erro ao marcar indicações como vistas:', error)
      return
    }
    indicacoesNovas.value = 0
  }

  let canal: ReturnType<ReturnType<typeof useSupabaseClient>['channel']> | null = null

  function assinarTempoReal() {
    if (canal) return // já assinado nesta sessão

    canal = db()
      .channel('admin-notificacoes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avaliacoes_aulas' }, () => recarregarAvaliacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'indicacoes' }, () => recarregarIndicacoes())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'faltas' }, () => recarregarFaltasPendentes())
      .subscribe()
  }

  function encerrarTempoReal() {
    if (canal) {
      db().removeChannel(canal)
      canal = null
    }
  }

  return {
    avaliacoesNovas,
    indicacoesNovas,
    faltasPendentes,
    recarregarTudo,
    recarregarFaltasPendentes,
    marcarAvaliacoesVistas,
    marcarIndicacoesVistas,
    assinarTempoReal,
    encerrarTempoReal
  }
}
