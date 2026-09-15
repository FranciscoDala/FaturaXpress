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
        <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 bg-white border p-5">
            <h3 className="text-[12px] font-bold mb-4">Faturas em Curso</h3>
            <div className="space-y-2">
                {faturas.length === 0? <p className="text-[12px] text-gray-400 text-center py-8">Nenhuma em curso</p> :
                    faturas.map(f => (
                        <div key={f.id} className="flex justify-between items-center border rounded px-3 py-2.5">
                            <div><p className="text-[13px] font-medium">{getNumero(f)} - {getTotal(f).toFixed(2)} KZ</p><p className="text-[11px] text-gray-500">{f.status}</p></div>
                            <div className="flex gap-1.5">
                                <button onClick={() => setViewFatura(f)} className="w-8 h-8 border rounded flex items-center justify-center hover:bg-black hover:text-white"><Eye className="w-4 h-4" /></button>
                                <button onClick={() => handleCancelar(f.id)} className="text-[11px] px-3 py-1 border rounded flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelar</button>
                                <button onClick={() => setDeleteTarget(f)} className="text-[11px] px-3 py-1 bg-[#FF3B30] text-white rounded flex items-center gap-1"><Trash2 className="w-3 h-3" /> Apagar</button>
                            </div>
                        </div>
                    ))}
            </div>
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget? getNumero(deleteTarget) : ''} onClose={() => setDeleteTarget(null)} onConfirm={handleApagar} title="Apagar?" description="Removida permanentemente." />
        </div>
    )
}
