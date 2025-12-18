<template>
  <div class="max-w-7xl mx-auto">
    <!-- Cards de métricas -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <!-- Card Alunos Hoje -->
        <div class="relative bg-gradient-to-br from-card via-blue-950/10 to-card text-card-foreground rounded-lg border border-blue-800/20 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all duration-300 p-6 group overflow-hidden">
          <!-- Efeito de brilho sutil -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 mb-1">Alunos Hoje</p>
              <p class="text-2xl font-bold text-foreground">{{ metrics.alunosHoje }}</p>
              <p class="text-xs text-blue-600 mt-1">até agora</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Icon :icon="['fas', 'ticket']" class-name="text-white text-2xl drop-shadow-lg" fallback="" />
            </div>
          </div>
        </div>

        <!-- Card Alunos na Semana -->
        <div class="relative bg-gradient-to-br from-card via-emerald-950/10 to-card text-card-foreground rounded-lg border border-emerald-800/20 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300 p-6 group overflow-hidden">
          <!-- Efeito de brilho sutil -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 mb-1">Alunos na Semana</p>
              <p class="text-2xl font-bold text-foreground">{{ metrics.alunosNovos }}</p>
              <p class="text-xs text-emerald-600 mt-1">nos últimos 7 dias</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Card Alunos esse mês -->
        <div class="relative bg-gradient-to-br from-card via-amber-950/10 to-card text-card-foreground rounded-lg border border-amber-800/20 shadow-sm hover:shadow-md hover:shadow-amber-500/10 transition-all duration-300 p-6 group overflow-hidden">
          <!-- Efeito de brilho sutil -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 mb-1">Alunos esse mês</p>
              <p class="text-2xl font-bold text-foreground">{{ metrics.alunosVencendo }}</p>
              <p class="text-xs text-green-600 mt-1">este mês</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
              <Icon :icon="['fas', 'user-graduate']" class-name="text-white text-2xl" fallback="" />
            </div>
          </div>
        </div>

        <!-- Card Total de Alunos -->
        <div class="relative bg-gradient-to-br from-card via-indigo-950/10 to-card text-card-foreground rounded-lg border border-indigo-800/20 shadow-sm hover:shadow-md hover:shadow-indigo-500/10 transition-all duration-300 p-6 group overflow-hidden">
          <!-- Efeito de brilho sutil -->
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 mb-1">Total de Alunos</p>
              <p class="text-2xl font-bold text-foreground">{{ metrics.alunosTotais.toLocaleString('pt-BR') }}</p>
              <p class="text-xs text-indigo-600 mt-1">total de alunos</p>
            </div>
            <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <Icon :icon="['fas', 'users']" class-name="text-white text-2xl" fallback="" />
            </div>
          </div>
        </div>
      </div>

    <!-- Gráficos -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <!-- Gráfico de Performance Circular -->
  <CircularProgress :total="metrics.alunosTotais" />

      <!-- Gráfico de Vendas Mensais -->
      <div class="bg-card text-card-foreground rounded-lg border border-border shadow-sm p-6">
  <h3 class="text-lg font-semibold text-foreground mb-4">Alunos dos Últimos Meses</h3>
        <div class="relative h-64">
          <canvas ref="lineChartRef"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)
const lineChartRef = ref<HTMLCanvasElement | null>(null)

const metrics = ref({
  alunosHoje: 0,
  alunosNovos: 0,
  alunosVencendo: 0,
  faturamento: 0,
  alunosTotais: 0
})
// Buscar total de alunos na tabela alunos
async function fetchAlunosTotais() {
  if (!process.client) return
  const supabase = useSupabaseClient()
  const { count, error } = await supabase
    .from('alunos')
    .select('id', { count: 'exact', head: true })
  if (!error && typeof count === 'number') {
    metrics.value.alunosTotais = count
  }
}
// Buscar total de alunos na tabela alunos
async function fetchTotalAlunos() {
  if (!process.client) return
  const supabase = useSupabaseClient()
  const { count, error } = await supabase
    .from('alunos')
    .select('id', { count: 'exact', head: true })
  if (!error && typeof count === 'number') {
    metrics.value.faturamento = count
  }
}


