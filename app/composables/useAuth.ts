import { ref, computed, readonly } from 'vue'
import type { User, Session } from '@supabase/supabase-js'
import { useSupabaseClient } from './useSupabaseClient'

// Composable simples de autenticação
export function useAuth() {
  // Estados globais compartilhados (criados pelo plugin auth.client.ts)
  const user = useState<User | null>('auth_user', () => null)
  const session = useState<Session | null>('auth_session', () => null)
  const isLoading = useState<boolean>('auth_loading', () => process.server ? false : true)
  const errorMessage = ref<string | null>(null)

  // Computed para verificar se está autenticado
  const isAuthenticated = computed(() => !!user.value && !!session.value)

  // Obtém o aluno Supabase apenas no lado do aluno
  const getSupabase = () => {
    if (process.server) return null
    return useSupabaseClient()
  }

  // Funções básicas
  const signInWithEmailAndPassword = async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) return false
    
    isLoading.value = true
    errorMessage.value = null
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      user.value = data.user
      session.value = data.session
      return data.user
    } catch (err: any) {
      errorMessage.value = String(err?.message || err)
      return false
    } finally {
      isLoading.value = false
    }
  }
  const signUp = async ({ name, companyName, email, password }: { name: string, companyName: string, email: string, password: string }) => {
    const supabase = getSupabase()
    if (!supabase) return false
    
    isLoading.value = true
    errorMessage.value = null
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      if (error) throw error
      // Registrar usuário na tabela usuarios
      await supabase.from('usuarios').insert({
        nome: name,
        empresa: companyName,
        email: email,
        perfil: 'admin'
      })
      return data.user
    } catch (err: any) {
      errorMessage.value = String(err?.message || err)
      return false
    } finally {
      isLoading.value = false
    }
  }
  const signOut = async () => {}
  const reloadSession = async () => {}
  const clearError = () => { errorMessage.value = null }

  return {
    user: readonly(user),
    session: readonly(session),
    isAuthenticated: readonly(isAuthenticated),
    isLoading: readonly(isLoading),
    errorMessage: readonly(errorMessage),
    signInWithEmailAndPassword,
    signUp,
    signOut,
    reloadSession,
    clearError
  }
}