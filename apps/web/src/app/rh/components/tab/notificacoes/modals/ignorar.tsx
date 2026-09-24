import { Ban, Loader2 } from 'lucide-react'

export default function IgnoreModal({ data, actingId, onClose, onConfirmFalta, onConfirmAtraso }: { data: any, actingId: string | null, onClose: () => void, onConfirmFalta: (id: string) => void, onConfirmAtraso: (fid: string) => void }) {
    const isAtraso = data?.tipo === 'atraso_excedido'
    const nome = data?.funcionario?.nome || data?.funcionario_nome || 'Funcionário'
    const idFalta = data?.falta?.id
    const idFunc = data?.funcionario_id || data?.funcionario?.id

    return (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[16px] border overflow-hidden w-full max-w-[340px] shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="px-4 py-3 bg-blue-50 border-l-4 border-blue-200 border-b">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center"><Ban className="w-4 h-4 text-blue-700" /></div>
                        <p className="text-[14px] font-bold text-blue-800">{isAtraso ? 'Zerar atrasos?' : 'Ignorar notificação?'}</p>
                    </div>
                </div>
                <div className="p-4">
                    <p className="text-[13px] leading-[18px] text-black/70">
                        {isAtraso
                            ? <>Deseja zerar o contador de <span className="font-bold text-black">{nome}</span>? Ele tem <b>{data?.qtd_atrasos} atrasos</b> e voltará a contar do zero.</>
                            : <>Deseja ignorar a notificação de <span className="font-bold text-black">{nome}</span>?</>
                        }
                    </p>
                    <div className="mt-4 flex gap-2">
                        <button onClick={onClose} className="flex-1 h-10 rounded-full border bg-white text-[13px] font-bold text-black">Cancelar</button>
                        <button disabled={!!actingId} onClick={() => isAtraso ? onConfirmAtraso(idFunc) : onConfirmFalta(idFalta)} className="flex-1 h-10 rounded-full bg-black text-white text-[13px] font-bold flex items-center justify-center gap-2">
                            {actingId ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {isAtraso ? 'Zerar' : 'Ignorar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
