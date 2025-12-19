-- Criar tabela de pagamentos de multas
CREATE TABLE IF NOT EXISTS public.pagamentos_multas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    valor_pago NUMERIC(10, 2) NOT NULL CHECK (valor_pago > 0),
    data_pagamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_pagamentos_multas_aluno_id ON public.pagamentos_multas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_multas_empresa_id ON public.pagamentos_multas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_multas_data_pagamento ON public.pagamentos_multas(data_pagamento);

-- Habilitar RLS
ALTER TABLE public.pagamentos_multas ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuários podem ver pagamentos da própria empresa
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

-- Política INSERT: usuários podem inserir pagamentos para alunos da própria empresa
CREATE POLICY "Usuários podem inserir pagamentos da própria empresa"
    ON public.pagamentos_multas
    FOR INSERT
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
        AND aluno_id IN (
            SELECT id 
            FROM public.alunos 
            WHERE empresa_id IN (
                SELECT empresa_id 
                FROM public.usuarios 
                WHERE id = auth.uid()
            )
        )
    );

-- Política UPDATE: usuários podem atualizar pagamentos da própria empresa
CREATE POLICY "Usuários podem atualizar pagamentos da própria empresa"
    ON public.pagamentos_multas
    FOR UPDATE
    USING (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
    )
    WITH CHECK (
        empresa_id IN (
            SELECT empresa_id 
            FROM public.usuarios 
            WHERE id = auth.uid()
        )
    );

-- Política DELETE: usuários podem deletar pagamentos da própria empresa
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

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_pagamentos_multas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pagamentos_multas_updated_at
    BEFORE UPDATE ON public.pagamentos_multas
    FOR EACH ROW
    EXECUTE FUNCTION update_pagamentos_multas_updated_at();
