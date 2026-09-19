import { useState, useMemo } from 'react'
import { Trash2, XCircle, Eye, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { TabCursoSkeleton } from '../../../../components/CardsSkeleton'
import { api } from '../../../../lib/api'
import { getNumero, getTotal } from '../../EmitirFaturaPage'
import ModalConfirmDelete from '../../../dashboard/components/modals/modal_ConfirmDelete'
import ModalConfirmConverter from '../../../dashboard/components/modals/modal_ConfirmConverter'
import ModalConfirmCancelarPP from '../../../dashboard/components/modals/modal_ConfirmCancelarPP'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'

const formatEstado = (s: string) => (s || 'em_curso').replace(/_/g, ' ').toUpperCase()
const cleanNumero = (raw: string) => {
    if (!raw) return '---'
    return raw.replace(/PROFORMA/gi, '').replace(/\bPP\b/gi, '').replace(/\s+/g, ' ').trim()
}

interface Props {
    faturas: any[]
    cliente?: any | null
    empresa: any
    onRefresh: () => void
    loading?: boolean
}

export default function TabCurso({ faturas, cliente, empresa, onRefresh, loading = false }: Props) {
    const [deleteTarget, setDeleteTarget] = useState<any>(null)
    const [convertTarget, setConvertTarget] = useState<any>(null)
    const [converting, setConverting] = useState(false)
    const [cancelTarget, setCancelTarget] = useState<any>(null)
    const [canceling, setCanceling] = useState(false)
    const [viewFatura, setViewFatura] = useState<any>(null)

    const faturasVisiveis = useMemo(() => {
        return faturas.filter((f: any) =>
            f.tipo_documento === 'proforma' &&
            f.status === 'em_curso'
        )
    }, [faturas])

    const handleAskConverter = (f: any) => setConvertTarget(f)
    const handleAskCancelar = (f: any) => setCancelTarget(f)

    const handleConverter = async () => {
        if (!convertTarget) return
        try {
            setConverting(true)
            const t = toast.loading('A gerar FT com hash AGT...', { description: 'Validando com regras do seu plano...' })
            const { data } = await api.post(`/api/faturas/${convertTarget.id}/converter`)
            toast.dismiss(t)
            toast.success(`FT ${data.numero_fatura} emitida!`, {
                description: `Hash: ${data.hash_agt?.slice(0, 12)}... | PP convertida para FT oficial.`,
                duration: 5000
            })
            setConvertTarget(null)
            onRefresh()
        } catch (e: any) {
            toast.dismiss()
            const status = e.response?.status
            const detail = e.response?.data?.detail || 'Erro ao converter para FT'
            if (status === 403) {
                toast.error('Limite do plano atingido', {
                    description: detail,
                    duration: 6000,
                    action: { label: 'Fazer Upgrade', onClick: () => window.location.hash = '#/assinatura' }
                })
            } else {
                toast.error('Erro ao converter', { description: detail })
            }
        } finally {
            setConverting(false)
        }
    }

    const handleConfirmCancelar = async () => {
        if (!cancelTarget) return
        try {
            setCanceling(true)
            await api.post(`/api/faturas/${cancelTarget.id}/cancelar`);
            toast.success('Proforma cancelada', { description: 'PP marcada como cancelada.' });
            setCancelTarget(null)
            onRefresh()
        } catch (e: any) {
            toast.error('Erro ao cancelar', { description: e.response?.data?.detail || 'Tente novamente.' })
        } finally {
            setCanceling(false)
        }
    }

    const handleApagar = async () => {
        try {
            await api.delete(`/api/faturas/${deleteTarget.id}`);
            toast.success('Proforma apagada', { description: 'PP removida com sucesso.' });
            setDeleteTarget(null);
            onRefresh()
        } catch (e: any) {
            toast.error('Erro ao apagar', { description: e.response?.data?.detail })
        }
    }

    const getClienteDisplay = (f: any) => {
        if (f.cliente_nome) return `${f.cliente_nome}${f.cliente_nif? ` • ${f.cliente_nif}` : ''}${!f.cliente_id? ' (Avulso)' : ''}`
        if (cliente?.nome) return cliente.nome
        return 'Cliente Avulso'
    }

    if (loading) return <TabCursoSkeleton />

    return (
        <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
            {viewFatura && (
                <div className="fixed inset-0 z-[9999] bg-white overflow-y-auto overflow-x-hidden overscroll-contain">
                    <FaturaFolhaView
                        fatura={viewFatura}
                        cliente={cliente || { nome: viewFatura.cliente_nome || 'Cliente Avulso', nif: viewFatura.cliente_nif || '999999999', telefone: viewFatura.cliente_telefone, email: viewFatura.cliente_email, endereco: viewFatura.cliente_endereco }}
                        empresa={empresa}
                        onVoltar={() => setViewFatura(null)}
                    />
                </div>
            )}

            {faturasVisiveis.length === 0? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma fatura proforma (FT/PP)</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {faturasVisiveis.map(f => {
                        const numeroRaw = getNumero(f)
                        const numero = cleanNumero(numeroRaw)
                        const total = getTotal(f)
                        const estado = formatEstado(f.status)
                        const clienteDisplay = getClienteDisplay(f)
                        return (
                            <div key={f.id} className="w-full min-w-[calc(100vw-32px)] md:min-w-[320px] md:max-w-[320px] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
                                <div className="relative h-[90px] bg-[#FFF7CC] shrink-0">
                                    <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm border text-[#8A6D00] truncate max-w-[70%]">
                                        PROFORMA PP {numero}
                                    </div>
                                    <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                                        <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700 shrink-0">{numero.slice(0, 2).toUpperCase()}</div>
                                    </div>
                                </div>
                                <div className="pt-14 px-5 pb-4 min-w-0 flex-1 overflow-hidden">
                                    <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate max-w-full block" title={`${total.toFixed(2)} KZ`}>{total.toFixed(2)} KZ</h3>
                                    <p className="text-[11px] font-semibold text-gray-800 mt-1 truncate max-w-full block overflow-hidden whitespace-nowrap text-ellipsis" title={clienteDisplay}>
                                        {clienteDisplay}
                                    </p>
                                    <div className="mt-2 flex flex-col gap-0.5 min-w-0">
                                        <p className="text-[11px] text-gray-500 truncate max-w-full block" title={`${f.forma_pagamento} • Validade: ${f.validade_proforma? new Date(f.validade_proforma).toLocaleDateString('pt-AO') : '15 dias'}`}>
                                            {f.forma_pagamento} • Validade: {f.validade_proforma? new Date(f.validade_proforma).toLocaleDateString('pt-AO') : '15 dias'}
                                        </p>
                                        <p className="text-[10px] text-gray-400 truncate max-w-full block">Sem valor fiscal - AGT • {estado} • Livre de limite</p>
                                    </div>
                                    <button onClick={() => handleAskConverter(f)} className="mt-3 w-full bg-[#0095ff] text-white h-[38px] rounded-full text-[12px] font-bold flex items-center justify-center gap-1 hover:bg-[#0080e0] shrink-0">
                                        Converter para FT <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                                    <button onClick={() => setViewFatura(f)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-gray-600 group-hover:text-black" /></button>
                                    <button onClick={() => handleAskCancelar(f)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"><XCircle className="w-4 h-4 text-gray-600 group-hover:text-orange-600" /></button>
                                    <button onClick={() => setDeleteTarget(f)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget? `PROFORMA PP ${cleanNumero(getNumero(deleteTarget))}` : ''} onClose={() => setDeleteTarget(null)} onConfirm={handleApagar} title="Apagar proforma?" description="Proforma PP pode ser apagada. É livre e não conta no limite. FT oficial só cancela - regra AGT." />
            <ModalConfirmConverter open={!!convertTarget} numero={convertTarget? cleanNumero(getNumero(convertTarget)) : ''} total={convertTarget? getTotal(convertTarget) : 0} loading={converting} onClose={() =>!converting && setConvertTarget(null)} onConfirm={handleConverter} />
            <ModalConfirmCancelarPP open={!!cancelTarget} numero={cancelTarget? cleanNumero(getNumero(cancelTarget)) : ''} loading={canceling} onClose={() =>!canceling && setCancelTarget(null)} onConfirm={handleConfirmCancelar} />
        </div>
    )
}
