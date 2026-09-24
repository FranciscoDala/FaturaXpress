import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Loader2, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../../lib/api'
import { getDataChave } from './utils/format'
import AtivasTab from './tabelas/ativas'
import HistoricoTab from './tabelas/historico'
import ComprovanteModal from './modals/comprovante'
import IgnoreModal from './modals/ignorar'

type Props = { cargoAtual: string }

const getLogadoId = () => {
    const keys = ['funcionario', 'user', 'admin', 'auth', 'company', 'profile', 'usuario']
    for (const k of keys) {
        try {
            const raw = localStorage.getItem(k)
            if (!raw) continue
            const obj = JSON.parse(raw)
            const id = obj?.id || obj?.user?.id || obj?.company?.id || obj?.funcionario?.id || obj?.data?.id || obj?.company_id
            if (id) return id
        } catch { }
    }
    try {
        const tokenRaw = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
        if (tokenRaw && tokenRaw.includes('.')) {
            const payload = JSON.parse(atob(tokenRaw.split('.')[1]))
            if (payload?.sub || payload?.id || payload?.company_id) return payload.sub || payload.id || payload.company_id
        }
    } catch { }
    return null
}

const parseError = (e: any) => {
    const detail = e?.response?.data?.detail || e?.response?.data?.msg || e?.message || 'Erro inesperado'
    const d = String(detail).toLowerCase()
    if (d.includes('edição bloqueada') || d.includes('edicao bloqueada')) return detail + ' — RH pode editar até 7 dias, Admin/Dono até 30 dias.'
    if (d.includes('já existe falta')) return 'Já existe falta lançada nesse dia para este funcionário.'
    if (d.includes('já tem uma justificação') || d.includes('justificacao em analise')) return 'Essa falta já está em análise. Você pode justificar faltas de outros dias normalmente.'
    if (d.includes('já está em análise') || d.includes('essa justificação já')) return 'Essa falta específica já está em análise. Aguarde a resposta.'
    if (d.includes('já justificada')) return 'Essa falta já foi justificada. Aguarde aprovação.'
    if (d.includes('futuro')) return 'Não é possível lançar ponto/falta em data futura.'
    if (d.includes('motivo') && d.includes('retro')) return 'Para datas passadas, informe o motivo do lançamento retroativo.'
    if (d.includes('bi ou senha inválidos')) return detail
    if (d.includes('funcionário não encontrado')) return 'Funcionário não encontrado.'
    if (d.includes('sem anexo')) return 'Esta falta não tem documento anexo.'
    if (d.includes('notificação') && d.includes('não encontrada')) return 'Notificação não encontrada ou já resolvida.'
    return detail
}

