// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import { dirname, resolve as resolvePath } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  ssr: true,
  app: {
    head: {
      script: [
        {
          // Aplica a classe de tema (dark/light) ANTES da página pintar,
          // direto no <html>, lendo o valor salvo no localStorage. Isso
          // evita qualquer corrida entre plugins/componentes: quando o Vue
          // monta, a classe correta já está lá — ninguém mais precisa
          // decidir isso de novo.
          //
          // A chave é isolada por área (admin/aluno/professor), decidida
          // pelo prefixo da URL — assim escolher escuro na área do aluno
          // não muda o painel do professor nem o administrativo, e vice-versa.
          // Se a chave da área ainda não existe, aproveita a antiga 'theme'
          // (era compartilhada) só como valor inicial, pra não resetar tema
          // de quem já tinha escolhido antes dessa mudança.
          innerHTML: `(function(){try{var p=location.pathname;var area=p.indexOf('/aluno')===0?'aluno':(p.indexOf('/professor')===0?'professor':'admin');var key='theme-'+area;var t=localStorage.getItem(key);if(t===null)t=localStorage.getItem('theme');var c=t==='light'?'light':'dark';var h=document.documentElement;h.classList.remove(c==='light'?'dark':'light');h.classList.add(c);}catch(e){document.documentElement.classList.add('dark');}})();`,
          type: 'text/javascript'
        }
      ]
    }
  },
  tailwindcss: {
    cssPath: resolvePath(__dirname, 'assets/css/tailwind.css')
  },
  css: ['@fortawesome/fontawesome-svg-core/styles.css'],
  routeRules: {
    '/aluno/**': { ssr: false },
    '/login': { ssr: false },
    // Estas páginas usam o cliente Supabase direto no setup, que só existe no
    // navegador (useSupabaseClient lança erro no servidor). Sem isto o SSR
    // aborta o setup e o template renderiza com os refs indefinidos.
    '/professor/**': { ssr: false },
    '/professor': { ssr: false },
    '/professores': { ssr: false },
    '/relatorio-aulas': { ssr: false },
    '/avaliacoes': { ssr: false },
    '/indicacoes': { ssr: false },
  },
  runtimeConfig: {
    // Chaves privadas (apenas servidor)
    supabaseServiceKey: process.env.NUXT_SUPABASE_SERVICE_ROLE_KEY,
    
    // Chaves públicas
    public: {
      supabaseUrl:
        process.env.NUXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL,
      supabaseAnonKey:
        process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY
    }
  }
})