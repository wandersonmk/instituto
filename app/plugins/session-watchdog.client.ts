import type { SupabaseClient, Session, User } from '@supabase/supabase-js'
import { withTimeout } from '~/utils/withTimeout'

/**
 * Corrige a tela de carregamento presa que aparece quando a aba fica muito
 * tempo em segundo plano/suspensa (ex: virou o dia com o navegador aberto) e
 * é reaberta. Causa raiz: o supabase-js usa a Web Locks API pra renovar
 * sessão, e esse lock pode ficar preso depois de uma suspensão longa — daí
 * `getSession()` nunca resolve e qualquer tela que depende dele (dashboard,
 * middlewares) fica presa pra sempre. Hoje só um F5 resolve, porque recarregar
 * descarta o contexto JS travado e libera o lock.
 *
 * Este plugin automatiza esse "F5": ao voltar de um período longo em segundo
 * plano, confere a sessão com prazo curto. Se confirmar sessão válida, só
 * sincroniza o estado em memória (usuário continua logado, sem interrupção).
 * Se a checagem travar/expirar ou não bater com o que a tela acha que está
 * logado, recarrega a página — o boot novo resolve certo (mantém logado se a
 * sessão for válida, ou manda pro /login se tiver expirado de verdade).
 */
export default defineNuxtPlugin(() => {
  if (!process.client) return

  const HIDDEN_THRESHOLD_MS = 2 * 60 * 1000 // só vale a pena checar se ficou escondida por >= 2min
  const RELOAD_GUARD_KEY = 'session-watchdog:last-reload'
  const RELOAD_GUARD_MIN_GAP_MS = 30 * 1000 // evita loop de reload se algo estiver realmente quebrado

  let hiddenAt: number | null = null

  const podeRecarregar = () => {
    try {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0')
      return Date.now() - last > RELOAD_GUARD_MIN_GAP_MS
    } catch {
      return true
    }
  }

  const recarregar = () => {
    try {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
    } catch {
      // sessionStorage indisponível não deve impedir o reload
    }
    window.location.reload()
  }

  const handleVisibilityChange = async () => {
    if (document.hidden) {
      hiddenAt = Date.now()
      return
    }

    const ficouEscondidaMuitoTempo = hiddenAt !== null && (Date.now() - hiddenAt) >= HIDDEN_THRESHOLD_MS
    hiddenAt = null
    if (!ficouEscondidaMuitoTempo) return

    const nuxtApp = useNuxtApp()
    const supabase = nuxtApp.$supabase as SupabaseClient | undefined
    if (!supabase) return

    const user = useState<User | null>('auth_user', () => null)
    const session = useState<Session | null>('auth_session', () => null)
    const achavaQueEstavaLogado = !!user.value

    try {
      const { data, error } = await withTimeout(supabase.auth.getSession(), 4000, 'getSession watchdog')

      if (error || !data.session) {
        // Achava que estava logado mas a sessão real sumiu/expirou: recarrega
        // pra cair no fluxo normal de redirecionar pro /login.
        if (achavaQueEstavaLogado && podeRecarregar()) recarregar()
        return
      }

      // Sessão válida: sincroniza o estado em memória sem recarregar, pra
      // não interromper o que o usuário estava fazendo.
      user.value = data.session.user
      session.value = data.session
    } catch {
      // Timeout: o lock ficou preso mesmo. Só um reload libera.
      if (podeRecarregar()) recarregar()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
})
