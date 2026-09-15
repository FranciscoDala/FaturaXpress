import { useState } from 'react'
import { Trash2, XCircle, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'
import { getNumero, getTotal } from '../../EmitirFaturaPage'
import ModalConfirmDelete from '../../../dashboard/components/modals/modal_ConfirmDelete'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'

export default function TabCurso({ faturas, cliente, empresa, onRefresh }: { faturas: any[]; cliente: any; empresa: any; onRefresh: () => void }) {
    const [deleteTarget, setDeleteTarget] = useState<any>(null)
    const [viewFatura, setViewFatura] = useState<any>(null)

    const handleCancelar = async (id: string) => { try { await api.post(`/api/faturas/${id}/cancelar`); toast.success('Cancelada'); onRefresh() } catch { toast.error('Erro') } }
    const handleApagar = async () => { try { await api.delete(`/api/faturas/${deleteTarget.id}`); toast.success('Apagada'); setDeleteTarget(null); onRefresh() } catch { toast.error('Erro') } }

    if (viewFatura) {
        return <FaturaFolhaView fatura={viewFatura} cliente={cliente} empresa={empresa} onVoltar={() => setViewFatura(null)} />
    }

    return (
        <div className="w-full mt-0">
            <div className="flex justify-between items-center mb-4">
                {/* <h3 className="text-[17px] font-bold text-gray-900">Faturas em Curso</h3> */}
                <span className="text-[12px] bg-white px-3 py-1 rounded-full border">{faturas.length}</span>
            </div>

            {faturas.length === 0? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma em curso</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {faturas.map(f => (
                        <div key={f.id} className="min-w-[100%] md:min-w-[300px] md:max-w-[300px] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
                            <div className="relative h-[90px] bg-[#E6F0FF]">
                                <div className="absolute top-3 right-3 bg-[#FFF7CC] px-3 py-1 rounded-full text-[11px] font-medium shadow-sm border text-[#8A6D00]">em_curso</div>
                                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700">{getNumero(f).slice(0,2).toUpperCase()}</div>
                                </div>
                            </div>
                            <div className="pt-14 px-5 pb-4">
                                <div className="flex items-center gap-1.5 mb-3">
                                    <span className="text-[11px] text-gray-400">exp.</span>
                                    <div className="flex gap-[2px]">{Array.from({ length: 10 }).map((_, i) => (<div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 7? 'bg-yellow-400' : 'bg-gray-200'}`} />))}</div>
                                </div>
                                <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">{getNumero(f)}</h3>
                                <div className="mt-2 flex flex-col gap-0.5">
                                    <p className="text-[13px] text-gray-900 font-bold truncate">{getTotal(f).toFixed(2)} KZ</p>
                                    <p className="text-[12.5px] text-gray-500 truncate">{f.tipo_documento}</p>
                                    <p className="text-[12.5px] text-gray-500 truncate">{f.data? new Date(f.data).toLocaleDateString() : 'Hoje'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                                <button onClick={() => setViewFatura(f)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-gray-600 group-hover:text-black" /></button>
                                <button onClick={() => handleCancelar(f.id)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"><XCircle className="w-4 h-4 text-gray-600 group-hover:text-orange-600" /></button>
                                <button onClick={() => setDeleteTarget(f)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget? getNumero(deleteTarget) : ''} onClose={() => setDeleteTarget(null)} onConfirm={handleApagar} title="Apagar?" description="Removida permanentemente." />
        </div>
    )
}
