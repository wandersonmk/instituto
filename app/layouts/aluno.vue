<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="bg-card border-b border-border sticky top-0 z-40">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Icon icon="graduation-cap" class-name="w-6 h-6 text-white" fallback="🎓" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-foreground">Área do Aluno</h1>
            <p class="text-xs text-muted-foreground">{{ userNome }}</p>
          </div>
        </div>
        
        <button
          @click="sair"
          class="flex items-center space-x-2 px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
        >
          <Icon icon="sign-out-alt" class-name="w-4 h-4" fallback="" />
          <span>Sair</span>
        </button>
      </div>
    </header>
    
    <!-- Navigation -->
    <nav class="bg-card border-b border-border">
      <div class="container mx-auto px-4">
        <div class="flex space-x-1 overflow-x-auto">
          <NuxtLink
            to="/aluno"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            :class="$route.path === '/aluno' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          >
            <Icon icon="home" class-name="w-4 h-4 inline mr-2" fallback="🏠" />
            Dashboard
          </NuxtLink>
          
          <NuxtLink
            to="/aluno/indicacoes"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            :class="$route.path === '/aluno/indicacoes' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          >
            <Icon icon="handshake" class-name="w-4 h-4 inline mr-2" fallback="🤝" />
            Minhas Indicações
          </NuxtLink>
          
          <NuxtLink
            to="/aluno/aulas"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            :class="$route.path === '/aluno/aulas' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'"
          >
            <Icon icon="book" class-name="w-4 h-4 inline mr-2" fallback="📚" />
            Minhas Aulas
          </NuxtLink>
        </div>
      </div>
    </nav>
    
    <!-- Main Content -->
    <main class="container mx-auto px-4 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { user, signOut } = useAuth()
const router = useRouter()

const userNome = computed(() => {
  return user.value?.user_metadata?.nome || user.value?.email || 'Aluno'
})

async function sair() {
  await signOut()
  router.push('/login')
}
</script>
