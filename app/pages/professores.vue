<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'dashboard'
})

// Refs antes do composable: se useProfessores() lançar, o setup aborta e o
// template renderizaria com os refs indefinidos.
const isLoading = ref(true)
const professores = ref<Professor[]>([])
const cursos = ref<any[]>([])
const empresaId = ref<string | null>(null)

const {
  listarProfessores,
  listarCursos,
  criarProfessor,
  definirCursosDoProfessor,
  buscarEmpresaId
} = useProfessores()

// Modal de novo professor
const mostrarModalNovo = ref(false)
const novoNome = ref('')
const novoEmail = ref('')
const novaSenha = ref('')
const novosCursos = ref<string[]>([])
const salvandoNovo = ref(false)

// Resultado da criação (mostra a senha uma única vez)
const credenciaisGeradas = ref<{ email: string; senha: string } | null>(null)

// Modal de cursos
const mostrarModalCursos = ref(false)
const professorEditando = ref<Professor | null>(null)
const cursosSelecionados = ref<string[]>([])
const salvandoCursos = ref(false)

async function carregar() {
  try {
    const [lista, listaCursos, empresa] = await Promise.all([
      listarProfessores(),
      listarCursos(),
      buscarEmpresaId()
    ])
    professores.value = lista
    cursos.value = listaCursos
    empresaId.value = empresa
  } catch (error) {
    console.error('Erro ao carregar professores:', error)
  } finally {
    isLoading.value = false
  }
}

// ------------------------------------------------------------ novo professor

function abrirModalNovo() {
  novoNome.value = ''
  novoEmail.value = ''
  novaSenha.value = ''
  novosCursos.value = []
  credenciaisGeradas.value = null
  mostrarModalNovo.value = true
}

const emailValido = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail.value.trim()))
const novoValido = computed(() => novoNome.value.trim().length >= 3 && emailValido.value)

async function salvarNovoProfessor() {
  if (!novoValido.value) return

  const toast = await useToastSafe()
  salvandoNovo.value = true

  try {
    const resposta = await criarProfessor({
      nome: novoNome.value.trim(),
      email: novoEmail.value.trim(),
      senha: novaSenha.value.trim() || undefined,
      cursoIds: novosCursos.value
    })

    credenciaisGeradas.value = { email: novoEmail.value.trim(), senha: resposta.senha }
    toast?.success('Professor cadastrado com sucesso!')
    professores.value = await listarProfessores()
  } catch (error: any) {
    console.error('Erro ao criar professor:', error)
    toast?.error(error?.data?.statusMessage || error.message || 'Erro ao cadastrar professor')
  } finally {
    salvandoNovo.value = false
  }
}

function fecharModalNovo() {
  mostrarModalNovo.value = false
  credenciaisGeradas.value = null
}

async function copiarCredenciais() {
  if (!credenciaisGeradas.value) return
  const texto = `E-mail: ${credenciaisGeradas.value.email}\nSenha: ${credenciaisGeradas.value.senha}`
  try {
    await navigator.clipboard.writeText(texto)
    const toast = await useToastSafe()
    toast?.success('Credenciais copiadas!')
  } catch {
    /* clipboard pode estar bloqueado; o texto continua visível na tela */
  }
}

// ------------------------------------------------------------ cursos

function abrirModalCursos(professor: Professor) {
  professorEditando.value = professor
  cursosSelecionados.value = professor.cursos.map(c => c.id)
  mostrarModalCursos.value = true
}

// Recebem o id e mexem no ref diretamente: no template o Vue desembrulha os refs,
// então passar o ref como argumento entregaria o array puro e "lista.value" seria undefined.
function alternarCursoNovo(cursoId: string) {
  const i = novosCursos.value.indexOf(cursoId)
  if (i === -1) novosCursos.value.push(cursoId)
  else novosCursos.value.splice(i, 1)
}

function alternarCursoEdicao(cursoId: string) {
  const i = cursosSelecionados.value.indexOf(cursoId)
  if (i === -1) cursosSelecionados.value.push(cursoId)
  else cursosSelecionados.value.splice(i, 1)
}

