import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'

const MONTH_LABEL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const WEEK_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"]

function isoToday() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function formatDisplay(iso: string) {
    if (!iso) return ""
    const [y, m, d] = iso.split("-")
    return `${d}/${m}/${y}`
}
function addDays(iso: string, days: number) {
    const d = new Date(iso + "T12:00:00")
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
    open: boolean
    value: string
    onClose: () => void
    onSelect: (iso: string) => void
}

export default function ModalCalendarioPonto({ open, value, onClose, onSelect }: Props) {
    const hoje = isoToday()
    const minDate = addDays(hoje, -6) // 7 dias no total: hoje + 6 atrás

    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days')
    const [view, setView] = useState(() => {
        const base = value? new Date(value + "T12:00:00") : new Date()
        return { year: base.getFullYear(), month: base.getMonth() }
    })
    const [yearPage, setYearPage] = useState(() => Math.floor((value? new Date(value + "T12:00:00").getFullYear() : new Date().getFullYear()) / 12) * 12)

    useEffect(() => {
        if (value) {
            const d = new Date(value + "T12:00:00")
            setView({ year: d.getFullYear(), month: d.getMonth() })
            setYearPage(Math.floor(d.getFullYear() / 12) * 12)
        }
        if (open) setViewMode('days')
    }, [value, open])

    if (!open) return null

    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const startDay = new Date(view.year, view.month, 1).getDay()
    const days: (number | null)[] = [...Array(startDay).fill(null),...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

    const selected = value? { d: Number(value.split("-")[2]), m: Number(value.split("-")[1]) - 1, y: Number(value.split("-")[0]) } : null
    const isSelected = (day: number) => selected && selected.d === day && selected.m === view.month && selected.y === view.year
    const isToday = (day: number) => {
        const t = new Date()
        return t.getDate() === day && t.getMonth() === view.month && t.getFullYear() === view.year
    }
    const toIso = (day: number) => `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const isFuture = (iso: string) => iso > hoje
    const isTooOld = (iso: string) => iso < minDate

    const handleSelect = (day: number) => {
        const iso = toIso(day)
        if (isFuture(iso)) {
            toast.error("Não pode selecionar data futura")
            return
        }
        if (isTooOld(iso)) {
            toast.error(`Só até 7 dias: de ${formatDisplay(minDate)} até hoje`)
            return
        }
        onSelect(iso)
        onClose()
    }

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="h-[60px] px-4 flex items-center justify-between bg-white border-b border-gray-200">
                    {viewMode === 'days'? (
                        <>
                            <button type="button" onClick={() => setView(v => v.month === 0? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })} className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-black" /></button>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setViewMode('months')} className="px-4 py-1.5 rounded-full bg-white border border-gray-300 text-[14px] font-black text-black">{MONTH_SHORT[view.month]}</button>
                                <button type="button" onClick={() => { setYearPage(Math.floor(view.year / 12) * 12); setViewMode('years') }} className="px-4 py-1.5 rounded-full bg-[#0A2540] text-white text-[14px] font-black">{view.year}</button>
                            </div>
                            <button type="button" onClick={() => setView(v => v.month === 11? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 })} className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center"><ChevronRight className="w-5 h-5 text-black" /></button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => setYearPage(p => p - 12)} className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center"><ChevronLeft className="w-5 h-5 text-black" /></button>
                            <span className="text-[15px] font-black text-black">{viewMode === 'months'? view.year : `${yearPage} - ${yearPage + 11}`}</span>
                            <button type="button" onClick={() => setYearPage(p => p + 12)} className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center"><ChevronRight className="w-5 h-5 text-black" /></button>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white">
                    <div className="mb-3 flex justify-between text-[11px] bg-gray-50 rounded-full px-3 py-1.5 border">
                        <span className="text-black/60">Min: {formatDisplay(minDate)}</span>
                        <span className="text-black font-bold">Max: Hoje</span>
                    </div>

                    {viewMode === 'days' && (
                        <>
                            <div className="grid grid-cols-7 gap-1 mb-3">
                                {WEEK_LABEL.map((w, i) => <span key={i} className="h-7 flex items-center justify-center text-[12px] font-black text-black">{w}</span>)}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {days.map((day, idx) => day === null? <div key={`e-${idx}`} className="h-11" /> : (() => {
                                    const iso = toIso(day)
                                    const future = isFuture(iso)
                                    const tooOld = isTooOld(iso)
                                    const disabled = future || tooOld
                                    return (
                                        <button key={idx} type="button" disabled={disabled} onClick={() => handleSelect(day)} className={`h-11 rounded-[12px] text-[15px] font-bold border-2 transition active:scale-90 relative ${disabled? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' : isSelected(day)? 'bg-[#0A2540] text-white border-[#0A2540]' : isToday(day)? 'bg-white text-black border-black font-black' : 'bg-white text-black border-gray-200 hover:border-black'}`}>
                                            {day}
                                            {disabled && <Lock className="w-3 h-3 absolute -top-1 -right-1 text-gray-400" />}
                                        </button>
                                    )
                                })())}
                            </div>
                        </>
                    )}
                    {viewMode === 'months' && (
                        <div className="grid grid-cols-3 gap-2">
                            {MONTH_LABEL.map((m, i) => (
                                <button key={m} type="button" onClick={() => { setView(v => ({...v, month: i })); setViewMode('days') }} className={`h-12 rounded-[12px] text-[13px] font-black border-2 text-black ${view.month === i? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}>{m}</button>
                            ))}
                        </div>
                    )}
                    {viewMode === 'years' && (
                        <div className="grid grid-cols-3 gap-2">
                            {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                                <button key={y} type="button" onClick={() => { setView(v => ({...v, year: y })); setViewMode('days') }} className={`h-12 rounded-[12px] text-[13px] font-black border-2 text-black ${view.year === y? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}>{y}</button>
                            ))}
                        </div>
                    )}

                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={() => { onSelect(hoje); onClose() }} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-black">Hoje</button>
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-black text-black font-bold bg-white flex items-center justify-center gap-1"><X className="w-4 h-4" /> Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    )
    return typeof document!== 'undefined'? createPortal(modal, document.body) : null
}
