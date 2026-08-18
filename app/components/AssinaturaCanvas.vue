<script setup lang="ts">
/**
 * Campo de assinatura desenhada com o dedo (celular) ou mouse.
 * Equivalente ao campo "ASSINATURA DO ALUNO" do comprovante em papel.
 * Emite a assinatura como data URL (PNG base64).
 */
const emit = defineEmits<{ (e: 'update:modelValue', valor: string | null): void }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const desenhando = ref(false)
const temTraco = ref(false)

let ctx: CanvasRenderingContext2D | null = null
let ultimoX = 0
let ultimoY = 0

function preparar() {
  const canvas = canvasRef.value
  if (!canvas) return

  // Ajusta a resolução interna à densidade da tela, senão o traço fica borrado
  const proporcao = window.devicePixelRatio || 1
  const largura = canvas.offsetWidth
  const altura = canvas.offsetHeight

  canvas.width = largura * proporcao
  canvas.height = altura * proporcao

  ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.scale(proporcao, proporcao)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#111827'
}

function posicao(evento: PointerEvent) {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const area = canvas.getBoundingClientRect()
  return { x: evento.clientX - area.left, y: evento.clientY - area.top }
}

function comecar(evento: PointerEvent) {
  if (!ctx) preparar()
  const { x, y } = posicao(evento)
  desenhando.value = true
  ultimoX = x
  ultimoY = y
  canvasRef.value?.setPointerCapture(evento.pointerId)
}

function mover(evento: PointerEvent) {
  if (!desenhando.value || !ctx) return
  evento.preventDefault()

  const { x, y } = posicao(evento)
  ctx.beginPath()
  ctx.moveTo(ultimoX, ultimoY)
  ctx.lineTo(x, y)
  ctx.stroke()

  ultimoX = x
  ultimoY = y
  temTraco.value = true
}

function terminar(evento: PointerEvent) {
  if (!desenhando.value) return
  desenhando.value = false
  canvasRef.value?.releasePointerCapture?.(evento.pointerId)
  emitirValor()
}

function emitirValor() {
  if (!temTraco.value || !canvasRef.value) {
    emit('update:modelValue', null)
    return
  }
  emit('update:modelValue', canvasRef.value.toDataURL('image/png'))
}

function limpar() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  temTraco.value = false
  emit('update:modelValue', null)
}

defineExpose({ limpar })

onMounted(() => {
  preparar()
  window.addEventListener('resize', preparar)
})

onUnmounted(() => {
  window.removeEventListener('resize', preparar)
})
</script>

<template>
  <div>
    <div class="relative rounded-lg border-2 border-dashed border-border bg-white overflow-hidden">
      <canvas
        ref="canvasRef"
        class="w-full h-40 touch-none cursor-crosshair block"
        @pointerdown="comecar"
        @pointermove="mover"
        @pointerup="terminar"
        @pointerleave="terminar"
        @pointercancel="terminar"
      ></canvas>

      <p
        v-if="!temTraco"
        class="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none"
      >
        Assine aqui com o dedo ou o mouse
      </p>
    </div>

    <button
      type="button"
      @click="limpar"
      class="mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Limpar assinatura
    </button>
  </div>
</template>
