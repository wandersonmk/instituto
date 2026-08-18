/**
 * Garante que o WebSocket do Realtime está usando o token da sessão atual
 * ANTES de assinar um canal com postgres_changes.
 *
 * Sem isso, o supabase-js pode confirmar a assinatura (status "SUBSCRIBED")
 * normalmente, mas o servidor avalia a conexão como se não tivesse usuário
 * logado — a política de RLS da tabela (corretamente) não deixa passar
 * nenhum evento, e nada chega, sem erro nenhum visível na tela. Achado
 * testando na prática (canal com service_role recebia evento, o mesmo canal
 * com sessão de usuário real não recebia, mesmo com RLS idêntica), não é só
 * uma cautela teórica.
 *
 * Chame isso logo antes de cada `.channel(...).subscribe()` — tanto na
 * primeira assinatura quanto em qualquer reconexão, pra sempre usar o token
 * mais recente (cobre também o token expirando numa aba de longa duração).
 */
export async function autenticarRealtime(supabase: ReturnType<typeof useSupabaseClient>): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) supabase.realtime.setAuth(token)
}
