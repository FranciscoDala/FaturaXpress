import { useEffect, useState, useRef } from 'react'
import { X, Check, Building2, ChevronDown, Upload, Landmark } from 'lucide-react'

const BANCOS_ANGOLA = [
    "BAI - Banco Angolano de Investimentos",
    "BFA - Banco de Fomento Angola",
    "BIC - Banco BIC",
    "BPC - Banco de Poupança e Crédito",
    "BCI - Banco de Comércio e Indústria",
    "BNI - Banco de Negócios Internacional",
    "BMA - Banco Millennium Atlântico",
    "BCA - Banco Caixa Geral Angola",
    "SOL - Banco Sol",
    "SBA - Standard Bank Angola",
    "BE - Banco Económico",
    "BVB - Banco Valor",
    "BCS - Banco de Crédito do Sul",
    "BCH - Banco Comercial do Huambo",
    "BPG - Banco Prestígio",
    "BMF - Banco BAI Micro Finanças",
    "BIR - Banco de Investimento Rural",
    "FNB - First National Bank Angola",
]

interface EmpresaForm {
    companyName: string
    nif: string
    email: string
    phone: string
    address: string
    city: string
    province: string
    iban?: string
    iban2?: string
    banco1?: string
    banco2?: string
    logo_url?: string
    image_url?: string
}

interface Props {
    open: boolean
    initialData: EmpresaForm
    saving: boolean
    onClose: () => void
    onSave: (data: EmpresaForm & { logoFile?: File | null }) => void
}

