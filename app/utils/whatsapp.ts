/**
 * Renderiza texto com a formatação que o próprio WhatsApp usa
 * (*negrito*, _itálico_, ~tachado~, ```monoespaçado```) como HTML, pra
 * mostrar uma prévia fiel de como a mensagem chega pro aluno.
 *
 * Escapa HTML antes de aplicar a formatação — o texto vem de um campo que o
 * admin digita livremente, então isso evita que algo digitado ali vire
 * marcação HTML de verdade quando exibido com v-html.
 */
export function formatarComoWhatsapp(texto: string): string {
  let s = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Ordem importa: monoespaçado antes pra não deixar * _ ~ dentro dele virarem formatação
  s = s.replace(/```([^`\n]+)```/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10">$1</code>')
  s = s.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
  s = s.replace(/_([^_\n]+)_/g, '<em>$1</em>')
  s = s.replace(/~([^~\n]+)~/g, '<s>$1</s>')

  return s
}
