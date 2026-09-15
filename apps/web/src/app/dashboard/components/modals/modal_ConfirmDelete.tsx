import { Trash2, X, AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  title?: string
  description?: string
  itemName?: string
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ModalConfirmDelete({
  open,
  title = "Apagar definitivamente?",
  description = "Essa ação não pode ser desfeita.",
  itemName,
  loading = false,
  onClose,
  onConfirm
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white rounded-[24px] w-full max-w-[420px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        {/* Top estilo card */}
        <div className="relative h-[90px] bg-[#FFF0F0] p-5">
          <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center border">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <button onClick={onClose} className="bg-white rounded-full p-2 shadow-sm border hover:bg-gray-50">
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* Icone grande 88px igual cards */}
          <div className="absolute -bottom-10 left-5 w-[88px] h-[88px] rounded-full bg-white border-[4px] border-white shadow-md flex items-center justify-center">
            <div className="w-full h-full rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[11px] text-gray-400">exp.</span>
            <div className="flex gap-[2px]">{Array.from({length:8}).map((_,i)=><div key={i} className="w-[4px] h-[10px] rounded-full bg-red-200" />)}</div>
          </div>
          <h3 className="text-[18px] font-bold text-gray-900">{title}</h3>
          <p className="text-[13.5px] text-gray-500 mt-2 leading-relaxed">
            {description} {itemName && <span className="font-semibold text-gray-800">"{itemName}"</span>} será removido permanentemente.
          </p>

          <div className="flex gap-3 mt-8">
            <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border bg-white text-sm font-medium hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={onConfirm} disabled={loading} className="flex-1 h-11 rounded-full bg-[#FF4D4F] text-white text-sm font-semibold hover:bg-red-600 shadow-[0_4px_16px_rgba(255,77,79,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">
              {loading? 'Apagando...' : <><Trash2 className="w-4 h-4" /> Apagar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
