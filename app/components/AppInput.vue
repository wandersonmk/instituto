<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  valid?: boolean
  readonly?: boolean
  autocomplete?: string
  name?: string
  id?: string
}>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  invalid: false,
  valid: false,
  readonly: false,
  autocomplete: 'off',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const showPassword = ref(false)

const isPasswordField = computed(() => props.type === 'password')
const inputType = computed(() => {
  if (isPasswordField.value) {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="relative">
    <input
      :id="props.id"
      :name="props.name"
      :type="inputType"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :autocomplete="props.autocomplete"
      @input="onInput"
      class="w-full rounded-md text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed border px-3 py-2"
      :class="{ 
        'border-destructive ring-destructive focus-visible:ring-destructive': props.invalid,
        'border-green-500 ring-green-500 focus-visible:ring-green-500': props.valid && !props.invalid,
        'border-input focus-visible:ring-primary': !props.invalid && !props.valid,
        'pr-10': isPasswordField
      }"
    />
    
    <!-- Botão do olho para campos de senha -->
    <button
      v-if="isPasswordField"
      type="button"
      @click="togglePasswordVisibility"
      class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
      :disabled="props.disabled"
    >
      <!-- Ícone de olho fechado -->
      <svg
        v-if="!showPassword"
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
      </svg>
      
      <!-- Ícone de olho aberto/cortado -->
      <svg
        v-else
        class="h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>
      </svg>
    </button>
  </div>
</template>

<style>
/* Estilos para modo claro */
html.light input,
html.light input[type="text"],
html.light input[type="email"],
html.light input[type="password"],
html.light input[type="tel"],
html.light input:hover,
html.light input:focus,
html.light input:active {
  background-color: #f5f5f5 !important;
  border-color: #d0d0d0 !important;
  color: rgb(15 23 42) !important;
}

html.light input:hover,
html.light input[type="text"]:hover,
html.light input[type="email"]:hover,
html.light input[type="password"]:hover,
html.light input[type="tel"]:hover {
  background-color: #ebebeb !important;
  border-color: #c0c0c0 !important;
}

html.light input:focus,
html.light input[type="text"]:focus,
html.light input[type="email"]:focus,
html.light input[type="password"]:focus,
html.light input[type="tel"]:focus {
  background-color: #ffffff !important;
  border-color: rgb(253 215 61) !important;
  box-shadow: 0 0 0 3px rgba(253, 215, 61, 0.1) !important;
}

html.light input:-webkit-autofill,
html.light input[type="text"]:-webkit-autofill,
html.light input[type="email"]:-webkit-autofill,
html.light input[type="password"]:-webkit-autofill,
html.light input[type="tel"]:-webkit-autofill,
html.light input:-webkit-autofill:hover,
html.light input:-webkit-autofill:focus,
html.light input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #f5f5f5 inset !important;
  box-shadow: 0 0 0 1000px #f5f5f5 inset !important;
  -webkit-text-fill-color: rgb(15 23 42) !important;
  background-color: #f5f5f5 !important;
  background-image: none !important;
  border-color: #d0d0d0 !important;
}

/* Estilos para modo escuro */
:global(html.dark) input,
:global(html:not(.light)) input,
:global(.dark) input,
:global(:root:not(.light)) input {
  background-color: rgb(38 39 43) !important;
  border-color: rgb(63 63 70) !important;
  color: rgb(255 255 255) !important;
}

:global(html.dark) input:hover,
:global(html:not(.light)) input:hover,
:global(.dark) input:hover,
:global(:root:not(.light)) input:hover {
  background-color: rgb(38 39 43) !important;
}

:global(html.dark) input:focus,
:global(html:not(.light)) input:focus,
:global(.dark) input:focus,
:global(:root:not(.light)) input:focus {
  background-color: rgb(38 39 43) !important;
}

:global(html.dark) input:-webkit-autofill,
:global(html.dark) input:-webkit-autofill:hover,
:global(html.dark) input:-webkit-autofill:focus,
:global(html.dark) input:-webkit-autofill:active,
:global(html:not(.light)) input:-webkit-autofill,
:global(html:not(.light)) input:-webkit-autofill:hover,
:global(html:not(.light)) input:-webkit-autofill:focus,
:global(html:not(.light)) input:-webkit-autofill:active,
:global(.dark) input:-webkit-autofill,
:global(.dark) input:-webkit-autofill:hover,
:global(.dark) input:-webkit-autofill:focus,
:global(.dark) input:-webkit-autofill:active,
:global(:root:not(.light)) input:-webkit-autofill,
:global(:root:not(.light)) input:-webkit-autofill:hover,
:global(:root:not(.light)) input:-webkit-autofill:focus,
:global(:root:not(.light)) input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(38 39 43) inset !important;
  box-shadow: 0 0 0 1000px rgb(38 39 43) inset !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  background-color: rgb(38 39 43) !important;
  background-image: none !important;
}
</style>


