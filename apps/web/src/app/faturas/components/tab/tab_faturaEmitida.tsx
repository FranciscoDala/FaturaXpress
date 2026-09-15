import { useState } from 'react'
import { FileText, Eye } from 'lucide-react'
import { getNumero, getTotal } from '../../EmitirFaturaPage'
import FaturaPDFModal from '../pdf/pdf_FaturaModal' // <- CORRIGIDO

export default function TabEmitidas({ faturas, cliente, empresa }: { faturas: any[]; cliente: any; empresa: any }) {
    const [filtro, setFiltro] = useState('todos')
    const [viewFatura, setViewFatura] = useState<any>(null)
    const filtradas = filtro === 'todos'? faturas : faturas.filter(f => f.status === filtro)
    return (
        <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 bg-white border p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[12px] font-bold">Todas as Faturas</h3>
                <select value={filtro} onChange={e => setFiltro(e.target.value)} className="text-[11px] border rounded px-2 py-1"><option value="todos">Todos</option><option value="concluida">Concluídas</option><option value="cancelada">Canceladas</option><option value="em_curso">Em Curso</option></select>
            </div>
            <div className="space-y-2">
                {filtradas.map(f => (
                    <div key={f.id} className="flex justify-between items-center border rounded px-3 py-2.5">
                        <div className="flex gap-2 items-center"><FileText className="w-4 h-4 text-gray-400" /><div><p className="text-[13px] font-medium">{getNumero(f)} - {getTotal(f).toFixed(2)} KZ</p><p className="text-[11px] text-gray-500 capitalize">{f.status} • {f.tipo_documento}</p></div></div>
                        <div className="flex items-center gap-2"><span className={`text-[10px] px-2 py-0.5 rounded ${f.status === 'cancelada'? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{f.status}</span><button onClick={() => setViewFatura(f)} className="w-8 h-8 bg-black text-white rounded flex items-center justify-center"><Eye className="w-4 h-4" /></button></div>
                    </div>
                ))}
            </div>
            {viewFatura && <FaturaPDFModal open={!!viewFatura} fatura={viewFatura} cliente={cliente} empresa={empresa} onClose={() => setViewFatura(null)} />}
        </div>
    )
}
