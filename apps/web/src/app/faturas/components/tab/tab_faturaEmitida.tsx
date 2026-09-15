import { useState } from 'react'
import { FileText, Eye, Search } from 'lucide-react'
import { getNumero, getTotal } from '../../EmitirFaturaPage'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'

export default function TabEmitidas({ faturas, cliente, empresa }: { faturas: any[]; cliente: any; empresa: any }) {
    const [filtro, setFiltro] = useState('todos')
    const [viewFatura, setViewFatura] = useState<any>(null)
    const [search, setSearch] = useState('')

    const filtradas = faturas.filter(f => {
        const matchFiltro = filtro === 'todos' ? true : f.status === filtro
        const matchSearch = search === '' ? true : getNumero(f).toLowerCase().includes(search.toLowerCase())
        return matchFiltro && matchSearch
    })

    if (viewFatura) {
        return <FaturaFolhaView fatura={viewFatura} cliente={cliente} empresa={empresa} onVoltar={() => setViewFatura(null)} />
    }

    return (
        <div className="bg-[#F5F5F7] rounded-[24px] p-4 sm:p-6 mx-4 sm:mx-8 lg:mx-12 mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Todas as Faturas</h3>
                <div className="flex gap-2 w-full sm:w-auto">
                    <select value={filtro} onChange={e => setFiltro(e.target.value)} className="text-[13px] border border-gray-200 rounded-full px-3 py-2.5 bg-white">
                        <option value="todos">Todos</option>
                        <option value="concluida">Concluídas</option>
                        <option value="cancelada">Canceladas</option>
                        <option value="em_curso">Em Curso</option>
                    </select>
                    <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nº" className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            </div>

            {filtradas.length === 0 ? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px]">Nenhuma fatura</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {filtradas.map(f => (
                        <FaturaCard key={f.id} fatura={f} onView={setViewFatura} />
                    ))}
                </div>
            )}
        </div>
    )
}

function FaturaCard({ fatura, onView }: { fatura: any; onView: (f: any) => void }) {
    const statusColor = fatura.status === 'cancelada' ? 'bg-red-100 text-red-600' : fatura.status === 'concluida' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-700'
    const initials = getNumero(fatura)?.slice(0, 2).toUpperCase() || 'FT'

    return (
        <div className="min-w-[100%] md:min-w-[300px] md:max-w-[300px] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF]">
                <div className={`absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[11px] font-medium shadow-sm border ${statusColor}`}>
                    {fatura.status}
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700">
                        {initials}
                    </div>
                </div>
            </div>

            <div className="pt-14 px-5 pb-4">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
                <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">{getNumero(fatura)}</h3>
                <div className="mt-2 flex flex-col gap-0.5">
                    <p className="text-[12.5px] text-gray-900 font-semibold truncate">{getTotal(fatura).toFixed(2)} KZ</p>
                    <p className="text-[12.5px] text-gray-500 truncate capitalize">{fatura.tipo_documento} · {fatura.status}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">{fatura.data ? new Date(fatura.data).toLocaleDateString() : '15-09-2026'}</p>
                </div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                <button onClick={() => onView(fatura)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Ver">
                    <Eye className="w-4 h-4 text-gray-600 group-hover:text-black" />
                </button>
                <button onClick={() => onView(fatura)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group" title="PDF">
                    <FileText className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>
                <button className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Status">
                    <div className={`w-2 h-2 rounded-full mt-1 ${fatura.status === 'cancelada' ? 'bg-red-500' : 'bg-green-500'}`} />
                </button>
            </div>
        </div>
    )
}