export default function TabNotificacoes({ cargoAtual }: Props) {
    const [tab, setTab] = useState<'ativas' | 'historico'>('ativas')
    const [notifs, setNotifs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actingId, setActingId] = useState<string | null>(null)
    const [openSwipeId, setOpenSwipeId] = useState<string | null>(null)
    const [comprovante, setComprovante] = useState<{ url: string, type: string } | null>(null)
    const [diasVisiveis, setDiasVisiveis] = useState(3)
    const [ignoreModal, setIgnoreModal] = useState<any | null>(null)
    const firstLoad = useRef(true)
    const area = cargoAtual === 'admin' ? 'admin' : 'rh'
    const listRef = useRef<HTMLDivElement>(null)

    const fetchNotifs = useCallback(async (tabAtual: 'ativas' | 'historico' = tab) => {
        if (firstLoad.current) setLoading(true)
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}&tab=${tabAtual}`);
            setNotifs(Array.isArray(data) ? data : [])
        } catch {
            toast.error('Erro ao carregar notificações. Verifique sua conexão.')
        } finally {
            setLoading(false);
            firstLoad.current = false
        }
    }, [area, tab])

    useEffect(() => {
        firstLoad.current = true
        setDiasVisiveis(3)
        fetchNotifs(tab);
        const i = setInterval(() => fetchNotifs(tab), 30000);
        return () => clearInterval(i)
    }, [fetchNotifs, tab])

    const agrupado = useMemo(() => {
        const sorted = [...notifs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const grupos: Record<string, any[]> = {}
        sorted.forEach(n => {
            const chave = getDataChave(n.updated_at || n.created_at)
            if (!grupos[chave]) grupos[chave] = []
            grupos[chave].push(n)
        })
        return Object.entries(grupos).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).slice(0, diasVisiveis) as [string, any[]][]
    }, [notifs, diasVisiveis])

    const onScroll = () => {
        if (!listRef.current) return
        const { scrollTop, scrollHeight, clientHeight } = listRef.current
        if (scrollHeight - scrollTop - clientHeight < 150 && diasVisiveis < 7) {
            setDiasVisiveis(d => d + 1)
        }
    }

    const abrirComprovante = async (faltaId: string) => {
        if (!faltaId) return
        const token = localStorage.getItem("token") || localStorage.getItem("access_token") || ""
        const url = `${apiRoot}/rh/falta/${faltaId}/anexo?token=${encodeURIComponent(token)}`
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            if (blob.size < 100) throw new Error('vazio')
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch { toast.error('Sem anexo ou arquivo não encontrado no Cloudinary') }
    }

    const fecharComprovante = () => {
        if (comprovante) URL.revokeObjectURL(comprovante.url);
        setComprovante(null)
    }

    const handleLida = async (notificacaoId: string) => {
        if (!notificacaoId || actingId) return
        setActingId(notificacaoId)
        setNotifs(prev => prev.filter(n => n.notificacao_id !== notificacaoId))
        try {
            await api.post(`/api/rh/notificacoes/${notificacaoId}/lida`)
            toast.success('Confirmado')
            setOpenSwipeId(null)
        } catch (e: any) {
            toast.error(parseError(e))
            await fetchNotifs(tab)
        } finally { setActingId(null) }
    }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar' | 'ignorar') => {
        if (!faltaId || actingId) return;
        setActingId(faltaId)
        try {
            const logadoId = getLogadoId()
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logadoId })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logadoId })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logadoId })
            if (acao === 'ignorar') await api.post(`/api/rh/falta/${faltaId}/ignorar`, { ignorado_por_id: logadoId })
            toast.success(acao === 'aprovar' ? 'Falta justificada e abonada com sucesso' : acao === 'rejeitar' ? 'Justificação rejeitada' : acao === 'ignorar' ? 'Notificação ignorada' : 'Encaminhada para o Admin Principal')
            setOpenSwipeId(null);
            setNotifs(prev => prev.filter(n => n.falta?.id !== faltaId))
            await fetchNotifs(tab)
        } catch (e: any) {
            toast.error(parseError(e))
            await fetchNotifs(tab)
        } finally { setActingId(null); setIgnoreModal(null) }
    }

    const handleAtraso = async (funcionarioId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => {
        if (!funcionarioId || actingId) return;
        setActingId(funcionarioId)
        try {
            const logadoId = getLogadoId()
            if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcionarioId}/aplicar-falta`, { aplicado_por_id: logadoId })
            if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcionarioId}/ignorar-atraso`, { ignorado_por_id: logadoId })
            if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcionarioId}/encaminhar-admin`, { encaminhado_por_id: logadoId })
            toast.success(acao === 'aplicar' ? 'Falta aplicada por excesso de atrasos' : acao === 'ignorar' ? 'Contador de atrasos zerado' : 'Atraso encaminhado para o Admin Principal')
            setOpenSwipeId(null);
            setNotifs(prev => prev.filter(n => n.funcionario_id !== funcionarioId))
            await fetchNotifs(tab)
        } catch (e: any) {
            toast.error(parseError(e))
            await fetchNotifs(tab)
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
                        <button onClick={() => setTab('ativas')} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'ativas' ? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                        <button onClick={() => setTab('historico')} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'historico' ? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                    </div>
                </div>

                <div ref={listRef} onScroll={onScroll} className="max-h-[75vh] overflow-y-auto no-scrollbar">
                    {tab === 'ativas' ? (
                        <AtivasTab
                            agrupado={agrupado}
                            area={area}
                            actingId={actingId}
                            openSwipeId={openSwipeId}
                            setOpenSwipeId={setOpenSwipeId}
                            onAction={handleFalta}
                            onActionAtraso={handleAtraso}
                            onViewDoc={abrirComprovante}
                            onIgnore={setIgnoreModal}
                            onLida={handleLida}
                        />
                    ) : (
                        <HistoricoTab
                            agrupado={agrupado}
                            onViewDoc={abrirComprovante}
                            openSwipeId={openSwipeId}
                            setOpenSwipeId={setOpenSwipeId}
                        />
                    )}
                </div>
            </div>

            {comprovante && <ComprovanteModal comprovante={comprovante} onClose={fecharComprovante} />}
            {ignoreModal && <IgnoreModal data={ignoreModal} actingId={actingId} onClose={() => setIgnoreModal(null)} onConfirmFalta={(id: any) => handleFalta(id, 'ignorar')} onConfirmAtraso={(fid: any) => handleAtraso(fid, 'ignorar')} />}
        </>
    )
}
