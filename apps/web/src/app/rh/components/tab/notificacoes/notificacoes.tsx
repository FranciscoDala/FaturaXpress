import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Loader2, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../../lib/api'
import { getStatusKey } from './utils/status'
import { getDataChave } from './utils/format'
import AtivasTab from './tabelas/ativas'
import HistoricoTab from './tabelas/historico'
import ComprovanteModal from './modals/comprovante'
import IgnoreModal from './modals/ignorar'

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
    const area = cargoAtual === 'admin' ? 'admin' : 'rh'
    const listRef = useRef<HTMLDivElement>(null)

    const fetchNotifs = useCallback(async () => {
        if (firstLoad.current) setLoading(true)
        try {
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}`);
            setNotifs(Array.isArray(data) ? data : [])
        } catch {
            toast.error('Erro ao carregar notificações')
        } finally {
            setLoading(false);
            firstLoad.current = false
        }
    }, [area])

    useEffect(() => {
        fetchNotifs();
        const i = setInterval(fetchNotifs, 30000);
        return () => clearInterval(i)
    }, [fetchNotifs])

    const { ativas, historico } = useMemo(() => {
        const at = [...notifs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const limite = new Date(); limite.setDate(limite.getDate() - 7)
        const hist = notifs.filter(n => {
            const s = getStatusKey(n)
            const resolvida = ['aprovada', 'aprovado', 'justificado', 'abonada', 'rejeitada', 'rejeitado', 'ignorado', 'ignorada', 'aguardando_admin', 'encaminhado_admin', 'encaminhada', 'encaminhado'].includes(s)
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
        return Object.entries(grupos).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()).slice(0, diasVisiveis)
    }, [historico, diasVisiveis])

    const onScroll = () => {
        if (!listRef.current || tab !== 'historico') return
        const { scrollTop, scrollHeight, clientHeight } = listRef.current
        if (scrollHeight - scrollTop - clientHeight < 120 && diasVisiveis < 7) {
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
            setComprovante({ url: URL.createObjectURL(blob), type: blob.type })
        } catch { toast.error('Sem anexo') }
    }

    const fecharComprovante = () => {
        if (comprovante) URL.revokeObjectURL(comprovante.url);
        setComprovante(null)
    }

    const handleFalta = async (faltaId: string, acao: 'aprovar' | 'rejeitar' | 'encaminhar' | 'ignorar') => {
        if (!faltaId || actingId) return;
        setActingId(faltaId)
        const statusMap: any = { aprovar: 'aprovada', rejeitar: 'rejeitada', encaminhar: 'encaminhada', ignorar: 'ignorada' }
        const nowIso = new Date().toISOString()
        // Optimistic update - força o BG correto imediatamente
        setNotifs(prev => prev.map(n => n.falta?.id === faltaId ? { ...n, status_notificacao: statusMap[acao], updated_at: nowIso } : n))
        try {
            const logado = JSON.parse(localStorage.getItem('funcionario') || 'null')
            if (!logado?.id) throw new Error('Usuário não identificado')
            if (acao === 'aprovar') await api.post(`/api/rh/falta/${faltaId}/aprovar`, { aprovado_por_id: logado?.id })
            if (acao === 'rejeitar') await api.post(`/api/rh/falta/${faltaId}/rejeitar`, { aprovado_por_id: logado?.id })
            if (acao === 'encaminhar') await api.post(`/api/rh/falta/${faltaId}/encaminhar-admin`, { encaminhado_por_id: logado?.id })
            if (acao === 'ignorar') await api.post(`/api/rh/falta/${faltaId}/ignorar`, { ignorado_por_id: logado?.id })
            toast.success(acao === 'aprovar' ? 'Falta justificada' : acao === 'rejeitar' ? 'Justificação não aceite' : acao === 'ignorar' ? 'Ignorada' : 'Encaminhada para o admin')
            setOpenSwipeId(null);
            await fetchNotifs()
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || e.message || 'Erro')
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
                        <button onClick={() => setTab('ativas')} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'ativas' ? 'bg-black text-white' : 'text-black/60'}`}>Ativas</button>
                        <button onClick={() => { setTab('historico'); setDiasVisiveis(1) }} className={`px-4 py-1 rounded-full text-[12px] font-bold ${tab === 'historico' ? 'bg-black text-white' : 'text-black/60'}`}>Histórico</button>
                    </div>
                </div>

                <div ref={listRef} onScroll={onScroll} className="max-h-[75vh] overflow-y-auto no-scrollbar">
                    {tab === 'ativas' ? (
                        <AtivasTab
                            ativas={ativas}
                            area={area}
                            actingId={actingId}
                            openSwipeId={openSwipeId}
                            setOpenSwipeId={setOpenSwipeId}
                            onAction={handleFalta}
                            onViewDoc={abrirComprovante}
                            onIgnore={setIgnoreModal}
                        />
                    ) : (
                        <HistoricoTab agrupado={historicoAgrupado} />
                    )}
                </div>
            </div>

            {comprovante && <ComprovanteModal comprovante={comprovante} onClose={fecharComprovante} />}
            {ignoreModal && <IgnoreModal data={ignoreModal} actingId={actingId} onClose={() => setIgnoreModal(null)} onConfirm={(id) => handleFalta(id, 'ignorar')} />}
        </>
    )
}
