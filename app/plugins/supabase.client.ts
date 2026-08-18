import { createClient } from '@supabase/supabase-js'
// Import explícito: se o auto-import falhar aqui, o plugin lança e nunca fornece
// $supabase, derrubando toda página que usa useSupabaseClient() no setup.
import { getAuthStorageKey, LEGACY_AUTH_STORAGE_KEY } from '~/utils/authStorageKey'

export default defineNuxtPlugin(() => {
  console.log('[Supabase Plugin] Executando plugin no cliente...')
  
  const config = useRuntimeConfig()
  
  console.log('[Supabase Plugin] Config disponível:', {
    hasPublicUrl: !!config.public?.supabaseUrl,
    hasPublicKey: !!config.public?.supabaseAnonKey
  })

  const url = config.public?.supabaseUrl as string
  const anonKey = config.public?.supabaseAnonKey as string

  if (!url || !anonKey) {
    console.error('[Supabase] Variáveis de ambiente ausentes.')
    return
  }

  // Chave por projeto: evita reaproveitar sessão de um projeto Supabase em outro
  const storageKey = getAuthStorageKey(url)

  // Limpa sessão antiga de chave fixa (de antes da migração de projeto),
  // que hoje só geraria 401 por ter sido emitida por outro projeto
  if (storageKey !== LEGACY_AUTH_STORAGE_KEY) {
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
  }

  console.log('[Supabase Plugin] Criando cliente...')
  const supabase = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
      storageKey
    }
  })

  console.log('[Supabase Plugin] Cliente criado com sucesso')

  return {
    provide: {
      supabase
    }
  }
})


