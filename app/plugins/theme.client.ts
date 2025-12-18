export default defineNuxtPlugin(() => {
  if (process.client) {
    // Verifica o tema salvo no localStorage
    const savedTheme = localStorage.getItem('theme')
    const html = document.documentElement
    
    if (savedTheme === 'light') {
      html.classList.add('light')
      html.classList.remove('dark')
    } else {
      // Padrão: tema escuro
      html.classList.add('dark')
      html.classList.remove('light')
    }
  }
})