// Buscar quantidade de tickets de hoje na tabela relatorios
async function fetchAlunosHoje() {
  if (!process.client) return
  const supabase = useSupabaseClient()
  // Data de hoje no formato DD/MM/YYYY
  const hoje = new Date()
  const dia = String(hoje.getDate()).padStart(2, '0')
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const ano = hoje.getFullYear()
  const dataHoje = `${dia}/${mes}/${ano}`
  const { count, error } = await supabase
    .from('relatorios')
    .select('id', { count: 'exact', head: true })
    .eq('data_abertura_chamado', dataHoje)
  if (!error && typeof count === 'number') {
    metrics.value.alunosHoje = count
  }
}

// Buscar quantidade de tickets da semana na tabela relatorios
async function fetchAlunosSemana() {
  if (!process.client) return
  const supabase = useSupabaseClient()
  // Alunos na Semana (últimos 7 dias, incluindo hoje) usando created_at
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 6); // 6 dias atrás + hoje = 7 dias
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const { data: alunosSemana, error: errorSemana } = await supabase
    .from('relatorios')
    .select('id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());
  metrics.value.alunosNovos = alunosSemana?.length || 0;
}

// Buscar quantidade de tickets do mês atual na tabela relatorios
async function fetchAlunosMes() {
  if (!process.client) return
  const supabase = useSupabaseClient()
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  firstDay.setHours(0, 0, 0, 0)
  lastDay.setHours(23, 59, 59, 999)
  const { data: alunosMes, error: errorMes } = await supabase
    .from('relatorios')
    .select('id')
    .gte('created_at', firstDay.toISOString())
    .lte('created_at', lastDay.toISOString())
  metrics.value.alunosVencendo = alunosMes?.length || 0
}

onMounted(() => {
  nextTick(() => {
    createLineChart()
    fetchAlunosHoje()
    fetchAlunosSemana()
    fetchAlunosMes()
    fetchTotalAlunos()
    fetchAlunosTotais()
  })
})


// Configuração do gráfico de linha
// Gráfico de tickets por mês
async function createLineChart() {
  if (!lineChartRef.value) return

  const supabase = useSupabaseClient()
  const now = new Date()
  const months = []
  const labels = []
  const data = []
  // Últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleString('pt-BR', { month: 'short' })
    labels.push(label.charAt(0).toUpperCase() + label.slice(1))
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    firstDay.setHours(0, 0, 0, 0)
    lastDay.setHours(23, 59, 59, 999)
    months.push({ firstDay, lastDay })
  }

  // Buscar total de alunos por mês
  for (const m of months) {
    const { count, error } = await supabase
      .from('relatorios')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', m.firstDay.toISOString())
      .lte('created_at', m.lastDay.toISOString())
    data.push(!error && typeof count === 'number' ? count : 0)
  }

  const ctx = lineChartRef.value.getContext('2d')
  if (!ctx) return

  // Detectar tema atual
  const isDark = document.documentElement.classList.contains('dark')
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Alunos',
        data,
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointHoverBackgroundColor: '#059669',
        pointHoverBorderColor: '#FFFFFF'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: isDark ? '#E5E7EB' : '#1F2937',
            font: {
              size: 13,
              weight: 'bold'
            }
          }
        },
        tooltip: {
          backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
          titleColor: isDark ? '#F3F4F6' : '#1F2937',
          bodyColor: isDark ? '#F3F4F6' : '#1F2937',
          borderColor: isDark ? '#4B5563' : '#E5E7EB',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              return 'Alunos: ' + context.parsed.y.toLocaleString('pt-BR')
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: isDark ? '#D1D5DB' : '#4B5563',
            font: {
              size: 12,
              weight: '500'
            }
          },
          grid: {
            color: isDark ? '#374151' : '#E5E7EB',
            lineWidth: 1
          },
          border: {
            color: isDark ? '#4B5563' : '#D1D5DB'
          }
        },
        y: {
          ticks: {
            color: isDark ? '#D1D5DB' : '#4B5563',
            font: {
              size: 12,
              weight: '500'
            },
            callback: function(value) {
              return value + ' alunos'
            }
          },
          grid: {
            color: isDark ? '#374151' : '#E5E7EB',
            lineWidth: 1
          },
          border: {
            color: isDark ? '#4B5563' : '#D1D5DB'
          }
        }
      }
    }
  })
}

// Inicializar gráficos quando o componente for montado
// ...existing code...
// ...existing code...

</script>

