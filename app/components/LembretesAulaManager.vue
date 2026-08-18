<script setup lang="ts">
const { buscarConfiguracao, salvarLembreteAula } = useNotificacoesWhatsapp()

const isLoading = ref(true)
const salvando = ref(false)

const ativo = ref(false)
const antecedencias = ref<number[]>([1440])
const template = ref('')

// Fora do template de propósito: escrever "{{nome}}" dentro de uma
// interpolação Vue ({{ '{{nome}}' }}) confunde o parser (chaves aninhadas).
const variaveisDisponiveis = ['{{nome}}', '{{curso}}', '{{hora}}']

// Guarda o que veio do banco pra saber se há mudança não salva
const original = ref({ ativo: false, antecedencias: [1440] as number[], template: '' })
const alterado = computed(() =>
  ativo.value !== original.value.ativo ||
  template.value !== original.value.template ||
  antecedencias.value.length !== original.value.antecedencias.length ||
  antecedencias.value.some(v => !original.value.antecedencias.includes(v))
)

function alternarAntecedencia(valor: number) {
  if (antecedencias.value.includes(valor)) {
    antecedencias.value = antecedencias.value.filter(v => v !== valor)
  } else {
    antecedencias.value = [...antecedencias.value, valor].sort((a, b) => a - b)
  }
}

async function carregar() {
  isLoading.value = true
  try {
    const config = await buscarConfiguracao()
    if (config) {
      ativo.value = config.lembreteAulaAtivo
      antecedencias.value = [...config.lembreteAulaAntecedenciasMinutos]
      template.value = config.lembreteAulaTemplate
      original.value = { ativo: ativo.value, antecedencias: [...antecedencias.value], template: template.value }
    }
  } catch (e: any) {
    const toast = await useToastSafe()
    toast?.error(e?.message || 'Erro ao carregar as configurações de lembrete')
  } finally {
    isLoading.value = false
  }
}

async function salvar() {
  if (ativo.value && antecedencias.value.length === 0) {
    const toast = await useToastSafe()
    toast?.error('Escolha pelo menos uma antecedência para ativar o lembrete')
    return
  }

  salvando.value = true
  const toast = await useToastSafe()
  try {
    await salvarLembreteAula({ ativo: ativo.value, antecedenciasMinutos: antecedencias.value, template: template.value })
    original.value = { ativo: ativo.value, antecedencias: [...antecedencias.value], template: template.value }
    toast?.success('Configuração de lembrete salva!')
  } catch (e: any) {
    toast?.error(e?.message || 'Erro ao salvar')
  } finally {
    salvando.value = false
  }
}

const previaTexto = computed(() =>
  template.value
    .replaceAll('{{nome}}', 'Maria')
    .replaceAll('{{curso}}', 'Design de Sobrancelhas')
    .replaceAll('{{hora}}', '14:00')
)
const previaHtml = computed(() => formatarComoWhatsapp(previaTexto.value))

onMounted(carregar)
</script>

