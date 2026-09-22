import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, History, User, Eye, FileCheck2, RefreshCw, Loader2, Dot } from 'lucide-react'
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

    // --- FORMATADOR PROFISSIONAL ---
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
        // fallback: NAO_APARECEU -> Não apareceu
        return texto.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
    }

    const formatarDataHora = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
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
            if (!blob.type.startsWith('image/') && blob.type!== 'application/pdf') {
                throw new Error('Formato de comprovante inválido')
            }
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch (error: any) {
            toast.error(error?.message || 'Erro ao abrir comprovante')
        } finally {
            setOpeningId(null)
        }
    }

    useEffect(() => {
        if (!comprovante) return
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') fecharComprovante()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [comprovante])

    useEffect(() => () => {
        if (comprovante) URL.revokeObjectURL(comprovante.url)
    }, [comprovante])

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
            setExpandedId(null)
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
            setExpandedId(null)
            await fetchNotifs(true)
        } catch (e: any) {
            setNotifs(prev)
            toast.error(e?.response?.data?.detail || 'Erro')
        }
        finally { setActingId(null) }
    }

    return (
        <>
        <div className="w-full">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-[16px] font-bold tracking-tight flex items-center gap-2">
                        Notifications
                        {isRefreshing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />}
                    </h2>
                    {ativas.length > 0 && tab === 'ativas' && (
                        <span className="bg-[#ff3b30] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{ativas.length}</span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[12px]">
                    <button onClick={() => setTab('ativas')} className={`px-3 py-1 rounded-full font-medium transition ${tab === 'ativas'? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>
                        Inbox
                    </button>
                    <button onClick={() => setTab('historico')} className={`px-3 py-1 rounded-full font-medium transition ${tab === 'historico'? 'bg-black text-white' : 'text-gray-500 hover:text-black'}`}>
                        Archived
                    </button>
                </div>
            </div>

            <div className="w-full bg-white border border-gray-200 rounded-[16px] overflow-hidden shadow-sm">
                {loading? (
                    <div className="divide-y divide-gray-100">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-4 flex gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-gray-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                                    <div className="h-2.5 bg-gray-50 rounded w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : list.length === 0? (
                    <div className="py-16 text-center">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"><Bell className="w-5 h-5 text-gray-400" /></div>
                        <p className="text-[14px] font-medium">Tudo em dia</p>
                        <p className="text-[12px] text-gray-400 mt-1">Nenhuma notificação pendente</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {list.map((n: any) => {
                            const isExpanded = expandedId === n.notificacao_id
                            const isPending = n.status_notificacao === 'pendente'
                            const isAtraso = n.tipo === 'atraso_excedido'
                            const nome = n.funcionario?.nome || 'Funcionário'
                            const motivo = formatarTexto(n.falta?.motivo || n.motivo || '')
                            const tipoJust = formatarTexto(n.falta?.justificativa_tipo || '')
                            const status = formatarTexto(n.falta?.status || n.status_notificacao || '')

                            return (
                                <div key={n.notificacao_id} onClick={() => setExpandedId(isExpanded? null : n.notificacao_id)} className={`w-full text-left p-3.5 hover:bg-[#fafafa] transition cursor-pointer group ${isExpanded? 'bg-[#fafafa]' : ''}`}>
                                    <div className="flex gap-3 items-start">
                                        {/* ICONE USER IGUAL DA FOTO */}
                                        <div className="relative shrink-0 mt-0.5">
                                            <div className="w-8 h-8 rounded-full bg-[#f1f1f2] border border-gray-200 flex items-center justify-center">
                                                <User className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-[14px] h-[14px] rounded-full border-2 border-white flex items-center justify-center ${isAtraso? 'bg-amber-500' : 'bg-[#0a84ff]'}`}>
                                                {isAtraso? <Clock className="w-[8px] h-[8px] text-white" /> : <FileCheck2 className="w-[8px] h-[8px] text-white" />}
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* LINHA 1: NOME + AÇÃO */}
                                            <p className="text-[13px] leading-5 text-black">
                                                <span className="font-semibold">{nome}</span>
                                                <span className="font-normal text-gray-600 ml-1">
                                                    {isAtraso? `acumulou ${n.qtd_atrasos} atrasos` : `enviou justificação • ${tipoJust}`}
                                                </span>
                                            </p>
                                            {/* LINHA 2: MOTIVO FORMATADO */}
                                            <p className="text-[13px] font-medium text-gray-800 truncate mt-0.5">
                                                {motivo || (isAtraso? 'Atraso excedido' : 'Falta justificada')}
                                            </p>
                                            {/* LINHA 3: DATA + CONTEXTO IGUAL DA FOTO */}
                                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                                {formatarDataHora(n.created_at)}
                                                <Dot className="w-3 h-3 -mx-1" />
                                                {isAtraso? `Regra: ${n.qtd_para_falta} atrasos = 1 falta` : `${status}`}
                                                {n.falta?.justificativa_anexo_url && <> <Dot className="w-3 h-3 -mx-1" /> Comprovante anexado</>}
                                            </p>

                                            {/* BOTÕES OCULTOS - APARECEM AO CLICAR */}
                                            {isExpanded && isPending && (
                                                <div className="flex items-center gap-2 mt-3" onClick={e => e.stopPropagation()}>
                                                    {isAtraso? (
                                                        <>
                                                            <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'ignorar')} className="h-7 px-4 rounded-full bg-white border border-gray-200 text-[12px] font-medium hover:bg-gray-50 disabled:opacity-50">
                                                                Ignorar
                                                            </button>
                                                            <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'aplicar')} className="h-7 px-4 rounded-full bg-[#0a84ff] text-white text-[12px] font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                                                                {actingId === n.funcionario?.id? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Aplicar falta
                                                            </button>
                                                            <button disabled={actingId === n.funcionario?.id} onClick={() => handleAtraso(n.funcionario?.id, 'encaminhar')} className="h-7 px-3 rounded-full bg-gray-100 text-[12px] flex items-center gap-1">
                                                                <ArrowUpRight className="w-3 h-3" /> Admin
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            {n.falta?.justificativa_anexo_url && (
                                                                <button onClick={() => abrirComprovante(n.falta.id)} disabled={openingId === n.falta.id} className="h-7 px-3 rounded-full bg-white border border-gray-200 text-[12px] flex items-center gap-1 hover:bg-gray-50">
                                                                    {openingId === n.falta.id? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />} Ver comprovante
                                                                </button>
                                                            )}
                                                            <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'rejeitar')} className="h-7 px-4 rounded-full bg-white border border-gray-200 text-[12px] font-medium hover:bg-gray-50 disabled:opacity-50">
                                                                Rejeitar
                                                            </button>
                                                            <button disabled={actingId === n.falta?.id} onClick={() => handleFalta(n.falta?.id, 'aprovar')} className="h-7 px-4 rounded-full bg-[#0a84ff] text-white text-[12px] font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1">
                                                                {actingId === n.falta?.id? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Abonar
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}

                                            {/* OBSERVAÇÃO */}
                                            {isExpanded && n.falta?.justificativa_obs && (
                                                <p className="text-[12px] text-gray-600 mt-2 bg-white border rounded-lg px-3 py-2">{n.falta.justificativa_obs}</p>
                                            )}
                                        </div>

                                        {/* BOLINHA VERDE + ICONE APP IGUAL DA FOTO */}
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            {isPending && <span className="w-2 h-2 bg-[#0a84ff] rounded-full" />}
                                            <div className="w-6 h-6 rounded-md bg-[#f1f1f2] flex items-center justify-center opacity-60 group-hover:opacity-100">
                                                <FileCheck2 className="w-3.5 h-3.5 text-gray-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>

        {comprovante && (
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={fecharComprovante}>
                <div className="relative w-full h-full bg-white overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="h-12 px-4 flex items-center justify-between border-b">
                        <span className="text-sm font-semibold">Comprovante</span>
                        <button onClick={fecharComprovante} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="h-[calc(100%-3rem)] bg-gray-100 flex items-center justify-center p-3">
                        {comprovante.type === 'application/pdf'? (
                            <iframe src={comprovante.url} title="Comprovante" className="w-full h-full rounded-lg bg-white" />
                        ) : (
                            <img src={comprovante.url} alt="Comprovante" className="max-w-full max-h-full object-contain rounded-lg" />
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
