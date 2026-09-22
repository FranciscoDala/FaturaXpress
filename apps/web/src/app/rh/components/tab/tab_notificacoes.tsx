import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, History, User, FileCheck2, RefreshCw, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

type Props = { cargoAtual: string }

export default function TabNotificacoes({ cargoAtual }: Props) {
    const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [actingId, setActingId] = useState<string | null>(null)
    const [openingId, setOpeningId] = useState<string | null>(null)
    const firstLoad = useRef(true)

    const area = cargoAtual === 'admin'? 'admin' : 'rh'
    const isAdmin = cargoAtual === 'admin'

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

    const abrirComprovante = (faltaId: string) => {
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `https://faturaxpress-backend.onrender.com/api/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const handleAtraso = async (funcId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        if (!funcId) { toast.error('Funcionário inválido'); return }
        setActingId(funcId)
        const prev = notifs
        if (acao!== 'encaminhar') {
            setNotifs(n => n.filter(x => x.funcionario?.id!== funcId || x.tipo!== 'atraso_excedido'))
        }
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar`, { aplicado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success(acao === 'aplicar'? 'Falta aplicada' : acao === 'ignorar'? 'Atrasos zerados' : 'Encaminhado para admin')
            await fetchNotifs(true)
        } catch (e: any) {
            setNotifs(prev)
            toast.error(e?.response?.data?.detail || 'Erro')
        }
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
            await fetchNotifs(true)
        } catch (e: any) {
            setNotifs(prev)
            toast.error(e?.response?.data?.detail || 'Erro')
        }
        finally { setActingId(null) }
    }

    return (
        <div className="w-full max-w-[680px] mx-auto">
            {/* HEADER ESTILO PRINT */}
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-[16px] font-bold flex items-center gap-2">
                    Notifications
                    {isRefreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                </h2>
                <div className="flex bg-[#f2f2f3] rounded-full p-1">
                    <button onClick={() => setTab('ativas')} className={`px-3.5 py-1 rounded-full text-[12px] font-medium transition ${tab === 'ativas'? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>
                        All {ativas.length > 0 && <span className="ml-1">{ativas.length}</span>}
                    </button>
                    <button onClick={() => setTab('historico')} className={`px-3.5 py-1 rounded-full text-[12px] font-medium transition flex items-center gap-1 ${tab === 'historico'? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>
                        Unread
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-[24px] shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
                {loading? (
                    <div className="divide-y divide-gray-100">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-4 flex gap-3 animate-pulse">
                                <div className="w-9 h-9 rounded-full bg-gray-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                                    <div className="h-3 bg-gray-50 rounded w-3/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : list.length === 0? (
                    <div className="py-16 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#F0F7FF] border border-[#d6e8ff] flex items-center justify-center mx-auto mb-3"><Bell className="w-5 h-5 text-[#0095ff]/40" /></div>
                        <p className="text-[14px] font-medium">{tab === 'ativas'? 'Tudo em dia' : 'Nenhum histórico'}</p>
                        <p className="text-[11px] text-gray-400 mt-1">Quando houver faltas ou atrasos aparece aqui.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {list.map((n: any) => {
                            const isPending = n.status_notificacao === 'pendente'
                            const isAtraso = n.tipo === 'atraso_excedido'
                            return (
                                <div key={n.notificacao_id} className="p-4 hover:bg-gray-50/60 transition flex gap-3 group">
                                    {/* AVATAR ESTILO PRINT */}
                                    <div className="relative shrink-0">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-bold ${isAtraso? 'bg-amber-400' : 'bg-black'}`}>
                                            {isAtraso? <Clock className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[10px] ${isAtraso? 'bg-amber-500' : 'bg-[#7c5cff]'}`}>
                                            {isAtraso? '!' : <FileCheck2 className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                    </div>

                                    {/* CONTEUDO */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-[13px] leading-[18px] truncate">
                                                <span className="font-semibold text-black">{isAtraso? n.funcionario?.nome : `Falta • ${n.falta?.justificativa_tipo || 'justificada'}`}</span>
                                                <span className="text-gray-500 font-normal ml-1">{isAtraso? `${n.qtd_atrasos} atrasos` : ''}</span>
                                                <span className="text-gray-400 text-[11px] ml-2">{n.created_at? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ago</span>
                                            </p>
                                            {isPending && <span className="w-2 h-2 bg-[#00c950] rounded-full shrink-0 mt-1.5" />}
                                        </div>

                                        <p className="text-[13px] font-medium text-black mt-0.5 truncate">
                                            {isAtraso? `Regra: ${n.qtd_para_falta} atrasos = 1 falta` : n.falta?.motivo}
                                        </p>

                                        <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1">
                                            {isAtraso? n.atrasos?.slice(0, 2).map((a: any) => `${a.data?.slice(0, 10)} • ${a.atraso_min}min`).join(' • ') : (n.falta?.justificativa_obs || 'Aguardando análise do RH')}
                                        </p>

                                        {/* AÇÕES ESTILO PRINT - Decline / Accept */}
                                        {isPending && (
                                            <div className="flex items-center gap-2 mt-3">
                                                {isAtraso? (
                                                    <>
                                                        <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'ignorar')} className="h-7 px-4 rounded-full bg-[#f2f2f3] text-[12px] font-medium text-black hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1">
                                                            {actingId === n.funcionario?.id? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Decline
                                                        </button>
                                                        <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'aplicar')} className="h-7 px-4 rounded-full bg-black text-white text-[12px] font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1">
                                                            <Check className="w-3 h-3" /> Accept
                                                        </button>
                                                        {area === 'rh' && (
                                                            <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'encaminhar')} className="ml-auto text-[11px] text-gray-500 hover:text-black flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Admin</button>
                                                        )}
                                                    </>
                                                ) : (
                                                    <>
                                                        {n.falta?.justificativa_anexo_url && (
                                                            <button onClick={() => abrirComprovante(n.falta.id)} className="h-7 px-3 rounded-full bg-white border border-gray-200 text-[11px] flex items-center gap-1 hover:bg-gray-50">
                                                                <Eye className="w-3 h-3" /> Ver
                                                            </button>
                                                        )}
                                                        <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="h-7 px-4 rounded-full bg-[#f2f2f3] text-[12px] font-medium text-black hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1">
                                                            Decline
                                                        </button>
                                                        <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="h-7 px-4 rounded-full bg-black text-white text-[12px] font-medium hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1">
                                                            Accept
                                                        </button>
                                                        {area === 'rh' &&!isAdmin && (
                                                            <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'encaminhar')} className="ml-auto text-[11px] text-gray-500 hover:text-black flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Admin</button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
