import { useState } from 'react'
import { Menu, Download, Printer, Share2 } from 'lucide-react'
import FaturaPDF from './pdf_Fatura'
import { getNumero, isNotaCredito } from '../../EmitirFaturaPage'

export default function FaturaFolhaView({ fatura, cliente, empresa, onVoltar }: any) {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const clienteView = cliente || {
        nome: fatura?.cliente_nome || 'Consumidor Final',
        nif: fatura?.cliente_nif || '999999999',
        telefone: fatura?.cliente_telefone || '',
        email: fatura?.cliente_email || '',
        endereco: fatura?.cliente_endereco || '',
        cidade: fatura?.cliente_cidade || '',
        id: fatura?.cliente_id || null
    }
    const empresaView = empresa? {
      ...empresa,
        logo: empresa.logo_url || empresa.image_url || empresa.logo || '',
        logo_url: empresa.logo_url || empresa.image_url || '',
    } : empresa

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

    const labelTipo = isNotaCredito(fatura)? `NC ${fatura.numero_nota_credito}` : fatura?.tipo_documento === 'fatura'? `${fatura?.numero_fatura}` : `${getNumero(fatura)}`

    return (
        <div className="fixed inset-0 z-[10000] bg-[#525659] flex flex-col overflow-hidden">
            <style>{`
              #fatura-pdf-wrapper{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;display:flex;justify-content:center;width:100%;background:transparent;padding:24px 16px}
              #fatura-pdf{transform-origin:top center}
              @media (max-width:768px){
                #fatura-pdf{transform:scale(0.45);transform-origin:top center;margin-bottom:-55%;width:210mm!important;min-width:210mm!important}
                #fatura-pdf-wrapper{padding:0!important}
              }
              @media print{.no-print{display:none!important} #fatura-pdf-wrapper{overflow:visible!important} #fatura-pdf{transform:none!important; margin:0!important; box-shadow:none!important; border:none!important} }
            `}</style>

            <div className="no-print h-[44px] bg-[#323233] flex items-center justify-between px-2 text-white shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={onVoltar} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded shrink-0"><Menu className="w-4 h-4" /></button>
                    <p className="text-[11px] md:text-[13px] font-bold uppercase truncate">{labelTipo} - {isNotaCredito(fatura)? 'NOTA DE CRÉDITO' : fatura?.tipo_documento === 'fatura'? 'FACTURA' : 'PROFORMA'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-[#1e1e1e] text-[10px] px-1.5 py-0.5 rounded">1 / 1</span>
                    <button onClick={onVoltar} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Share2 className="w-4 h-4"/></button>
                    <button onClick={handlePrint} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Download className="w-4 h-4"/></button>
                    <button onClick={handlePrint} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Printer className="w-4 h-4"/></button>
                </div>
            </div>

            <div id="fatura-pdf-wrapper">
                <div className="shadow-2xl h-fit">
                    <FaturaPDF fatura={fatura} cliente={clienteView} empresa={empresaView} isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
                </div>
            </div>
        </div>
    )
}