<template>
  <div class="bg-card border border-border/70 rounded-2xl shadow-sm">
    <div class="flex items-center gap-3 px-5 py-4 border-b border-border/70">
      <div class="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20 ring-1 ring-inset ring-white/10">
        <Icon icon="bell" class-name="w-4 h-4 text-white" fallback="🔔" />
      </div>
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-foreground leading-tight">Lembrete de Aula</h2>
        <p class="text-xs text-muted-foreground leading-tight">Avisa o aluno por WhatsApp antes do horário da aula</p>
      </div>
      <span
        class="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border flex-shrink-0"
        :class="ativo
          ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300'
          : 'border-border bg-muted/40 text-muted-foreground'"
      >
        <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="ativo ? 'bg-emerald-500' : 'bg-muted-foreground/50'"></span>
        {{ ativo ? 'Ativo' : 'Desativado' }}
      </span>
    </div>

    <div v-if="isLoading" class="p-8 text-center text-sm text-muted-foreground">Carregando...</div>

    <div v-else class="p-5">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4">
        <!-- Coluna esquerda: quando enviar -->
        <div class="space-y-4">
          <label class="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/70 cursor-pointer">
            <span class="text-sm font-medium text-foreground">Enviar lembrete de aula automaticamente</span>
            <button
              type="button"
              role="switch"
              :aria-checked="ativo"
              @click="ativo = !ativo"
              class="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              :class="ativo ? 'bg-emerald-500' : 'bg-muted-foreground/30'"
            >
              <span
                class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                :class="ativo ? 'translate-x-5' : 'translate-x-0'"
              ></span>
            </button>
          </label>

          <!-- Antecedências: seleção múltipla via chips, não uma escolha só -->
          <div>
            <label class="block text-xs font-semibold text-foreground mb-1.5">
              Enviar com quanto tempo de antecedência
              <span class="text-muted-foreground font-normal">(pode marcar mais de uma)</span>
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="op in OPCOES_ANTECEDENCIA"
                :key="op.valor"
                type="button"
                @click="alternarAntecedencia(op.valor)"
                class="px-3 py-1.5 text-xs font-medium rounded-full border transition-all"
                :class="antecedencias.includes(op.valor)
                  ? 'border-primary bg-primary/10 text-amber-700 dark:text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'"
              >
                <Icon
                  v-if="antecedencias.includes(op.valor)"
                  icon="check"
                  class-name="w-3 h-3 inline mr-1"
                  fallback="✓"
                />
                {{ op.rotulo }}
              </button>
            </div>
            <p v-if="ativo && antecedencias.length === 0" class="text-[11px] text-red-600 dark:text-red-400 mt-1.5">
              Escolha ao menos uma antecedência.
            </p>
            <p v-else-if="antecedencias.length > 1" class="text-[11px] text-muted-foreground mt-1.5">
              O aluno vai receber {{ antecedencias.length }} lembretes pra cada aula.
            </p>
          </div>
        </div>

        <!-- Coluna direita: o que enviar -->
        <div>
          <label class="block text-xs font-semibold text-foreground mb-1.5">Mensagem enviada ao aluno</label>
          <textarea
            v-model="template"
            rows="5"
            maxlength="500"
            class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          ></textarea>
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-1.5">
            <p class="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1">
              Variáveis:
              <code
                v-for="v in variaveisDisponiveis"
                :key="v"
                class="px-1 py-0.5 rounded bg-muted text-foreground"
              >{{ v }}</code>
            </p>
            <p class="text-[11px] text-muted-foreground">
              Formatação: <code class="px-1 py-0.5 rounded bg-muted text-foreground">*negrito*</code>
              <code class="px-1 py-0.5 rounded bg-muted text-foreground ml-1">_itálico_</code>
              <code class="px-1 py-0.5 rounded bg-muted text-foreground ml-1">~tachado~</code>
            </p>
          </div>

          <!-- Prévia: simula a bolha de mensagem do WhatsApp, com a
               formatação (negrito/itálico/tachado) e quebras de linha
               renderizadas de verdade — não só o texto cru. -->
          <div class="mt-3 p-4 rounded-xl bg-[#e5ddd5] dark:bg-[#0b141a]">
            <p class="text-[11px] font-semibold text-foreground/60 mb-2 flex items-center gap-1.5">
              <Icon icon="eye" class-name="w-3 h-3" fallback="👁" />
              Prévia — como chega no WhatsApp
            </p>
            <div class="inline-block max-w-full rounded-lg rounded-tl-none bg-[#dcf8c6] dark:bg-[#005c4b] px-3 py-2 shadow-sm">
              <p class="text-sm text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words" v-html="previaHtml"></p>
            </div>
          </div>
        </div>
      </div>

      <button
        @click="salvar"
        :disabled="!alterado || salvando"
        class="w-full mt-5 py-2.5 rounded-xl font-semibold text-sm text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {{ salvando ? 'Salvando...' : 'Salvar' }}
      </button>
    </div>
  </div>
</template>
