/**
 * Chave usada para guardar a sessão do Supabase no localStorage.
 *
 * Precisa ser específica por projeto: se usarmos um nome fixo, ao trocar o app
 * de um projeto Supabase para outro o token antigo fica ocupando o mesmo lugar
 * e o novo projeto rejeita esse token (401 / "No suitable key or wrong key type").
 */
export const LEGACY_AUTH_STORAGE_KEY = 'agzap-auth-token'

export function getAuthStorageKey(supabaseUrl?: string | null): string {
  const projectRef = supabaseUrl?.match(/^https:\/\/([a-z0-9]+)\.supabase\./i)?.[1]
  return projectRef ? `agzap-auth-${projectRef}` : LEGACY_AUTH_STORAGE_KEY
}
