import { X } from 'lucide-react'

export default function ComprovanteModal({ comprovante, onClose }: { comprovante: { url: string, type: string }, onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[16px] w-full max-w-3xl h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="h-11 px-4 flex items-center justify-between border-b"><span className="text-[13px] font-bold">Documento</span><button onClick={onClose} className="w-8 h-8 rounded-full border flex items-center justify-center"><X className="w-4 h-4" /></button></div>
                <div className="h-[calc(100%-44px)] bg-gray-100 p-2">
                    {comprovante.type === 'application/pdf' ? <iframe src={comprovante.url} className="w-full h-full bg-white rounded-[8px]" /> : <img src={comprovante.url} className="w-full h-full object-contain bg-white rounded-[8px]" />}
                </div>
            </div>
        </div>
    )
}
