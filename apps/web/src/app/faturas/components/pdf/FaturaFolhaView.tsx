import { useState } from 'react'
import FaturaPDF from './pdf_Fatura'
import { getNumero, isNotaCredito } from '../../EmitirFaturaPage'

export default function FaturaFolhaView({ fatura, cliente, empresa, onVoltar }: any) {
    const [isFullscreen, setIsFullscreen] = useState(false)

    const handlePrint = () => {
        const el = document.getElementById('fatura-pdf')
        if (!el) return
        const content = el.outerHTML
        const w = window.open('', '', 'width=900,height=1200')
        if (!w) return
        w.document.write(`
          <html><head>
            <title>${fatura?.numero_nota_credito || fatura?.numero_fatura || getNumero(fatura) || ''}</title>
            <link href="https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page{size:A4;margin:0}
              *{font-family:'Zalando Sans Expanded',sans-serif!important}
              body{-webkit-print-color-adjust:exact; print-color-adjust:exact; background:white; padding:0; margin:0}
            </style>
          </head><body>${content}</body></html>
        `)
        w.document.close()
        setTimeout(() => w.print(), 600)
    }

    const handleBaixar = () => {
        handlePrint()
    }

    const labelTipo = isNotaCredito(fatura)? `NC ${fatura.numero_nota_credito} (Nota de Crédito)` : fatura?.tipo_documento === 'fatura'? `${fatura?.numero_fatura} (FT - Oficial AGT)` : `${getNumero(fatura)} (PP - Proforma)`

    return (
        <div className="bg-[#525659] min-h-screen flex flex-col overflow-x-hidden">
            <div className="bg-white border-b border-gray-200 py-2 px-4 sm:px-8 lg:px-12 flex items-center justify-between sticky top-0 z-20 w-full" style={{ fontFamily: "var(--fonte-principal)" }}>
                <div className="flex items-center">
                    <button onClick={onVoltar} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 text-black" title="Fechar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <span className="ml-2 text-[12px] font-bold">{labelTipo}</span>
                </div>
                <div className="flex items-center">
                    <button onClick={handleBaixar} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 text-black" title="Baixar PDF">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                    </button>
                    <button onClick={handlePrint} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 text-black" title="Imprimir">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 6 2 18 2 18 9" />
                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                            <rect x="6" y="14" width="12" height="8" />
                        </svg>
                    </button>
                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 text-black" title="Expandir">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round">
                            <polyline points="15 3 21 3 21 9" />
                            <polyline points="9 21 3 21 3 15" />
                            <line x1="21" y1="3" x2="14" y2="10" />
                            <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 flex justify-center overflow-x-hidden overflow-y-auto">
                <div className="shadow-2xl w-full max-w-[210mm] overflow-hidden">
                    <FaturaPDF fatura={fatura} cliente={cliente} empresa={empresa} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
                </div>
            </div>
        </div>
    )
}
