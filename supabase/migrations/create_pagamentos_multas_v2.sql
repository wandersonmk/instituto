-- ========================================
-- MIGRAÇÃO: Criar tabela de pagamentos_multas
-- Data: 18/12/2025
-- ========================================

-- 1. Deletar tabela se já existir (cuidado em produção!)
DROP TABLE IF EXISTS public.pagamentos_multas CASCADE;

-- 2. Criar tabela de pagamentos de multas
CREATE TABLE public.pagamentos_multas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    valor_pago NUMERIC(10, 2) NOT NULL CHECK (valor_pago > 0),
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índices para melhorar performance
CREATE INDEX idx_pagamentos_multas_aluno_id ON public.pagamentos_multas(aluno_id);
CREATE INDEX idx_pagamentos_multas_empresa_id ON public.pagamentos_multas(empresa_id);
CREATE INDEX idx_pagamentos_multas_data_pagamento ON public.pagamentos_multas(data_pagamento DESC);

-- 4. Habilitar RLS
ALTER TABLE public.pagamentos_multas ENABLE ROW LEVEL SECURITY;

-- 5. Deletar políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver pagamentos da própria empresa" ON public.pagamentos_multas;
DROP POLICY IF EXISTS "Usuários podem inserir pagamentos da própria empresa" ON public.pagamentos_multas;
DROP POLICY IF EXISTS "Usuários podem atualizar pagamentos da própria empresa" ON public.pagamentos_multas;
DROP POLICY IF EXISTS "Usuários podem deletar pagamentos da própria empresa" ON public.pagamentos_multas;

-- 6. Criar políticas RLS

-- SELECT: Ver pagamentos da própria empresa
CREATE POLICY "Usuários podem ver pagamentos da própria empresa"
    ON public.pagamentos_multas
    FOR SELECT
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- INSERT: Inserir pagamentos da própria empresa
CREATE POLICY "Usuários podem inserir pagamentos da própria empresa"
    ON public.pagamentos_multas
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- UPDATE: Atualizar pagamentos da própria empresa
CREATE POLICY "Usuários podem atualizar pagamentos da própria empresa"
    ON public.pagamentos_multas
    FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- DELETE: Deletar pagamentos da própria empresa
CREATE POLICY "Usuários podem deletar pagamentos da própria empresa"
    ON public.pagamentos_multas
    FOR DELETE
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- 7. Criar função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pagamentos_multas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Criar trigger para updated_at
DROP TRIGGER IF EXISTS trigger_update_pagamentos_multas_updated_at ON public.pagamentos_multas;
CREATE TRIGGER trigger_update_pagamentos_multas_updated_at
    BEFORE UPDATE ON public.pagamentos_multas
    FOR EACH ROW
    EXECUTE FUNCTION update_pagamentos_multas_updated_at();

-- 9. Conceder permissões
GRANT ALL ON public.pagamentos_multas TO authenticated;
GRANT ALL ON public.pagamentos_multas TO service_role;

-- ========================================
-- FIM DA MIGRAÇÃO
-- ========================================

-- Para verificar se foi criada corretamente, execute:
-- SELECT * FROM public.pagamentos_multas LIMIT 5;

-- Para testar a inserção (substitua os IDs reais):
-- INSERT INTO public.pagamentos_multas (aluno_id, empresa_id, valor_pago, observacoes)
-- VALUES ('seu-aluno-id', 'sua-empresa-id', 50.00, 'Pagamento teste');
