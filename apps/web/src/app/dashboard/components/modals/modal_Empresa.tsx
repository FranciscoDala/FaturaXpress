import { useEffect, useState } from 'react'
import { X, Check, Building2 } from 'lucide-react'

interface EmpresaForm {
    companyName: string
    nif: string
    email: string
    phone: string
    address: string
    city: string
    province: string
}

interface Props {
    open: boolean
    initialData: EmpresaForm
    saving: boolean
    onClose: () => void
    onSave: (data: EmpresaForm) => void
}

export default function ModalEmpresa({ open, initialData, saving, onClose, onSave }: Props) {
    const [form, setForm] = useState<EmpresaForm>(initialData)

    useEffect(() => {
        if (open) setForm(initialData)
    }, [initialData, open])

    if (!open) return null

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(form)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-[24px] w-full max-w-[520px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER FIXO */}
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
                    <p className="text-[13.5px] text-gray-500 mt-1">Atualize os dados da sua empresa</p>
                </div>

                {/* CONTEUDO COM SCROLL INVISIVEL */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                        <style>{`
             .no-scrollbar::-webkit-scrollbar { display: none; }
             .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

                        <div className="flex flex-col gap-[2px]">
                            <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Nome da empresa *"
                                required className={inputClass} />

                            <div className="grid grid-cols-2 gap-[2px]">
                                <input value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} placeholder="NIF"
                                    className={inputClass} />
                                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Telefone"
                                    className={inputClass} />
                            </div>

                            <input value={form.email} type="email" onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email"
                                className={inputClass} />

                            <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Endereço"
                                className={inputClass} />

                            <div className="grid grid-cols-2 gap-[2px]">
                                <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Cidade"
                                    className={inputClass} />
                                <input value={form.province} onChange={e => setForm({ ...form, province: e.target.value })} placeholder="Província"
                                    className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* FOOTER FIXO */}
                    <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
