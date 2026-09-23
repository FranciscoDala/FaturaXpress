import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Loader2, Check, X, Eye, Bell, Menu, Send, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../../lib/api'

type Props = { cargoAtual: string }

export default function TabNotificacoes({ cargoAtual }: Props) {
    const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actingId, setActingId] = useState<string | null>(null)
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
    const [comprovante, setComprovante] = useState<{ url: string, type: string } | null>(null)
    const [diasVisiveis, setDiasVisiveis] = useState(1)
    const [ignoreModal, setIgnoreModal] = useState<any | null>(null)
    const firstLoad = useRef(true)
    const area = cargoAtual === 'admin'? 'admin' : 'rh'
    const listRef = useRef<HTMLDivElement>(null)

    const formatarTexto = (t: string) => {
        if (!t) return ''
        const mapa: any = { 'NAO_APARECEU': 'Não apareceu', 'DOENTE': 'Doente', 'ATESTADO': 'Atestado', 'DECLARACAO': 'Declaração' }
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
        return `há ${Math.floor(d/7)} sem`
    }
    const formatarDataCurta = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`
    }
    const getDataChave = (iso: string) => {
        const d = new Date(iso)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    }

    const fetchNotifs = useCallback(async () => {
        if (firstLoad.current) setLoading(true)
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}`);
            setNotifs(Array.isArray(data)? data : [])
        } catch {}
        finally { setLoading(false); firstLoad.current = false }
    }, [area])
    useEffect(() => { fetchNotifs(); const i = setInterval(fetchNotifs, 30000); return () => clearInterval(i) }, [fetchNotifs])

    const getAlertStyle = (n: any) => {
        const s = (n.status_notificacao || n.status || n.falta?.status || '').toLowerCase()
        if (['aprovada','aprovado','justificado','abonada'].includes(s)) return { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-800 border-green-200', label: 'Falta justificada' }
        if (['rejeitada','rejeitado'].includes(s)) return { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Justificação não aceite' }
        if (['aguardando_admin','encaminhado_admin','encaminhada','encaminhado'].includes(s)) return { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Encaminhada para o admin' }
        if (['ignorado','ignorada'].includes(s)) return { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Notificação ignorada' }
        return { bg: 'bg-white', border: 'border-gray-200', badge: 'bg-gray-100 text-black border-gray-200', label: `Falta: ${getMotivo(n)}` }
    }

    const getStatusKey = (n: any) => (n.status_notificacao || n.status || n.falta?.status || 'pendente').toLowerCase()

    const { ativas, historico } = useMemo(() => {
        const at = [...notifs].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const limite = new Date(); limite.setDate(limite.getDate() - 7)
        const hist = notifs.filter(n => {
            const s = getStatusKey(n)
            const resolvida = ['aprovada','aprovado','justificado','abonada','rejeitada','rejeitado','ignorado','ignorada','aguardando_admin','encaminhado_admin','encaminhada','encaminhado'].includes(s)
            if (!resolvida) return false
            return new Date(n.updated_at || n.created_at) >= limite
        })
        return { ativas: at, historico: hist }
    }, [notifs])

    const historicoAgrupado = useMemo(() => {
        const grupos: Record<string, any[]> = {}
        historico.forEach(n => {
            const chave = getDataChave(n.updated_at || n.created_at)
            if (!grupos[chave]) grupos[chave] = []
            grupos[chave].push(n)
        })
        const ordenado = Object.entries(grupos).sort((a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
        return ordenado.slice(0, diasVisiveis)
    }, [historico, diasVisiveis])

    const onScroll = () => {
        if (!listRef.current || tab!== 'historico') return
        const { scrollTop, scrollHeight, clientHeight } = listRef.current
        if (scrollHeight - scrollTop - clientHeight < 120) {
            if (diasVisiveis < 7) setDiasVisiveis(d => d + 1)
        }
    }

    const abrirComprovante = async (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        try { const res = await fetch(url); if (!res.ok) throw new Error(); const blob = await res.blob(); setComprovante({ url: URL.createObjectURL(blob), type: blob.type }) }
        catch { toast.error('Sem anexo') }
    }
    const fecharComprovante = () => { if (comprovante) URL.revokeObjectURL(comprovante.url); setComprovante(null) }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar' | 'ignorar') => {
        if (!faltaId) return;
        setActingId(faltaId)
        const statusMap: any = { aprovar: 'aprovada', rejeitar: 'rejeitada', encaminhar: 'encaminhada', ignorar: 'ignorada' }
        const nowIso = new Date().toISOString()
        setNotifs(prev => prev.map(n => n.falta?.id === faltaId? {...n, status_notificacao: statusMap[acao], updated_at: nowIso } : n))
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/falta/${faltaId}/ignorar`, { ignorado_por_id: logado?.id })
            toast.success(acao === 'aprovar'? 'Falta justificada' : acao === 'rejeitar'? 'Justificação não aceite' : acao === 'ignorar'? 'Ignorada' : 'Encaminhada para o admin')
            setOpenSwipeId(null);
            await fetchNotifs()
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Erro')
            await fetchNotifs()
        } finally { setActingId(null); setIgnoreModal(null) }
    }

    if (loading) return <div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>

    return (
        <>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Bell className="w-4 h-4" /></div>
                        <p className="text-[14px] font-bold text-black">Notificações</p>
                    </div>
                    <div className="flex bg-white border rounded-full p-1">
                        <button onClick={() => setTab('ativas')} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'ativas'? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                        <button onClick={() => { setTab('historico'); setDiasVisiveis(1) }} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'historico'? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                    </div>
                </div>

                <div ref={listRef} onScroll={onScroll} className="max-h-[75vh] overflow-y-auto no-scrollbar">
                    {tab === 'ativas' && (
                        <>
                            {ativas.length === 0 && <p className="py-12 text-center text-[12px] text-black/50">Nenhuma ativa</p>}
                            {ativas.map((n: any) => {
                                const nome = n.funcionario?.nome || 'Funcionário'
                                const style = getAlertStyle(n)
                                const status = getStatusKey(n)
                                const isAprovado = ['aprovada','aprovado','justificado','abonada'].includes(status)
                                const isEncaminhado = ['aguardando_admin','encaminhado_admin','encaminhada','encaminhado'].includes(status)
                                const isRejeitado = ['rejeitada','rejeitado'].includes(status)
                                const isIgnorado = ['ignorado','ignorada'].includes(status)
                                const temAnexo =!!n.falta?.justificativa_anexo_url

                                return (
                                    <SwipeCard
                                        key={n.notificacao_id}
                                        id={n.notificacao_id}
                                        isOpen={openSwipeId === n.notificacao_id}
                                        setOpen={setOpenSwipeId}
                                        onDoubleTap={() => {
                                            if (getStatusKey(n) === 'pendente' && n.falta?.id) {
                                                setIgnoreModal(n)
                                            }
                                        }}
                                        actions={
                                            <div className="absolute inset-y-0 right-0 w-[300px] bg-[#E8F2FF] flex items-center justify-center">
                                                <div className="flex items-center gap-3">
                                                    {/* PENDENTE e IGNORADO = todos */}
                                                    {!isAprovado &&!isEncaminhado &&!isRejeitado && (
                                                        <>
                                                            <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="w-11 h-11 rounded-full bg-white border shadow-sm flex items-center justify-center text-red-600 active:scale-90 transition-transform"><X className="w-5 h-5" /></button>
                                                            <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 shadow-sm flex items-center justify-center text-white active:scale-90 transition-transform"><Send className="w-[18px] h-[18px]" /></button>
                                                            <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="w-11 h-11 rounded-full bg-[#0095ff] shadow-sm flex items-center justify-center text-white active:scale-90 transition-transform"><Check className="w-5 h-5" /></button>
                                                            {temAnexo && <button onClick={() => abrirComprovante(n.falta.id)} className="w-11 h-11 rounded-full bg-black shadow-sm flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}
                                                        </>
                                                    )}
                                                    {/* ENCAMINHADO = view + encaminhar */}
                                                    {isEncaminhado && (
                                                        <>
                                                            {temAnexo && <button onClick={() => abrirComprovante(n.falta.id)} className="w-11 h-11 rounded-full bg-black shadow-sm flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}
                                                            <button disabled={!!actingId} onClick={() => handleFalta(n.falta?.id, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 shadow-sm flex items-center justify-center text-white active:scale-90 transition-transform"><Send className="w-[18px] h-[18px]" /></button>
                                                        </>
                                                    )}
                                                    {/* APROVADO e REJEITADO = só view */}
                                                    {(isAprovado || isRejeitado) && (
                                                        <>
                                                            {temAnexo? (
                                                                <button onClick={() => abrirComprovante(n.falta.id)} className="w-11 h-11 rounded-full bg-black shadow-sm flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>
                                                            ) : (
                                                                <span className="text-[11px] text-black/40">Sem anexo</span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        }
                                    >
                                        <div className={`px-3 py-2.5 ${style.bg} border-l-4 ${style.border}`}>
                                            <div className="flex justify-between gap-2">
                                                <div className="min-w-0 flex-1 leading-tight">
                                                    <p className="text-[13px] leading-[16px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                                    <div className="mt-1 flex flex-wrap gap-1">
                                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-medium leading-none ${style.badge}`}>{style.label}</span>
                                                    </div>
                                                    <p className="text-[12px] leading-[16px] text-black/70 mt-1.5">Doc: <span className="text-[#0095ff]">{formatarTexto(n.falta?.justificativa_tipo || 'Atestado')}</span></p>
                                                    {n.falta?.justificativa_obs && <p className="text-[12px] leading-[16px] text-black/60 mt-1">{n.falta.justificativa_obs}</p>}
                                                </div>
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <span className="text-[12px] text-black/70">{formatarDataCurta(n.created_at)}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id? null : n.notificacao_id)}} className="w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center"><Menu className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        </div>
                                    </SwipeCard>
                                )
                            })}
                        </>
                    )}

                    {tab === 'historico' && (
                        <>
                            {historicoAgrupado.length === 0 && <p className="py-12 text-center text-[12px] text-black/50">Histórico vazio (7 dias)</p>}
                            {historicoAgrupado.map(([dataChave, lista]) => {
                                const d = new Date(dataChave)
                                const hoje = new Date(); hoje.setHours(0,0,0,0)
                                const ontem = new Date(hoje); ontem.setDate(hoje.getDate()-1)
                                const isHoje = getDataChave(hoje.toISOString()) === dataChave
                                const isOntem = getDataChave(ontem.toISOString()) === dataChave
                                const label = isHoje? `HOJE • ${formatarDataCurta(d.toISOString())}` : isOntem? `ONTEM • ${formatarDataCurta(d.toISOString())}` : formatarDataCurta(d.toISOString()).toUpperCase()
                                return (
                                    <div key={dataChave}>
                                        <div className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur px-3 py-1.5 border-b">
                                            <p className="text-[11px] font-bold text-black/60 tracking-wide">{label}</p>
                                        </div>
                                        {lista.map((n: any) => {
                                            const style = getAlertStyle(n)
                                            const nome = n.funcionario?.nome || 'Funcionário'
                                            return (
                                                <div key={n.notificacao_id} className={`px-3 py-2.5 border-b last:border-b-0 ${style.bg} border-l-4 ${style.border}`}>
                                                    <div className="flex justify-between gap-2">
                                                        <div className="min-w-0 flex-1 leading-tight">
                                                            <p className="text-[13px] leading-[16px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                                            <div className="mt-1"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-medium leading-none ${style.badge}`}>{style.label}</span></div>
                                                            <p className="text-[11px] text-black/50 mt-1">{formatarDataCurta(n.updated_at || n.created_at)} • {new Date(n.updated_at || n.created_at).toLocaleTimeString('pt-AO', {hour:'2-digit', minute:'2-digit'})}</p>
                                                        </div>
                                                        <span className="text-[12px] text-black/70">{formatarDataCurta(n.updated_at || n.created_at)}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </>
                    )}
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

            {ignoreModal && (
                <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={() => setIgnoreModal(null)}>
                    <div className="bg-white rounded-[16px] border overflow-hidden w-full max-w-[340px] shadow-2xl" onClick={e=>e.stopPropagation()}>
                        <div className="px-4 py-3 bg-blue-50 border-l-4 border-blue-200 border-b">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center"><Ban className="w-4 h-4 text-blue-700" /></div>
                                <p className="text-[14px] font-bold text-blue-800">Ignorar notificação?</p>
                            </div>
                        </div>
                        <div className="p-4">
                            <p className="text-[13px] leading-[18px] text-black/70">Deseja ignorar a notificação de <span className="font-bold text-black">{ignoreModal.funcionario?.nome || 'Funcionário'} </span>?</p>
                            <div className="mt-4 flex gap-2">
                                <button onClick={() => setIgnoreModal(null)} className="flex-1 h-10 rounded-full border bg-white text-[13px] font-bold text-black">Cancelar</button>
                                <button disabled={!!actingId} onClick={() => handleFalta(ignoreModal.falta?.id, 'ignorar')} className="flex-1 h-10 rounded-full bg-black text-white text-[13px] font-bold flex items-center justify-center gap-2">
                                    {actingId? <Loader2 className="w-4 h-4 animate-spin" /> : null} Ignorar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

function SwipeCard({ children, id, isOpen, setOpen, swipeWidth = 300, actions, onDoubleTap }: any) {
    const cardRef = useRef<HTMLDivElement>(null)
    const startX = useRef(0)
    const startY = useRef(0)
    const curX = useRef(0)
    const dragging = useRef(false)
    const moved = useRef(false)
    const lastTap = useRef(0)
    const lastDoubleTap = useRef(0)

    const triggerDoubleTap = () => {
        const now = Date.now()
        if (now - lastDoubleTap.current < 500) return
        lastDoubleTap.current = now
        onDoubleTap?.()
    }

    const setTx = (x: number, anim = false) => {
        curX.current = x
        if (cardRef.current) {
            cardRef.current.style.transition = anim? 'transform 0.3s cubic-bezier(0.22,1,0.36,1)' : 'none'
            cardRef.current.style.transform = `translate3d(${x}px,0,0)`
        }
    }

    useEffect(() => { setTx(isOpen? -swipeWidth : 0, true) }, [isOpen, swipeWidth])

    const handleDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return
        dragging.current = true
        moved.current = false
        startX.current = e.clientX
        startY.current = e.clientY
        cardRef.current?.setPointerCapture(e.pointerId)
    }

    const handleMove = (e: React.PointerEvent) => {
        if (!dragging.current) return
        const dx = e.clientX - startX.current
        const dy = e.clientY - startY.current
        if (!moved.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
        if (Math.abs(dy) > Math.abs(dx)) return
        moved.current = true
        let next = dx
        if (isOpen) next = -swipeWidth + dx
        next = Math.max(-swipeWidth, Math.min(0, next))
        setTx(next, false)
    }

    const handleUp = (e: React.PointerEvent) => {
        if (!dragging.current) return
        dragging.current = false
        if (!moved.current) {
            const now = Date.now()
            if (now - lastTap.current < 350) {
                triggerDoubleTap()
                lastTap.current = 0
            } else {
                lastTap.current = now
            }
        }
        const threshold = -swipeWidth * 0.35
        if (curX.current < threshold) {
            setTx(-swipeWidth, true)
            setOpen(id)
        } else {
            setTx(0, true)
            setOpen(null)
        }
    }

    return (
        <div className="relative overflow-hidden border-b last:border-b-0">
            {actions}
            <div
                ref={cardRef}
                className="relative bg-white will-change-transform select-none"
                onPointerDown={handleDown}
                onPointerMove={handleMove}
                onPointerUp={handleUp}
                onPointerCancel={handleUp}
                onDoubleClick={triggerDoubleTap}
                style={{ touchAction: 'pan-y' }}
            >
                {children}
            </div>
        </div>
    )
}
