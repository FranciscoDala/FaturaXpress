import { useState } from 'react'
import FaturaPDF from './pdf_Fatura'
import { getNumero } from '../../EmitirFaturaPage'

export default function FaturaFolhaView({ fatura, cliente, empresa, onVoltar }: any) {
    const [showBaixar, setShowBaixar] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const buildPrintAndPrint = () => {
        const el = document.getElementById('fatura-pdf')
        if (!el) return
        const content = el.outerHTML
        const w = window.open('', '', 'width=900,height=1200')
        if (!w) return
        w.document.write(`
          <html><head><title>${fatura?.numero_fatura || getNumero(fatura) || ''}</title><script src="https://cdn.tailwindcss.com"></script>
          <style>@page{size:A4;margin:0} body{-webkit-print-color-adjust:exact; print-color-adjust:exact; background:white; padding:0; margin:0}</style>
          </head><body>${content}</body></html>
        `)
        w.document.close()
        setTimeout(() => w.print(), 600)
    }

    const handleBaixar = () => {
        setShowBaixar(false)
        buildPrintAndPrint()
    }

    return (
        <div className="bg-[#525659] min-h-screen flex flex-col">
            {/* BARRA DE CIMA - onde estava a outra */}
            <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2 flex items-center justify-between sticky top-0 z-20" style={{ fontFamily: "var(--fonte-principal)" }}>
                <div className="flex items-center gap-2">
                    <button onClick={onVoltar} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[20px] font-bold">✕</button>
                    <div className="relative flex items-center">
                        <button onClick={handleBaixar} className="bg-[#137333] hover:bg-[#0f5c29] text-white px-4 py-[8px] rounded-l-md flex items-center gap-2 text-[14px] font-medium">
                            Baixar
                        </button>
                        <button onClick={() => setShowBaixar(!showBaixar)} className="bg-[#137333] hover:bg-[#0f5c29] text-white px-2 py-[8px] rounded-r-md border-l border-[#0f5c29]">▼</button>
                        {showBaixar && (
                            <div className="absolute top-[38px] left-0 bg-white border border-gray-200 shadow-lg rounded-md w-[200px] z-50">
                                <button onClick={handleBaixar} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px]">Baixar PDF</button>
                                <button onClick={() => { setShowBaixar(false); buildPrintAndPrint() }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px]">Imprimir</button>
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">⛶</button>
            </div>

            {/* Folha centralizada */}
            <div className="flex-1 p-6 flex justify-center overflow-auto">
                <div className="shadow-2xl">
                    <FaturaPDF fatura={fatura} cliente={cliente} empresa={empresa} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
                </div>
            </div>
        </div>
    )
}