async function salvarCursos() {
  if (!professorEditando.value || !empresaId.value) return

  const toast = await useToastSafe()
  salvandoCursos.value = true

  try {
    await definirCursosDoProfessor(
      professorEditando.value.id,
      cursosSelecionados.value,
      empresaId.value
    )
    toast?.success('Cursos atualizados!')
    professores.value = await listarProfessores()
    mostrarModalCursos.value = false
    professorEditando.value = null
  } catch (error: any) {
    console.error('Erro ao salvar cursos:', error)
    toast?.error(error.message || 'Erro ao salvar os cursos')
  } finally {
    salvandoCursos.value = false
  }
}

onMounted(carregar)
</script>

<template>
  <div>
    <AppLoading
      v-if="isLoading"
      title="Carregando Professores"
      description="Buscando os professores cadastrados..."
    />

    <div v-else class="space-y-4">
      <div class="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg sm:text-xl font-bold text-foreground">Professores</h2>
            <p class="text-sm text-muted-foreground">
              Total: <strong>{{ professores.length }}</strong> cadastrado(s)
            </p>
          </div>
          <button
            @click="abrirModalNovo"
            class="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-all"
          >
            <Icon icon="plus" class-name="w-4 h-4 inline mr-1.5" fallback="+" />
            Novo Professor
          </button>
        </div>
      </div>

      <div v-if="professores.length === 0" class="bg-card border border-border rounded-lg p-8 text-center">
        <div class="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon="chalkboard-teacher" class-name="w-8 h-8 text-muted-foreground" fallback="👩‍🏫" />
        </div>
        <h3 class="text-lg font-semibold text-foreground mb-2">Nenhum professor cadastrado</h3>
        <p class="text-sm text-muted-foreground mb-4">
          Cadastre um professor para que ele possa conduzir as aulas.
        </p>
        <button
          @click="abrirModalNovo"
          class="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium"
        >
          Cadastrar Primeiro Professor
        </button>
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="professor in professores"
          :key="professor.id"
          class="bg-card border border-border rounded-lg p-4"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="min-w-0">
              <h3 class="font-semibold text-foreground truncate">{{ professor.nome }}</h3>
              <p class="text-xs text-muted-foreground truncate">{{ professor.email }}</p>
            </div>
            <span class="px-2 py-0.5 text-xs rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
              Professor
            </span>
          </div>

          <div class="mb-3">
            <p class="text-xs text-muted-foreground mb-1.5">Cursos que leciona:</p>
            <div v-if="professor.cursos.length === 0" class="text-xs text-amber-600 dark:text-amber-400">
              Nenhum curso vinculado — ele não verá nenhuma aula no painel dele.
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="curso in professor.cursos"
                :key="curso.id"
                class="px-2 py-1 text-xs rounded-md bg-muted text-foreground"
              >
                {{ curso.nome }}
              </span>
            </div>
          </div>

          <button
            @click="abrirModalCursos(professor)"
            class="w-full py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-all"
          >
            Gerenciar cursos
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal: novo professor -->
  <Transition name="fade">
    <div
      v-if="mostrarModalNovo"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 overflow-y-auto"
      @click="fecharModalNovo"
    >
      <div class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl my-4" @click.stop>
        <div class="p-6">
          <!-- Credenciais geradas -->
          <div v-if="credenciaisGeradas">
            <div class="text-center mb-5">
              <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon icon="check-circle" class-name="w-7 h-7 text-emerald-600" fallback="✓" />
              </div>
              <h3 class="text-xl font-bold text-foreground">Professor cadastrado</h3>
              <p class="text-sm text-muted-foreground mt-1">
                Anote os dados de acesso: a senha não será exibida novamente.
              </p>
            </div>

            <div class="bg-muted/50 rounded-lg p-4 mb-4 space-y-2 text-sm font-mono">
              <div><span class="text-muted-foreground">E-mail:</span> {{ credenciaisGeradas.email }}</div>
              <div><span class="text-muted-foreground">Senha:</span> {{ credenciaisGeradas.senha }}</div>
            </div>

            <div class="flex space-x-3">
              <button
                @click="copiarCredenciais"
                class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
              >
                Copiar
              </button>
              <button
                @click="fecharModalNovo"
                class="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all"
              >
                Concluir
              </button>
            </div>
          </div>

          <!-- Formulário -->
          <div v-else>
            <h3 class="text-xl font-bold text-foreground mb-1">Novo Professor</h3>
            <p class="text-sm text-muted-foreground mb-5">
              A conta já nasce confirmada, sem precisar de e-mail de verificação.
            </p>

            <label class="block text-sm font-medium text-foreground mb-1.5">Nome completo</label>
            <input
              v-model="novoNome"
              type="text"
              placeholder="Ex.: Simone Martins"
              class="w-full px-3 py-2 mb-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <label class="block text-sm font-medium text-foreground mb-1.5">E-mail</label>
            <input
              v-model="novoEmail"
              type="email"
              placeholder="professor@exemplo.com"
              class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              :class="novoEmail && !emailValido ? 'border-red-400' : ''"
            />
            <p v-if="novoEmail && !emailValido" class="text-xs text-red-500 mt-1">Digite um e-mail válido</p>
            <div class="mb-4"></div>

            <label class="block text-sm font-medium text-foreground mb-1.5">
              Senha <span class="text-muted-foreground font-normal">(deixe vazio para gerar automaticamente)</span>
            </label>
            <input
              v-model="novaSenha"
              type="text"
              placeholder="Gerada automaticamente"
              class="w-full px-3 py-2 mb-4 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <label class="block text-sm font-medium text-foreground mb-1.5">Cursos que vai lecionar</label>
            <div v-if="cursos.length === 0" class="text-xs text-muted-foreground mb-4">
              Nenhum curso ativo cadastrado.
            </div>
            <div v-else class="max-h-40 overflow-y-auto border border-border rounded-lg p-2 mb-5 space-y-1">
              <label
                v-for="curso in cursos"
                :key="curso.id"
                class="flex items-center space-x-2 p-1.5 rounded hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="novosCursos.includes(curso.id)"
                  @change="alternarCursoNovo(curso.id)"
                  class="w-4 h-4 rounded border-border"
                />
                <span class="text-sm text-foreground">{{ curso.nome }}</span>
              </label>
            </div>

            <div class="flex space-x-3">
              <button
                @click="fecharModalNovo"
                class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
              >
                Cancelar
              </button>
              <button
                @click="salvarNovoProfessor"
                :disabled="!novoValido || salvandoNovo"
                class="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ salvandoNovo ? 'Cadastrando...' : 'Cadastrar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Modal: gerenciar cursos -->
  <Transition name="fade">
    <div
      v-if="mostrarModalCursos && professorEditando"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3"
      @click="mostrarModalCursos = false"
    >
      <div class="bg-card border border-border rounded-xl max-w-md w-full shadow-2xl" @click.stop>
        <div class="p-6">
          <h3 class="text-xl font-bold text-foreground mb-1">Cursos do professor</h3>
          <p class="text-sm text-muted-foreground mb-5">{{ professorEditando.nome }}</p>

          <div v-if="cursos.length === 0" class="text-sm text-muted-foreground mb-5">
            Nenhum curso ativo cadastrado.
          </div>
          <div v-else class="max-h-64 overflow-y-auto border border-border rounded-lg p-2 mb-5 space-y-1">
            <label
              v-for="curso in cursos"
              :key="curso.id"
              class="flex items-center space-x-2 p-2 rounded hover:bg-muted cursor-pointer"
            >
              <input
                type="checkbox"
                :checked="cursosSelecionados.includes(curso.id)"
                @change="alternarCursoEdicao(curso.id)"
                class="w-4 h-4 rounded border-border"
              />
              <span class="text-sm text-foreground">{{ curso.nome }}</span>
            </label>
          </div>

          <div class="flex space-x-3">
            <button
              @click="mostrarModalCursos = false"
              class="flex-1 px-4 py-3 border-2 border-border rounded-lg text-foreground font-medium hover:bg-muted transition-all"
            >
              Cancelar
            </button>
            <button
              @click="salvarCursos"
              :disabled="salvandoCursos"
              class="flex-1 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-all disabled:opacity-50"
            >
              {{ salvandoCursos ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
