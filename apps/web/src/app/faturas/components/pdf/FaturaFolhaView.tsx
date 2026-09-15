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
            {/* Folha centralizada - barra de cima removida, agora a barra de baixo do pdf_Fatura que fica no topo */}
            <div className="p-6 flex justify-center overflow-auto">
                <div className="shadow-2xl">
                    <FaturaPDF fatura={fatura} cliente={cliente} empresa={empresa} onClose={onVoltar} />
                </div>
            </div>
        </div>
    )
}
