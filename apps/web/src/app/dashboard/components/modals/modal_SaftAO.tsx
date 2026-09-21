import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X, FileDown, Check, ChevronDown, Calendar, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

const MONTH_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["exportar_saft"],
    recepcao: [],
    rh: []
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

const genMeses = () => {
    const list: { value: string; label: string; year: number; month: number }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        list.push({
            value,
            label: i === 0? 'Mês atual' : i === 1? 'Mês passado' : `${MONTH_LABEL[d.getMonth()]} ${d.getFullYear()}`,
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

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeExportar = funcionarioLogado? temPermissao(cargoAtual, 'exportar_saft') || cargoAtual === 'admin' : true

    const exportar = async () => {
        if (!podeExportar) { toast.error('Sem permissão'); return }
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

    if (!podeExportar) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
                <div className="relative bg-white rounded-[24px] p-8 text-center max-w-[380px] w-full shadow-xl">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                    <p className="font-black text-[16px]">Sem permissão</p>
                    <p className="text-[13px] text-black/60 mt-2 font-medium">Cargo <b>{cargoAtual.toUpperCase()}</b> não pode exportar SAFT. Só ADMIN e FINANCEIRA.</p>
                    <button onClick={onClose} className="mt-5 w-full h-11 bg-black text-white rounded-full font-black">Fechar</button>
                </div>
            </div>
        )
    }

    const calendarPicker = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpenSel(false)} />
            <div className="relative w-full max-w-[360px] bg-white rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.35)] border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="h-[60px] px-4 flex items-center justify-between bg-white border-b border-gray-200">
                    <button type="button" onClick={() => setAnoView(a => a - 1)} className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center active:scale-90"><ChevronLeft className="w-5 h-5 text-black" /></button>
                    <div className="flex items-center gap-2">
                        <span className="text-[16px] font-black text-black">{anoView}</span>
                        <span className="px-2.5 py-1 rounded-full bg-[#0A2540] text-white text-[11px] font-black">AGT</span>
                    </div>
                    <button type="button" onClick={() => setAnoView(a => a + 1)} disabled={anoView >= new Date().getFullYear() + 1} className="w-10 h-10 rounded-full bg-gray-100 border flex items-center justify-center active:scale-90 disabled:opacity-40"><ChevronRight className="w-5 h-5 text-black" /></button>
                </div>

                <div className="p-4 bg-white">
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {MESES.slice(0, 2).map(m => (
                            <button key={m.value} onClick={() => { setMes(m.value); setAnoView(m.year); setOpenSel(false) }}
                                className={`h-[46px] rounded-[14px] border-2 text-[13px] font-black flex items-center justify-between px-4 active:scale-[0.98] transition text-black ${mes === m.value? 'bg-black border-black text-white' : 'bg-white border-gray-300 hover:border-black'}`}>
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
                                    className={`h-[62px] rounded-[14px] border-2 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition ${isSel? 'bg-black border-black text-white' : 'bg-white border-gray-300 hover:border-black text-black'}`}>
                                    <span className="text-[13px] font-black">{MONTH_LABEL[idx]}</span>
                                    <span className={`text-[11px] font-bold ${isSel? 'text-white/70' : 'text-black/60'}`}>{anoView}</span>
                                </button>
                            )
                        })}
                    </div>
                    <button type="button" onClick={() => setOpenSel(false)} className="mt-5 w-full h-11 rounded-full bg-black text-white font-black text-[14px] sm:hidden">Confirmar</button>
                </div>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="relative h-[72px] bg-[#E6F0FF] px-5 pt-5 flex justify-between items-start rounded-t-[24px] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <FileDown className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-black">{cargoAtual.toUpperCase()} • SAFT</span>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                            <X className="w-4 h-4 text-black" />
                        </button>
                    </div>
                </div>

                <div className="px-6 pt-5 pb-6 overflow-y-auto overscroll-contain flex-1 bg-white">
                    <h3 className="text-[18px] font-black text-black leading-tight">Exportar SAFT-AO</h3>
                    <p className="text-[13.5px] text-black/60 mt-3 leading-relaxed font-medium">
                        Ficheiro oficial <span className="font-black text-black">AGT Angola</span> com FT + NC + Hash. Prazo até dia 15. • {cargoAtual.toUpperCase()}
                    </p>

                    <div className="relative mt-5">
                        <button onClick={() => setOpenSel(!openSel)} className="w-full h-[48px] bg-white border-2 border-black rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-[13.5px] font-black text-black hover:bg-gray-50 transition">
                            <span className="flex items-center gap-2 text-black"><Calendar className="w-4 h-4 text-black" /> {current?.label} - {mes}</span>
                            <ChevronDown className={`w-4 h-4 text-black transition-transform ${openSel? 'rotate-180' : ''}`} />
                        </button>

                        {openSel && typeof document!== 'undefined' && createPortal(calendarPicker, document.body)}
                    </div>

                    <div className="mt-4 bg-white border-2 border-black rounded-[16px] p-3.5 text-[12px] text-black font-medium">
                        <p className="font-black text-black text-[12px] mb-1.5">Conteúdo AGT • só ADMIN/FINANCEIRA</p>
                        <p className="text-black">• FT com hash cadeia SHA256</p>
                        <p className="text-black">• NC com total negativo + FT origem</p>
                        <p className="text-black">• Marca comunicado_agt automático</p>
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-12 rounded-full border-2 border-black bg-white text-[14px] font-black text-black">Cancelar</button>
                        <button onClick={exportar} disabled={loading} className="flex-1 h-12 rounded-full bg-black text-white text-[14px] font-black flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading? 'A gerar...' : <><FileDown className="w-4 h-4" /> Exportar XML</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
