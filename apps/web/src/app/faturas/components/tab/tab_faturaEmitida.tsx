import { useState } from 'react'
import { FileText } from 'lucide-react'
import { getNumero, getTotal } from '../../EmitirFaturaPage'

export default function TabEmitidas({ faturas }: { faturas: any[] }) {
    const [filtro, setFiltro] = useState('todos')
    const filtradas = filtro === 'todos'? faturas : faturas.filter(f => f.status === filtro)

    return (
        <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 bg-white border p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-[12px] font-bold">Todas as Faturas Emitidas</h3>
                <select value={filtro} onChange={e => setFiltro(e.target.value)} className="text-[11px] border rounded px-2 py-1">
                    <option value="todos">Todos</option><option value="concluida">Concluídas</option><option value="cancelada">Canceladas</option><option value="apagada">Apagadas</option><option value="em_curso">Em Curso</option>
                </select>
            </div>
            <div className="space-y-2">
                {filtradas.length === 0? <p className="text-[12px] text-gray-400 text-center py-8">Nenhuma fatura</p> :
                    filtradas.map(f => (
                        <div key={f.id} className="flex justify-between items-center border rounded px-3 py-2.5">
                            <div className="flex gap-2 items-center"><FileText className="w-4 h-4 text-gray-400" /><div><p className="text-[13px] font-medium">{getNumero(f)} - {getTotal(f).toFixed(2)} KZ</p><p className="text-[11px] text-gray-500 capitalize">{f.status}</p></div></div>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${f.status === 'cancelada'? 'bg-red-100 text-red-600' : f.status === 'concluida'? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{f.status}</span>
                        </div>
                    ))}
            </div>
        </div>
    )
}
