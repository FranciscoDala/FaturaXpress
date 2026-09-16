import { X, LogOut } from 'lucide-react'

interface Props {
    open: boolean
    companyName: string
    onClose: () => void
    onConfirm: () => void
}

export default function ModalConfirmSair({ open, companyName, onClose, onConfirm }: Props) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#FFF1F1]">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-[#FF3B30]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <div className="px-6 pt-5 pb-6">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Sair da conta?</h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                        Tens a certeza que queres encerrar a sessão de <span className="font-bold text-gray-800 uppercase">{companyName}</span>?
                    </p>
                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                            <X className="w-4 h-4" />
                        </button>
                        <button onClick={onConfirm} className="flex-1 h-11 rounded-full bg-[#FF3B30] text-white font-semibold hover:bg-[#e6362c] shadow-[0_6px_20px_rgba(255,59,48,0.35)] flex items-center justify-center gap-2">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
