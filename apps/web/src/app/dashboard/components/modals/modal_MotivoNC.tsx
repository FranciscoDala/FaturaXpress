import { X, FileMinus, Check } from 'lucide-react'

const MOTIVOS_NC = [
    { value: '01 - Devolução', label: 'Devolução de mercadoria' },
    { value: '02 - Desconto', label: 'Desconto comercial' },
    { value: '03 - Erro facturação', label: 'Erro de facturação' },
    { value: '04 - Anulação', label: 'Anulação total' },
    { value: '05 - Outros', label: 'Outros motivos' },
]

interface Props {
    open: boolean
    faturaNumero: string
    loading?: boolean
    selected: string
    setSelected: (v: string) => void
    onClose: () => void
    onConfirm: () => void
}

export default function ModalMotivoNC({ open, faturaNumero, loading, selected, setSelected, onClose, onConfirm }: Props) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[420px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.30)]">
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
                    <div className="mt-5 space-y-2 max-h-[38vh] overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {MOTIVOS_NC.map(m => (
                            <button key={m.value} onClick={() => setSelected(m.value)} className={`w-full text-left px-4 py-3 rounded-[14px] border text-[13px] flex items-center justify-between transition ${selected === m.value? 'bg-[#E6F0FF] border-[#0095ff] text-gray-900 font-semibold shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}>
                                <div>
                                    <p className="font-bold">{m.value}</p>
                                    <p className="text-[11px] opacity-70">{m.label}</p>
                                </div>
                                {selected === m.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="w-11 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                        <button onClick={onConfirm} disabled={!selected || loading} className="w-11 h-11 rounded-full bg-[#0095ff] text-white flex items-center justify-center hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed">
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
