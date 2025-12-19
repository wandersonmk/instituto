<script setup lang="ts">
import { ref, computed } from 'vue'

const email = ref('')
const password = ref('')
let toast: any
onMounted(async () => {
  toast = await useToastSafe()
})

const { signInWithEmailAndPassword, isLoading, errorMessage } = process.client ? useAuth() : {
  signInWithEmailAndPassword: async () => {},
  isLoading: ref(false),
  errorMessage: ref(null)
}

// Validações em tempo real
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailValid = computed(() => {
  if (!email.value) return true // Não mostra erro se estiver vazio
  return emailRegex.test(email.value)
})

const emailError = computed(() => {
  if (!email.value || isEmailValid.value) return ''
  return 'Email inválido'
})

async function handleLogin() {
  if (!email.value || !password.value) {
    toast?.warning('Preencha todos os campos')
    return
  }
  
  // Validação de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.value)) {
    toast?.error('Digite um email válido')
    return
  }
  
  try {
    console.log('LoginForm: Iniciando login...')
    const result = await signInWithEmailAndPassword(email.value, password.value)
    await new Promise(resolve => setTimeout(resolve, 200))

    // Se login falhou, mostra erro
    if (!result) {
      console.error('LoginForm: Erro no login:', errorMessage.value)
      toast?.error(errorMessage.value || 'Erro ao efetuar login. Verifique seus dados.')
      return
    }

    // Se login OK, mostra sucesso
    const { isAuthenticated, user } = useAuth()
    console.log('LoginForm: Estado atual após delay:', { 
      isAuthenticated: isAuthenticated.value, 
      hasUser: !!user.value,
      email: user.value?.email 
    })

    if (process.client && user.value?.email) {
      localStorage.setItem('user_email', user.value.email)
      console.log('LoginForm: Email salvo no localStorage:', user.value.email)
    }

    // Verificar role do usuário e redirecionar para área correta
    const userRole = user.value?.user_metadata?.role
    console.log('LoginForm: User role:', userRole)
    
    toast?.success('Login realizado com sucesso!')
    
    // Redirecionar baseado no role
    if (userRole === 'aluno') {
      await navigateTo('/aluno')
      console.log('LoginForm: Aluno redirecionado para /aluno')
    } else {
      await navigateTo('/alunos')
      console.log('LoginForm: Admin redirecionado para /alunos')
    }
  } catch (error) {
    console.error('LoginForm: Erro inesperado no login:', error)
    toast?.error('Erro inesperado ao efetuar login.')
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <!-- Card principal -->
    <div class="rounded-xl border border-border/50 bg-secondary p-6 shadow-lg backdrop-blur-sm">
    <div class="space-y-1">
      <h2 class="text-lg font-semibold">Faça login na plataforma</h2>
      <p class="text-sm text-muted-foreground">Acesse sua conta com email e senha</p>
    </div>

    <form @submit.prevent="handleLogin" class="mt-6 space-y-3">
      <div>
        <AppInput
          v-model="email"
          type="email"
          placeholder="Email"
          autocomplete="email"
          required
          :invalid="!!emailError"
          :valid="!!email && isEmailValid"
        />
        <div v-if="emailError" class="text-xs text-red-500 mt-1 px-1">
          {{ emailError }}
        </div>
      </div>
      
      <AppInput
        v-model="password"
        type="password"
        placeholder="Senha"
        autocomplete="current-password"
        required
        :valid="!!password"
      />
      
      <div class="text-right">
        <NuxtLink 
          to="/recuperar-senha" 
          class="text-xs text-foreground/55 hover:text-foreground transition-colors"
        >
          Recuperar senha
        </NuxtLink>
      </div>
      
      <AppButton 
        type="submit" 
        block 
        :disabled="isLoading || !email || !password || !isEmailValid"
      >
        <span v-if="isLoading">Entrando...</span>
        <span v-else>Entrar</span>
      </AppButton>
    </form>
    </div>
  </div>
</template>

<style>
/* Força fundo claro nos inputs do login no tema claro */
.light input[type="email"],
.light input[type="password"] {
  background-color: #f5f5f5 !important;
  border-color: #d0d0d0 !important;
  color: rgb(15 23 42) !important;
}

.light input[type="email"]:hover,
.light input[type="password"]:hover {
  background-color: #ebebeb !important;
  border-color: #c0c0c0 !important;
}

.light input[type="email"]:focus,
.light input[type="password"]:focus {
  background-color: #ffffff !important;
  border-color: rgb(253 215 61) !important;
  box-shadow: 0 0 0 3px rgba(253, 215, 61, 0.1) !important;
}

.light input[type="email"]:-webkit-autofill,
.light input[type="email"]:-webkit-autofill:hover,
.light input[type="email"]:-webkit-autofill:focus,
.light input[type="email"]:-webkit-autofill:active,
.light input[type="password"]:-webkit-autofill,
.light input[type="password"]:-webkit-autofill:hover,
.light input[type="password"]:-webkit-autofill:focus,
.light input[type="password"]:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px #f5f5f5 inset !important;
  box-shadow: 0 0 0 1000px #f5f5f5 inset !important;
  -webkit-text-fill-color: rgb(15 23 42) !important;
  background-color: #f5f5f5 !important;
  background-image: none !important;
  border-color: #d0d0d0 !important;
}

/* Força fundo escuro nos inputs do login no tema escuro */
.dark input[type="email"],
.dark input[type="password"],
:root input[type="email"],
:root input[type="password"] {
  background-color: rgb(38 39 43) !important;
}

.dark input[type="email"]:-webkit-autofill,
.dark input[type="email"]:-webkit-autofill:hover,
.dark input[type="email"]:-webkit-autofill:focus,
.dark input[type="email"]:-webkit-autofill:active,
.dark input[type="password"]:-webkit-autofill,
.dark input[type="password"]:-webkit-autofill:hover,
.dark input[type="password"]:-webkit-autofill:focus,
.dark input[type="password"]:-webkit-autofill:active,
:root input[type="email"]:-webkit-autofill,
:root input[type="email"]:-webkit-autofill:hover,
:root input[type="email"]:-webkit-autofill:focus,
:root input[type="email"]:-webkit-autofill:active,
:root input[type="password"]:-webkit-autofill,
:root input[type="password"]:-webkit-autofill:hover,
:root input[type="password"]:-webkit-autofill:focus,
:root input[type="password"]:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 1000px rgb(38 39 43) inset !important;
  box-shadow: 0 0 0 1000px rgb(38 39 43) inset !important;
  -webkit-text-fill-color: rgb(255 255 255) !important;
  background-color: rgb(38 39 43) !important;
  background-image: none !important;
}
</style>




