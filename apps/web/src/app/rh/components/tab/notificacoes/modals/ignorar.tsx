import { Ban, Loader2 } from 'lucide-react'

export default function IgnoreModal({ data, actingId, onClose, onConfirm }: { data: any, actingId: string | null, onClose: () => void, onConfirm: (id: string) => void }) {
    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[16px] border overflow-hidden w-full max-w-[340px] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 bg-blue-50 border-l-4 border-blue-200 border-b">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center"><Ban className="w-4 h-4 text-blue-700" /></div>
                        <p className="text-[14px] font-bold text-blue-800">Ignorar notificação?</p>
                    </div>
                </div>
                <div className="p-4">
                    <p className="text-[13px] leading-[18px] text-black/70">Deseja ignorar a notificação de <span className="font-bold text-black">{data.funcionario?.nome || 'Funcionário'} </span>?</p>
                    <div className="mt-4 flex gap-2">
                        <button onClick={onClose} className="flex-1 h-10 rounded-full border bg-white text-[13px] font-bold text-black">Cancelar</button>
                        <button disabled={!!actingId} onClick={() => onConfirm(data.falta?.id)} className="flex-1 h-10 rounded-full bg-black text-white text-[13px] font-bold flex items-center justify-center gap-2">
                            {actingId ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Ignorar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
