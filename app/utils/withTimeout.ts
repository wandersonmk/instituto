/**
 * Corre uma promise com um prazo máximo. Existe porque o supabase-js usa a
 * Web Locks API (navigator.locks) pra sincronizar renovação de sessão entre
 * abas, e esse lock pode ficar "preso" depois que a aba fica muito tempo em
 * segundo plano/suspensa (o navegador congela a aba no meio de uma renovação
 * e o lock nunca é liberado). Sem timeout, chamadas como
 * `supabase.auth.getSession()` ficam pendentes pra sempre — e como várias
 * telas fazem `await` nelas antes de decidir o que mostrar, o app inteiro
 * trava numa tela de carregamento até o usuário dar F5 (que descarta o
 * contexto JS travado e libera o lock).
 *
 * Usar em qualquer chamada de auth que possa bloquear a navegação ou o boot
 * do app, pra transformar "trava pra sempre" em "falha rápido e segue o
 * fluxo normal (ex: manda pro login)".
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operação'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} excedeu ${ms}ms`))
    }, ms)

    promise
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}
