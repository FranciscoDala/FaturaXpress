import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Search, Loader2, Check, X, Eye, Bell, Menu } from 'lucide-react'
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
    const [comprovante, setComprovante] = useState<{ url: string, type: string } | null>(null)
    const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
    const firstLoad = useRef(true)
    const area = cargoAtual === 'admin'? 'admin' : 'rh'

    const formatarTexto = (t: string) => {
        if (!t) return ''
        const mapa: any = { 'NAO_APARECEU': 'Não apareceu', 'DOENTE': 'Doente', 'ATESTADO': 'Atestado', 'ATESTADO_MEDICO': 'Atestado médico', 'LICENCA': 'Licença' }
        const u = t.toUpperCase().trim()
        if (mapa[u]) return mapa[u]
        return t.replace(/_/g,' ').toLowerCase().replace(/(^\w|\s\w)/g, s=>s.toUpperCase())
    }
    const getMotivo = (n: any) => {
        const raw = (n.falta?.motivo || '').split('|')[0].trim()
        return formatarTexto(raw.replace(/^(FALTA|OUTROS)\s*/i,'').trim() || raw) || 'Não informado'
    }
    const formatarTempo = (iso: string) => {
        if (!iso) return 'agora'
        const min = Math.floor((Date.now() - new Date(iso).getTime())/60000)
        if (min < 1) return 'agora'
        if (min < 60) return `há ${min}min`
        const h = Math.floor(min/60)
        if (h < 24) return `há ${h}h`
        const d = Math.floor(h/24)
        if (d === 1) return 'há 1d'
        if (d < 7) return `há ${d}d`
        if (d < 14) return 'há 1 semana'
        if (d < 21) return 'há 2 semanas'
        if (d < 28) return 'há 3 semanas'
        return `há ${Math.floor(d/30)} mês`
    }
    const formatarDataCurta = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
    }

    const fetchNotifs = useCallback(async () => {
        if (firstLoad.current) setLoading(true)
        try { const { data } = await api.get(`/api/rh/notificacoes?area=${area}`); setNotifs(Array.isArray(data)? data : []) }
        catch { toast.error('Erro ao carregar') }
        finally { setLoading(false); firstLoad.current = false }
    }, [area])

    useEffect(() => { fetchNotifs() }, [fetchNotifs])

    // REGRA QUE VOCÊ PEDIU: só vai pro historico se foi aceite, rejeitada ou ignorada
    const ativas = useMemo(() => {
        return notifs.filter(n => {
            const sNotif = (n.status_notificacao || '').toLowerCase()
            const sFalta = (n.falta?.status || '').toLowerCase()
            // se ainda é pendente / justificada / aguardando, fica em ativas
            return sNotif === 'pendente' || sFalta === 'pendente' || sFalta === 'justificada' || sFalta === 'aguardando'
        })
    }, [notifs])

    const historico = useMemo(() => {
        return notifs.filter(n =>!ativas.includes(n))
    }, [notifs, ativas])

    const filtered = tab === 'ativas'? ativas : historico

    const marcarComoLida = async (id: string) => {
        if (viewedIds.has(id)) return
        setViewedIds(p => new Set(p).add(id))
        try { await api.post(`/api/rh/notificacoes/${id}/lida`) } catch {}
    }

    const handleExpand = (n: any) => {
        if (!n.lida &&!viewedIds.has(n.notificacao_id)) marcarComoLida(n.notificacao_id)
        setOpenSwipeId(null)
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

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar') => {
        if (!faltaId) return; setActingId(faltaId)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            else await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            toast.success(acao === 'aprovar'? 'Abonada' : 'Rejeitada')
            setExpandedId(null); setOpenSwipeId(null)
            await fetchNotifs()
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    if (loading) return <div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/40" /></div>

    return (
        <>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                {/* HEADER - TITULO VISIVEL SEM CONTADOR */}
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Bell className="w-4 h-4 text-black" /></div>
                        <p className="text-[14px] font-bold text-black">Notificações</p>
                    </div>
                    <div className="flex bg-white border border-gray-200 rounded-full p-1">
                        <button onClick={() => setTab('ativas')} className={`px-4 py-1 rounded-full text-[12px] font-bold transition ${tab === 'ativas'? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                        <button onClick={() => setTab('historico')} className={`px-4 py-1 rounded-full text-[12px] font-bold transition ${tab === 'historico'? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto no-scrollbar overscroll-contain">
                    {filtered.length === 0 && <p className="text-center py-10 text-[12px] text-black/50">{tab === 'ativas'? 'Nenhuma notificação ativa' : 'Histórico vazio'}</p>}
                    {filtered.map((n: any) => {
                        const nome = n.funcionario?.nome || 'Funcionário'
                        const motivo = getMotivo(n)
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || 'Atestado')
                        const justificacao = n.falta?.justificativa_obs || ''
                        const temAnexo =!!n.falta?.justificativa_anexo_url
                        const isPending = ativas.includes(n)
                        const isNew =!n.lida &&!viewedIds.has(n.notificacao_id) && isPending
                        const isExpanded = expandedId === n.notificacao_id
                        const isSwipeOpen = openSwipeId === n.notificacao_id

                        return (
                            <div key={n.notificacao_id} className="relative border-b last:border-b-0 overflow-hidden">
                                {/* FUNDO DOS BTNS - APARECE AO ARRASTAR NO CELULAR */}
                                <div className="absolute inset-0 bg-[#EEF5FF] flex items-center justify-end pr-3 gap-2">
                                    <button onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="h-10 w-10 rounded-full bg-white border border-red-200 text-red-600 flex items-center justify-center"><X className="w-5 h-5" /></button>
                                    <button onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="h-10 w-10 rounded-full bg-[#0095ff] text-white flex items-center justify-center"><Check className="w-5 h-5" /></button>
                                    {temAnexo && <button onClick={() => abrirComprovante(n.falta.id)} className="h-10 w-10 rounded-full bg-black text-white flex items-center justify-center"><Eye className="w-5 h-5" /></button>}
                                </div>

                                <SwipeRow id={n.notificacao_id} isOpen={isSwipeOpen} setOpen={setOpenSwipeId} onCloseOther={() => setExpandedId(null)}>
                                    <div className={`relative bg-white px-3 py-2.5 ${isNew? 'bg-[#F0F8FF]' : 'bg-white'}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0 flex-1 leading-tight">
                                                <p className="text-[13px] leading-[16px] truncate">
                                                    <span className="font-bold text-black">{nome}</span>
                                                    <span className="text-black/60 font-normal"> · {formatarTempo(n.created_at)}</span>
                                                </p>
                                                <div className="mt-1">
                                                    <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] border font-medium leading-none bg-red-50 border-red-200 text-red-700">
                                                        Motivo da falta: {motivo}
                                                    </span>
                                                </div>
                                                <div className="mt-1.5 leading-[16px]">
                                                    <p className="text-[12px] leading-[16px] text-black/70">Doc: <span className="text-[#0095ff]">{tipoJust}</span></p>
                                                    {justificacao && <p className="text-[12px] leading-[16px] text-black/60 mt-1">{justificacao}</p>}
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className="text-[12px] text-black/70 leading-none">{formatarDataCurta(n.created_at)}</span>
                                                {isPending && (
                                                    <button onClick={() => handleExpand(n)} className="hidden md:flex w-7 h-7 rounded-full bg-white border shadow-sm items-center justify-center">
                                                        <Menu className="w-4 h-4 text-black" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* DROPDOWN DESKTOP */}
                                        {isExpanded && isPending && (
                                            <div className="hidden md:block absolute right-2 top-[52px] z-20 w-[200px] bg-white border rounded-[12px] shadow-xl p-2">
                                                <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="w-full h-9 rounded-full bg-[#0095ff] text-white text-[12px] font-bold">Abonar falta</button>
                                                <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="w-full mt-2 h-9 rounded-full bg-white border border-red-200 text-red-600 text-[12px] font-bold">Rejeitar</button>
                                                {temAnexo && <button disabled={!!openingId} onClick={() => abrirComprovante(n.falta.id)} className="w-full mt-2 h-9 rounded-full bg-black text-white text-[12px] font-bold">Ver comprovante</button>}
                                            </div>
                                        )}
                                    </div>
                                </SwipeRow>
                            </div>
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

function SwipeRow({ children, id, isOpen, setOpen, onCloseOther }: any) {
    const [tx, setTx] = useState(0)
    const startX = useRef<number | null>(null)

    useEffect(() => { setTx(isOpen? -132 : 0) }, [isOpen])

    const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX }
    const onTouchMove = (e: React.TouchEvent) => {
        if (startX.current === null) return
        const diff = e.touches[0].clientX - startX.current
        if (diff < 0) setTx(Math.max(diff, -140))
        if (diff > 0 && isOpen) setTx(-140 + diff)
    }
    const onTouchEnd = () => {
        if (startX.current === null) return
        if (tx < -60) { setOpen(id); onCloseOther?.() }
        else { setOpen(null); setTx(0) }
        startX.current = null
    }

    return (
        <div
            className="relative bg-white will-change-transform"
            style={{ transform: `translateX(${tx}px)`, transition: startX.current === null? 'transform 0.2s ease-out' : 'none' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {children}
        </div>
    )
}
