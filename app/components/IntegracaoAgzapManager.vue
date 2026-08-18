<script setup lang="ts">
const { buscarConfiguracao, salvarToken, enviarTeste } = useNotificacoesWhatsapp()

const isLoading = ref(true)
const salvando = ref(false)
const mostrarModal = ref(false)

const tokenSalvo = ref<string | null>(null)
const tokenCampo = ref('')
const mostrarToken = ref(false)

const conectado = computed(() => !!tokenSalvo.value)

async function carregar() {
  isLoading.value = true
  try {
    const config = await buscarConfiguracao()
    tokenSalvo.value = config?.whatsappToken || null
    tokenCampo.value = tokenSalvo.value || ''
  } catch (e: any) {
    const toast = await useToastSafe()
    toast?.error(e?.message || 'Erro ao carregar a integração')
  } finally {
    isLoading.value = false
  }
}

function abrirModal() {
  tokenCampo.value = tokenSalvo.value || ''
  resultadoTeste.value = null
  mostrarModal.value = true
}

async function salvar() {
  salvando.value = true
  const toast = await useToastSafe()
  try {
    await salvarToken(tokenCampo.value)
    tokenSalvo.value = tokenCampo.value.trim() || null
    toast?.success(tokenSalvo.value ? 'Token salvo — integração conectada!' : 'Token removido.')
  } catch (e: any) {
    toast?.error(e?.message || 'Erro ao salvar o token')
  } finally {
    salvando.value = false
  }
}

// -------------------------------------------------------------- testar envio

const numeroTeste = ref('')
const mensagemTeste = ref('Olá! Esta é uma mensagem de teste do Instituto Fios de Ouro. 💛')
const enviandoTeste = ref(false)
const resultadoTeste = ref<{ ok: boolean; texto: string } | null>(null)

/**
 * Máscara de telefone BR — só dígitos, no máximo 11 (DDD + celular/fixo),
 * que é exatamente o que a Agzap aceita: normalizar_telefone_whatsapp() e
 * a rota /api/whatsapp/testar tiram tudo que não é dígito e, se sobrar até
 * 11, prefixam "55" (código do Brasil) por conta própria — então nem faz
 * sentido deixar digitar "+55" ou qualquer outra coisa aqui na frente.
 */
function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) return digitos ? `(${digitos}` : ''
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

function handleNumeroTesteInput(event: Event) {
  numeroTeste.value = formatarTelefone((event.target as HTMLInputElement).value)
}

// DDD (2) + fixo (8) ou celular (9) = 10 ou 11 dígitos — mesma regra que o
// backend usa pra decidir se o número já está completo.
const numeroTesteValido = computed(() => {
  const digitos = numeroTeste.value.replace(/\D/g, '')
  return digitos.length === 10 || digitos.length === 11
})

async function testar() {
  if (!numeroTesteValido.value || !mensagemTeste.value.trim()) return
  enviandoTeste.value = true
  resultadoTeste.value = null

  const resposta = await enviarTeste(numeroTeste.value, mensagemTeste.value)
  resultadoTeste.value = resposta.success
    ? { ok: true, texto: 'Mensagem enviada com sucesso! Confira o WhatsApp do número testado.' }
    : { ok: false, texto: resposta.erro || 'Não foi possível enviar a mensagem.' }

  enviandoTeste.value = false
}

onMounted(carregar)
</script>

