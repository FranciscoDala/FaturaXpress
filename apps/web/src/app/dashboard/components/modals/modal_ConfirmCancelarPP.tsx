import { X, Ban, Check } from 'lucide-react'

interface Props {
    open: boolean
    numero: string
    loading?: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ModalConfirmCancelarPP({ open, numero, loading = false, onClose, onConfirm }: Props) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#FFF1F1]">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <Ban className="w-4 h-4 text-[#ff4444]" />
                    </div>
                    <button onClick={onClose} disabled={loading} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <div className="px-6 pt-5 pb-6">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Cancelar proforma?</h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                        PP <b className="text-gray-900">{numero}</b> será marcada como cancelada e não poderá mais ser convertida em FT.
                    </p>
                    <div className="mt-4 bg-gray-50 border border-gray-100 rounded-[16px] p-3 text-[12px] space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Proforma</span><span className="font-bold text-gray-900 truncate">PP {numero}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Estado</span><span className="font-bold text-[#ff4444]">Cancelada</span></div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"><X className="w-4 h-4" /></button>
                        <button onClick={onConfirm} disabled={loading} className="flex-1 h-11 rounded-full bg-[#ff4444] text-white font-semibold hover:bg-[#e03a3a] shadow-[0_6px_20px_rgba(255,68,68,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">{loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
