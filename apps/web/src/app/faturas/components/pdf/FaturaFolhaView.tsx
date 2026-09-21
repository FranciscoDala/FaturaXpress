import FaturaPDF from './pdf_Fatura'
import { getNumero, isNotaCredito } from '../../EmitirFaturaPage'
import { Menu, Download, Printer, Share2 } from 'lucide-react'

export default function FaturaFolhaView({ fatura, cliente, empresa, onVoltar }: any) {
    const clienteView = cliente || { nome: fatura?.cliente_nome || 'Consumidor Final', nif: fatura?.cliente_nif || '999999999', telefone: fatura?.cliente_telefone || '', email: fatura?.cliente_email || '', endereco: fatura?.cliente_endereco || '', cidade: fatura?.cliente_cidade || '', id: fatura?.cliente_id || null }
    const empresaView = empresa? {...empresa, logo: empresa.logo_url || empresa.image_url || empresa.logo || '', logo_url: empresa.logo_url || empresa.image_url || '', } : empresa

    const handlePrint = () => {
        const el = document.getElementById('fatura-pdf')
        if (!el) return
        const w = window.open('', '', 'width=900,height=1200')
        if (!w) return
        w.document.write(`
          <html><head>
            <title>${fatura?.numero_fatura || getNumero(fatura)}</title>
            <link href="https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page{size:A4;margin:0}
              *{font-family:'Zalando Sans Expanded',sans-serif!important; -webkit-print-color-adjust:exact; print-color-adjust:exact}
              html,body{margin:0;padding:0;background:white;width:210mm;min-height:297mm}
              #fatura-pdf{width:210mm!important;min-width:210mm!important;min-height:297mm!important;transform:none!important;margin:0!important;box-shadow:none!important;border:none!important;padding:10mm!important;position:relative!important}
            </style>
          </head><body>${el.outerHTML}</body></html>
        `)
        w.document.close()
        setTimeout(() => { w.focus(); w.print(); }, 700)
    }

    const labelTipo = isNotaCredito(fatura)? `NC ${fatura.numero_nota_credito}` : fatura?.tipo_documento === 'fatura'? `${fatura?.numero_fatura}` : `${getNumero(fatura)}`

    return (
        <div className="fixed inset-0 z-[10000] bg-[#525659] overflow-y-auto overflow-x-hidden">
            <style>{`
              /* SÓ 1 SCROLL - O DO PAI FIXED */
              #fatura-pdf-wrapper{width:100%;display:flex;justify-content:center;padding:24px 16px;background:transparent}
              #fatura-pdf{transform-origin:top center;box-shadow:0 10px 30px rgba(0,0,0,0.4)}
              @media (max-width:768px){
                #fatura-pdf{transform:scale(0.42);margin-bottom:-58%}
                #fatura-pdf-wrapper{padding:0;display:block}
              }
              /* ESCONDE SCROLL INTERNO */
              #fatura-pdf-wrapper::-webkit-scrollbar{display:none}
              @media print{.no-print{display:none!important}}
            `}</style>

            <div className="no-print sticky top-0 z-30 h-[44px] bg-[#323233] flex items-center justify-between px-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={onVoltar} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded shrink-0"><Menu className="w-4 h-4" /></button>
                    <p className="text-[11px] md:text-[13px] font-bold uppercase truncate">{labelTipo}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-[#1e1e1e] text-[10px] px-1.5 py-0.5 rounded">1 / 1</span>
                    <button onClick={onVoltar} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Share2 className="w-4 h-4"/></button>
                    <button onClick={handlePrint} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Download className="w-4 h-4"/></button>
                    <button onClick={handlePrint} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Printer className="w-4 h-4"/></button>
                </div>
            </div>

            <div id="fatura-pdf-wrapper">
                <FaturaPDF fatura={fatura} cliente={clienteView} empresa={empresaView} />
            </div>
        </div>
    )
}
