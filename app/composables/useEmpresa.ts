export function useEmpresa() {
  const supabase = useSupabaseClient()
  const { user } = useAuth()
  
  // Estados globais
  const empresa = useState<any>('empresa_data', () => null)
  const usuario = useState<any>('usuario_data', () => null)
  const isLoadingEmpresa = useState<boolean>('empresa_loading', () => false)

  // Buscar dados completos da empresa e usuário
  async function buscarNomeEmpresa() {
    if (!process.client || !user.value) {
      empresa.value = null
      usuario.value = null
      return
    }

    try {
      isLoadingEmpresa.value = true
      
      // Buscar usuário e empresa
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select(`
          *,
          empresa:empresas(*)
        `)
        .eq('user_id', user.value.id)
        .single()

      if (userError) {
        console.error('Erro ao buscar dados do usuário:', userError)
        usuario.value = null
        empresa.value = null
        return
      }

      usuario.value = userData
      empresa.value = userData?.empresa || null
      
    } catch (err) {
      console.error('Erro:', err)
      usuario.value = null
      empresa.value = null
    } finally {
      isLoadingEmpresa.value = false
    }
  }

  // Computed properties
  const nomeEmpresa = computed(() => empresa.value?.nome || null)
  const empresaId = computed(() => empresa.value?.id || null)
  const isAdmin = computed(() => usuario.value?.perfil === 'admin')
  const isColaborador = computed(() => usuario.value?.perfil === 'colaborador')

  return {
    nomeEmpresa: readonly(nomeEmpresa),
    empresa: readonly(empresa),
    usuario: readonly(usuario),
    empresaId: readonly(empresaId),
    isAdmin: readonly(isAdmin),
    isColaborador: readonly(isColaborador),
    isLoadingEmpresa: readonly(isLoadingEmpresa),
    buscarNomeEmpresa
  }
}
