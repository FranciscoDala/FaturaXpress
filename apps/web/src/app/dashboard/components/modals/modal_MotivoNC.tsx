import { X, FileMinus, Check } from 'lucide-react'
import { useState } from 'react'

interface Props {
    open: boolean
    faturaNumero: string
    loading?: boolean
    onClose: () => void
    onConfirm: (motivo: string, motivoLabel: string) => void
}

const MOTIVOS = [
    { value: '01 - Devolução', label: 'Devolução de mercadoria' },
    { value: '02 - Desconto', label: 'Desconto comercial' },
    { value: '03 - Erro facturação', label: 'Erro de facturação' },
    { value: '04 - Anulação', label: 'Anulação total' },
    { value: '05 - Outros', label: 'Outros motivos' },
]

export default function ModalMotivoNC({ open, faturaNumero, loading = false, onClose, onConfirm }: Props) {
    const [selected, setSelected] = useState<string>('')

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-[24px] w-full max-w-[420px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95">
                {/* Header igual aos cards */}
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
                        Vai anular a <span className="font-bold text-gray-800">FT {faturaNumero}</span>. Escolhe o motivo AGT obrigatório.
                    </p>

                    <div className="mt-5 space-y-2">
                        {MOTIVOS.map(m => (
                            <button
                                key={m.value}
                                onClick={() => setSelected(m.value)}
                                className={`w-full text-left px-4 py-3 rounded-[14px] border text-[13px] flex items-center justify-between transition
                ${selected === m.value ? 'bg-[#E6F0FF] border-[#0095ff] text-gray-900 font-semibold shadow-sm' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-600'}`}
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
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[14px] font-medium text-gray-400 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => {
                                if (!selected) return
                                const label = MOTIVOS.find(x => x.value === selected)?.label || selected
                                onConfirm(selected, label)
                            }}
                            disabled={!selected || loading}
                            className="flex-1 h-11 rounded-full bg-[#0095ff] text-white text-[14px] font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'A emitir...' : 'Emitir NC'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
