export interface ConfiguracaoNotificacoes {
  empresaId: string
  whatsappToken: string | null
  lembreteAulaAtivo: boolean
  /** Pode ter mais de uma — ex.: manda 1 dia antes E 3h antes da mesma aula. */
  lembreteAulaAntecedenciasMinutos: number[]
  lembreteAulaTemplate: string
}

/** Presets de antecedência oferecidos na tela — valor sempre em minutos no banco. */
export const OPCOES_ANTECEDENCIA = [
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
  return {
    empresaId: row.empresa_id,
    whatsappToken: row.whatsapp_token,
    lembreteAulaAtivo: row.lembrete_aula_ativo,
    lembreteAulaAntecedenciasMinutos: row.lembrete_aula_antecedencias_minutos || [1440],
    lembreteAulaTemplate: row.lembrete_aula_template
  }
}

/**
 * Configuração de notificações por WhatsApp (1 linha por empresa). A leitura
 * e a escrita passam pela RLS normal (admin só vê/edita a própria empresa) —
 * não precisa de RPC porque não tem regra de negócio complexa, só CRUD.
 */
export const useNotificacoesWhatsapp = () => {
  const db = () => useSupabaseClient()

  /** Busca a config da empresa do admin logado; cria uma linha padrão se ainda não existir. */
  async function buscarConfiguracao(): Promise<ConfiguracaoNotificacoes | null> {
    const { data, error } = await db().from('configuracoes_notificacoes').select('*').maybeSingle()

    if (error) {
      console.error('Erro ao buscar configuração de notificações:', error)
      throw error
    }

    if (data) return mapear(data)

    // Primeira vez que essa empresa acessa a tela — cria a linha com os padrões.
    const { data: usuario } = await db().from('usuarios').select('empresa_id').single()
    if (!usuario?.empresa_id) return null

    const { data: criada, error: erroCriar } = await db()
      .from('configuracoes_notificacoes')
      .insert({ empresa_id: usuario.empresa_id, lembrete_aula_template: TEMPLATE_PADRAO_AULA })
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
  }): Promise<void> {
    const { data: usuario } = await db().from('usuarios').select('empresa_id').single()
    if (!usuario?.empresa_id) throw new Error('Empresa não encontrada')

    const { error } = await db()
      .from('configuracoes_notificacoes')
      .update({
        lembrete_aula_ativo: dados.ativo,
        lembrete_aula_antecedencias_minutos: dados.antecedenciasMinutos,
        lembrete_aula_template: dados.template,
        updated_at: new Date().toISOString()
      })
      .eq('empresa_id', usuario.empresa_id)

    if (error) throw error
  }

  async function salvarToken(token: string): Promise<void> {
    const { data: usuario } = await db().from('usuarios').select('empresa_id').single()
    if (!usuario?.empresa_id) throw new Error('Empresa não encontrada')

    const { error } = await db()
      .from('configuracoes_notificacoes')
      .update({ whatsapp_token: token.trim() || null, updated_at: new Date().toISOString() })
      .eq('empresa_id', usuario.empresa_id)

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
