import { useState, useRef, useEffect } from 'react'
import { X, FileDown, Check, ChevronDown, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

const MESES = [
    { value: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`, label: 'Mês atual' },
    { value: `${new Date().getFullYear()}-${String(new Date().getMonth()).padStart(2, '0')}`, label: 'Mês passado' },
]

interface Props {
    open: boolean
    onClose: () => void
}

export default function ModalSaftAO({ open, onClose }: Props) {
    const [mes, setMes] = useState(MESES[0].value)
    const [openSel, setOpenSel] = useState(false)
    const [loading, setLoading] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpenSel(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    const exportar = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/api/saft/export`, { params: { mes }, responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `SAFT-AO-${mes}.xml`
            a.click()
            toast.success(`SAFT ${mes} gerado - submeter em agt.minfin.gov.ao`)
            onClose()
        } catch (e: any) {
            toast.error(e.response?.data?.detail || 'Erro ao gerar SAFT')
        } finally { setLoading(false) }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* TRAVADA - não fecha ao clicar fora */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="relative h-[72px] bg-[#E6F0FF] px-5 pt-5 flex justify-between items-start">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <FileDown className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-6">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Exportar SAFT-AO</h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                        Ficheiro oficial <span className="font-bold text-gray-800">AGT Angola</span> com FT + NC + Hash. Prazo até dia 15.
                    </p>

                    <div ref={ref} className="relative mt-5 z-10">
                        <button onClick={() => setOpenSel(!openSel)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[13.5px] font-medium">
                            <span className="flex items-center gap-2 text-gray-900"><Calendar className="w-4 h-4 text-gray-400" /> {MESES.find(m => m.value === mes)?.label} - {mes}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSel ? 'rotate-180' : ''}`} />
                        </button>
                        {openSel && (
                            <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {MESES.map(m => (
                                    <button key={m.value} onClick={() => { setMes(m.value); setOpenSel(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${mes === m.value ? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        {m.label} ({m.value})
                                        {mes === m.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                ))}
                                <div className="px-2 py-2">
                                    <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="w-full h-[40px] border border-gray-200 rounded-full px-4 text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-100" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 bg-[#F6F9FF] border border-blue-100 rounded-[14px] p-3 text-[11px] text-gray-600 leading-relaxed">
                        <p className="font-bold text-gray-900 text-[12px] mb-1">O que vai no ficheiro:</p>
                        <p>• Todas FT com hash cadeia</p>
                        <p>• Todas NC com total negativo + FT origem</p>
                        <p>• Marcação automática comunicado_agt</p>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[14px] font-medium text-gray-400 hover:bg-gray-50">Cancelar</button>
                        <button onClick={exportar} disabled={loading} className="flex-1 h-11 rounded-full bg-[#0A2540] text-white text-[14px] font-semibold hover:bg-black shadow-[0_6px_20px_rgba(10,37,64,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? 'A gerar...' : <><FileDown className="w-4 h-4" /> Exportar XML</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
