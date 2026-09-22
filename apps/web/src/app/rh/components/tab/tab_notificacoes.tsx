import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Search, Loader2, Check, X, Eye, ArrowUpRight, Bell, Menu } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../lib/api'

type Props = { cargoAtual: string }

export default function TabNotificacoes({ cargoAtual }: Props) {
    const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actingId, setActingId] = useState<string | null>(null)
    const [openingId, setOpeningId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [comprovante, setComprovante] = useState<{ url: string, type: string } | null>(null)
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
    const firstLoad = useRef(true)
    const area = cargoAtual === 'admin'? 'admin' : 'rh'

    const formatarTexto = (texto: string) => {
        if (!texto) return ''
        const mapa: Record<string, string> = {
            'NAO_APARECEU': 'Não apareceu', 'DOENTE': 'Doente', 'ATESTADO': 'Atestado',
            'ATESTADO_MEDICO': 'Atestado médico', 'OUTROS': 'Outros'
        }
        const upper = texto.toUpperCase().trim()
        if (mapa[upper]) return mapa[upper]
        return texto.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
    }

    const getMotivo = (n: any) => {
        if (n.tipo === 'atraso_excedido') return `${n.qtd_atrasos} atrasos`
        const raw = (n.falta?.motivo || '').split('|')[0].trim()
        return formatarTexto(raw.replace(/^(FALTA|OUTROS)\s*/i,'').trim() || raw) || 'Não informado'
    }

    // TEMPO ONDE FICA ADMIN: agora, há 1min, 1h, 1d, 7d, 1 semana, 2 semanas, 1 mês
    const formatarTempoAdmin = (iso: string) => {
        if (!iso) return 'agora'
        const diffMs = Date.now() - new Date(iso).getTime()
        const min = Math.floor(diffMs / 60000)
        if (min < 1) return 'agora'
        if (min < 60) return `há ${min}min`
        const h = Math.floor(min / 60)
        if (h < 24) return `há ${h}h`
        const d = Math.floor(h / 24)
        if (d < 7) return `há ${d}d`
        if (d < 14) return 'há 1 semana'
        if (d < 21) return 'há 2 semanas'
        if (d < 28) return 'há 3 semanas'
        const m = Math.floor(d / 30)
        if (m < 12) return m <= 1? 'há 1 mês' : `há ${m} meses`
        return `há ${Math.floor(m/12)} ano`
    }

    const formatarDataCurta = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        const dd = String(d.getDate()).padStart(2,'0')
        const mm = String(d.getMonth()+1).padStart(2,'0')
        const yy = String(d.getFullYear()).slice(-2)
        return `${dd}/${mm}/${yy}`
    }

    const fetchNotifs = useCallback(async (silent = false) => {
        if (!silent && firstLoad.current) setLoading(true)
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}`)
            setNotifs(Array.isArray(data)? data : [])
        } catch { if (!silent) toast.error('Erro') }
        finally { setLoading(false); firstLoad.current = false }
    }, [area])

    useEffect(() => { fetchNotifs(false) }, [fetchNotifs])

    const ativas = notifs.filter(n => n.status_notificacao === 'pendente')
    const historico = notifs.filter(n => n.status_notificacao!== 'pendente')

    const filtered = useMemo(() => {
        const list = tab === 'ativas'? ativas : historico
        if (!search.trim()) return list
        const s = search.toLowerCase()
        return list.filter(n => (n.funcionario?.nome || '').toLowerCase().includes(s))
    }, [ativas, historico, tab, search])

    const marcarComoLida = async (notifId: string) => {
        if (viewedIds.has(notifId)) return
        setViewedIds(prev => new Set(prev).add(notifId))
        try { await api.post(`/api/rh/notificacoes/${notifId}/lida`) } catch {}
    }

    const handleExpand = (n: any) => {
        const isNew =!n.lida &&!viewedIds.has(n.notificacao_id) && n.status_notificacao === 'pendente'
        if (isNew) marcarComoLida(n.notificacao_id)
        setExpandedId(expandedId === n.notificacao_id? null : n.notificacao_id)
    }

    const fecharComprovante = () => { if (comprovante) URL.revokeObjectURL(comprovante.url); setComprovante(null) }
    const abrirComprovante = async (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        setOpeningId(faltaId)
        try {
            const res = await fetch(url); if (!res.ok) throw new Error('Falha')
            const blob = await res.blob()
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch (e: any) { toast.error(e?.message) } finally { setOpeningId(null) }
    }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar') => {
        if (!faltaId) return; setActingId(faltaId)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success('Feito'); setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }
    const handleAtraso = async (funcId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        if (!funcId) return; setActingId(funcId)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar`, { aplicado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success('Feito'); setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    if (loading) return <div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/40" /></div>

    return (
        <>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Bell className="w-4 h-4 text-black" /></div>
                            <p className="text-[13px] font-bold text-black">Notificações • {ativas.length}</p>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-[260px]">
                                <Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full h-[36px] bg-white border border-gray-200 rounded-full pl-8 pr-3 text-[12px] focus:outline-none focus:border-black" />
                            </div>
                            <div className="flex bg-white border border-gray-200 rounded-full p-1">
                                <button onClick={() => setTab('ativas')} className={`px-3 py-1 rounded-full text-[11px] font-bold ${tab === 'ativas'? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                                <button onClick={() => setTab('historico')} className={`px-3 py-1 rounded-full text-[11px] font-bold ${tab === 'historico'? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
                    {filtered.map((n: any) => {
                        const isExpanded = expandedId === n.notificacao_id
                        const isAtraso = n.tipo === 'atraso_excedido'
                        const func = n.funcionario
                        const nome = func?.nome || 'Funcionário'
                        const motivo = getMotivo(n)
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || '')
                        const justificacao = n.falta?.justificativa_obs || ''
                        const temAnexo =!!n.falta?.justificativa_anexo_url
                        const isPending = n.status_notificacao === 'pendente'
                        const isNew =!n.lida &&!viewedIds.has(n.notificacao_id) && isPending

                        return (
                            <div key={n.notificacao_id} className={`px-3 md:px-4 py-3 border-b last:border-b-0 transition ${isNew? 'bg-[#F0F8FF]' : 'bg-white hover:bg-gray-50'}`}>
                                <div className="flex justify-between items-start gap-2">
                                    {/* ESQUERDA - Nome · Admin · tempo */}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px] text-black truncate">
                                            <span className="font-bold">{nome}</span>
                                            <span className="font-normal text-black/60"> · Admin</span>
                                            <span className="font-normal text-black/60"> · {formatarTempoAdmin(n.created_at)}</span>
                                        </p>
                                    </div>
                                    {/* DIREITA - Data + menu 3 barras */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[12px] text-black/60 font-medium">{formatarDataCurta(n.created_at)}</span>
                                        <button onClick={() => handleExpand(n)} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                                            <Menu className="w-4 h-4 text-black" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] border font-medium ${isAtraso? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        Falta aplicada por motivo de: {motivo}
                                    </span>
                                </div>

                                {/* Doc: Atestado - azul, não negritado */}
                                {!isAtraso && (
                                    <div className="mt-2 space-y-1">
                                        <p className="text-[12px] text-black/70">
                                            Doc: <span className="text-[#0095ff] font-normal">{tipoJust || 'Atestado'}</span>
                                        </p>
                                        {justificacao && (
                                            <p className="text-[12px] text-black/70 leading-5">{justificacao}</p>
                                        )}
                                    </div>
                                )}

                                {isAtraso && (
                                    <p className="text-[11px] text-black/60 mt-1.5">{n.qtd_atrasos} atrasos • Regra: {n.qtd_para_falta} = 1 falta</p>
                                )}

                                {isExpanded && isPending && (
                                    <div className="mt-3 grid grid-cols-1 gap-2">
                                        <button disabled={!!actingId} onClick={() => isAtraso? handleAtraso(func?.id, 'ignorar') : handleFalta(n.falta?.id, 'rejeitar')} className="w-full h-[40px] rounded-full bg-white border border-red-200 text-red-600 text-[13px] font-bold hover:bg-red-50 flex items-center justify-center gap-1.5">
                                            <X className="w-4 h-4" /> Rejeitar
                                        </button>
                                        <button disabled={!!actingId} onClick={() => isAtraso? handleAtraso(func?.id, 'aplicar') : handleFalta(n.falta?.id, 'aprovar')} className="w-full h-[40px] rounded-full bg-[#0095ff] text-white text-[13px] font-bold hover:bg-[#0085e6] flex items-center justify-center gap-1.5">
                                            <Check className="w-4 h-4" /> {isAtraso? 'Aplicar falta' : 'Abonar falta'}
                                        </button>
                                        {temAnexo && (
                                            <button disabled={!!openingId} onClick={() => abrirComprovante(n.falta.id)} className="w-full h-[40px] rounded-full bg-black text-white text-[13px] font-bold flex items-center justify-center gap-1.5">
                                                <Eye className="w-4 h-4" /> Ver comprovante
                                            </button>
                                        )}
                                        <button onClick={() => isAtraso? handleAtraso(func?.id, 'encaminhar') : handleFalta(n.falta?.id, 'encaminhar')} className="w-full h-[40px] rounded-full bg-white border border-gray-200 text-black text-[13px] font-bold flex items-center justify-center gap-1.5">
                                            <ArrowUpRight className="w-4 h-4" /> Admin
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {comprovante && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={fecharComprovante}>
                    <div className="bg-white rounded-[16px] w-full max-w-3xl h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="h-11 px-4 flex items-center justify-between border-b bg-gray-50">
                            <span className="text-[13px] font-bold">Documento</span>
                            <button onClick={fecharComprovante} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="h-[calc(100%-44px)] bg-gray-100 p-2">
                            {comprovante.type === 'application/pdf'? <iframe src={comprovante.url} className="w-full h-full bg-white rounded-[8px]" /> : <img src={comprovante.url} className="w-full h-full object-contain bg-white rounded-[8px]" />}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
