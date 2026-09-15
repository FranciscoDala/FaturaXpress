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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <div className="relative h-[72px] bg-[#FFE9E9] px-5 pt-5 flex justify-between items-start">
          <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-6">
          <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{title}</h3>
          <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
            {description} {itemName && <span className="font-bold text-gray-800">"{itemName}"</span>} será removido permanentemente.
          </p>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[14px] font-medium text-gray-400 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-11 rounded-full bg-[#FF3B30] text-white text-[14px] font-semibold hover:bg-red-600 shadow-[0_6px_20px_rgba(255,59,48,0.35)] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading? 'Apagando...' : <><Trash2 className="w-4 h-4" /> Apagar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
