import type { SupabaseClient, User, Session } from '@supabase/supabase-js'

export default defineNuxtPlugin(async () => {
  // Só executa no cliente
  if (process.client) {
    // Obter estados existentes ou criar novos
    const user = useState<User | null>('auth_user', () => null)
    const session = useState<Session | null>('auth_session', () => null)
    const loading = useState<boolean>('auth_loading', () => true)
    
    try {
      const nuxtApp = useNuxtApp()
      
      // Aguardar Supabase estar disponível (com retry rápido)
      let supabase = nuxtApp.$supabase as SupabaseClient | undefined
      let retries = 0
      
      while (!supabase && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 50))
        supabase = nuxtApp.$supabase as SupabaseClient | undefined
        retries++
      }
      
      if (!supabase) {
        console.error('[Auth Plugin] Supabase não disponível após tentativas')
        loading.value = false
        return
      }
      
      // Verificar se existe uma sessão salva
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[Auth Plugin] Erro ao obter sessão:', error)
        
        // Se o erro é de refresh token inválido, limpar tudo
        if (error.message?.includes('Refresh Token')) {
          localStorage.clear()
          user.value = null
          session.value = null
        }
      } else {
        // Atualizar o estado com a sessão atual
        if (data.session) {
          user.value = data.session.user
          session.value = data.session
        } else {
          user.value = null
          session.value = null
        }
      }
      
      loading.value = false
      
      // Escutar mudanças de autenticação
      supabase.auth.onAuthStateChange((event: any, newSession: Session | null) => {
        user.value = newSession?.user ?? null
        session.value = newSession
      })
      
    } catch (error) {
      console.error('[Auth Plugin] Erro ao inicializar:', error)
      user.value = null
      session.value = null
      loading.value = false
    }
  }
})
