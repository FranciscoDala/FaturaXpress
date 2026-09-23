import { useState, useRef, useEffect, useMemo } from 'react'
import { FileText, Eye, Search, ChevronDown, Check, Ban, AlertTriangle, Lock, Download } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { createRoot, type Root } from 'react-dom/client'
import { TabEmitidasSkeleton } from '../../../../components/CardsSkeleton'
import { api } from '../../../../lib/api'
import { getNumero, getTotal, isNotaCredito } from '../../page'
import FaturaFolhaView from '../../components/pdf/FaturaFolhaView'
import ModalMotivoNC from '../../../dashboard/components/modals/modal_MotivoNC'

const OPTIONS = [
    { value: 'todos', label: 'Todas (FT + NC)' },
    { value: 'emitida', label: 'Emitidas FT' },
    { value: 'nota_credito', label: 'Notas Crédito NC' },
    { value: 'concluida', label: 'Concluídas' },
    { value: 'cancelada', label: 'Canceladas' },
]

const MOTIVOS_MAP: Record<string, string> = {
    '01': '01 - Devolução de mercadoria',
    '02': '02 - Desconto comercial',
    '03': '03 - Erro de facturação',
    '04': '04 - Anulação total',
    '05': '05 - Outros motivos',
    '01 - Devolução': '01 - Devolução de mercadoria',
    '02 - Desconto': '02 - Desconto comercial',
    '03 - Erro facturação': '03 - Erro de facturação',
    '04 - Anulação': '04 - Anulação total',
    '05 - Outros': '05 - Outros motivos',
}

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["ver_faturas", "emitir_nc", "ver_nc"],
    rh: [],
    recepcao: ["ver_faturas"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

interface Props {
    faturas: any[]
    cliente?: any | null
    empresa: any
    onRefresh: () => void
    loading?: boolean
}

export default function TabEmitidas({ faturas, cliente, empresa, onRefresh, loading = false }: Props) {
    const [filtro, setFiltro] = useState('todos')
    const [viewFatura, setViewFatura] = useState<any>(null)
    const [search, setSearch] = useState('')
    const [openSelect, setOpenSelect] = useState(false)
    const [showMotivo, setShowMotivo] = useState(false)
    const [selectedFatura, setSelectedFatura] = useState<any>(null)
    const [selectedMotivo, setSelectedMotivo] = useState('')
    const [loadingNC, setLoadingNC] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 320 })

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeEmitirNC = funcionarioLogado? temPermissao(cargoAtual, 'emitir_nc') || cargoAtual === 'admin' : true
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_faturas') || temPermissao(cargoAtual, 'ver_nc') || cargoAtual === 'admin' : true

    const updatePosition = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width })
        }
    }

    useEffect(() => { if (openSelect) updatePosition() }, [openSelect])
    useEffect(() => {
        if (!openSelect) return
        const handle = () => updatePosition()
        window.addEventListener('scroll', handle, true)
        window.addEventListener('resize', handle)
        return () => {
            window.removeEventListener('scroll', handle, true)
            window.removeEventListener('resize', handle)
        }
    }, [openSelect])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapperRef.current &&!wrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-select-dropdown]')) {
                setOpenSelect(false)
            }
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const { ncPorOrigem, faturaOrigemComNC } = useMemo(() => {
        const map = new Map<string, any>()
        const set = new Set<string>()
        faturas.forEach(f => {
            if (f.tipo_documento === 'nota_credito' && f.fatura_origem_id) {
                map.set(f.fatura_origem_id, f)
                set.add(f.fatura_origem_id)
            }
        })
        return { ncPorOrigem: map, faturaOrigemComNC: set }
    }, [faturas])

    if (loading) {
        return (
            <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                <div className="flex gap-4 overflow-x-auto pb-3 mb-4 [&::-webkit-scrollbar]:hidden">
                    <div className="min-w-full md:min-w-[320px] md:max-w-[320px] h-[46px] bg-gray-100 animate-pulse rounded-full" />
                    <div className="min-w-full md:min-w-[320px] md:max-w-[320px] h-[46px] bg-gray-100 animate-pulse rounded-full" />
                </div>
                <TabEmitidasSkeleton />
            </div>
        )
    }

    if (!podeVer) {
        return (
            <div className="w-full px-4 sm:px-0 text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-[13px] text-gray-500">Cargo <b>{cargoAtual}</b> não pode ver FT/NC</p>
            </div>
        )
    }

    const filtradas = useMemo(() => {
        return faturas.filter(f => {
            const isNC = f.tipo_documento === 'nota_credito'
            const hasNC = faturaOrigemComNC.has(f.id)

            if (filtro === 'nota_credito' &&!isNC) return false
            if (filtro!== 'todos' && filtro!== 'nota_credito' && isNC) return false

            let matchFiltro = true
            if (filtro === 'emitida') matchFiltro = f.status === 'emitida' &&!hasNC &&!isNC
            if (filtro === 'concluida') matchFiltro = f.status === 'concluida' &&!isNC
            if (filtro === 'cancelada') matchFiltro = f.status === 'cancelada' || hasNC

            const matchSearch = search === ''? true :
                getNumero(f).toLowerCase().includes(search.toLowerCase()) ||
                (f.hash_agt || '').toLowerCase().includes(search.toLowerCase()) ||
                (f.cliente_nome || '').toLowerCase().includes(search.toLowerCase()) ||
                (f.cliente_nif || '').toLowerCase().includes(search.toLowerCase()) ||
                (ncPorOrigem.get(f.id)?.numero_nota_credito || '').toLowerCase().includes(search.toLowerCase())
            return matchFiltro && matchSearch
        })
    }, [faturas, filtro, search, ncPorOrigem, faturaOrigemComNC])

    const handleOpenNC = (fatura: any) => {
        if (!podeEmitirNC) { toast.error(`Cargo ${cargoAtual} não pode emitir NC`); return }
        if (faturaOrigemComNC.has(fatura.id)) {
            toast.error('FT já anulada por NC', { description: `Já existe ${getNumero(ncPorOrigem.get(fatura.id))} para esta FT.` })
            return
        }
        setSelectedFatura(fatura)
        setSelectedMotivo('')
        setShowMotivo(true)
    }

    const handleConfirmNC = async () => {
        if (!selectedMotivo ||!selectedFatura) return
        if (!podeEmitirNC) { toast.error('Sem permissão'); return }
        setLoadingNC(true)
        try {
            const { data } = await api.post(`/api/faturas/${selectedFatura.id}/nota-credito`, {
                motivo: selectedMotivo,
                observacoes: `NC referente a ${selectedFatura.numero_fatura} - ${MOTIVOS_MAP[selectedMotivo] || selectedMotivo}`
            })
            toast.success(`NC ${data.numero_nota_credito} emitida!`, {
                description: `${MOTIVOS_MAP[selectedMotivo] || selectedMotivo} aplicado na mesma FT. FT agora anulada.`,
                duration: 6000
            })
            setShowMotivo(false)
            setSelectedFatura(null)
            setSelectedMotivo('')
            onRefresh()
        } catch (e: any) {
            toast.error('Erro ao emitir NC', { description: e.response?.data?.detail || 'Tente novamente.' })
        } finally {
            setLoadingNC(false)
        }
    }

    return (
        <>
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

            <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-3 mb-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div ref={wrapperRef} className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-40">
                        <button ref={btnRef} onClick={() => setOpenSelect(!openSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                            <span className="text-gray-900">{OPTIONS.find(o => o.value === filtro)?.label} • {cargoAtual.toUpperCase()}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSelect? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                    <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-0">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nº FT/NC, hash ou cliente avulso" className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                    </div>
                </div>

                {openSelect && (
                    <div data-select-dropdown style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                        {OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => { setFiltro(opt.value); setOpenSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${filtro === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                {opt.label}
                                {filtro === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                            </button>
                        ))}
                    </div>
                )}

                {filtradas.length === 0? (
                    <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhuma fatura emita ( FT/NC)</p>
                ) : (
                    <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {filtradas.map(f => {
                            const ncVinculada = ncPorOrigem.get(f.id)
                            return (
                                <FaturaCard key={f.id} fatura={f} ncVinculada={ncVinculada} clienteProp={cliente} empresa={empresa} onView={setViewFatura} onOpenNC={handleOpenNC} podeEmitirNC={podeEmitirNC} cargoAtual={cargoAtual} />
                            )
                        })}
                    </div>
                )}
            </div>

            {podeEmitirNC && (
                <ModalMotivoNC
                    open={showMotivo}
                    faturaNumero={selectedFatura?.numero_fatura || (selectedFatura? getNumero(selectedFatura) : '')}
                    loading={loadingNC}
                    selected={selectedMotivo}
                    setSelected={setSelectedMotivo}
                    onClose={() => { setShowMotivo(false); setSelectedFatura(null); setSelectedMotivo('') }}
                    onConfirm={handleConfirmNC}
                />
            )}
        </>
    )
}

function FaturaCard({ fatura, ncVinculada, clienteProp, empresa, onView, onOpenNC, podeEmitirNC, cargoAtual }: { fatura: any; ncVinculada?: any; clienteProp?: any | null; empresa?: any; onView: (f: any) => void; onOpenNC: (f: any) => void; podeEmitirNC: boolean; cargoAtual: string }) {
    const isCancel = fatura.status === 'cancelada' ||!!ncVinculada
    const isNC = isNotaCredito(fatura)
    const initials = isNC? 'NC' : ncVinculada? 'NC' : getNumero(fatura)?.slice(0, 2).toUpperCase() || 'FT'
    const nomeCliente = fatura.cliente_nome || clienteProp?.nome || 'Cliente Avulso'
    const nifCliente = fatura.cliente_nif || clienteProp?.nif || ''
    const motivoLabel = ncVinculada? (MOTIVOS_MAP[ncVinculada.motivo_credito] || ncVinculada.motivo_credito) : ''
    const [downloading, setDownloading] = useState(false)

    const podeBaixar = useMemo(() => {
        try {
            const funcionario = JSON.parse(localStorage.getItem('funcionario') || 'null')
            return temPermissao(funcionario?.cargo?.toLowerCase() || cargoAtual, 'baixar_fatura')
        } catch {
            return true
        }
    }, [cargoAtual])

    const handleDownload = async () => {
        if (!podeBaixar) {
            toast.error('Sem permissão para baixar')
            return
        }

        setDownloading(true)
        let container: HTMLDivElement | null = null
        let root: Root | null = null
        try {
            const documento = ncVinculada || fatura
            const cliente = clienteProp || {
                nome: documento.cliente_nome || 'Cliente Avulso',
                nif: documento.cliente_nif || '999999999',
                telefone: documento.cliente_telefone,
                email: documento.cliente_email,
                endereco: documento.cliente_endereco,
            }
            container = document.createElement('div')
            container.style.cssText = 'position:fixed;left:-10000px;top:0;width:210mm;background:#fff;pointer-events:none;'
            document.body.appendChild(container)
            root = createRoot(container)
            root.render(<FaturaPDF fatura={documento} cliente={cliente} empresa={empresa} />)
            await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

            const element = container.querySelector<HTMLElement>('#fatura-pdf')
            if (!element) throw new Error('Conteúdo da fatura não foi renderizado')

            const canvas = await html2canvas(element, {
                scale: Math.min(2, window.devicePixelRatio || 1),
                useCORS: true,
                backgroundColor: '#ffffff',
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight,
            })
            const pdf = new jsPDF('p', 'mm', 'a4')
            const pageWidth = 210
            const pageHeight = 297
            const scale = Math.min(pageWidth / canvas.width, pageHeight / canvas.height)
            const imageWidth = canvas.width * scale
            const imageHeight = canvas.height * scale
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pageWidth - imageWidth) / 2, (pageHeight - imageHeight) / 2, imageWidth, imageHeight)
            pdf.save(`${getNumero(documento)}.pdf`)
            toast.success('Fatura baixada')
        } catch {
            toast.error('Erro ao gerar PDF')
        } finally {
            root?.unmount()
            container?.remove()
            setDownloading(false)
        }
    }

    return (
        <div className={`w-full min-w-[calc(100vw-32px)] md:min-w-[320px] md:max-w-[320px] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border flex flex-col ${ncVinculada? 'border-red-200' : 'border-gray-100'}`}>
            <div className={`relative h-[90px] ${isNC || ncVinculada? 'bg-[#FFEBEB]' : 'bg-[#E6F0FF]'}`}>
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm border bg-white max-w-[70%] truncate ${isNC || ncVinculada? 'text-red-600 border-red-200' : isCancel? 'text-red-600 border-red-200' : 'text-green-700 border-green-200'}`}>
                    {ncVinculada? `${getNumero(fatura)}. Anulada • ${cargoAtual.toUpperCase()}` : `${getNumero(fatura)} • ${isNC? 'NC' : fatura.status}`}
                </div>
                {!podeEmitirNC && <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-[8px] font-bold">LEITURA</div>}
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                    <div className={`w-full h-full rounded-full flex items-center justify-center text-[18px] font-bold text-white ${isNC || ncVinculada? 'bg-red-500' : 'bg-[#0095ff]'}`}>{initials}</div>
                </div>
            </div>
            <div className="pt-14 px-5 pb-4">
                <h3 className="font-bold text-[14px] text-gray-900 leading-tight truncate">{ncVinculada? `${getNumero(fatura)} → ${getNumero(ncVinculada)}` : getNumero(fatura)}</h3>
                <p className="text-[11px] font-semibold text-gray-800 truncate mt-1">{nomeCliente} {nifCliente? `• ${nifCliente}` : ''} {!fatura.cliente_id? '(Avulso)' : ''}</p>
                {ncVinculada? (
                    <div className="mt-1 bg-red-50 border border-red-100 rounded-[10px] px-2 py-1.5">
                        <p className="text-[10px] text-red-600 font-bold truncate">{motivoLabel}</p>
                        <p className="text-[9px] text-red-500 truncate">NC {ncVinculada.numero_nota_credito} • Hash {ncVinculada.hash_agt?.slice(0, 12)}... • Anula FT</p>
                    </div>
                ) : isNC? (
                    <p className="text-[10px] text-red-500 truncate">Ref FT: {fatura.fatura_origem_id?.slice(0, 8) || '---'} • Motivo: {fatura.motivo_credito}</p>
                ) : (
                    <p className="text-[10px] text-gray-400 truncate">PP origem: {fatura.proforma_origem_id? fatura.proforma_origem_id.slice(0, 8) : 'Direta'} • Conta no limite do plano</p>
                )}
                <div className="mt-2 flex flex-col gap-0.5">
                    <p className={`text-[13px] font-bold truncate ${isNC || ncVinculada? 'text-red-600 line-through' : 'text-gray-900'}`}>{getTotal(fatura).toFixed(2)} KZ • {fatura.forma_pagamento}</p>
                    <p className="text-[10px] text-gray-500 truncate">Data: {fatura.data_emissao? new Date(fatura.data_emissao).toLocaleDateString('pt-AO') : ''}</p>
                    <p className="text-[9px] text-gray-400 break-all">Hash: {fatura.hash_agt? fatura.hash_agt.slice(0, 24) + '...' : '---'}</p>
                    {fatura.comunicado_agt && <span className={`text-[9px] border px-2 py-0.5 rounded-full w-fit mt-1 ${isNC || ncVinculada? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{ncVinculada? `Anulada por ${ncVinculada.numero_nota_credito}` : isNC? 'NC Comunicada AGT' : 'Comunicado AGT'}</span>}
                </div>
                {!isNC &&!ncVinculada &&!isCancel && (
                    <button disabled={!podeEmitirNC} onClick={() => onOpenNC(fatura)} className={`mt-3 w-full h-[36px] rounded-full text-[11px] font-bold border transition flex items-center justify-center gap-1 ${podeEmitirNC? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}>
                        <Ban className="w-3.5 h-3.5" /> Emitir Nota de Crédito {podeEmitirNC? '' : '(sem permissão)'}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                <button onClick={() => onView(ncVinculada || fatura)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-gray-600 group-hover:text-black" /></button>
                <button onClick={() => onView(ncVinculada || fatura)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"><FileText className="w-4 h-4 text-gray-600 group-hover:text-blue-600" /></button>
                <button disabled={downloading || !podeBaixar} onClick={handleDownload} className={`py-3.5 flex justify-center transition group ${downloading || !podeBaixar ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`} title="Baixar PDF">
                    {downloading ? <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" /> : <Download className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />}
                </button>
            </div>
        </div>
    )
}
