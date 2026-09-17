import { useState } from 'react'
import { X, Check, Copy, Upload, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PagamentoManual {
  nome: string
  paypay: string
  kwik: string
  iban: string
  banco: string
}

interface Subscription {
  id: string
  reference: string
  amount: number
  status: string
  plan_id: string
  provider: string
}

interface Props {
  open: boolean
  checkoutInfo: {
    subscription: Subscription
    pagamento_manual: PagamentoManual
    paypay_disponivel: boolean
  } | null
  onClose: () => void
  onSuccess: () => void
  apiBase: string
}

export default function PagamentoModal({ open, checkoutInfo, onClose, onSuccess, apiBase }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open ||!checkoutInfo) return null

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!', { position: 'top-center' })
  }

  const handleSend = async () => {
    if (!file) return toast.error('Selecione o comprovativo', { position: 'top-center' })
    if (file.size > 5 * 1024 * 1024) return toast.error('Máx 5MB', { position: 'top-center' })

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch(`${apiBase}/comprovativo/${checkoutInfo.subscription.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Erro ao enviar')

      toast.success('Comprovativo enviado! Validação em 15-30min', { position: 'top-center' })
      onSuccess()
      onClose()
      setFile(null)
    } catch (e: any) {
      toast.error(e.message, { position: 'top-center' })
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* backdrop trava - não fecha ao clicar, só no X */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-[24px] w-full max-w-[520px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER padrão */}
        <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
          <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-[#0095ff]" />
          </div>
          <button onClick={onClose} disabled={loading} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-2 shrink-0">
          <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Finalizar pagamento</h3>
          <p className="text-[13.5px] text-gray-500 mt-1 leading-relaxed">
            Plano {checkoutInfo.subscription.plan_id.toUpperCase()} • {checkoutInfo.subscription.amount.toLocaleString()} Kz • Ref {checkoutInfo.subscription.reference}
          </p>
        </div>

        <div className="px-6 pb-6 pt-3 overflow-auto flex-1 flex flex-col gap-[10px]">

          {/* DADOS - trava cópia */}
          <div className="flex flex-col gap-[2px]">
            <div className="relative">
              <div className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 flex items-center justify-between">
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] text-gray-500 uppercase">IBAN - {checkoutInfo.pagamento_manual.banco}</span>
                  <span className="text-[13px] font-mono font-bold">{checkoutInfo.pagamento_manual.iban}</span>
                </div>
                <button onClick={() => copy(checkoutInfo.pagamento_manual.iban)} className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center"><Copy className="w-3 h-3" /></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[2px]">
              <div className="relative">
                <div className={inputClass + " flex items-center justify-between"}>
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-gray-500">PayPay</span>
                    <span className="text-[13px] font-mono font-bold">{checkoutInfo.pagamento_manual.paypay}</span>
                  </div>
                  <button type="button" onClick={() => copy(checkoutInfo.pagamento_manual.paypay)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><Copy className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="relative">
                <div className={inputClass + " flex items-center justify-between"}>
                  <div className="flex flex-col leading-none">
                    <span className="text-[10px] text-gray-500">KWiK</span>
                    <span className="text-[13px] font-mono font-bold">{checkoutInfo.pagamento_manual.kwik}</span>
                  </div>
                  <button type="button" onClick={() => copy(checkoutInfo.pagamento_manual.kwik)} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"><Copy className="w-3 h-3" /></button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-[12px] text-[11.5px] text-amber-800 leading-relaxed">
              Titular: <b>{checkoutInfo.pagamento_manual.nome}</b><br />
              Na descrição da transferência coloca a referência <b>{checkoutInfo.subscription.reference}</b>
            </div>
          </div>

          {/* UPLOAD */}
          <div className="mt-2 flex flex-col gap-2">
            <label className="text-[13px] font-medium text-gray-700">Comprovativo (JPG/PNG/PDF - máx 5MB)</label>
            <label className="w-full h-[44px] bg-white border border-dashed border-gray-300 rounded-[12px] px-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition">
              <Upload className="w-4 h-4 text-gray-500" />
              <span className="text-[13px] text-gray-600 truncate max-w-[260px]">{file? file.name : 'Clique para selecionar'}</span>
              <input type="file" hidden accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50">
              <X className="w-4 h-4" />
            </button>
            <button type="button" onClick={handleSend} disabled={loading ||!file}
              className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">
              {loading? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
              {loading? 'Enviando...' : 'Enviar comprovativo'}
            </button>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-2">Validação manual em até 30min. Não reutilize o mesmo comprovativo - hash é verificado.</p>
        </div>
      </div>
    </div>
  )
}
