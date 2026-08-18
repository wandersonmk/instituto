/**
 * `avaliacoes_aulas.presenca_id` tem constraint UNIQUE — então, ao embedar
 * `avaliacoes_aulas(id)` a partir de `presencas` (`.select('...,avaliacoes_aulas(id)')`),
 * o PostgREST entende a relação como 1-para-1 e devolve um OBJETO único
 * (`{ id: '...' }`) ou `null`, nunca um array. Checar `?.length` nesse valor
 * sempre dá `undefined` quando existe avaliação (objeto não tem `.length`),
 * fazendo aulas JÁ avaliadas parecerem sempre pendentes — bug real que já
 * aconteceu 3x neste app (sino de notificações, ícone ⭐ do card de curso,
 * botão da aula do dia). Use esta função em vez de checar `.length` direto.
 */
export function temAvaliacao(campo: unknown): boolean {
  if (!campo) return false
  return Array.isArray(campo) ? campo.length > 0 : true
}
