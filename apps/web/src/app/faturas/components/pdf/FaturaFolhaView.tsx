import { useMemo } from 'react'
import FaturaPDF from './pdf_Fatura'
import { getNumero, isNotaCredito } from '../../page'
import { Menu, Download, Printer, Share2, Lock } from 'lucide-react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["ver_faturas", "baixar_fatura", "imprimir_fatura"],
    rh: [],
    recepcao: ["ver_faturas"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function FaturaFolhaView({ fatura, cliente, empresa, onVoltar }: any) {
    const clienteView = cliente || { nome: fatura?.cliente_nome || 'Consumidor Final', nif: fatura?.cliente_nif || '999999999', telefone: fatura?.cliente_telefone || '', email: fatura?.cliente_email || '', endereco: fatura?.cliente_endereco || '', cidade: fatura?.cliente_cidade || '', id: fatura?.cliente_id || null }
    const empresaView = empresa? {...empresa, logo: empresa.logo_url || empresa.image_url || empresa.logo || '', logo_url: empresa.logo_url || empresa.image_url || '', } : empresa

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeBaixar = funcionarioLogado? temPermissao(cargoAtual, 'baixar_fatura') || cargoAtual === 'admin' : true
    const podeImprimir = funcionarioLogado? temPermissao(cargoAtual, 'imprimir_fatura') || temPermissao(cargoAtual, 'baixar_fatura') || cargoAtual === 'admin' : true
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_faturas') || cargoAtual === 'admin' : true

    const handlePrint = () => {
        if (!podeImprimir) return
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

    if (!podeVer) {
        return (
            <div className="fixed inset-0 z-[10000] bg-white flex items-center justify-center p-6">
                <div className="text-center max-w-[320px]">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold">Sem permissão para ver fatura</p>
                    <p className="text-[12px] text-gray-500 mt-1">Cargo {cargoAtual.toUpperCase()}</p>
                    <button onClick={onVoltar} className="mt-4 w-full h-11 bg-black text-white rounded-full text-[13px] font-bold">Voltar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[10000] bg-[#525659] overflow-y-auto overflow-x-hidden">
            <style>{`
              #fatura-pdf-wrapper{width:100%;display:flex;justify-content:center;padding:24px 16px;background:transparent}
              #fatura-pdf{transform-origin:top center;box-shadow:0 10px 30px rgba(0,0,0,0.4)}
              @media (max-width:768px){
                #fatura-pdf{transform:scale(0.42);margin-bottom:-58%}
                #fatura-pdf-wrapper{padding:0;display:block}
              }
              #fatura-pdf-wrapper::-webkit-scrollbar{display:none}
              @media print{.no-print{display:none!important}}
            `}</style>

            <div className="no-print sticky top-0 z-30 h-[44px] bg-[#323233] flex items-center justify-between px-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={onVoltar} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded shrink-0"><Menu className="w-4 h-4" /></button>
                    <p className="text-[11px] md:text-[13px] font-bold uppercase truncate">{labelTipo} • {cargoAtual.toUpperCase()} {podeBaixar? '' : '• somente leitura'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-[#1e1e1e] text-[10px] px-1.5 py-0.5 rounded">1 / 1</span>
                    {podeBaixar && <button onClick={onVoltar} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Share2 className="w-4 h-4"/></button>}
                    <button disabled={!podeBaixar} onClick={() => podeBaixar && handlePrint()} className={`w-7 h-7 flex items-center justify-center rounded ${podeBaixar? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}><Download className="w-4 h-4"/></button>
                    <button disabled={!podeImprimir} onClick={() => podeImprimir && handlePrint()} className={`w-7 h-7 flex items-center justify-center rounded ${podeImprimir? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}><Printer className="w-4 h-4"/></button>
                </div>
            </div>

            <div id="fatura-pdf-wrapper">
                <FaturaPDF fatura={fatura} cliente={clienteView} empresa={empresaView} />
            </div>

            {!podeBaixar && (
                <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[11px] px-4 py-2 rounded-full flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5"/> Recepção não pode baixar/imprimir FT oficial
                </div>
            )}
        </div>
    )
}
