import type { SupabaseClient, User, Session } from '@supabase/supabase-js'
// Import explícito (mesmo motivo do supabase.client.ts): se o auto-import
// falhar aqui, o plugin inteiro lança e loading fica preso em true.
import { withTimeout } from '~/utils/withTimeout'

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
      
      // Verificar se existe uma sessão salva. Com timeout: getSession() usa
      // um lock (navigator.locks) que pode ficar preso depois da aba passar
      // muito tempo suspensa — sem prazo máximo, loading nunca vira false e
      // a tela de carregamento fica presa pra sempre (só F5 resolve). Em
      // try/catch próprio pra não pular o registro do onAuthStateChange
      // logo abaixo caso essa chamada específica falhe/estoure o prazo.
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 5000, 'getSession inicial')

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
      } catch (sessionError) {
        // Timeout ou lock preso: trata como "sem sessão confirmada" e segue
        // o boot — as telas protegidas vão exigir login normalmente.
        console.error('[Auth Plugin] getSession travou/expirou:', sessionError)
        user.value = null
        session.value = null
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
