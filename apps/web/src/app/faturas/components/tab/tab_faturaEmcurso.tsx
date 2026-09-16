import { useState } from 'react'
import { Trash2, XCircle, Eye, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'
import { getNumero, getTotal } from '../../EmitirFaturaPage'
import ModalConfirmDelete from '../../../dashboard/components/modals/modal_ConfirmDelete'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'

const formatEstado = (s: string) => (s || 'em_curso').replace(/_/g, ' ').toUpperCase()

export default function TabCurso({ faturas, cliente, empresa, onRefresh }: { faturas: any[]; cliente: any; empresa: any; onRefresh: () => void }) {
    const [deleteTarget, setDeleteTarget] = useState<any>(null)
    const [viewFatura, setViewFatura] = useState<any>(null)

    const handleConverter = async (id: string) => {
        try {
            const t = toast.loading('A gerar FT com hash AGT...')
            const { data } = await api.post(`/api/faturas/${id}/converter`)
            toast.dismiss(t)
            toast.success(`FT ${data.numero_fatura} emitida! Hash: ${data.hash_agt?.slice(0, 10)}...`)
            onRefresh()
        } catch (e: any) {
            toast.dismiss()
            toast.error(e.response?.data?.detail || 'Erro ao converter para FT')
        }
    }
    const handleCancelar = async (id: string) => { try { await api.post(`/api/faturas/${id}/cancelar`); toast.success('Proforma cancelada'); onRefresh() } catch { toast.error('Erro') } }
    const handleApagar = async () => { try { await api.delete(`/api/faturas/${deleteTarget.id}`); toast.success('Proforma apagada'); setDeleteTarget(null); onRefresh() } catch { toast.error('Erro') } }

    if (viewFatura) {
        return <FaturaFolhaView fatura={viewFatura} cliente={cliente} empresa={empresa} onVoltar={() => setViewFatura(null)} />
    }

    return (
        <div className="-full px-4 sm:px-0 lg:px-0 mt-0">
            {faturas.length === 0 ? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma proforma em curso</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {faturas.map(f => {
                        const numero = getNumero(f)
                        const total = getTotal(f)
                        const estado = formatEstado(f.status)
                        return (
                            <div key={f.id} className="min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
                                <div className="relative h-[90px] bg-[#FFF7CC]">
                                    <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm border text-[#8A6D00] truncate max-w-[85%]">
                                        PROFORMA PP {numero}
                                    </div>
                                    <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                                        <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700">{numero.slice(0, 2).toUpperCase()}</div>
                                    </div>
                                </div>
                                <div className="pt-14 px-5 pb-4">
                                    <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">{total.toFixed(2)} KZ</h3>
                                    <div className="mt-2 flex flex-col gap-0.5">
                                        <p className="text-[11px] text-gray-500 truncate">{f.forma_pagamento} • Validade: {f.validade_proforma ? new Date(f.validade_proforma).toLocaleDateString('pt-AO') : '15 dias'}</p>
                                        <p className="text-[10px] text-gray-400 truncate">Sem valor fiscal - AGT • {estado}</p>
                                    </div>
                                    <button onClick={() => handleConverter(f.id)} className="mt-3 w-full bg-[#0095ff] text-white h-[38px] rounded-full text-[12px] font-bold flex items-center justify-center gap-1 hover:bg-[#0080e0]">
                                        Converter para FT <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                                    <button onClick={() => setViewFatura(f)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-gray-600 group-hover:text-black" /></button>
                                    <button onClick={() => handleCancelar(f.id)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"><XCircle className="w-4 h-4 text-gray-600 group-hover:text-orange-600" /></button>
                                    <button onClick={() => setDeleteTarget(f)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget ? `PROFORMA PP ${getNumero(deleteTarget)}` : ''} onClose={() => setDeleteTarget(null)} onConfirm={handleApagar} title="Apagar proforma?" description="Proforma PP pode ser apagada. FT oficial só cancela - regra AGT." />
        </div>
    )
}
