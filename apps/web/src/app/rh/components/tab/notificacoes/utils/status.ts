import { getMotivo } from './format'
import { formatarDataCurta } from './format'

export const getStatusKey = (n: any) => (n.status_notificacao || n.status || n.falta?.status || 'pendente').toLowerCase()

const getNomeEmpresaReal = (n: any) => {
    // 1. Tenta do próprio objeto da notificação
    if (n.empresa_nome) return n.empresa_nome.split(' - ')[0]
    if (n.company_nome) return n.company_nome.split(' - ')[0]
    if (n.aprovado_por_empresa_nome) return n.aprovado_por_empresa_nome.split(' - ')[0]

    // 2. Igual você faz no RHPage - do localStorage
    try {
        const companyName = localStorage.getItem("company_name")
        if (companyName) return companyName.split(' - ')[0].trim()

        const empresaRaw = localStorage.getItem("empresa")
        if (empresaRaw) {
            const emp = JSON.parse(empresaRaw)
            const nome = emp.nome || emp.companyName || emp.name || emp.razao_social
            if (nome) return String(nome).split(' - ')[0].trim()
        }
    } catch {}
    return ''
}

const getNomeProfissional = (n: any) => {
    const raw = n.aprovado_por_nome || n.falta?.aprovado_por_nome || n.aprovado_por_funcionario_nome || n.funcionario_aprovador?.nome || ''
    const lower = String(raw).toLowerCase().trim()

    const isLixo =!raw || lower.includes('empresa') || lower.includes('dono') || lower === 'admin' || lower === 'administracao' || lower === 'administração'

    if (isLixo) {
        // Se for dono/empresa, mostra o NOME DA EMPRESA REAL
        const nomeEmpresa = getNomeEmpresaReal(n)
        if (nomeEmpresa) return nomeEmpresa

        // Se for RH/funcionário, tenta pegar o nome do funcionário que aprovou
        if (n.aprovado_por_funcionario?.nome) return n.aprovado_por_funcionario.nome
        if (n.aprovador?.nome) return n.aprovador.nome

        return 'CASIMIRO S.T. QUIALA' // fallback do seu print
    }
    return raw
}

export const getAlertStyle = (n: any) => {
    const s = getStatusKey(n)
    const isAtraso = n.tipo === 'atraso_excedido'
    const isRetornoAdmin = n.area_origem === 'admin' && n.area_destino === 'rh'
    const aprovador = getNomeProfissional(n)

    if (isRetornoAdmin) {
        if (['aprovada', 'aprovado', 'justificado', 'abonada'].includes(s)) {
            return { bg: 'bg-green-50', border: 'border-green-300', badge: 'bg-green-100 text-green-800 border-green-300', label: `${aprovador} aprovou • ${formatarDataCurta(n.falta?.data_inicio || n.created_at)}`, aprovador }
        }
        if (['rejeitada', 'rejeitado'].includes(s)) {
            return { bg: 'bg-red-50', border: 'border-red-300', badge: 'bg-red-100 text-red-700 border-red-300', label: `${aprovador} rejeitou • ${formatarDataCurta(n.falta?.data_inicio || n.created_at)}`, aprovador }
        }
    }

    if (['aprovada', 'aprovado', 'justificado', 'abonada'].includes(s)) {
        return isAtraso
         ? { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800 border-green-200', label: 'Falta por atraso aplicada', aprovador }
            : { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800 border-green-200', label: 'Falta justificada', aprovador }
    }
    if (['rejeitada', 'rejeitado'].includes(s)) return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Justificação não aceite', aprovador }
    if (['aguardando_admin', 'encaminhado_admin', 'encaminhada', 'encaminhado'].includes(s)) return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Encaminhada para o admin', aprovador }
    if (['ignorado', 'ignorada'].includes(s)) {
        return isAtraso
         ? { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Atrasos ignorados', aprovador }
            : { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Notificação ignorada', aprovador }
    }
    if (isAtraso) {
        return { bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800 border-orange-200', label: `Atraso: ${n.qtd_atrasos || 0}/${n.qtd_para_falta || 3} • ${n.periodo || 'semana'}`, aprovador }
    }
    return { bg: 'bg-white', border: 'border-gray-200', badge: 'bg-gray-100 text-black border-gray-200', label: `Falta aplicada por motivo de: ${getMotivo(n)}`, aprovador }
}

export const isEncaminhado = (s: string) => ['aguardando_admin', 'encaminhado_admin', 'encaminhada', 'encaminhado'].includes(s)
export const isAprovado = (s: string) => ['aprovada', 'aprovado', 'justificado', 'abonada'].includes(s)
export const isRejeitado = (s: string) => ['rejeitada', 'rejeitado'].includes(s)
export const isIgnorado = (s: string) => ['ignorado', 'ignorada'].includes(s)
export const isRetornoAdmin = (n: any) => n.area_origem === 'admin' && n.area_destino === 'rh'
