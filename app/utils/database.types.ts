export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alunos: {
        Row: {
          ativo: boolean | null
          aulas_concluidas: number | null
          bairro: string | null
          cep: string | null
          complemento: string | null
          created_at: string | null
          curso_contratado: string | null
          dias_semana: string[] | null
          endereco: string | null
          estado: string | null
          hora_entrada: string | null
          hora_saida: string | null
          id: string
          local_aulas: string | null
          multa_falta: string | null
          nome_completo: string
          numero: string | null
          pais: string | null
          quantidade_aulas: number | null
          quantidade_horas: number | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          aulas_concluidas?: number | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          created_at?: string | null
          curso_contratado?: string | null
          dias_semana?: string[] | null
          endereco?: string | null
          estado?: string | null
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          local_aulas?: string | null
          multa_falta?: string | null
          nome_completo: string
          numero?: string | null
          pais?: string | null
          quantidade_aulas?: number | null
          quantidade_horas?: number | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          aulas_concluidas?: number | null
          bairro?: string | null
          cep?: string | null
          complemento?: string | null
          created_at?: string | null
          curso_contratado?: string | null
          dias_semana?: string[] | null
          endereco?: string | null
          estado?: string | null
          hora_entrada?: string | null
          hora_saida?: string | null
          id?: string
          local_aulas?: string | null
          multa_falta?: string | null
          nome_completo?: string
          numero?: string | null
          pais?: string | null
          quantidade_aulas?: number | null
          quantidade_horas?: number | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      aulas_historico: {
        Row: {
          aluno_id: string
          created_at: string | null
          data_aula: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          multa_aplicada: boolean | null
          observacoes: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          valor_multa: number | null
        }
        Insert: {
          aluno_id: string
          created_at?: string | null
          data_aula: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          multa_aplicada?: boolean | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_multa?: number | null
        }
        Update: {
          aluno_id?: string
          created_at?: string | null
          data_aula?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          multa_aplicada?: boolean | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_multa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_historico_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      cursos: {
        Row: {
          ativo: boolean | null
          carga_horaria: number | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          quantidade_aulas: number | null
          updated_at: string | null
          user_id: string | null
          valor: number | null
          valor_multa_falta: number | null
        }
        Insert: {
          ativo?: boolean | null
          carga_horaria?: number | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          quantidade_aulas?: number | null
          updated_at?: string | null
          user_id?: string | null
          valor?: number | null
          valor_multa_falta?: number | null
        }
        Update: {
          ativo?: boolean | null
          carga_horaria?: number | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          quantidade_aulas?: number | null
          updated_at?: string | null
          user_id?: string | null
          valor?: number | null
          valor_multa_falta?: number | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          created_at: string | null
          email: string
          foto: string | null
          id: string
          nome: string
          perfil: string
        }
        Insert: {
          created_at?: string | null
          email: string
          foto?: string | null
          id?: string
          nome: string
          perfil: string
        }
        Update: {
          created_at?: string | null
          email?: string
          foto?: string | null
          id?: string
          nome?: string
          perfil?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
