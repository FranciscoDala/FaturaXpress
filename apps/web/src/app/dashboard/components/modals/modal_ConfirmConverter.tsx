import { X, FileCheck, ArrowRight, AlertTriangle } from 'lucide-react'

interface Props {
    open: boolean
    numero: string
    clienteNome?: string
    total: number
    loading?: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ModalConfirmConverter({ open, numero, clienteNome, total, loading = false, onClose, onConfirm }: Props) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* BACKDROP TRAVADO - sem onClick */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] animate-in fade-in zoom-in-95">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF]">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} disabled={loading} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
                <div className="px-6 pt-5 pb-6">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Converter para FT Oficial?</h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                        Esta PP vai virar FT com <b>Hash AGT + QR</b> automático. Não poderá ser editada nem apagada, só anulada com NC. Conta no limite do seu plano.
                    </p>

                    <div className="mt-4 bg-gray-50 border border-gray-100 rounded-[16px] p-3 text-[12px] space-y-1.5">
                        <div className="flex justify-between gap-2">
                            <span className="text-gray-500 shrink-0">Proforma</span>
                            <span className="font-bold text-gray-900 truncate">PP {numero}</span>
                        </div>
                        {clienteNome && (
                            <div className="flex justify-between gap-2">
                                <span className="text-gray-500 shrink-0">Cliente</span>
                                <span className="font-bold text-gray-900 truncate max-w-[200px]">{clienteNome}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total</span>
                            <span className="font-bold text-gray-900">{total.toFixed(2)} KZ</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Ação</span>
                            <span className="font-bold text-[#0095ff]">PP → FT Oficial</span>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2 bg-amber-50 border border-amber-100 rounded-[12px] px-3 py-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-800 leading-[1.4]">Ação irreversível. Confirme que os dados estão corretos.</p>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50">
                            <X className="w-4 h-4" /> Cancelar
                        </button>
                        <button onClick={onConfirm} disabled={loading} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Converter</span><ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