<template>
  <div>
    <!-- Grade de conectores — hoje só a Agzap, mas já preparada pra receber
         outras integrações no mesmo padrão de card resumido + clique pra abrir. -->
    <div v-if="isLoading" class="p-8 text-center text-sm text-muted-foreground">Carregando...</div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <button
        @click="abrirModal"
        class="text-left bg-card border border-border/70 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
      >
        <div class="flex items-start justify-between gap-2 mb-3">
          <!-- Logo é um logotipo largo (não um ícone quadrado) — mostra no
               tamanho natural dela, trocando de versão conforme o tema, em
               vez de espremer numa caixinha quadrada. -->
          <div class="h-6 flex items-center flex-shrink-0">
            <img src="/logo.modoClaro.png" alt="Agzap" class="h-full w-auto object-contain block dark:hidden" />
            <img src="/logo.wrn.png" alt="Agzap" class="h-full w-auto object-contain hidden dark:block" />
          </div>
          <span
            class="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-full border flex-shrink-0"
            :class="conectado
              ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300'
              : 'border-border bg-muted/40 text-muted-foreground'"
          >
            <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="conectado ? 'bg-emerald-500' : 'bg-muted-foreground/50'"></span>
            {{ conectado ? 'Conectado' : 'Configurar' }}
          </span>
        </div>

        <p class="text-xs text-muted-foreground leading-snug">
          Envio de lembretes e mensagens por WhatsApp
        </p>

        <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/70">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-muted text-muted-foreground">
            <Icon icon="whatsapp" class-name="w-3 h-3" fallback="💬" />
            WHATSAPP
          </span>
          <span class="text-xs font-medium text-amber-600 dark:text-primary">
            {{ conectado ? 'Gerenciar' : 'Conectar' }} →
          </span>
        </div>
      </button>
    </div>

    <!-- Modal de configuração -->
    <Transition name="fade">
      <div
        v-if="mostrarModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        @click="mostrarModal = false"
      >
        <div class="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl" @click.stop>
          <div class="flex items-center gap-3 px-5 py-4 border-b border-border/70">
            <div class="h-7 flex items-center flex-shrink-0">
              <img src="/logo.modoClaro.png" alt="Agzap" class="h-full w-auto object-contain block dark:hidden" />
              <img src="/logo.wrn.png" alt="Agzap" class="h-full w-auto object-contain hidden dark:block" />
            </div>
            <div class="min-w-0">
              <h2 class="text-sm font-semibold text-foreground leading-tight">Enviar mensagem via Agzap</h2>
              <p class="text-xs text-muted-foreground leading-tight">Conector de WhatsApp usado pelos lembretes automáticos</p>
            </div>
            <button @click="mostrarModal = false" class="ml-auto p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
              <Icon icon="xmark" class-name="w-4 h-4 text-muted-foreground" fallback="✕" />
            </button>
          </div>

          <div class="p-5">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
              <!-- Coluna esquerda: identidade + token -->
              <div class="space-y-4">
                <div class="flex items-center justify-center py-4 px-4 rounded-xl bg-muted/30 border border-border/70">
                  <img src="/logo.modoClaro.png" alt="Agzap" class="h-8 block dark:hidden" />
                  <img src="/logo.wrn.png" alt="Agzap" class="h-8 hidden dark:block" />
                </div>

                <div>
                  <label class="block text-xs font-semibold text-foreground mb-1.5">Token da instância</label>
                  <div class="relative">
                    <input
                      v-model="tokenCampo"
                      :type="mostrarToken ? 'text' : 'password'"
                      placeholder="Cole aqui o token fornecido pela Agzap"
                      class="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      @click="mostrarToken = !mostrarToken"
                      class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      :title="mostrarToken ? 'Ocultar' : 'Mostrar'"
                    >
                      <Icon :icon="mostrarToken ? 'eye-slash' : 'eye'" class-name="w-4 h-4" :fallback="mostrarToken ? '🙈' : '👁'" />
                    </button>
                  </div>
                  <p class="text-[11px] text-muted-foreground mt-1.5">
                    Esse é o único dado necessário — qualquer número conectado na Agzap pode ser usado.
                  </p>
                </div>

                <button
                  @click="salvar"
                  :disabled="salvando || tokenCampo === (tokenSalvo || '')"
                  class="w-full py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {{ salvando ? 'Salvando...' : 'Salvar token' }}
                </button>
              </div>

              <!-- Coluna direita: testar envio -->
              <div class="p-4 rounded-xl bg-muted/30 border border-border/70">
                <p class="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <Icon icon="paper-plane" class-name="w-3.5 h-3.5 text-muted-foreground" fallback="📤" />
                  Testar envio de mensagem
                </p>

                <div class="space-y-2.5">
                  <div>
                    <label class="block text-[11px] text-muted-foreground mb-1">Número (com DDD)</label>
                    <input
                      :value="numeroTeste"
                      @input="handleNumeroTesteInput"
                      type="tel"
                      inputmode="numeric"
                      autocomplete="off"
                      maxlength="15"
                      placeholder="(11) 91234-5678"
                      class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      :class="numeroTeste && !numeroTesteValido ? 'border-red-300 dark:border-red-800/60 focus:ring-red-400/40' : ''"
                    />
                    <p v-if="numeroTeste && !numeroTesteValido" class="text-[11px] text-red-600 dark:text-red-400 mt-1">
                      Informe DDD + número (10 ou 11 dígitos).
                    </p>
                  </div>
                  <div>
                    <label class="block text-[11px] text-muted-foreground mb-1">Mensagem</label>
                    <textarea
                      v-model="mensagemTeste"
                      rows="3"
                      maxlength="300"
                      class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                    ></textarea>
                  </div>

                  <button
                    @click="testar"
                    :disabled="!conectado || enviandoTeste || !numeroTesteValido || !mensagemTeste.trim()"
                    class="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Icon icon="paper-plane" class-name="w-4 h-4" fallback="📤" />
                    {{ enviandoTeste ? 'Enviando...' : 'Enviar teste' }}
                  </button>

                  <p v-if="!conectado" class="text-[11px] text-muted-foreground text-center">
                    Salve o token ao lado antes de testar o envio.
                  </p>

                  <div
                    v-if="resultadoTeste"
                    class="text-xs rounded-lg px-3 py-2.5 flex items-start gap-2"
                    :class="resultadoTeste.ok
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                      : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40'"
                  >
                    <Icon :icon="resultadoTeste.ok ? 'check-circle' : 'exclamation-circle'" class-name="w-3.5 h-3.5 mt-0.5 flex-shrink-0" :fallback="resultadoTeste.ok ? '✓' : '⚠'" />
                    <span>{{ resultadoTeste.texto }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }
</style>
