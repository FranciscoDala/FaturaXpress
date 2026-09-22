import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, User, Eye, FileCheck2, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
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

    const formatarDataHora = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        const now = new Date()
        const diffMs = now.getTime() - d.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return 'agora'
        if (diffMins < 60) return `${diffMins} min atrás`
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`
        return d.toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    const fetchNotifs = useCallback(async (silent = false) => {
        if (!silent) {
            if (firstLoad.current) setLoading(true)
            else setIsRefreshing(true)
        }
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}`)
            const list = Array.isArray(data)? data : []
            setNotifs(prev => {
                const prevStr = JSON.stringify(prev.map(n => n.notificacao_id + n.status_notificacao))
                const nextStr = JSON.stringify(list.map((n: any) => n.notificacao_id + n.status_notificacao))
                return prevStr === nextStr? prev : list
            })
        } catch {
            if (!silent) toast.error('Erro ao carregar notificações')
        } finally {
            setLoading(false)
            setIsRefreshing(false)
            firstLoad.current = false
        }
    }, [area])

    useEffect(() => { fetchNotifs(false) }, [fetchNotifs])
    useEffect(() => {
        const h = () => fetchNotifs(true)
        window.addEventListener('notificacoes-refresh' as any, h)
        const onFocus = () => fetchNotifs(true)
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onFocus)
        return () => {
            window.removeEventListener('notificacoes-refresh' as any, h)
            window.removeEventListener('focus', onFocus)
            document.removeEventListener('visibilitychange', onFocus)
        }
    }, [fetchNotifs])

    const ativas = notifs.filter(n => n.status_notificacao === 'pendente')
    const historico = notifs.filter(n => n.status_notificacao!== 'pendente')
    const list = tab === 'ativas'? ativas : historico

    const fecharComprovante = () => {
        if (comprovante) URL.revokeObjectURL(comprovante.url)
        setComprovante(null)
    }

    const abrirComprovante = async (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        setOpeningId(faltaId)
        try {
            const response = await fetch(url)
            if (!response.ok) throw new Error('Falha ao carregar comprovante')
            const blob = await response.blob()
            if (!blob.type.startsWith('image/') && blob.type!== 'application/pdf') throw new Error('Formato inválido')
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao abrir comprovante')
        } finally {
            setOpeningId(null)
        }
    }

    useEffect(() => {
        if (!comprovante) return
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharComprovante() }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [comprovante])
    useEffect(() => () => { if (comprovante) URL.revokeObjectURL(comprovante.url) }, [comprovante])

    const handleAtraso = async (funcId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        if (!funcId) { toast.error('Funcionário inválido'); return }
        setActingId(funcId)
        const prev = notifs
        if (acao!== 'encaminhar') setNotifs(n => n.filter(x => x.funcionario?.id!== funcId || x.tipo!== 'atraso_excedido'))
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar`, { aplicado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success(acao === 'aplicar'? 'Falta aplicada' : acao === 'ignorar'? 'Atrasos zerados' : 'Encaminhado para admin')
            setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { setNotifs(prev); toast.error(e?.response?.data?.detail || 'Erro') }
        finally { setActingId(null) }
    }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar') => {
        if (!faltaId) return
        setActingId(faltaId)
        const prev = notifs
        setNotifs(n => n.map(x => x.falta?.id === faltaId? {...x, status_notificacao: 'resolvido' } : x))
        setTimeout(() => setNotifs(n => n.filter(x => x.falta?.id!== faltaId || x.status_notificacao === 'pendente'? true : tab === 'ativas'? false : true)), 300)
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success(acao === 'aprovar'? 'Falta abonada' : acao === 'rejeitar'? 'Falta rejeitada' : 'Encaminhado para admin')
            setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { setNotifs(prev); toast.error(e?.response?.data?.detail || 'Erro') }
        finally { setActingId(null) }
    }

    return (
        <>
        <div className="w-full">
            {/* HEADER SAAS */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-black flex items-center justify-center shadow-sm">
                        <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-semibold tracking-tight leading-none flex items-center gap-2">
                            Notificações
                            {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
                        </h2>
                        <p className="text-[11px] text-gray-500 mt-1">{ativas.length} pendentes • {area.toUpperCase()}</p>
                    </div>
                </div>
                <div className="bg-[#f4f4f5] p-1 rounded-full flex gap-1 border border-gray-200/60">
                    <button onClick={() => setTab('ativas')} className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${tab === 'ativas'? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-black'}`}>
                        Ativas {ativas.length > 0 && `• ${ativas.length}`}
                    </button>
                    <button onClick={() => setTab('historico')} className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${tab === 'historico'? 'bg-white text-black shadow-sm border border-gray-200' : 'text-gray-500 hover:text-black'}`}>
                        Histórico
                    </button>
                </div>
            </div>

            {loading? (
                <div className="space-y-2">
                    {[1,2,3].map(i => (
                        <div key={i} className="bg-white border border-gray-200 rounded-[16px] p-4 animate-pulse flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100" />
                            <div className="flex-1 space-y-2"><div className="h-3 w-1/2 bg-gray-100 rounded" /><div className="h-3 w-full bg-gray-50 rounded" /></div>
                        </div>
                    ))}
                </div>
            ) : list.length === 0? (
                <div className="bg-white border border-dashed border-gray-200 rounded-[20px] py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-50 border flex items-center justify-center mx-auto mb-3"><FileCheck2 className="w-6 h-6 text-gray-400" /></div>
                    <p className="text-[14px] font-medium">Tudo em dia</p>
                    <p className="text-[12px] text-gray-500 mt-1">Nenhuma notificação pendente no momento</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {list.map((n: any) => {
                        const isExpanded = expandedId === n.notificacao_id
                        const isPending = n.status_notificacao === 'pendente'
                        const isAtraso = n.tipo === 'atraso_excedido'
                        const func = n.funcionario
                        const nome = func?.nome || 'Funcionário'
                        const cargo = func?.cargo? formatarTexto(func.cargo) : ''
                        const motivo = formatarTexto(n.falta?.motivo || '')
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || '')
                        const status = formatarTexto(n.falta?.status || n.status_notificacao || '')

                        return (
                            <div
                                key={n.notificacao_id}
                                onClick={() => setExpandedId(isExpanded? null : n.notificacao_id)}
                                className={`w-full bg-white border rounded-[16px] p-4 cursor-pointer transition-all duration-200 group ${isPending? 'border-gray-200 border-l-[3px] border-l-black hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]' : 'border-gray-100 hover:border-gray-200'} ${isExpanded? 'shadow-[0_8px_24px_rgba(0,0,0,0.08)]!border-black/10' : ''}`}
                            >
                                <div className="flex gap-3.5">
                                    {/* AVATAR COM INICIAL - SAAS */}
                                    <div className="relative shrink-0">
                                        <div className="w-10 h-10 rounded-full bg-[#111] text-white flex items-center justify-center text-[12px] font-semibold tracking-wide">
                                            {getInitials(nome)}
                                        </div>
                                        {isPending && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-black rounded-full ring-2 ring-white animate-pulse" />}
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${isAtraso? 'bg-amber-500' : 'bg-black'}`}>
                                            {isAtraso? <AlertTriangle className="w-3 h-3 text-white" /> : <FileCheck2 className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* TOP */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-[13.5px] leading-[18px] font-medium text-[#111] flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold">{nome}</span>
                                                    {cargo && <span className="text-[11px] bg-gray-100 border px-1.5 py-0.5 rounded-full font-normal text-gray-600">{cargo}</span>}
                                                </p>
                                                <p className="text-[12px] text-gray-500 mt-0.5">
                                                    {isAtraso? `Acumulou ${n.qtd_atrasos} atrasos neste ${n.periodo || 'período'}` : `Justificou falta • ${tipoJust || 'Comprovante'}`}
                                                </p>
                                            </div>
                                            <span className="text-[11px] text-gray-400 shrink-0 font-normal mt-0.5">{formatarDataHora(n.created_at)}</span>
                                        </div>

                                        {/* MOTIVO */}
                                        <div className="mt-2.5 flex items-center gap-2">
                                            <div className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${isAtraso? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                                                {isAtraso? `Regra: ${n.qtd_para_falta} atrasos = 1 falta` : motivo || 'Falta justificada'}
                                            </div>
                                            {isPending && <span className="text-[10px] font-medium text-white bg-black px-2 py-0.5 rounded-full">{status}</span>}
                                        </div>

                                        {/* EXPAND AREA */}
                                        {isExpanded && (
                                            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200" onClick={e => e.stopPropagation()}>
                                                {isAtraso? (
                                                    <div className="bg-[#fafafa] border rounded-[12px] p-3">
                                                        <p className="text-[11px] font-medium text-gray-500 mb-2">Últimos atrasos</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {n.atrasos?.slice(0,6).map((a:any,i:number) => (
                                                                <span key={i} className="text-[11px] bg-white border border-gray-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                                                                    <Clock className="w-3 h-3 text-gray-400" /> {a.data?.slice(0,10)} • {a.atraso_min}min
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {n.falta?.justificativa_obs && (
                                                            <div className="bg-[#fafafa] border rounded-[12px] p-3">
                                                                <p className="text-[11px] font-medium text-gray-500 mb-1">Observação do funcionário</p>
                                                                <p className="text-[13px] text-gray-800 leading-5">"{n.falta.justificativa_obs}"</p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* ACTIONS */}
                                                {isPending && (
                                                    <div className="flex items-center gap-2 pt-1">
                                                        <button onClick={() => isAtraso? handleAtraso(func?.id, 'ignorar') : handleFalta(n.falta?.id, 'rejeitar')} disabled={!!actingId} className="h-8 px-4 rounded-full bg-white border border-gray-200 text-[12px] font-medium hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5">
                                                            <X className="w-3.5 h-3.5" /> {isAtraso? 'Ignorar' : 'Rejeitar'}
                                                        </button>
                                                        <button onClick={() => isAtraso? handleAtraso(func?.id, 'aplicar') : handleFalta(n.falta?.id, 'aprovar')} disabled={!!actingId} className="h-8 px-4 rounded-full bg-black text-white text-[12px] font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1.5">
                                                            {actingId? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} {isAtraso? 'Aplicar falta' : 'Abonar falta'}
                                                        </button>
                                                        {n.falta?.justificativa_anexo_url && (
                                                            <button onClick={() => abrirComprovante(n.falta.id)} disabled={openingId === n.falta.id} className="h-8 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-[12px] flex items-center gap-1 ml-auto">
                                                                {openingId === n.falta.id? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Comprovante
                                                            </button>
                                                        )}
                                                        <button onClick={() => isAtraso? handleAtraso(func?.id, 'encaminhar') : handleFalta(n.falta?.id, 'encaminhar')} className="h-8 w-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-auto lg:ml-0">
                                                            <ArrowUpRight className="w-4 h-4" />
                                                        </button>
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
                <div className="relative w-full max-w-4xl h-[85vh] bg-white rounded-[16px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                    <div className="h-12 px-4 flex items-center justify-between border-b bg-white">
                        <span className="text-[13px] font-semibold flex items-center gap-2"><FileCheck2 className="w-4 h-4" /> Comprovante</span>
                        <button onClick={fecharComprovante} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="h-[calc(100%-3rem)] bg-[#f8f8f8] p-2">
                        {comprovante.type === 'application/pdf'? (
                            <iframe src={comprovante.url} title="PDF" className="w-full h-full rounded-[10px] bg-white border" />
                        ) : (
                            <img src={comprovante.url} alt="Comprovante" className="w-full h-full object-contain rounded-[10px] bg-white border" />
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
