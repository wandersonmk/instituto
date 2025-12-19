---
applyTo: '**/*.vue'
---

# Padrão de Botões Dourados

⚠️ **IMPORTANTE**  
Todos os botões primários/principais do sistema DEVEM seguir este padrão.

---

## Regras para Botões Primários

### ✅ SEMPRE use esta estrutura:

```vue
<button class="px-4 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors flex items-center space-x-2">
  <Icon icon="plus" class-name="w-4 h-4" />
  <span>Texto do Botão</span>
</button>
```

### ❌ NUNCA use:

```vue
<!-- NÃO FAZER -->
<button class="bg-primary hover:bg-primary/90 font-medium">...</button>
<button class="font-semibold bg-gradient-to-r from-yellow-400">...</button>
```

---

## Classes Obrigatórias

1. **`golden-gradient`** - Aplica o gradiente dourado padrão
2. **`text-primary-foreground`** - Cor do texto (branco/preto conforme tema)
3. **`rounded-lg`** - Bordas arredondadas
4. **`transition-colors`** - Animação suave

### Classes Opcionais (conforme necessidade):

- `px-4 py-2` ou `px-6 py-3` - Padding do botão
- `flex items-center space-x-2` - Para botões com ícones
- `w-full` - Botão em largura total
- `disabled:opacity-50 disabled:cursor-not-allowed` - Estado desabilitado

---

## Estilo CSS (já incluído globalmente)

```css
.golden-gradient {
  background: radial-gradient(circle at top left, #ffd700 0%, #f0c000 50%, #daa520 100%) !important;
  box-shadow: 0 2px 4px rgba(255, 215, 0, 0.3);
}

.golden-gradient:hover {
  background: radial-gradient(circle at top left, #ffe44d 0%, #ffd700 45%, #f0c000 100%) !important;
  box-shadow: 0 3px 6px rgba(255, 215, 0, 0.4);
}
```

---

## Exemplos de Uso

### Botão com Ícone:
```vue
<button 
  @click="salvar"
  class="px-4 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors flex items-center space-x-2"
>
  <Icon icon="check" class-name="w-4 h-4" />
  <span>Salvar</span>
</button>
```

### Botão Simples:
```vue
<button 
  @click="continuar"
  class="px-6 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors"
>
  Continuar
</button>
```

### Botão Submit:
```vue
<button 
  type="submit"
  class="w-full px-4 py-3 golden-gradient text-primary-foreground rounded-lg transition-colors"
>
  Cadastrar
</button>
```

### Botão Desabilitado:
```vue
<button 
  :disabled="!formValido"
  class="px-4 py-2 golden-gradient text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  Enviar
</button>
```

---

## Componentes que já usam o padrão:

- ✅ `AulasVideosManager.vue`
- ✅ `AppSidebar.vue` (menu ativo)

## Componentes que precisam ser atualizados:

- 🔄 `AlunosCadastroManager.vue`
- 🔄 `AlunosManager.vue`
- 🔄 `aluno/indicacoes.vue`
- 🔄 Todos os outros componentes com botões primários

---

## Observações:

1. **NÃO adicione** `font-medium`, `font-semibold` ou `font-bold` nos botões
2. **NÃO use** `bg-primary` ou variações de `bg-gradient-to-*`
3. **SEMPRE** use `golden-gradient` para botões de ação principal
4. Botões secundários/cancelar podem usar `border border-border hover:bg-muted`
5. O estilo deve estar disponível globalmente ou via scoped no componente

---

## Checklist ao criar novos botões:

- [ ] Usa classe `golden-gradient`?
- [ ] Usa `text-primary-foreground`?
- [ ] Tem `rounded-lg` e `transition-colors`?
- [ ] **NÃO** tem classes de font-weight?
- [ ] **NÃO** usa `bg-primary` ou outros backgrounds?
