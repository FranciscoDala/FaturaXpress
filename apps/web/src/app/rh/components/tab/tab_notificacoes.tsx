import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, Eye, FileCheck2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../lib/api'

type Props = { cargoAtual: string }

export default function TabNotificacoes({ cargoAtual }: Props) {
    const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [actingId, setActingId] = useState<string | null>(null)
    const [openingId, setOpeningId] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [comprovante, setComprovante] = useState<{ url: string, type: string } | null>(null)
    const firstLoad = useRef(true)

    const area = cargoAtual === 'admin'? 'admin' : 'rh'

    const getInitials = (nome: string) => {
        if (!nome) return 'F'
        const parts = nome.trim().split(' ').filter(Boolean)
        if (parts.length === 1) return parts[0][0].toUpperCase()
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }

    const formatarTexto = (texto: string) => {
        if (!texto) return ''
        const mapa: Record<string, string> = {
            'NAO_APARECEU': 'Não apareceu',
            'FALTA': 'Falta',
            'ATRASO': 'Atraso',
            'ATESTADO': 'Atestado',
            'ATESTADO_MEDICO': 'Atestado médico',
            'JUSTIFICADA': 'Justificada',
            'PENDENTE': 'Pendente',
            'PENDENTE_JUSTIFICACAO': 'Pendente de justificação',
            'APROVADA': 'Aprovada',
            'REJEITADA': 'Rejeitada',
            'ABONADA': 'Abonada',
            'OUTROS': 'Outros',
            'ATRASO_EXCEDIDO': 'Atraso excedido',
            'FALTA_JUSTIFICADA': 'Falta justificada'
        }
        const upper = texto.toUpperCase().trim()
        if (mapa[upper]) return mapa[upper]
        return texto.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
    }

    const getMotivoFormatado = (n: any) => {
        const isAtraso = n.tipo === 'atraso_excedido'
        if (isAtraso) return `Motivo do atraso: ${n.qtd_atrasos} atrasos no período (${n.periodo || 'semana'})`
        const raw = (n.falta?.motivo || n.motivo || '').split('|')[0].trim()
        const clean = formatarTexto(raw.replace(/^(FALTA|OUTROS|ATRASO)\s*/i,'').trim() || raw)
        return `Motivo da falta: ${clean || 'Não informado'}`
    }

    const formatarDataHora = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        const now = new Date()
        const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000)
        if (diffMins < 1) return 'agora mesmo'
        if (diffMins < 60) return `${diffMins} min atrás`
        if (diffMins < 1440) return `${Math.floor(diffMins/60)}h atrás`
        return d.toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    const fetchNotifs = useCallback(async (silent = false) => {
        if (!silent) { if (firstLoad.current) setLoading(true); else setIsRefreshing(true) }
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}`)
            const list = Array.isArray(data)? data : []
            setNotifs(prev => {
                const prevStr = JSON.stringify(prev.map(n => n.notificacao_id + n.status_notificacao))
                const nextStr = JSON.stringify(list.map((n: any) => n.notificacao_id + n.status_notificacao))
                return prevStr === nextStr? prev : list
            })
        } catch { if (!silent) toast.error('Erro ao carregar notificações') }
        finally { setLoading(false); setIsRefreshing(false); firstLoad.current = false }
    }, [area])

    useEffect(() => { fetchNotifs(false) }, [fetchNotifs])
    useEffect(() => {
        const h = () => fetchNotifs(true)
        window.addEventListener('notificacoes-refresh' as any, h)
        const onFocus = () => fetchNotifs(true)
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onFocus)
        return () => { window.removeEventListener('notificacoes-refresh' as any, h); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus) }
    }, [fetchNotifs])

    const ativas = notifs.filter(n => n.status_notificacao === 'pendente')
    const historico = notifs.filter(n => n.status_notificacao!== 'pendente')
    const list = tab === 'ativas'? ativas : historico

    const fecharComprovante = () => { if (comprovante) URL.revokeObjectURL(comprovante.url); setComprovante(null) }
    const abrirComprovante = async (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        setOpeningId(faltaId)
        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Falha ao carregar')
            const blob = await res.blob()
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch (e: any) { toast.error(e?.message || 'Erro') } finally { setOpeningId(null) }
    }

    useEffect(() => {
        if (!comprovante) return
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharComprovante() }
        document.addEventListener('keydown', onKeyDown); return () => document.removeEventListener('keydown', onKeyDown)
    }, [comprovante])
    useEffect(() => () => { if (comprovante) URL.revokeObjectURL(comprovante.url) }, [comprovante])

    const handleAtraso = async (funcId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        if (!funcId) return; setActingId(funcId); const prev = notifs
        if (acao!== 'encaminhar') setNotifs(n => n.filter(x => x.funcionario?.id!== funcId || x.tipo!== 'atraso_excedido'))
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar`, { aplicado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success(acao === 'aplicar'? 'Falta aplicada' : acao === 'ignorar'? 'Atrasos zerados' : 'Encaminhado'); setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { setNotifs(prev); toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar') => {
        if (!faltaId) return; setActingId(faltaId); const prev = notifs
        setNotifs(n => n.map(x => x.falta?.id === faltaId? {...x, status_notificacao: 'resolvido' } : x))
        setTimeout(() => setNotifs(n => n.filter(x => x.falta?.id!== faltaId || x.status_notificacao === 'pendente'? true : tab === 'ativas'? false : true)), 300)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success(acao === 'aprovar'? 'Falta abonada' : acao === 'rejeitar'? 'Falta rejeitada' : 'Encaminhado'); setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { setNotifs(prev); toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    return (
        <>
        <div className="w-full">
            {/* HEADER COM CORES DO SEU HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white border border-[#d6e8ff] rounded-[16px] p-4 mb-5 shadow-sm">
                <div className="absolute inset-0 pointer-events-none overflow-hidden"><div className="bubble bubble-1"></div><div className="bubble bubble-2"></div></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-[#d6e8ff] shadow-sm flex items-center justify-center relative">
                            <Bell className="w-5 h-5 text-[#0095ff]" />
                            {ativas.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{ativas.length}</span>}
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-[#1a202c] tracking-tight flex items-center gap-2">Notificações {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-[#0095ff]" />}</h2>
                            <p className="text-[11px] text-gray-600 font-medium">{area.toUpperCase()} • {ativas.length} pendentes</p>
                        </div>
                    </div>
                    <div className="flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                        <button onClick={() => setTab('ativas')} className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition ${tab === 'ativas'? 'bg-[#0095ff] text-white shadow-sm' : 'text-gray-600 hover:text-[#0095ff]'}`}>Ativas</button>
                        <button onClick={() => setTab('historico')} className={`px-4 py-1.5 rounded-full text-[12px] font-semibold transition ${tab === 'historico'? 'bg-[#0095ff] text-white shadow-sm' : 'text-gray-600 hover:text-[#0095ff]'}`}>Histórico</button>
                    </div>
                </div>
                <style>{`.bubble{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(0,149,255,0.18),rgba(0,149,255,0.04) 65%);border:1px solid rgba(0,149,255,0.12);}.bubble-1{width:90px;height:90px;left:60%;top:-20px;}.bubble-2{width:60px;height:60px;left:85%;top:30px;}`}</style>
            </div>

            {loading? (
                <div className="grid gap-3">{[1,2,3].map(i => (<div key={i} className="bg-white border border-gray-200 rounded-[16px] p-4 animate-pulse flex gap-3"><div className="w-11 h-11 rounded-full bg-[#E8F2FF]" /><div className="flex-1 space-y-2"><div className="h-3 w-1/2 bg-gray-100 rounded" /><div className="h-3 w-full bg-gray-50 rounded" /></div></div>))}</div>
            ) : list.length === 0? (
                <div className="bg-white border border-gray-200 rounded-[20px] py-16 text-center shadow-sm">
                    <div className="w-14 h-14 rounded-full bg-[#F0F7FF] border border-[#d6e8ff] flex items-center justify-center mx-auto mb-3"><FileCheck2 className="w-7 h-7 text-[#0095ff]/60" /></div>
                    <p className="text-[14px] font-bold text-[#1a202c]">Tudo em dia</p>
                    <p className="text-[12px] text-gray-500 mt-1 max-w-[260px] mx-auto">Nenhuma notificação pendente. Quando houver atrasos ou faltas justificadas, aparecem aqui.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {list.map((n: any) => {
                        const isExpanded = expandedId === n.notificacao_id
                        const isPending = n.status_notificacao === 'pendente'
                        const isAtraso = n.tipo === 'atraso_excedido'
                        const func = n.funcionario
                        const nome = func?.nome || 'Funcionário'
                        const motivoLinha = getMotivoFormatado(n)
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || '')
                        const obs = n.falta?.justificativa_obs

                        return (
                            <div key={n.notificacao_id} onClick={() => setExpandedId(isExpanded? null : n.notificacao_id)} className={`w-full bg-white border rounded-[16px] transition-all cursor-pointer group ${isPending? 'border-[#d6e8ff] shadow-[0_2px_12px_rgba(0,149,255,0.08)] hover:shadow-[0_6px_20px_rgba(0,149,255,0.12)] border-l-[4px] border-l-[#0095ff]' : 'border-gray-200 opacity-80 hover:opacity-100'} ${isExpanded? 'ring-2 ring-[#0095ff]/20' : ''}`}>
                                <div className="p-4 flex gap-3.5 items-start">
                                    <div className="relative shrink-0">
                                        <div className="w-11 h-11 rounded-full bg-[#1a202c] text-white flex items-center justify-center text-[12px] font-bold tracking-wide border-2 border-white shadow-sm">{getInitials(nome)}</div>
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm ${isAtraso? 'bg-amber-500' : 'bg-[#0095ff]'}`}>{isAtraso? <AlertTriangle className="w-3 h-3 text-white" /> : <FileCheck2 className="w-3 h-3 text-white" />}</div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[13.5px] font-bold text-[#1a202c] truncate">{nome}</p>
                                            <span className="text-[11px] font-medium text-gray-500 shrink-0">{formatarDataHora(n.created_at)}</span>
                                        </div>
                                        <p className="text-[13px] font-semibold text-[#1a202c] mt-1 leading-5">{motivoLinha}</p>
                                        <p className="text-[11px] text-gray-600 mt-1 flex items-center gap-1.5 font-medium">
                                            <span className="inline-flex items-center gap-1">{isAtraso? <Clock className="w-3 h-3" /> : <FileCheck2 className="w-3 h-3" />} {isAtraso? `Regra: ${n.qtd_para_falta} atrasos = 1 falta` : `Justificou falta • ${tipoJust || 'Comprovante'}`}</span>
                                            {n.falta?.justificativa_anexo_url && <span className="w-1 h-1 bg-gray-300 rounded-full" />}
                                            {n.falta?.justificativa_anexo_url && <span className="text-[#0095ff]">Com comprovante</span>}
                                        </p>

                                        {isExpanded && (
                                            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                                                {isAtraso? (
                                                    <div className="bg-[#F0F7FF] border border-[#d6e8ff] rounded-[12px] p-3">
                                                        <p className="text-[11px] font-bold text-[#0095ff] mb-2 uppercase tracking-wide">Últimos atrasos</p>
                                                        <div className="flex flex-wrap gap-1.5">{n.atrasos?.slice(0,6).map((a:any,i:number) => (<span key={i} className="text-[11px] bg-white border border-[#d6e8ff] px-2.5 py-1 rounded-full text-[#1a202c] font-medium">{a.data?.slice(0,10)} • {a.atraso_min}min</span>))}</div>
                                                    </div>
                                                ) : obs && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-3">
                                                        <p className="text-[11px] font-bold text-amber-700 mb-1 uppercase tracking-wide">Observação</p>
                                                        <p className="text-[13px] text-[#1a202c] leading-5 font-medium">"{obs}"</p>
                                                    </div>
                                                )}

                                                {isPending && (
                                                    <div className="flex flex-wrap gap-2">
                                                        <button disabled={!!actingId} onClick={() => isAtraso? handleAtraso(func?.id, 'ignorar') : handleFalta(n.falta?.id, 'rejeitar')} className="h-9 px-4 rounded-full bg-white border border-red-200 text-red-600 text-[12px] font-bold hover:bg-red-50 disabled:opacity-50 flex items-center gap-1.5"><X className="w-4 h-4" /> {isAtraso? 'Ignorar' : 'Rejeitar'}</button>
                                                        <button disabled={!!actingId} onClick={() => isAtraso? handleAtraso(func?.id, 'aplicar') : handleFalta(n.falta?.id, 'aprovar')} className="h-9 px-5 rounded-full bg-[#0095ff] text-white text-[12px] font-bold hover:bg-[#0084e6] shadow-sm shadow-blue-200 disabled:opacity-50 flex items-center gap-1.5">{actingId? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {isAtraso? 'Aplicar falta' : 'Abonar falta'}</button>
                                                        {n.falta?.justificativa_anexo_url && (<button disabled={openingId === n.falta.id} onClick={() => abrirComprovante(n.falta.id)} className="h-9 px-4 rounded-full bg-[#1a202c] text-white text-[12px] font-bold hover:bg-black disabled:opacity-50 flex items-center gap-1.5">{openingId === n.falta.id? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Ver comprovante</button>)}
                                                        <button onClick={() => isAtraso? handleAtraso(func?.id, 'encaminhar') : handleFalta(n.falta?.id, 'encaminhar')} className="h-9 px-3 rounded-full bg-white border border-gray-200 text-[12px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" /> Admin</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

        {comprovante && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={fecharComprovante}>
                <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-[16px] overflow-hidden shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
                    <div className="h-12 px-4 flex items-center justify-between border-b bg-gradient-to-br from-[#E8F2FF] to-white">
                        <span className="text-[13px] font-bold text-[#1a202c] flex items-center gap-2"><FileCheck2 className="w-4 h-4 text-[#0095ff]" /> Comprovante</span>
                        <button onClick={fecharComprovante} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="h-[calc(100%-3rem)] bg-[#f8fafc] p-2">{comprovante.type === 'application/pdf'? (<iframe src={comprovante.url} title="PDF" className="w-full h-full rounded-[10px] bg-white border" />) : (<img src={comprovante.url} alt="Comprovante" className="w-full h-full object-contain rounded-[10px] bg-white border" />)}</div>
                </div>
            </div>
        )}
        </>
    )
}
