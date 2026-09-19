import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, FileDown, Check, ChevronDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

const MONTH_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const genMeses = () => {
    const list: { value: string; label: string; year: number; month: number }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        list.push({
            value,
            label: i === 0 ? 'Mês atual' : i === 1 ? 'Mês passado' : `${MONTH_LABEL[d.getMonth()]} ${d.getFullYear()}`,
            year: d.getFullYear(),
            month: d.getMonth() + 1
        })
    }
    return list
}

interface Props { open: boolean; onClose: () => void }

export default function ModalSaftAO({ open, onClose }: Props) {
    const MESES = genMeses()
    const [mes, setMes] = useState(MESES[0].value)
    const [openSel, setOpenSel] = useState(false)
    const [loading, setLoading] = useState(false)
    const [anoView, setAnoView] = useState(new Date().getFullYear())
    const [isMobile, setIsMobile] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        if (openSel && btnRef.current && !isMobile) {
            const rect = btnRef.current.getBoundingClientRect()
            setPos({ top: rect.bottom + 8, left: rect.left, width: rect.width })
        }
    }, [openSel, isMobile])

    // TRAVA BODY
    useEffect(() => {
        if (open || openSel) {
            const prev = document.body.style.overflow
            if (isMobile && openSel) {
                document.body.style.overflow = 'hidden'
                document.documentElement.style.overflow = 'hidden'
            } else if (open && !openSel) {
                document.body.style.overflow = 'hidden'
                document.documentElement.style.overflow = 'hidden'
            }
            return () => {
                document.body.style.overflow = prev
                document.documentElement.style.overflow = ''
            }
        }
    }, [open, openSel, isMobile])

    const exportar = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/api/faturas/saf-t`, {
                params: { mes },
                responseType: 'blob'
            })
            const blob = new Blob([res.data], { type: 'application/xml;charset=utf-8' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `SAFT-AO-${mes}.xml`
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
            toast.success(`SAFT ${mes} gerado - AGT 1.04_01`)
            onClose()
        } catch (e: any) {
            if (e.response?.status === 404) toast.error(`Sem FT/NC em ${mes}`)
            else {
                if (e.response?.data instanceof Blob) {
                    const text = await e.response.data.text()
                    try {
                        const json = JSON.parse(text)
                        toast.error(json.detail || 'Erro ao gerar SAFT')
                    } catch {
                        toast.error('Erro ao gerar SAFT')
                    }
                } else {
                    toast.error(e.response?.data?.detail || 'Erro ao gerar SAFT')
                }
            }
        } finally {
            setLoading(false)
        }
    }

    if (!open) return null
    const current = MESES.find(m => m.value === mes)

    const calendarPicker = (
        <div className={`${isMobile ? 'fixed inset-0 z-[9999] flex items-end' : 'fixed z-[9999]'}`} style={!isMobile ? { top: pos.top, left: pos.left, width: pos.width } : {}}>
            {isMobile && <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpenSel(false)} />}
            <div className={`${isMobile ? 'relative w-full bg-white rounded-t-[28px] shadow-[0_-12px_40px_rgba(0,0,0,0.2)] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300' : 'w-full bg-white rounded-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200'}`}>
                {isMobile && <div className="w-full flex justify-center pt-3 pb-2 shrink-0"><div className="w-10 h-1.5 bg-gray-300 rounded-full" /></div>}

                <div className="h-[64px] px-4 flex items-center justify-between bg-[#F8FAFF] border-b border-gray-100 shrink-0">
                    <button type="button" onClick={() => setAnoView(a => a - 1)} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center active:scale-95"><ChevronLeft className="w-5 h-5" /></button>
                    <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-gray-900">{anoView}</span>
                        <span className="px-2.5 py-1 rounded-full bg-[#0A2540] text-white text-[11px] font-bold">{isMobile ? 'Toque no mês' : 'Selecione'}</span>
                    </div>
                    <button type="button" onClick={() => setAnoView(a => a + 1)} disabled={anoView >= new Date().getFullYear() + 1} className="w-10 h-10 rounded-full bg-white border shadow-sm flex items-center justify-center active:scale-95 disabled:opacity-40"><ChevronRight className="w-5 h-5" /></button>
                </div>

                <div className={`p-4 overflow-y-auto ${isMobile ? 'flex-1' : ''}`}>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {MESES.slice(0, 2).map(m => (
                            <button key={m.value} onClick={() => { setMes(m.value); setAnoView(m.year); setOpenSel(false) }}
                                className={`h-[48px] rounded-[14px] border text-[13px] font-semibold flex items-center justify-between px-4 active:scale-[0.98] transition ${mes === m.value ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                <span>{m.label}</span>
                                {mes === m.value && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                        {Array.from({ length: 12 }).map((_, idx) => {
                            const value = `${anoView}-${String(idx + 1).padStart(2, '0')}`
                            const isSel = mes === value
                            return (
                                <button key={value} onClick={() => { setMes(value); setOpenSel(false) }}
                                    className={`h-[64px] sm:h-[56px] rounded-[16px] border flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${isSel ? 'bg-[#E6F0FF] border-[#B8D9FF] text-[#0A2540] shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'}`}>
                                    <span className={`text-[13px] font-bold ${isSel ? 'text-[#0A2540]' : ''}`}>{MONTH_LABEL[idx]}</span>
                                    <span className="text-[11px] text-gray-400">{anoView}</span>
                                    {isSel && <div className="w-1 h-1 bg-[#0095ff] rounded-full mt-0.5" />}
                                </button>
                            )
                        })}
                    </div>
                    <button type="button" onClick={() => setOpenSel(false)} className="mt-5 w-full h-12 sm:hidden rounded-full bg-gray-900 text-white font-semibold text-[14px]">Confirmar</button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] my-4 sm:my-0 shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="relative h-[72px] bg-[#E6F0FF] px-5 pt-5 flex justify-between items-start rounded-t-[24px] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <FileDown className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-6 overflow-y-auto overscroll-contain flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Exportar SAFT-AO</h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                        Ficheiro oficial <span className="font-bold text-gray-800">AGT Angola</span> com FT + NC + Hash. Prazo até dia 15.
                    </p>

                    <div ref={ref} className="relative mt-5">
                        <button ref={btnRef} onClick={() => setOpenSel(!openSel)} className="w-full h-[48px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[13.5px] font-medium hover:border-gray-300 transition">
                            <span className="flex items-center gap-2 text-gray-900"><Calendar className="w-4 h-4 text-gray-400" /> {current?.label} - {mes}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSel ? 'rotate-180' : ''}`} />
                        </button>

                        {openSel && typeof document !== 'undefined' && createPortal(calendarPicker, document.body)}
                    </div>

                    <div className="mt-4 bg-[#F6F9FF] border border-blue-100 rounded-[16px] p-3.5 text-[11px] text-gray-600">
                        <p className="font-bold text-gray-900 text-[12px] mb-1.5">Conteúdo AGT</p>
                        <p>• FT com hash cadeia SHA256</p>
                        <p>• NC com total negativo + FT origem</p>
                        <p>• Marca comunicado_agt automático</p>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-12 rounded-full border border-gray-200 bg-white text-[14px] font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                        <button onClick={exportar} disabled={loading} className="flex-1 h-12 rounded-full bg-[#0A2540] text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition">
                            {loading ? 'A gerar...' : <><FileDown className="w-4 h-4" /> Exportar XML</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
