import { useState, useRef, useEffect } from 'react'
import { FileText, Eye, Search, ChevronDown, Check } from 'lucide-react'
import { getNumero, getTotal } from '../../EmitirFaturaPage'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'

const OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'concluida', label: 'Concluídas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'em_curso', label: 'Em Curso' },
]

export default function TabEmitidas({ faturas, cliente, empresa }: { faturas: any[]; cliente: any; empresa: any }) {
    const [filtro, setFiltro] = useState('todos')
    const [viewFatura, setViewFatura] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [openSelect, setOpenSelect] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const filtradas = faturas.filter(f => {
        const matchFiltro = filtro === 'todos'? true : f.status === filtro
        const matchSearch = search === ''? true : getNumero(f).toLowerCase().includes(search.toLowerCase())
        return matchFiltro && matchSearch
    })

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapperRef.current &&!wrapperRef.current.contains(e.target as Node)) setOpenSelect(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    if (viewFatura) {
        return <FaturaFolhaView fatura={viewFatura} cliente={cliente} empresa={empresa} onVoltar={() => setViewFatura(null)} />
    }

    return (
        <div className="w-full mt-0">
            {/* FILTROS TIPO CARDS - ARRASTÁVEL NO MOBILE */}
            <div className={`flex gap-3 pb-3 mb-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${openSelect? 'overflow-visible' : 'overflow-x-auto snap-x snap-mandatory snap-always'}`}>
                <div ref={wrapperRef} className="relative min-w-full sm:min-w-[180px] snap-center flex-shrink-0 z-50">
                    <button onClick={() => setOpenSelect(!openSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                        <span className="text-gray-900">{OPTIONS.find(o => o.value === filtro)?.label}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSelect? 'rotate-180' : ''}`} />
                    </button>
                    {openSelect && (
                        <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                            {OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => { setFiltro(opt.value); setOpenSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${filtro === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                    {opt.label}
                                    {filtro === opt.value && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative min-w-full sm:min-w-[280px] snap-center flex-shrink-0 z-0">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nº" className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                </div>
            </div>

            {filtradas.length === 0? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma fatura</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-0">
                    {filtradas.map(f => (
                        <FaturaCard key={f.id} fatura={f} onView={setViewFatura} />
                    ))}
                </div>
            )}
        </div>
    )
}

function FaturaCard({ fatura, onView }: { fatura: any; onView: (f:any)=>void }) {
    const statusColor = fatura.status === 'cancelada'? 'bg-red-100 text-red-600' : fatura.status === 'concluida'? 'bg-green-100 text-green-600' : 'bg-[#FFF7CC] text-[#8A6D00]'
    const initials = getNumero(fatura)?.slice(0,2).toUpperCase() || 'PR'
    return (
        <div className="min-w-full md:min-w-[300px] md:max-w-[300px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF]">
                <div className={`absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[11px] font-medium shadow-sm border ${statusColor}`}>{fatura.status}</div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700">{initials}</div>
                </div>
            </div>
            <div className="pt-14 px-5 pb-4">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">{Array.from({ length: 10 }).map((_, i) => (<div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5? 'bg-yellow-400' : 'bg-gray-200'}`} />))}</div>
                </div>
                <h3 className="font-bold text-[15px] text-gray-900 leading-tight truncate">{getNumero(fatura)}</h3>
                <div className="mt-2 flex flex-col gap-0.5">
                    <p className="text-[13px] text-gray-900 font-bold truncate">{getTotal(fatura).toFixed(2)} KZ</p>
                    <p className="text-[12.5px] text-gray-500 truncate capitalize">{fatura.tipo_documento} · {fatura.status}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">{fatura.data? new Date(fatura.data).toLocaleDateString() : '15-09-2026'}</p>
                </div>
            </div>
            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                <button onClick={() => onView(fatura)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-gray-600 group-hover:text-black" /></button>
                <button onClick={() => onView(fatura)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"><FileText className="w-4 h-4 text-gray-600 group-hover:text-blue-600" /></button>
                <button className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><div className={`w-2.5 h-2.5 rounded-full ${fatura.status === 'cancelada'? 'bg-red-500' : 'bg-green-500'}`} /></button>
            </div>
        </div>
    )
}
