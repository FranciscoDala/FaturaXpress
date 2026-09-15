import { FaturaPDF } from './pdf_Fatura'

interface ModalProps {
  open: boolean
  fatura: any
  cliente: any
  empresa: any
  onClose: () => void
}

export default function FaturaPDFModal({ open, onClose, fatura, cliente, empresa }: ModalProps) {
  if (!open) return null

  const handlePrint = () => {
    const el = document.getElementById('fatura-pdf')
    if (!el) return
    const content = el.outerHTML
    const w = window.open('', '', 'width=900,height=1200')
    if (!w) return
    w.document.write(`
      <html>
        <head>
          <title>PDF</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>@page{size:A4;margin:10mm} body{-webkit-print-color-adjust:exact}</style>
        </head>
        <body style="background:#ccc;padding:20px">${content}</body>
      </html>
    `)
    w.document.close()
    setTimeout(() => w.print(), 600)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#525659] w-full max-w-[950px] h-[92vh] rounded-lg flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-3 bg-white">
          <p className="text-[13px] font-bold">PDF A4 - {fatura?.numero_fatura || fatura?.numero_proforma}</p>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-1.5 bg-black text-white rounded text-[12px]">Imprimir / Baixar PDF</button>
            <button onClick={onClose} className="px-3 py-1.5 border rounded text-[12px]">Fechar</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <FaturaPDF fatura={fatura} cliente={cliente} empresa={empresa} />
        </div>
      </div>
    </div>
  )
}
