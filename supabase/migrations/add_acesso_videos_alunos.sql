-- Adicionar campo acesso_videos na tabela alunos
ALTER TABLE alunos 
ADD COLUMN acesso_videos BOOLEAN DEFAULT false;

-- Comentário explicativo
COMMENT ON COLUMN alunos.acesso_videos IS 'Define se o aluno tem acesso à seção de vídeos aulas';
