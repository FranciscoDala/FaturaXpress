import { useState, useRef, useEffect } from 'react'
import { FileText, Eye, Search, ChevronDown, Check, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'
import { getNumero, getTotal, isNotaCredito } from '../../EmitirFaturaPage'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'

const OPTIONS = [
  { value: 'todos', label: 'Todas (FT + NC)' },
  { value: 'emitida', label: 'Emitidas FT' },
  { value: 'nota_credito', label: 'Notas Crédito NC' },
  { value: 'concluida', label: 'Concluídas' },
  { value: 'cancelada', label: 'Canceladas' },
]

export default function TabEmitidas({ faturas, cliente, empresa, onRefresh }: { faturas: any[]; cliente: any; empresa: any; onRefresh: () => void }) {
    const [filtro, setFiltro] = useState('todos')
    const [viewFatura, setViewFatura] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [openSelect, setOpenSelect] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    const filtradas = faturas.filter(f => {
        const matchFiltro = filtro === 'todos'? true : filtro === 'nota_credito'? f.tipo_documento === 'nota_credito' : f.status === filtro
        const matchSearch = search === ''? true : getNumero(f).toLowerCase().includes(search.toLowerCase()) || (f.hash_agt || '').toLowerCase().includes(search.toLowerCase())
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
        <div className="-full px-4 sm:px-0 lg:px-0 mt-0">
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
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nº FT/NC ou hash AGT" className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                </div>
            </div>

            {filtradas.length === 0? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma fatura FT/NC</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-0">
                    {filtradas.map(f => (
                        <FaturaCard key={f.id} fatura={f} onView={setViewFatura} onRefresh={onRefresh} />
                    ))}
                </div>
            )}
        </div>
    )
}

function FaturaCard({ fatura, onView, onRefresh }: { fatura: any; onView: (f: any) => void; onRefresh: () => void }) {
    const isCancel = fatura.status === 'cancelada'
    const isNC = isNotaCredito(fatura)
    const initials = isNC? 'NC' : getNumero(fatura)?.slice(0, 2).toUpperCase() || 'FT'
    const [loadingNC, setLoadingNC] = useState(false)

    const handleEmitirNC = async () => {
        const motivo = prompt("Motivo AGT da NC:\n01 - Devolução\n02 - Desconto\n03 - Erro facturação\n04 - Anulação\n05 - Outros")
        if (!motivo) return
        setLoadingNC(true)
        try {
            const { data } = await api.post(`/api/faturas/${fatura.id}/nota-credito`, {
                motivo: motivo,
                observacoes: `NC referente a ${fatura.numero_fatura} - ${motivo}`
            })
            toast.success(`NC ${data.numero_nota_credito} emitida!`)
            onRefresh()
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Erro ao emitir NC - já existe NC para esta FT?')
        } finally {
            setLoadingNC(false)
        }
    }

    return (
        <div className="min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className={`relative h-[90px] ${isNC? 'bg-[#FFEBEB]' : 'bg-[#E6F0FF]'}`}>
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm border bg-white ${isNC? 'text-red-600 border-red-200' : isCancel? 'text-red-600 border-red-200' : 'text-green-700 border-green-200'}`}>
                    {getNumero(fatura)} • {isNC? 'NC' : fatura.status}
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                    <div className={`w-full h-full rounded-full flex items-center justify-center text-[18px] font-bold text-white ${isNC? 'bg-red-500' : 'bg-[#0095ff]'}`}>{initials}</div>
                </div>
            </div>
            <div className="pt-14 px-5 pb-4">
                <h3 className="font-bold text-[14px] text-gray-900 leading-tight truncate">{getNumero(fatura)}</h3>
                {isNC? (
                    <p className="text-[10px] text-red-500 truncate">Ref FT: {fatura.fatura_origem_id?.slice(0, 8) || '---'} • Motivo: {fatura.motivo_credito}</p>
                ) : (
                    <p className="text-[10px] text-gray-400 truncate">PP origem: {fatura.proforma_origem_id? fatura.proforma_origem_id.slice(0, 8) : 'Direta'}</p>
                )}
                <div className="mt-2 flex flex-col gap-0.5">
                    <p className={`text-[13px] font-bold truncate ${isNC? 'text-red-600' : 'text-gray-900'}`}>{getTotal(fatura).toFixed(2)} KZ • {fatura.forma_pagamento}</p>
                    <p className="text-[10px] text-gray-500 truncate">Data: {fatura.data_emissao? new Date(fatura.data_emissao).toLocaleDateString('pt-AO') : ''}</p>
                    <p className="text-[9px] text-gray-400 break-all">Hash: {fatura.hash_agt? fatura.hash_agt.slice(0, 24) + '...' : '---'}</p>
                    {fatura.comunicado_agt && <span className={`text-[9px] border px-2 py-0.5 rounded-full w-fit mt-1 ${isNC? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{isNC? 'NC Comunicada AGT' : 'Comunicado AGT'}</span>}
                </div>
                {!isNC &&!isCancel && (
                    <button onClick={handleEmitirNC} disabled={loadingNC} className="mt-3 w-full h-[36px] rounded-full text-[11px] font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center justify-center gap-1">
                        <Ban className="w-3.5 h-3.5" /> {loadingNC? 'A emitir NC...' : 'Emitir Nota de Crédito'}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                <button onClick={() => onView(fatura)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-gray-600 group-hover:text-black" /></button>
                <button onClick={() => onView(fatura)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"><FileText className="w-4 h-4 text-gray-600 group-hover:text-blue-600" /></button>
                <button className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><div className={`w-2.5 h-2.5 rounded-full ${isNC? 'bg-red-500' : isCancel? 'bg-red-500' : 'bg-green-500'}`} /></button>
            </div>
        </div>
    )
}
