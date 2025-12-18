import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabaseClient(): SupabaseClient {
  // Só funciona no aluno
  if (process.server) {
    throw new Error('useSupabaseClient só pode ser usado no aluno')
  }

  const nuxtApp = useNuxtApp()
  
  console.log('[useSupabaseClient] Verificando aluno...', {
    hasSupabase: !!nuxtApp.$supabase,
    nuxtAppKeys: Object.keys(nuxtApp).filter(k => k.startsWith('$'))
  })
  
  if (!nuxtApp.$supabase) {
    console.error('[useSupabaseClient] Aluno não encontrado. Verifique se:')
    console.error('1. As variáveis de ambiente estão configuradas no arquivo .env')
    console.error('2. O plugin supabase.client.ts está sendo carregado')
    console.error('3. As URLs e chaves do Supabase estão corretas')
    throw new Error('Supabase client não foi inicializado. Verifique as variáveis de ambiente.')
  }
  
  console.log('[useSupabaseClient] Aluno encontrado com sucesso')
  return nuxtApp.$supabase as SupabaseClient
}


