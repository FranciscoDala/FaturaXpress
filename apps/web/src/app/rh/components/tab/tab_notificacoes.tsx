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
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
    const [search, setSearch] = useState('')
    const [comprovante, setComprovante] = useState<{ url: string, type: string } | null>(null)
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
    const firstLoad = useRef(true)
    const area = cargoAtual === 'admin'? 'admin' : 'rh'

    const formatarTexto = (texto: string) => {
        if (!texto) return ''
        const mapa: Record<string, string> = { 'NAO_APARECEU': 'Não apareceu', 'DOENTE': 'Doente', 'ATESTADO': 'Atestado', 'ATESTADO_MEDICO': 'Atestado médico', 'OUTROS': 'Outros' }
        const upper = texto.toUpperCase().trim()
        if (mapa[upper]) return mapa[upper]
        return texto.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
    }
    const getMotivo = (n: any) => {
        if (n.tipo === 'atraso_excedido') return `${n.qtd_atrasos} atrasos`
        const raw = (n.falta?.motivo || '').split('|')[0].trim()
        return formatarTexto(raw.replace(/^(FALTA|OUTROS)\s*/i,'').trim() || raw) || 'Não informado'
    }
    const formatarTempo = (iso: string) => {
        if (!iso) return 'agora'
        const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
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
        return m <= 1? 'há 1 mês' : `há ${m} meses`
    }
    const formatarDataCurta = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
    }

    const fetchNotifs = useCallback(async (silent = false) => {
        if (!silent && firstLoad.current) setLoading(true)
        try { const { data } = await api.get(`/api/rh/notificacoes?area=${area}`); setNotifs(Array.isArray(data)? data : []) }
        catch { if (!silent) toast.error('Erro') }
        finally { setLoading(false); firstLoad.current = false }
    }, [area])
    useEffect(() => { fetchNotifs(false) }, [fetchNotifs])

    // SÓ VAI PRO HISTORICO DEPOIS DE ACEITE, REJEITADA OU IGNORADA
    const ativas = notifs.filter(n => n.status_notificacao === 'pendente')
    const historico = notifs.filter(n => n.status_notificacao!== 'pendente') // aprovada, rejeitada, ignorada

    const filtered = useMemo(() => {
        const list = tab === 'ativas'? ativas : historico
        if (!search.trim()) return list
        const s = search.toLowerCase()
        return list.filter(n => (n.funcionario?.nome || '').toLowerCase().includes(s))
    }, [ativas, historico, tab, search])

    const marcarComoLida = async (id: string) => {
        if (viewedIds.has(id)) return
        setViewedIds(p => new Set(p).add(id))
        try { await api.post(`/api/rh/notificacoes/${id}/lida`) } catch {}
    }
    const handleExpand = (n: any) => {
        if (!n.lida &&!viewedIds.has(n.notificacao_id) && n.status_notificacao === 'pendente') marcarComoLida(n.notificacao_id)
        if (openSwipeId) setOpenSwipeId(null)
        setExpandedId(expandedId === n.notificacao_id? null : n.notificacao_id)
    }

    const fecharComprovante = () => { if (comprovante) URL.revokeObjectURL(comprovante.url); setComprovante(null) }
    const abrirComprovante = async (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        setOpeningId(faltaId)
        try { const res = await fetch(url); if (!res.ok) throw new Error('Falha'); const blob = await res.blob(); setComprovante({ url: URL.createObjectURL(blob), type: blob.type }) }
        catch (e: any) { toast.error(e?.message) } finally { setOpeningId(null) }
    }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar') => {
        setActingId(faltaId)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success('Feito'); setExpandedId(null); setOpenSwipeId(null); await fetchNotifs(true)
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }
    const handleAtraso = async (funcId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        setActingId(funcId)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar`, { aplicado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success('Feito'); setExpandedId(null); setOpenSwipeId(null); await fetchNotifs(true)
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    if (loading) return <div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/40" /></div>

    return (
        <>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Bell className="w-4 h-4" /></div>
                        <p className="text-[13px] font-bold">Notificações • {ativas.length}</p>
                    </div>
                    <div className="flex bg-white border rounded-full p-1">
                        <button onClick={() => setTab('ativas')} className={`px-3 py-1 rounded-full text-[11px] font-bold ${tab === 'ativas'? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                        <button onClick={() => setTab('historico')} className={`px-3 py-1 rounded-full text-[11px] font-bold ${tab === 'historico'? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                    </div>
                </div>

                <div className="max-h-[75vh] overflow-y-auto">
                    {filtered.map((n: any) => {
                        const isAtraso = n.tipo === 'atraso_excedido'
                        const func = n.funcionario
                        const nome = func?.nome || 'Funcionário'
                        const motivo = getMotivo(n)
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || '')
                        const justificacao = n.falta?.justificativa_obs || ''
                        const temAnexo =!!n.falta?.justificativa_anexo_url
                        const isPending = n.status_notificacao === 'pendente'
                        const isNew =!n.lida &&!viewedIds.has(n.notificacao_id) && isPending
                        const isExpanded = expandedId === n.notificacao_id
                        const isSwipeOpen = openSwipeId === n.notificacao_id

                        return (
                            <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isSwipeOpen={isSwipeOpen} setOpenSwipeId={setOpenSwipeId} setExpandedId={setExpandedId}>
                                <div className={`relative px-3 py-2.5 border-b last:border-b-0 ${isNew? 'bg-[#F0F8FF]' : 'bg-white'}`}>
                                    {/* SWIPE ACTIONS - MOBILE */}
                                    <div className="absolute inset-y-0 right-0 w-[76%] md:hidden flex items-center justify-end gap-2 pr-3 bg-[#F0F8FF]">
                                        {isPending && (
                                            <>
                                                <button onTouchEnd={e => e.stopPropagation()} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="w-11 h-11 rounded-full bg-white border border-red-200 text-red-600 flex items-center justify-center shadow"><X className="w-5 h-5" /></button>
                                                <button onTouchEnd={e => e.stopPropagation()} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="w-11 h-11 rounded-full bg-[#0095ff] text-white flex items-center justify-center shadow"><Check className="w-5 h-5" /></button>
                                                {temAnexo && <button onTouchEnd={e => e.stopPropagation()} onClick={() => abrirComprovante(n.falta.id)} className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center shadow"><Eye className="w-5 h-5" /></button>}
                                            </>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-start relative z-10 bg-inherit">
                                        <div className="min-w-0 pr-2 leading-tight">
                                            <p className="text-[13px] leading-[18px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                            <div className="mt-1 flex">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-medium leading-none ${isAtraso? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                                    Motivo da falta: {motivo}
                                                </span>
                                            </div>
                                            {!isAtraso && (
                                                <div className="mt-1.5 leading-[17px]">
                                                    <p className="text-[12px] text-black/70 leading-[17px]">Doc: <span className="text-[#0095ff]">{tipoJust || 'Atestado'}</span></p>
                                                    {justificacao && <p className="text-[12px] text-black/70 leading-[17px] mt-1">{justificacao}</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className="text-[12px] text-black/70 font-medium leading-none">{formatarDataCurta(n.created_at)}</span>
                                            {/* 3 BARRAS SÓ NO DESKTOP */}
                                            <button onClick={() => handleExpand(n)} className="hidden md:flex w-7 h-7 rounded-full bg-white border shadow-sm items-center justify-center hover:bg-gray-50">
                                                <Menu className="w-4 h-4" />
                                            </button>
                                            {/* NO MOBILE APARECE DICA DE ARRASTAR */}
                                            <span className="md:hidden text-[10px] text-black/30 mt-1">arrastar</span>
                                        </div>
                                    </div>

                                    {/* DROPDOWN DESKTOP */}
                                    {isExpanded && isPending && (
                                        <div className="hidden md:block absolute right-2 top-14 z-20 w-[190px] bg-white border rounded-[12px] shadow-xl p-2">
                                            <button onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="w-full h-9 rounded-full bg-[#0095ff] text-white text-[12px] font-bold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Abonar</button>
                                            <button onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="w-full mt-1.5 h-9 rounded-full bg-white border border-red-200 text-red-600 text-[12px] font-bold flex items-center justify-center gap-1.5"><X className="w-4 h-4" /> Rejeitar</button>
                                            {temAnexo && <button onClick={() => abrirComprovante(n.falta.id)} className="w-full mt-1.5 h-9 rounded-full bg-black text-white text-[12px] font-bold flex items-center justify-center gap-1.5"><Eye className="w-4 h-4" /> Ver</button>}
                                            <button onClick={() => handleFalta(n.falta?.id, 'encaminhar')} className="w-full mt-1.5 h-9 rounded-full bg-white border text-[12px] font-bold flex items-center justify-center gap-1.5"><ArrowUpRight className="w-4 h-4" /> Admin</button>
                                        </div>
                                    )}
                                </div>
                            </SwipeCard>
                        )
                    })}
                </div>
            </div>

            {comprovante && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={fecharComprovante}>
                    <div className="bg-white rounded-[16px] w-full max-w-3xl h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="h-11 px-4 flex items-center justify-between border-b bg-gray-50"><span className="text-[13px] font-bold">Documento</span><button onClick={fecharComprovante} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                        <div className="h-[calc(100%-44px)] bg-gray-100 p-2">
                            {comprovante.type === 'application/pdf'? <iframe src={comprovante.url} className="w-full h-full bg-white rounded-[8px]" /> : <img src={comprovante.url} className="w-full h-full object-contain bg-white rounded-[8px]" />}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function SwipeCard({ children, id, isSwipeOpen, setOpenSwipeId, setExpandedId }: any) {
    const [tx, setTx] = useState(0)
    const startX = useRef(0)
    const isDragging = useRef(false)

    useEffect(() => { if (!isSwipeOpen) setTx(0) }, [isSwipeOpen])
    useEffect(() => { if (isSwipeOpen) setTx(-140) }, [])

    const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; isDragging.current = true }
    const onTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return
        const diff = e.touches[0].clientX - startX.current
        if (diff < 0) { setTx(Math.max(diff, -160)) } // só arrasta pra esquerda
        if (diff > 20 && isSwipeOpen) setTx(diff - 160)
    }
    const onTouchEnd = () => {
        isDragging.current = false
        if (tx < -60) { setTx(-140); setOpenSwipeId(id); setExpandedId(null) }
        else { setTx(0); setOpenSwipeId(null) }
    }

    return (
        <div className="relative overflow-hidden touch-pan-y" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={() => { if (isSwipeOpen) { setTx(0); setOpenSwipeId(null) } }}>
            <div className="transition-transform duration-200 ease-out will-change-transform bg-white" style={{ transform: `translateX(${isSwipeOpen? -140 : tx}px)` }}>
                {children}
            </div>
        </div>
    )
}
