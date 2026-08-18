export interface ConfiguracaoNotificacoes {
  empresaId: string
  whatsappToken: string | null
  lembreteAulaAtivo: boolean
  /** Pode ter mais de uma — ex.: manda 1 dia antes E 3h antes da mesma aula. */
  lembreteAulaAntecedenciasMinutos: number[]
  /** Mensagem padrão — usada por qualquer antecedência sem mensagem própria em `lembreteAulaMensagens`. */
  lembreteAulaTemplate: string
  /** Mensagem específica por antecedência (chave = minutos). Ausente = cai no template padrão. */
  lembreteAulaMensagens: Record<number, string>
}

/** Presets de antecedência oferecidos na tela — valor sempre em minutos no banco. */
export const OPCOES_ANTECEDENCIA = [
  { valor: 30, rotulo: '30 minutos antes' },
  { valor: 60, rotulo: '1 hora antes' },
  { valor: 120, rotulo: '2 horas antes' },
  { valor: 180, rotulo: '3 horas antes' },
  { valor: 240, rotulo: '4 horas antes' },
  { valor: 1440, rotulo: '1 dia antes' },
  { valor: 2880, rotulo: '2 dias antes' },
  { valor: 4320, rotulo: '3 dias antes' }
] as const

const TEMPLATE_PADRAO_AULA =
  'Olá {{nome}}! Passando para lembrar que você tem aula de {{curso}} hoje às {{hora}}. Te esperamos! 💛'

function mapear(row: any): ConfiguracaoNotificacoes {
  const mensagensBrutas = row.lembrete_aula_mensagens || {}
  const mensagens: Record<number, string> = {}
  for (const chave of Object.keys(mensagensBrutas)) {
    if (mensagensBrutas[chave]) mensagens[Number(chave)] = mensagensBrutas[chave]
  }

  return {
    empresaId: row.empresa_id,
    whatsappToken: row.whatsapp_token,
    lembreteAulaAtivo: row.lembrete_aula_ativo,
    lembreteAulaAntecedenciasMinutos: row.lembrete_aula_antecedencias_minutos || [1440],
    lembreteAulaTemplate: row.lembrete_aula_template,
    lembreteAulaMensagens: mensagens
  }
}

/**
 * Configuração de notificações por WhatsApp (1 linha por empresa). A leitura
 * e a escrita passam pela RLS normal (admin só vê/edita a própria empresa) —
 * não precisa de RPC porque não tem regra de negócio complexa, só CRUD.
 */
export const useNotificacoesWhatsapp = () => {
  const db = () => useSupabaseClient()
  const { user } = useAuth()

  /**
   * Empresa do usuário logado. Filtra por `user_id` explicitamente — sem isso,
   * a RLS de `usuarios` (que deixa ver qualquer colega da mesma empresa, não
   * só a própria linha) faz `.single()` estourar assim que a empresa tem mais
   * de um admin/professor cadastrado, e o erro genérico vira "Empresa não
   * encontrada" mesmo com tudo certo. Bug real, já aconteceu aqui.
   */
  async function empresaIdAtual(): Promise<string> {
    if (!user.value) throw new Error('Sessão expirada — faça login novamente')

    const { data: usuario, error } = await db()
      .from('usuarios')
      .select('empresa_id')
      .eq('user_id', user.value.id)
      .maybeSingle()

    if (error) {
      console.error('Erro ao identificar empresa do usuário:', error)
      throw new Error('Não foi possível identificar sua empresa — tente novamente')
    }
    if (!usuario?.empresa_id) {
      throw new Error('Seu usuário não está vinculado a nenhuma empresa')
    }
    return usuario.empresa_id
  }

  /** Busca a config da empresa do admin logado; cria uma linha padrão se ainda não existir. */
  async function buscarConfiguracao(): Promise<ConfiguracaoNotificacoes | null> {
    const { data, error } = await db().from('configuracoes_notificacoes').select('*').maybeSingle()

    if (error) {
      console.error('Erro ao buscar configuração de notificações:', error)
      throw error
    }

    if (data) return mapear(data)

    // Primeira vez que essa empresa acessa a tela — cria a linha com os padrões.
    const empresaId = await empresaIdAtual()

    const { data: criada, error: erroCriar } = await db()
      .from('configuracoes_notificacoes')
      .insert({ empresa_id: empresaId, lembrete_aula_template: TEMPLATE_PADRAO_AULA })
      .select()
      .single()

    if (erroCriar) {
      console.error('Erro ao criar configuração de notificações:', erroCriar)
      throw erroCriar
    }
    return mapear(criada)
  }

  async function salvarLembreteAula(dados: {
    ativo: boolean
    antecedenciasMinutos: number[]
    template: string
    /** Mensagem própria por antecedência (minutos → texto); omitida = usa o template padrão. */
    mensagens: Record<number, string>
  }): Promise<void> {
    const empresaId = await empresaIdAtual()

    // jsonb no banco — chaves de objeto JS já viram string na serialização,
    // então isso bate certinho com o que a função do cron lê via `->>minutos`.
    const mensagensParaSalvar: Record<string, string> = {}
    for (const [minutos, texto] of Object.entries(dados.mensagens)) {
      if (texto?.trim()) mensagensParaSalvar[minutos] = texto
    }

    const { error } = await db()
      .from('configuracoes_notificacoes')
      .update({
        lembrete_aula_ativo: dados.ativo,
        lembrete_aula_antecedencias_minutos: dados.antecedenciasMinutos,
        lembrete_aula_template: dados.template,
        lembrete_aula_mensagens: mensagensParaSalvar,
        updated_at: new Date().toISOString()
      })
      .eq('empresa_id', empresaId)

    if (error) throw error
  }

  async function salvarToken(token: string): Promise<void> {
    const empresaId = await empresaIdAtual()

    const { error } = await db()
      .from('configuracoes_notificacoes')
      .update({ whatsapp_token: token.trim() || null, updated_at: new Date().toISOString() })
      .eq('empresa_id', empresaId)

    if (error) throw error
  }

  /**
   * Envio manual de teste — passa pela rota do servidor (não chama a Agzap
   * direto do navegador): o token fica só no banco, o servidor é quem lê e
   * repassa, e a resposta real (sucesso/erro) volta na hora pra tela.
   */
  async function enviarTeste(numero: string, mensagem: string): Promise<{ success: boolean; status?: number; erro?: string }> {
    const { data: sessao } = await db().auth.getSession()
    const token = sessao?.session?.access_token
    if (!token) throw new Error('Sessão inválida — faça login novamente')

    try {
      const resposta = await $fetch<{ success: boolean; status?: number }>('/api/whatsapp/testar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { numero, mensagem }
      })
      return resposta
    } catch (e: any) {
      return { success: false, erro: e?.data?.statusMessage || e?.message || 'Erro ao enviar mensagem de teste' }
    }
  }

  return { buscarConfiguracao, salvarLembreteAula, salvarToken, enviarTeste }
}