export default function ModalEmpresa({ open, initialData, saving, onClose, onSave }: Props) {
    const [form, setForm] = useState<EmpresaForm>(initialData)
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [logoPreview, setLogoPreview] = useState<string | null>(null)
    const [openBanco1, setOpenBanco1] = useState(false)
    const [openBanco2, setOpenBanco2] = useState(false)
    const [banco1Pos, setBanco1Pos] = useState({ top: 0, left: 0, width: 0 })
    const [banco2Pos, setBanco2Pos] = useState({ top: 0, left: 0, width: 0 })
    const btnBanco1Ref = useRef<HTMLButtonElement>(null)
    const btnBanco2Ref = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (open) {
            setForm(initialData)
            setLogoFile(null)
            setLogoPreview(initialData.logo_url || initialData.image_url || null)
        }
    }, [initialData, open])

    useEffect(() => {
        const handleResize = () => {
            if (btnBanco1Ref.current) {
                const r = btnBanco1Ref.current.getBoundingClientRect()
                setBanco1Pos({ top: r.bottom + 8, left: r.left, width: r.width })
            }
            if (btnBanco2Ref.current) {
                const r = btnBanco2Ref.current.getBoundingClientRect()
                setBanco2Pos({ top: r.bottom + 8, left: r.left, width: r.width })
            }
        }
        if (openBanco1 || openBanco2) {
            handleResize()
            window.addEventListener('scroll', handleResize, true)
            window.addEventListener('resize', handleResize)
            return () => {
                window.removeEventListener('scroll', handleResize, true)
                window.removeEventListener('resize', handleResize)
            }
        }
    }, [openBanco1, openBanco2])

    useEffect(() => {
        const close = (e: MouseEvent) => {
            const t = e.target as HTMLElement
            if (!t.closest('[data-banco-dropdown]') &&!t.closest('[data-banco-btn]')) {
                setOpenBanco1(false)
                setOpenBanco2(false)
            }
        }
        if (openBanco1 || openBanco2) document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [openBanco1, openBanco2])

    if (!open) return null

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const selectBtnClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition"

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setLogoFile(file)
            setLogoPreview(URL.createObjectURL(file))
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave({...form, logoFile })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[560px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Editar Empresa</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1">Atualize os dados, logo e IBANs da empresa</p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                        <div className="flex flex-col gap-3">
                            {/* LOGO */}
                            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-[16px]">
                                <div className="w-14 h-14 rounded-[12px] bg-white border flex items-center justify-center overflow-hidden shrink-0">
                                    {logoPreview? <img src={logoPreview} className="w-full h-full object-cover" /> : <Upload className="w-5 h-5 text-gray-400" />}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[12px] font-bold text-gray-900">Logotipo da empresa</p>
                                    <p className="text-[11px] text-gray-500">PNG, JPG até 2MB. Aparece na fatura</p>
                                </div>
                                <label className="h-9 px-4 rounded-full bg-black text-white text-[12px] font-semibold flex items-center justify-center cursor-pointer hover:bg-gray-800">
                                    Escolher
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                                </label>
                            </div>

                            <input value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value })} placeholder="Nome da empresa *" required className={inputClass} />

                            <div className="grid grid-cols-2 gap-2">
                                <input value={form.nif} onChange={e => setForm({...form, nif: e.target.value })} placeholder="NIF" className={inputClass} />
                                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value })} placeholder="Telefone" className={inputClass} />
                            </div>

                            <input value={form.email} type="email" onChange={e => setForm({...form, email: e.target.value })} placeholder="Email" className={inputClass} />
                            <input value={form.address} onChange={e => setForm({...form, address: e.target.value })} placeholder="Endereço" className={inputClass} />

                            <div className="grid grid-cols-2 gap-2">
                                <input value={form.city} onChange={e => setForm({...form, city: e.target.value })} placeholder="Cidade" className={inputClass} />
                                <input value={form.province} onChange={e => setForm({...form, province: e.target.value })} placeholder="Província" className={inputClass} />
                            </div>

                            <div className="h-[1px] bg-gray-100 my-1" />
                            <p className="text-[11px] font-bold tracking-widest text-black">DADOS BANCÁRIOS</p>

                            {/* BANCO 1 */}
                            <div className="flex flex-col gap-2">
                                <button ref={btnBanco1Ref} data-banco-btn type="button" onClick={() => { setOpenBanco1(!openBanco1); setOpenBanco2(false) }} className={selectBtnClass}>
                                    <span className="flex items-center gap-2 truncate"><Landmark className="w-4 h-4 text-gray-500" />{form.banco1 || "Selecionar banco 1"}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition ${openBanco1? 'rotate-180' : ''}`} />
                                </button>
                                {form.banco1 && (
                                    <input value={form.iban || ''} onChange={e => setForm({...form, iban: e.target.value })} placeholder={`IBAN - ${form.banco1.split('-')[0].trim()}`} className={inputClass} />
                                )}
                            </div>

                            {/* BANCO 2 */}
                            <div className="flex flex-col gap-2">
                                <button ref={btnBanco2Ref} data-banco-btn type="button" onClick={() => { setOpenBanco2(!openBanco2); setOpenBanco1(false) }} className={selectBtnClass}>
                                    <span className="flex items-center gap-2 truncate"><Landmark className="w-4 h-4 text-gray-500" />{form.banco2 || "Selecionar banco 2 (opcional)"}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-500 transition ${openBanco2? 'rotate-180' : ''}`} />
                                </button>
                                {form.banco2 && (
                                    <input value={form.iban2 || ''} onChange={e => setForm({...form, iban2: e.target.value })} placeholder={`IBAN - ${form.banco2.split('-')[0].trim()}`} className={inputClass} />
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-2">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50">
                            {saving? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>

            {openBanco1 && (
                <div data-banco-dropdown style={{ top: banco1Pos.top, left: banco1Pos.left, width: banco1Pos.width }} className="fixed bg-white rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-200 overflow-hidden p-1.5 z-[9999] max-h-[280px] overflow-y-auto">
                    {BANCOS_ANGOLA.map(b => (
                        <button key={b} onClick={() => { setForm({...form, banco1: b }); setOpenBanco1(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] transition ${form.banco1 === b? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>{b}</button>
                    ))}
                    <button onClick={() => { setForm({...form, banco1: undefined, iban: '' }); setOpenBanco1(false) }} className="w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] text-red-500 hover:bg-red-50">Limpar</button>
                </div>
            )}
            {openBanco2 && (
                <div data-banco-dropdown style={{ top: banco2Pos.top, left: banco2Pos.left, width: banco2Pos.width }} className="fixed bg-white rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-200 overflow-hidden p-1.5 z-[9999] max-h-[280px] overflow-y-auto">
                    {BANCOS_ANGOLA.map(b => (
                        <button key={b} onClick={() => { setForm({...form, banco2: b }); setOpenBanco2(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] transition ${form.banco2 === b? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>{b}</button>
                    ))}
                    <button onClick={() => { setForm({...form, banco2: undefined, iban2: '' }); setOpenBanco2(false) }} className="w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] text-red-500 hover:bg-red-50">Limpar</button>
                </div>
            )}
        </div>
    )
}
