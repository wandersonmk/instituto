<template>
  <!-- Sempre mostra fallback para evitar erros de ícones não encontrados -->
  <span v-if="fallback" :class="className">{{ fallback }}</span>
  <ClientOnly v-else>
    <font-awesome-icon 
      :icon="icon" 
      :class="className"
    />
    <template #fallback>
      <span :class="className">?</span>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  className?: string
  fallback?: string
}>()
</script>

