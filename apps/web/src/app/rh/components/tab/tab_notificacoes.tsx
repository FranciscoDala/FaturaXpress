import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, History, User, FileText, Eye, FileCheck2, RefreshCw, Loader2 } from 'lucide-react'
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

    // AJUSTE: backend agora retorna RedirectResponse 302 pro Cloudinary, não precisa blob
    const abrirComprovante = (faltaId: string) => {
        if (!faltaId) return
        setOpeningId(faltaId)
        try {
            // abre direto o endpoint que redireciona - nunca dá 502
            window.open(`https://faturaxpress-backend.onrender.com/api/rh/falta/${faltaId}/anexo`, '_blank', 'noopener,noreferrer')
        } catch (e: any) {
            toast.error('Falha ao abrir comprovante')
        } finally {
            setTimeout(() => setOpeningId(null), 1000)
        }
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
        <div className="w-full">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
                <div className="w-10 h-10 rounded-full bg-white border border-[#d6e8ff] shadow-sm flex items-center justify-center relative">
                    <Bell className="w-5 h-5 text-[#0095ff]" />
                    {isRefreshing && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#0095ff] rounded-full animate-pulse" />}
                </div>
                <div>
                    <h2 className="text-[18px] font-bold flex items-center gap-2">
                        Notificações
                        {isRefreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    </h2>
                    <p className="text-[12px] text-gray-500">{area.toUpperCase()} • {isAdmin? 'Visão total' : 'Minha área'}</p>
                </div>
                <div className="ml-auto flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                    <button onClick={() => setTab('ativas')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition flex items-center gap-1.5 ${tab === 'ativas'? 'bg-[#E6F0FF] text-[#0095ff] border border-[#C2D8FF]' : 'text-gray-600 hover:bg-gray-50'}`}>
                        Ativas {ativas.length > 0 && <span className="bg-[#FF3B30] text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{ativas.length}</span>}
                    </button>
                    <button onClick={() => setTab('historico')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition flex items-center gap-1.5 ${tab === 'historico'? 'bg-[#E6F0FF] text-[#0095ff] border border-[#C2D8FF]' : 'text-gray-600 hover:bg-gray-50'}`}>
                        <History className="w-3.5 h-3.5" /> Histórico
                    </button>
                </div>
            </div>

            {loading? (
                <div className="grid gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border rounded-[20px] p-4 animate-pulse">
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-50 rounded w-full" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : list.length === 0? (
                <div className="py-20 text-center bg-white border rounded-[24px] shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-[#F0F7FF] border border-[#d6e8ff] flex items-center justify-center mx-auto mb-3"><Bell className="w-6 h-6 text-[#0095ff]/40" /></div>
                    <p className="text-gray-700 text-[14px] font-medium">{tab === 'ativas'? 'Tudo em dia' : 'Nenhum histórico ainda'}</p>
                    <p className="text-[11px] text-gray-400 mt-1 max-w-[260px] mx-auto">Quando uma falta for justificada ou um atraso exceder a regra, vai aparecer aqui automaticamente.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {list.map((n: any) => (
                        <div key={n.notificacao_id} className="bg-white border border-gray-100 rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,149,255,0.10)] transition-all duration-200">
                            {n.tipo === 'atraso_excedido'? (
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-amber-600" /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-semibold text-[14px] flex items-center gap-2 truncate"><User className="w-4 h-4 shrink-0" />{n.funcionario?.nome || 'Funcionário'} <span className="bg-[#FF3B30] text-white text-[10px] px-2 py-0.5 rounded-full">{n.qtd_atrasos} atrasos</span></h3>
                                            <span className="text-[10px] text-gray-400 shrink-0">{n.created_at? new Date(n.created_at).toLocaleString() : ''}</span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-1 bg-gray-50 border rounded-full px-2.5 py-1 inline-block">Regra: {n.qtd_para_falta} atrasos no {n.periodo} = 1 falta</p>
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">{n.atrasos?.slice(0, 5).map((a: any, i: number) => <span key={i} className="text-[11px] bg-white border border-gray-200 px-2.5 py-1 rounded-full shadow-sm">{a.data?.slice(0, 10)} • {a.atraso_min}min</span>)}</div>
                                        {n.status_notificacao === 'pendente'? (
                                            <div className="flex gap-2 mt-3.5 flex-wrap">
                                                <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'aplicar')} className="h-8 px-3.5 rounded-full bg-[#0095ff] text-white text-[12px] font-medium flex items-center gap-1 hover:bg-[#0084e6] disabled:opacity-50"><Check className="w-3.5 h-3.5" />Aplicar Falta</button>
                                                <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'ignorar')} className="h-8 px-3.5 rounded-full bg-white border text-[12px] flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"><X className="w-3.5 h-3.5" />Ignorar</button>
                                                {area === 'rh' && <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'encaminhar')} className="h-8 px-3.5 rounded-full bg-white border text-[12px] flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"><ArrowUpRight className="w-3.5 h-3.5" />Admin</button>}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#E6F0FF] border border-[#C2D8FF] flex items-center justify-center shrink-0"><FileCheck2 className="w-5 h-5 text-[#0095ff]" /></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between gap-2 items-start">
                                            <h3 className="font-semibold text-[14px] flex items-center gap-2">Falta • {n.falta?.justificativa_tipo?.toUpperCase() || 'JUSTIFICADA'} <span className={`text-[10px] px-2 py-0.5 rounded-full border ${n.falta?.status === 'pendente_justificacao'? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-green-50 border-green-200 text-green-700'}`}>{n.falta?.status}</span></h3>
                                            <span className="text-[10px] text-gray-400 shrink-0">{n.created_at? new Date(n.created_at).toLocaleDateString() : ''}</span>
                                        </div>
                                        <p className="text-[12px] text-gray-700 mt-1">{n.falta?.motivo}</p>
                                        {n.falta?.justificativa_obs && <p className="text-[12px] text-gray-500 mt-1 bg-amber-50 border border-amber-100 rounded-[10px] px-2.5 py-1.5">{n.falta.justificativa_obs}</p>}
                                        <div className="flex items-center gap-2 mt-2">
                                            {n.falta?.justificativa_anexo_url && (
                                                <button
                                                    onClick={() => abrirComprovante(n.falta.id)}
                                                    disabled={openingId === n.falta.id}
                                                    className="inline-flex text-[11px] bg-black text-white px-3 py-1.5 rounded-full items-center gap-1 hover:bg-gray-800 disabled:opacity-50"
                                                >
                                                    {openingId === n.falta.id? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                                                    {openingId === n.falta.id? 'Abrindo...' : 'Ver comprovante'}
                                                </button>
                                            )}
                                            {n.falta?.abonada && <span className="text-[10px] bg-green-100 border border-green-200 text-green-700 px-2 py-1 rounded-full">ABONADA</span>}
                                        </div>
                                        {n.status_notificacao === 'pendente'? (
                                            <div className="flex gap-2 mt-3.5 flex-wrap">
                                                <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="h-8 px-3.5 rounded-full bg-[#00c950] text-white text-[12px] font-medium flex items-center gap-1 hover:bg-[#00b448] disabled:opacity-50"><Check className="w-3.5 h-3.5" />Abonar</button>
                                                <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="h-8 px-3.5 rounded-full bg-white border border-red-200 text-red-600 text-[12px] flex items-center gap-1 hover:bg-red-50 disabled:opacity-50"><X className="w-3.5 h-3.5" />Rejeitar</button>
                                                {area === 'rh' &&!isAdmin && <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'encaminhar')} className="h-8 px-3.5 rounded-full bg-white border text-[12px] flex items-center gap-1 hover:bg-gray-50 disabled:opacity-50"><ArrowUpRight className="w-3.5 h-3.5" />Encaminhar Admin</button>}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
