<script setup lang="ts">
// Página acessível independente de autenticação
// Removido middleware para permitir acesso após cadastro

// Meta tags para SEO
useHead({
  title: 'Obrigado - Instituto Fios de Ouro',
  meta: [
    { name: 'description', content: 'Obrigado por se cadastrar no Instituto Fios de Ouro Gestão de Relatórios' }
  ]
})

definePageMeta({
  layout: 'auth'
})
</script>

<template>
  <ThankYouCard />
</template>
