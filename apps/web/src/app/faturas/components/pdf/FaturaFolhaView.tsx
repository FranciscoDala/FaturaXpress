import FaturaPDF from './pdf_Fatura'

export default function FaturaFolhaView({ fatura, cliente, empresa, onVoltar }: any) {
    const handlePrint = () => {
        const el = document.getElementById('fatura-pdf')
        if (!el) return
        const content = el.outerHTML
        const w = window.open('', '', 'width=900,height=1200')
        if (!w) return
        w.document.write(`
      <html><head><title>${fatura?.numero_fatura || ''}</title><script src="https://cdn.tailwindcss.com"></script>
      <style>@page{size:A4;margin:0} body{-webkit-print-color-adjust:exact; background:#525659; padding:0; margin:0}</style>
      </head><body>${content}</body></html>
    `)
        w.document.close()
        setTimeout(() => w.print(), 600)
    }

    return (
        <div className="bg-[#525659] min-h-[900px]">
            {/* Barra topo igual Scribd */}
            <div className="bg-white border-b px-4 py-2 flex justify-between items-center sticky top-0 z-10">
                <button onClick={onVoltar} className="text-[13px] font-medium px-4 py-1.5 border rounded hover:bg-black hover:text-white">
                    ← Voltar para lista
                </button>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="bg-[#1e7e34] text-white text-[13px] font-semibold px-4 py-1.5 rounded flex items-center gap-2">
                        Baixar ↓
                    </button>
                </div>
            </div>
            {/* Folha centralizada */}
            <div className="p-6 flex justify-center overflow-auto">
                <div className="shadow-2xl">
                    <FaturaPDF fatura={fatura} cliente={cliente} empresa={empresa} />
                </div>
            </div>
        </div>
    )
}
