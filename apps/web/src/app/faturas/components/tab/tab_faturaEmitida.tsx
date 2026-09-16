import { useState, useRef, useEffect } from 'react'
import { FileText, Eye, Search, ChevronDown, Check, Ban, X, FileMinus } from 'lucide-react'
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

const MOTIVOS_NC = [
  { value: '01 - Devolução', label: 'Devolução de mercadoria' },
  { value: '02 - Desconto', label: 'Desconto comercial' },
  { value: '03 - Erro facturação', label: 'Erro de facturação' },
  { value: '04 - Anulação', label: 'Anulação total' },
  { value: '05 - Outros', label: 'Outros motivos' },
]

function ModalMotivoNC({ open, faturaNumero, loading, selected, setSelected, onClose, onConfirm }: any) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" onClick={onClose} />
      <div className="relative bg-white rounded-[24px] w-full max-w-[420px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.30)] animate-in fade-in zoom-in-95">
        <div className="relative h-[72px] bg-[#E6F0FF] px-5 pt-5 flex justify-between items-start">
          <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
            <FileMinus className="w-4 h-4 text-[#0095ff]" />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-6 pt-5 pb-6">
          <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Emitir Nota de Crédito?</h3>
          <p className="text-[13.5px] text-gray-500 mt-2 leading-relaxed">
            Vai anular a <span className="font-bold text-gray-900">{faturaNumero}</span>. Escolhe o motivo AGT obrigatório.
          </p>
          <div className="mt-5 space-y-2 max-h-[40vh] overflow-auto pr-1">
            {MOTIVOS_NC.map(m => (
              <button
                key={m.value}
                onClick={() => setSelected(m.value)}
                className={`w-full text-left px-4 py-3 rounded-[14px] border text-[13px] flex items-center justify-between transition
                ${selected === m.value? 'bg-[#E6F0FF] border-[#0095ff] text-gray-900 font-semibold shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
              >
                <div>
                  <p className="font-bold">{m.value}</p>
                  <p className="text-[11px] opacity-70">{m.label}</p>
                </div>
                {selected === m.value && <Check className="w-4 h-4 text-[#0095ff]" />}
              </button>
            ))}
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[14px] font-medium text-gray-500 hover:bg-gray-50">Cancelar</button>
            <button onClick={onConfirm} disabled={!selected || loading} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white text-[14px] font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading? 'A emitir...' : 'Emitir NC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TabEmitidas({ faturas, cliente, empresa, onRefresh }: { faturas: any[]; cliente: any; empresa: any; onRefresh: () => void }) {
    const [filtro, setFiltro] = useState('todos')
    const [viewFatura, setViewFatura] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [openSelect, setOpenSelect] = useState(false)
    const [showMotivo, setShowMotivo] = useState(false)
    const [selectedFatura, setSelectedFatura] = useState<any>(null)
    const [selectedMotivo, setSelectedMotivo] = useState('')
    const [loadingNC, setLoadingNC] = useState(false)
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

    const handleOpenNC = (fatura: any) => {
      setSelectedFatura(fatura)
      setSelectedMotivo('')
      setShowMotivo(true)
    }

    const handleConfirmNC = async () => {
        if (!selectedMotivo ||!selectedFatura) return
        setLoadingNC(true)
        try {
            const { data } = await api.post(`/api/faturas/${selectedFatura.id}/nota-credito`, {
                motivo: selectedMotivo,
                observacoes: `NC referente a ${selectedFatura.numero_fatura} - ${selectedMotivo}`
            })
            toast.success(`NC ${data.numero_nota_credito} emitida!`)
            setShowMotivo(false)
            setSelectedFatura(null)
            setSelectedMotivo('')
            onRefresh()
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Erro ao emitir NC - já existe NC para esta FT?')
        } finally {
            setLoadingNC(false)
        }
    }

    if (viewFatura) {
        return <FaturaFolhaView fatura={viewFatura} cliente={cliente} empresa={empresa} onVoltar={() => setViewFatura(null)} />
    }

    return (
        <>
            <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                <div className="flex gap-3 pb-3 mb-4 overflow-visible">
                    <div ref={wrapperRef} className="relative min-w-[180px] z-40">
                        <button onClick={() => setOpenSelect(!openSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                            <span className="text-gray-900">{OPTIONS.find(o => o.value === filtro)?.label}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSelect? 'rotate-180' : ''}`} />
                        </button>
                        {openSelect && (
                            <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                                {OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => { setFiltro(opt.value); setOpenSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${filtro === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        {opt.label}
                                        {filtro === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative flex-1 z-0">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nº FT/NC ou hash AGT" className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                    </div>
                </div>

                {filtradas.length === 0? (
                    <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma fatura FT/NC</p>
                ) : (
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {filtradas.map(f => (
                            <FaturaCard key={f.id} fatura={f} onView={setViewFatura} onOpenNC={handleOpenNC} />
                        ))}
                    </div>
                )}
            </div>

            <ModalMotivoNC
                open={showMotivo}
                faturaNumero={selectedFatura?.numero_fatura || (selectedFatura? getNumero(selectedFatura) : '')}
                loading={loadingNC}
                selected={selectedMotivo}
                setSelected={setSelectedMotivo}
                onClose={() => { setShowMotivo(false); setSelectedFatura(null); setSelectedMotivo('') }}
                onConfirm={handleConfirmNC}
            />
        </>
    )
}

function FaturaCard({ fatura, onView, onOpenNC }: { fatura: any; onView: (f: any) => void; onOpenNC: (f:any)=>void }) {
    const isCancel = fatura.status === 'cancelada'
    const isNC = isNotaCredito(fatura)
    const initials = isNC? 'NC' : getNumero(fatura)?.slice(0, 2).toUpperCase() || 'FT'

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
                    <button onClick={() => onOpenNC(fatura)} className="mt-3 w-full h-[36px] rounded-full text-[11px] font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center justify-center gap-1">
                        <Ban className="w-3.5 h-3.5" /> Emitir Nota de Crédito
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
