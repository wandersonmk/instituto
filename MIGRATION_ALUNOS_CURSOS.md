# ✅ Migração do Banco de Dados Concluída

## 📋 O que foi feito:

### 1. **Nova Tabela `alunos_cursos` (Relacionamento N:N)**
Criada tabela intermediária que permite múltiplos cursos por aluno:

**Campos principais:**
- `aluno_id` - referência ao aluno
- `curso_id` - referência ao curso
- `aulas_concluidas` - progresso específico deste curso
- `status` - ativo, concluido, cancelado, suspenso
- `dias_semana[]` - dias específicos para este curso
- `local_aulas`, `hora_entrada`, `hora_saida` - configurações específicas

### 2. **Migração de Dados Existentes**
✅ Todos os 6 alunos foram migrados com sucesso para a nova estrutura

### 3. **Tabela `presencas` Atualizada**
✅ Adicionado campo `curso_id` para rastrear presenças por curso específico

### 4. **View `view_alunos_cursos_completo`**
✅ Criada view que facilita consultas com:
- Dados do aluno
- Dados do curso
- Progresso percentual calculado
- Aulas restantes
- Status da matrícula

### 5. **Políticas RLS (Row Level Security)**
✅ Configuradas políticas de segurança:
- SELECT: visualizar da própria empresa ou próprio aluno
- INSERT: criar apenas na própria empresa
- UPDATE: atualizar apenas na própria empresa
- DELETE: deletar apenas na própria empresa

---

## 📊 Estrutura Atual:

**Antes:**
```
alunos (1:1) → cursos
```

**Depois:**
```
alunos (N:N) ← alunos_cursos → (N:N) cursos
```

---

## 🔧 Próximos Passos no Frontend:

### 1. **Modificar `AlunosCadastroManager.vue`:**
- Trocar select único por lista de cursos
- Permitir adicionar/remover múltiplos cursos
- Para cada curso, configurar: dias_semana, horários, local

### 2. **Atualizar Composables:**
- Modificar queries para usar `alunos_cursos`
- Adaptar lógica de progresso para curso específico

### 3. **Página do Aluno:**
- Exibir lista de cursos matriculados
- Mostrar progresso individual por curso
- Permitir seleção de curso ao registrar presença

---

## 📝 Exemplo de Query (Frontend):

```typescript
// Buscar cursos do aluno
const { data: cursos } = await supabase
  .from('alunos_cursos')
  .select(`
    *,
    curso:cursos(*)
  `)
  .eq('aluno_id', alunoId)
  .eq('status', 'ativo')

// Adicionar novo curso ao aluno
await supabase
  .from('alunos_cursos')
  .insert({
    aluno_id: alunoId,
    curso_id: cursoId,
    empresa_id: empresaId,
    dias_semana: ['segunda', 'quarta'],
    hora_entrada: '14:00',
    hora_saida: '16:00',
    local_aulas: 'Sala 1'
  })
```

---

## ✅ Status:
- [x] Tabela `alunos_cursos` criada
- [x] Dados migrados (6 alunos)
- [x] Campo `curso_id` adicionado em `presencas`
- [x] View `view_alunos_cursos_completo` criada
- [x] Políticas RLS configuradas
- [ ] Frontend: modificar cadastro de aluno
- [ ] Frontend: modificar página do aluno
- [ ] Frontend: adaptar registro de presença

---

**Data da Migração:** 19/12/2025
**Alunos Migrados:** 6
**Status:** ✅ Sucesso
