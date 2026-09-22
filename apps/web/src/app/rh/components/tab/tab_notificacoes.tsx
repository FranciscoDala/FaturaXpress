import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, Eye, RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
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
            'NAO_APARECEU': 'Não apareceu', 'DOENTE': 'Doente', 'FALTA': 'Falta', 'ATESTADO': 'Atestado',
            'ATESTADO_MEDICO': 'Atestado médico', 'JUSTIFICADA': 'Justificada', 'PENDENTE_JUSTIFICACAO': 'Pendente de justificação',
            'OUTROS': 'Outros', 'ATRASO_EXCEDIDO': 'Atraso excedido', 'FALTA_JUSTIFICADA': 'Falta justificada'
        }
        const upper = texto.toUpperCase().trim()
        if (mapa[upper]) return mapa[upper]
        return texto.replace(/_/g, ' ').toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
    }

    const getMotivo = (n: any) => {
        if (n.tipo === 'atraso_excedido') return `${n.qtd_atrasos} atrasos (${n.periodo || 'semana'})`
        const raw = (n.falta?.motivo || '').split('|')[0].trim()
        return formatarTexto(raw.replace(/^(FALTA|OUTROS|ATRASO)\s*/i,'').trim() || raw) || 'Não informado'
    }

    const formatarDataHora = (iso: string) => {
        if (!iso) return ''
        const d = new Date(iso)
        const diffMins = Math.floor((Date.now() - d.getTime()) / 60000)
        if (diffMins < 1) return 'agora'
        if (diffMins < 60) return `${diffMins}min atrás`
        if (diffMins < 1440) return `${Math.floor(diffMins/60)}h atrás`
        return d.toLocaleString('pt-AO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    const fetchNotifs = useCallback(async (silent = false) => {
        if (!silent) { if (firstLoad.current) setLoading(true); else setIsRefreshing(true) }
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}`)
            setNotifs(Array.isArray(data)? data : [])
        } catch { if (!silent) toast.error('Erro') }
        finally { setLoading(false); setIsRefreshing(false); firstLoad.current = false }
    }, [area])

    useEffect(() => { fetchNotifs(false) }, [fetchNotifs])
    useEffect(() => {
        const h = () => fetchNotifs(true)
        window.addEventListener('notificacoes-refresh' as any, h)
        return () => window.removeEventListener('notificacoes-refresh' as any, h)
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
            const res = await fetch(url); if (!res.ok) throw new Error('Falha')
            const blob = await res.blob()
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch (e: any) { toast.error(e?.message) } finally { setOpeningId(null) }
    }

    const handleAtraso = async (funcId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        if (!funcId) return; setActingId(funcId); const prev = notifs
        if (acao!== 'encaminhar') setNotifs(n => n.filter(x => x.funcionario?.id!== funcId || x.tipo!== 'atraso_excedido'))
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar`, { aplicado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            toast.success('Feito'); setExpandedId(null); await fetchNotifs(true)
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
            toast.success('Feito'); setExpandedId(null); await fetchNotifs(true)
        } catch (e: any) { setNotifs(prev); toast.error(e?.response?.data?.detail || 'Erro') } finally { setActingId(null) }
    }

    return (
        <>
        <div className="w-full">
            {/* HEADER IGUAL DO SEU RH */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white border border-[#d6e8ff] rounded-[16px] p-4 mb-4 shadow-sm">
                <div className="absolute inset-0 pointer-events-none"><div className="bubble bubble-1"></div></div>
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-white border border-[#d6e8ff] shadow-sm flex items-center justify-center relative">
                            <Bell className="w-5 h-5 text-[#0095ff]" />
                            {ativas.length > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF3B30] text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2 border-white">{ativas.length > 9? '9+' : ativas.length}</span>}
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-[#1a202c] leading-none">Notificações {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin inline ml-2 text-[#0095ff]" />}</h2>
                            <p className="text-[12px] text-gray-600 font-medium mt-1">RH • {ativas.length} pendentes</p>
                        </div>
                    </div>
                    <div className="flex bg-white border border-gray-200 rounded-full p-1 shadow-sm">
                        <button onClick={() => setTab('ativas')} className={`px-5 py-2 rounded-full text-[13px] font-bold transition ${tab === 'ativas'? 'bg-[#0095ff] text-white shadow' : 'text-gray-500'}`}>Ativas</button>
                        <button onClick={() => setTab('historico')} className={`px-5 py-2 rounded-full text-[13px] font-bold transition ${tab === 'historico'? 'bg-[#0095ff] text-white shadow' : 'text-gray-500'}`}>Histórico</button>
                    </div>
                </div>
                <style>{`.bubble{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(0,149,255,0.18),rgba(0,149,255,0.04) 65%);border:1px solid rgba(0,149,255,0.12);}.bubble-1{width:100px;height:100px;left:70%;top:-20px;}`}</style>
            </div>

            {loading? (
                <div className="grid gap-3">{[1,2].map(i => <div key={i} className="bg-white border rounded-[20px] p-5 h-32 animate-pulse" />)}</div>
            ) : list.length === 0? (
                <div className="bg-white border border-gray-200 rounded-[20px] py-16 text-center"><p className="font-bold text-[#1a202c]">Tudo em dia</p></div>
            ) : (
                <div className="grid gap-3">
                    {list.map((n: any) => {
                        const isExpanded = expandedId === n.notificacao_id
                        const isPending = n.status_notificacao === 'pendente'
                        const isAtraso = n.tipo === 'atraso_excedido'
                        const func = n.funcionario
                        const nome = func?.nome || 'Funcionário'
                        const motivo = getMotivo(n)
                        const tipoJust = formatarTexto(n.falta?.justificativa_tipo || '')
                        const obs = n.falta?.justificativa_obs || ''
                        const temAnexo =!!n.falta?.justificativa_anexo_url

                        return (
                            <div key={n.notificacao_id} className={`w-full bg-white border-2 rounded-[20px] p-4 transition-all ${isPending? 'border-l-[#0095ff] border-l-[5px] border-[#d6e8ff] shadow-sm' : 'border-gray-200 opacity-80'}`}>
                                {/* TOP - NOME E HORA */}
                                <div className="flex gap-3 items-start">
                                    <div className="w-11 h-11 rounded-full bg-[#111] text-white flex items-center justify-center text-[13px] font-bold shrink-0">{getInitials(nome)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <p className="text-[16px] font-bold text-[#1a202c] leading-tight">{nome}</p>
                                            <span className="text-[12px] text-gray-500 font-medium shrink-0">{formatarDataHora(n.created_at)}</span>
                                        </div>

                                        {/* LINHA 1 - MOTIVO */}
                                        <p className="text-[15px] font-bold text-[#1a202c] mt-2">
                                            {isAtraso? `Motivo do atraso: ${motivo}` : `Motivo da falta: ${motivo}`}
                                        </p>

                                        {/* LINHA 2 - JUSTIFICOU FALTA - SEM ICONE E SEM COM COMPROVANTE */}
                                        <p className="text-[13px] text-gray-600 mt-1.5 font-medium">
                                            {isAtraso? `Acumulou ${n.qtd_atrasos} atrasos • Regra: ${n.qtd_para_falta} = 1 falta` : `Justificou falta • ${tipoJust || 'Atestado'}`}
                                        </p>

                                        {/* LINHA 3 - DOCUMENTO ANEXADO - SEMPRE VISIVEL SE TIVER */}
                                        {temAnexo &&!isAtraso && (
                                            <p className="text-[13px] text-[#1a202c] mt-2 font-medium">
                                                <span className="text-gray-500 font-normal">Documento anexado:</span> <button onClick={() => abrirComprovante(n.falta.id)} className="text-[#0095ff] underline font-bold">Ver documento</button>
                                            </p>
                                        )}

                                        {/* OBSERVAÇÃO - SEMPRE VISIVEL, NÃO ESCONDIDA */}
                                        {obs && (
                                            <div className="mt-4 bg-[#fffbeb] border border-[#fde68a] rounded-[12px] p-3">
                                                <p className="text-[11px] font-extrabold tracking-wide text-[#92400e] uppercase">Observação</p>
                                                <p className="text-[14px] text-[#1a202c] font-medium mt-1 leading-5">"{obs}"</p>
                                            </div>
                                        )}

                                        {/* ATRASOS VISIVEIS TAMBEM */}
                                        {isAtraso && n.atrasos?.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {n.atrasos.slice(0,4).map((a:any,i:number) => (
                                                    <span key={i} className="text-[11px] bg-[#F0F7FF] border border-[#d6e8ff] px-2.5 py-1 rounded-full font-medium text-[#1a202c]">{a.data?.slice(5,10)} • {a.atraso_min}min</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* AREA CLICAVEL PRA EXPANDIR BOTÕES */}
                                        <button onClick={() => setExpandedId(isExpanded? null : n.notificacao_id)} className="mt-3 text-[12px] font-bold text-[#0095ff]">{isExpanded? 'Fechar' : 'Ver ações'}</button>

                                        {/* SÓ BOTÕES ESCONDIDOS - WIDTH 100% NO MOBILE */}
                                        {isExpanded && isPending && (
                                            <div className="mt-4 grid grid-cols-1 gap-2.5 animate-in fade-in slide-in-from-top-2" onClick={e => e.stopPropagation()}>
                                                <button disabled={!!actingId} onClick={() => isAtraso? handleAtraso(func?.id, 'ignorar') : handleFalta(n.falta?.id, 'rejeitar')} className="w-full h-11 rounded-full bg-white border-2 border-red-200 text-[#d11a1a] text-[14px] font-bold hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2">
                                                    <X className="w-5 h-5" /> Rejeitar
                                                </button>
                                                <button disabled={!!actingId} onClick={() => isAtraso? handleAtraso(func?.id, 'aplicar') : handleFalta(n.falta?.id, 'aprovar')} className="w-full h-12 rounded-full bg-[#0095ff] text-white text-[15px] font-bold hover:bg-[#0084e6] shadow-md shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2">
                                                    {actingId? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />} {isAtraso? 'Aplicar falta' : 'Abonar falta'}
                                                </button>
                                                {temAnexo && (
                                                    <button disabled={openingId === n.falta.id} onClick={() => abrirComprovante(n.falta.id)} className="w-full h-11 rounded-full bg-[#1a202c] text-white text-[14px] font-bold hover:bg-black flex items-center justify-center gap-2">
                                                        {openingId === n.falta.id? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />} Ver comprovante
                                                    </button>
                                                )}
                                                <button onClick={() => isAtraso? handleAtraso(func?.id, 'encaminhar') : handleFalta(n.falta?.id, 'encaminhar')} className="w-full h-11 rounded-full bg-white border-2 border-gray-200 text-[#1a202c] text-[14px] font-bold hover:bg-gray-50 flex items-center justify-center gap-2">
                                                    <ArrowUpRight className="w-5 h-5" /> Encaminhar para Admin
                                                </button>
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
            <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3" onClick={fecharComprovante}>
                <div className="relative w-full max-w-3xl h-[85vh] bg-white rounded-[16px] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="h-12 px-4 flex items-center justify-between border-b bg-[#F0F7FF]">
                        <span className="text-[14px] font-bold">Documento</span>
                        <button onClick={fecharComprovante} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="h-[calc(100%-3rem)] bg-gray-100 p-2">
                        {comprovante.type === 'application/pdf'? <iframe src={comprovante.url} className="w-full h-full bg-white rounded-[10px]" /> : <img src={comprovante.url} className="w-full h-full object-contain bg-white rounded-[10px]" />}
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
