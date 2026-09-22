import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Loader2, Check, X, Eye, Bell, Menu } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../lib/api'

type Props = { cargoAtual: string }

export default function TabNotificacoes({ cargoAtual }: Props) {
    const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actingId, setActingId] = useState<string | null>(null)
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
        if (d < 7) return `há ${d}d`
        if (d < 14) return 'há 1 semana'
        return `há ${Math.floor(d/7)} sem`
    }
    const formatarDataCurta = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
    }

    const fetchNotifs = useCallback(async () => {
        if (firstLoad.current) setLoading(true)
        try { const { data } = await api.get(`/api/rh/notificacoes?area=${area}`); setNotifs(Array.isArray(data)? data : []) }
        catch { toast.error('Erro') }
        finally { setLoading(false); firstLoad.current = false }
    }, [area])
    useEffect(() => { fetchNotifs() }, [fetchNotifs])

    // CORREÇÃO DO HISTÓRICO - só vai pro historico se foi resolvida de verdade
    const { ativas, historico } = useMemo(() => {
        const resolvidas = ['aprovada','aprovado','rejeitada','rejeitado','ignorada','ignorado','abonada','abonado']
        const at: any[] = []
        const hist: any[] = []
        notifs.forEach(n => {
            const s = (n.status_notificacao || n.status || '').toLowerCase()
            if (resolvidas.includes(s)) hist.push(n)
            else at.push(n) // tudo que é pendente fica em ativas
        })
        return { ativas: at, historico: hist }
    }, [notifs])

    const filtered = tab === 'ativas'? ativas : historico

    const abrirComprovante = async (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        try { const res = await fetch(url); if (!res.ok) throw new Error(''); const blob = await res.blob(); setComprovante({ url: URL.createObjectURL(blob), type: blob.type }) }
        catch { toast.error('Sem anexo') }
    }
    const fecharComprovante = () => { if (comprovante) URL.revokeObjectURL(comprovante.url); setComprovante(null) }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar') => {
        if (!faltaId) return; setActingId(faltaId)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            else await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            toast.success(acao === 'aprovar'? 'Abonada' : 'Rejeitada')
            setOpenSwipeId(null)
            await fetchNotifs()
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    if (loading) return <div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>

    return (
        <>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Bell className="w-4 h-4 text-black" /></div>
                        <p className="text-[14px] font-bold text-black">Notificações</p>
                    </div>
                    <div className="flex bg-white border border-gray-200 rounded-full p-1">
                        <button onClick={() => { setTab('ativas'); setOpenSwipeId(null) }} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'ativas'? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                        <button onClick={() => { setTab('historico'); setOpenSwipeId(null) }} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'historico'? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                    </div>
                </div>

                <div className="max-h-[75vh] overflow-y-auto no-scrollbar">
                    {filtered.length === 0 && <p className="py-12 text-center text-[12px] text-black/50">Nenhuma notificação em {tab}</p>}
                    {filtered.map((n: any) => {
                        const nome = n.funcionario?.nome || 'Funcionário'
                        const motivo = getMotivo(n)
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || 'Atestado')
                        const justificacao = n.falta?.justificativa_obs || ''
                        const temAnexo =!!n.falta?.justificativa_anexo_url
                        const isNew =!n.lida &&!viewedIds.has(n.notificacao_id) && tab === 'ativas'

                        return (
                            <div key={n.notificacao_id} className="relative border-b last:border-b-0 bg-[#F0F8FF] overflow-hidden">
                                {/* FUNDO FIXO - TAMANHO DOS BTNS */}
                                <div className="absolute top-0 right-0 bottom-0 w-[160px] flex items-center justify-end gap-2 pr-3 bg-[#E8F2FF]">
                                    <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="w-10 h-10 rounded-full bg-white border shadow flex items-center justify-center text-red-600"><X className="w-5 h-5" /></button>
                                    <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="w-10 h-10 rounded-full bg-[#0095ff] shadow flex items-center justify-center text-white"><Check className="w-5 h-5" /></button>
                                    {temAnexo && <button onClick={() => abrirComprovante(n.falta.id)} className="w-10 h-10 rounded-full bg-black shadow flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}
                                </div>

                                <SwipeRow id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId} onView={() => { if (!n.lida) { setViewedIds(p=>new Set(p).add(n.notificacao_id)); api.post(`/api/rh/notificacoes/${n.notificacao_id}/lida`).catch(()=>{}) } }}>
                                    <div className={`px-3 py-2.5 ${isNew? 'bg-[#F0F8FF]' : 'bg-white'}`}>
                                        <div className="flex justify-between gap-2">
                                            <div className="min-w-0 flex-1 leading-tight">
                                                <p className="text-[13px] leading-[16px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                                <div className="mt-1"><span className="inline-flex px-2.5 py-1 rounded-full text-[11px] border bg-red-50 border-red-200 text-red-700 font-medium leading-none">Motivo da falta: {motivo}</span></div>
                                                <p className="text-[12px] leading-[16px] text-black/70 mt-1.5">Doc: <span className="text-[#0095ff]">{tipoJust}</span></p>
                                                {justificacao && <p className="text-[12px] leading-[16px] text-black/60 mt-1">{justificacao}</p>}
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span className="text-[12px] text-black/70">{formatarDataCurta(n.created_at)}</span>
                                                {tab === 'ativas' && (
                                                    <button onClick={() => setOpenSwipeId(openSwipeId === n.notificacao_id? null : n.notificacao_id)} className="w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center md:flex">
                                                        <Menu className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </SwipeRow>
                            </div>
                        )
                    })}
                </div>
            </div>

            {comprovante && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={fecharComprovante}>
                    <div className="bg-white rounded-[16px] w-full max-w-3xl h-[80vh] overflow-hidden" onClick={e=>e.stopPropagation()}>
                        <div className="h-11 px-4 flex items-center justify-between border-b"><span className="text-[13px] font-bold">Documento</span><button onClick={fecharComprovante} className="w-8 h-8 rounded-full border flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                        <div className="h-[calc(100%-44px)] bg-gray-100 p-2">
                            {comprovante.type === 'application/pdf'? <iframe src={comprovante.url} className="w-full h-full bg-white rounded-[8px]" /> : <img src={comprovante.url} className="w-full h-full object-contain bg-white rounded-[8px]" />}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function SwipeRow({ children, id, isOpen, setOpen, onView }: any) {
    const [tx, setTx] = useState(0)
    const startX = useRef<number | null>(null)

    useEffect(() => { setTx(isOpen? -160 : 0) }, [isOpen])

    const onStart = (x: number) => { startX.current = x }
    const onMove = (x: number) => {
        if (startX.current === null) return
        const diff = x - startX.current
        if (diff < 0) setTx(Math.max(diff, -160))
        if (diff > 30 && isOpen) setTx(-160 + diff)
    }
    const onEnd = () => {
        if (startX.current === null) return
        if (tx < -70) { setOpen(id); onView?.() } else { setOpen(null); setTx(0) }
        startX.current = null
    }

    return (
        <div
            className="bg-white will-change-transform"
            style={{ transform: `translateX(${tx}px)`, transition: startX.current === null? 'transform 0.22s cubic-bezier(.2,.8,.2,1)' : 'none' }}
            onTouchStart={e => onStart(e.touches[0].clientX)}
            onTouchMove={e => onMove(e.touches[0].clientX)}
            onTouchEnd={onEnd}
            onMouseDown={e => onStart(e.clientX)}
            onMouseMove={e => { if (e.buttons === 1) onMove(e.clientX) }}
            onMouseUp={onEnd}
            onMouseLeave={onEnd}
        >
            {children}
        </div>
    )
}
