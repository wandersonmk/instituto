<template>
  <button
    @click="toggleTheme"
    class="p-2 rounded-lg border border-border/50 bg-secondary/50 hover:bg-secondary transition-colors"
    :title="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
  >
    <!-- Ícone de sol (tema claro) -->
    <svg
      v-if="isDark"
      class="w-5 h-5 text-foreground/70"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>

    <!-- Ícone de lua (tema escuro) -->
    <svg
      v-else
      class="w-5 h-5 text-foreground/70"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

// Um script no <head> (nuxt.config.ts) já aplicou a classe correta no
// <html> antes desta página pintar, lendo o localStorage da área certa. Por
// isso basta ler o estado que já está no DOM aqui — não há necessidade de
// assumir um valor "padrão" e corrigir depois no onMounted, o que
// eliminava a janela de corrida entre esse componente e o plugin de tema.
const isDark = ref(!(process.client && document.documentElement.classList.contains('light')))

// Cada área (admin/aluno/professor) guarda sua própria escolha de tema, na
// mesma chave que o script do <head> usa — assim escolher escuro no painel
// do aluno não muda o painel do professor nem o administrativo.
const route = useRoute()
const chaveTema = computed(() => {
  const caminho = route.path
  const area = caminho.startsWith('/aluno') ? 'aluno' : caminho.startsWith('/professor') ? 'professor' : 'admin'
  return `theme-${area}`
})

// Única função que decide o tema: define a classe no <html> e persiste no
// localStorage no mesmo lugar, evitando dois pontos do código escrevendo o
// mesmo estado em momentos diferentes.
function aplicarTema(dark: boolean) {
  isDark.value = dark
  if (!process.client) return

  const html = document.documentElement
  if (dark) {
    html.classList.add('dark')
    html.classList.remove('light')
    localStorage.setItem(chaveTema.value, 'dark')
  } else {
    html.classList.add('light')
    html.classList.remove('dark')
    localStorage.setItem(chaveTema.value, 'light')
  }
}

function toggleTheme() {
  aplicarTema(!isDark.value)
}
</script>
