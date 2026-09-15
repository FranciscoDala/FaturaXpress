import { useState } from 'react'
import { getNumero } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any; onClose?: () => void }

const LogoDefault = ({ nome, size = 'small' }: { nome?: string; size?: 'small' | 'large' }) => {
    const inicial = (nome || 'T').charAt(0).toUpperCase()
    if (size === 'large') {
        return (
            <div className="flex flex-col items-center opacity-[0.13]">
                <div className="w-[500px] h-[500px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[220px]">{inicial}</div>
                <div className="mt-4 bg-[#1a5ca8] text-white text-[22px] font-bold px-8 py-1 tracking-widest">{(nome || 'TECMICRO').toUpperCase()}</div>
            </div>
        )
    }
    return (
        <div className="w-[110px] h-[90px] flex flex-col items-center justify-center shrink-0">
            <div className="w-[70px] h-[70px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[36px]">{inicial}</div>
            <div className="mt-1 bg-[#1a5ca8] text-white text-[9px] font-bold px-2 py-[2px]">{(nome || 'TECMICRO').toUpperCase().slice(0, 10)}</div>
        </div>
    )
}

export const FaturaPDF = ({ fatura, empresa, cliente, onClose }: Props) => {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showBaixar, setShowBaixar] = useState(false)

    const itens = fatura?.itens || fatura?.items || [
        { referencia: 'KIT UNO R3', nome_snapshot: 'Arduino Starter Kit Uno R3', quantidade: 1, unidade: 'UN', preco_unit_snapshot: 29900, subtotal_linha: 29900 }
    ]

    // TODOS OS CAMPOS DO DB COM FALLBACK ***********
    const emp = {
        nome: empresa?.nome || empresa?.name || '***********',
        nif: empresa?.nif || empresa?.nif_numero || '***********',
        endereco: empresa?.endereco || empresa?.morada || '***********',
        telefone: empresa?.telefone || empresa?.contactos || '***********',
        email: empresa?.email || '***********',
        cidade: empresa?.cidade || '***********',
        logo: empresa?.logo || empresa?.logo_url || '',
        operador: empresa?.operador || '***********',
        banco: empresa?.banco || empresa?.nome_banco || 'BAI',
        iban: empresa?.iban || empresa?.iban_banco || '',
        conta: empresa?.conta_bancaria || empresa?.numero_conta || '',
    }
    const hasLogo = emp.logo && emp.logo !== ''

    const mask = (val: string) => val && val !== '***********' ? val : '***********'

    const handleBaixar = () => {
        window.print()
    }

    const handleShare = async () => {
        if (navigator.share) {
            await navigator.share({ title: getNumero(fatura), text: 'Fatura ' + getNumero(fatura) })
        }
    }

    const Toolbar = ({ isFixedOverlay = false }: { isFixedOverlay?: boolean }) => (
        <div className={`w-full bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-4 py-2 ${isFixedOverlay ? 'fixed top-0 left-0 z-[100] shadow-md' : 'sticky top-0 z-50'}`}>
            {/* ESQUERDA - BAIXAR + ICONES */}
            <div className="flex items-center gap-2">
                {isFixedOverlay ? (
                    <button onClick={() => setIsFullscreen(false)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[20px] font-bold">✕</button>
                ) : (
                    onClose && <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[20px] font-bold">✕</button>
                )}

                <div className="relative flex items-center">
                    <button onClick={handleBaixar} className="bg-[#137333] hover:bg-[#0f5c29] text-white px-4 py-[8px] rounded-l-md flex items-center gap-2 text-[14px] font-medium">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                        Baixar
                    </button>
                    <button onClick={() => setShowBaixar(!showBaixar)} className="bg-[#137333] hover:bg-[#0f5c29] text-white px-2 py-[8px] rounded-r-md border-l border-[#0f5c29]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {showBaixar && (
                        <div className="absolute top-[38px] left-0 bg-white border border-gray-200 shadow-lg rounded-md w-[200px] z-50">
                            <button onClick={handleBaixar} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px]">Baixar PDF</button>
                            <button onClick={() => window.print()} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px]">Imprimir</button>
                        </div>
                    )}
                </div>

                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                </button>
                <button onClick={handleShare} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="1.8"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5f6368"><circle cx="12" cy="12" r="1.8" /><circle cx="19.5" cy="12" r="1.8" /><circle cx="4.5" cy="12" r="1.8" /></svg>
                </button>
            </div>

            {/* DIREITA - EXPANDIR */}
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="1.8">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
            </button>
        </div>
    )

    const Folha = () => (
        <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] font-sans text-[12px] leading-[1.3] flex flex-col border border-gray-300 shadow-sm overflow-hidden mx-auto">
            {/* MARCA D'ÁGUA GRANDE */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                {hasLogo ? <img src={emp.logo} alt="marca" className="w-[550px] h-[550px] object-contain opacity-[0.12] grayscale" /> : <LogoDefault nome={emp.nome} size="large" />}
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex gap-3">
                    {hasLogo ? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <LogoDefault nome={emp.nome} />}
                    <div className="text-[12px] leading-[16px] break-words">
                        <p className="font-bold text-[15px]">{mask(emp.nome)}</p>
                        <p>NIF: {mask(emp.nif)}</p>
                        <p>Endereço: {mask(emp.endereco)}</p>
                        <p>Contactos: {mask(emp.telefone)}</p>
                        <p>Email: {mask(emp.email)}</p>
                        <p>{mask(emp.cidade)}</p>
                    </div>
                </div>

                <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
                    <div></div>
                    <div className="flex gap-3 items-start">
                        <div className="text-right leading-[15px]">
                            <p className="font-bold text-[15px]">{getNumero(fatura) || 'Factura Proforma PROFORMA 2026/00007'}</p>
                            <p className="text-[#777] text-[12px] mt-1">Regime de Exclusão</p>
                            <p className="font-bold text-[13px]">Original</p>
                        </div>
                        <div className="w-[72px] h-[72px] shrink-0"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${fatura?.id || 'PROFORMA'}`} alt="qr" /></div>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <div className="w-[280px] text-[13px] leading-[18px] text-right break-words">
                        <p className="font-bold">{cliente?.nome || '***********'}</p>
                        <p className="mt-2">{cliente?.endereco || '***********'}</p>
                        <p>{cliente?.cidade || '***********'}</p>
                    </div>
                </div>

                <div className="mt-6 text-[9px] text-[#666]">Processado por programa validado 83/AGT/2019 KwanzaGest</div>

                <div className="mt-2 grid grid-cols-3 md:grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
                    {[
                        { k: 'CÓD. CLIENTE', v: cliente?.codigo || '***********' },
                        { k: 'DATA', v: '15-09-2026' },
                        { k: 'DATA VENC.', v: cliente?.data_venc || '***********' },
                        { k: 'NIF', v: cliente?.nif || 'Consumidor Final' },
                        { k: 'REFª', v: '***********' },
                        { k: 'OPERADOR', v: mask(emp.operador) },
                    ].map(b => (
                        <div key={b.k} className="border border-[#bbb] py-[4px] px-1 bg-white/80"><p className="font-bold text-[10px] truncate">{b.k}</p><p className="text-center text-[11px] mt-[3px] truncate">{b.v}</p></div>
                    ))}
                </div>

                <div className="w-full mt-2 bg-white/80">
                    <table className="w-full border-collapse">
                        <thead><tr className="bg-[#c2c2c2] text-[10px] font-bold"><th className="border border-[#999] py-[6px] px-1 text-left">REFERÊNCIA</th><th className="border border-[#999] py-[6px] px-1 text-left">PRODUTO / SERVIÇO</th><th className="border border-[#999] py-[6px]">QTD.</th><th className="border border-[#999] py-[6px]">UN.</th><th className="border border-[#999] py-[6px]">PREÇO UNIT.</th><th className="border border-[#999] py-[6px]">DESCONTO</th><th className="border border-[#999] py-[6px]">TAXA</th><th className="border border-[#999] py-[6px] text-right">VALOR (AKZ)</th></tr></thead>
                        <tbody>
                            {itens.map((it: any, i: number) => (
                                <tr key={i} className="text-[11px] h-[22px]"><td className="border border-[#bbb] px-1">{it.referencia}</td><td className="border border-[#bbb] px-1">{it.nome_snapshot}</td><td className="border border-[#bbb] text-center">{it.quantidade}</td><td className="border border-[#bbb] text-center">{it.unidade}</td><td className="border border-[#bbb] text-right pr-1">{Number(it.preco_unit_snapshot).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td><td className="border border-[#bbb]"></td><td className="border border-[#bbb] text-center">0%*</td><td className="border border-[#bbb] text-right pr-1">{Number(it.subtotal_linha).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr>
                            ))}
                            {Array.from({ length: 7 }).map((_, k) => (<tr key={k} className="h-[26px]"><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td></tr>))}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-2 gap-1">
                    <div className="flex-1 border border-[#999] bg-white/80"><div className="flex bg-[#c2c2c2] text-[10px] font-bold"><div className="flex-1 border-r border-[#999] py-[5px] px-1">IMPOSTO</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">TAXA</div><div className="w-[80px] border-r border-[#999] py-[5px] text-center">INCIDÊNCIA</div><div className="w-[80px] py-[5px] text-center">VALOR</div></div><div className="flex text-[10px]"><div className="flex-1 border-r border-[#999] py-[5px] px-1">*M04 IVA - Regime de Exclusão</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">0%</div><div className="w-[80px] border-r border-[#999] py-[5px] text-right pr-1">32 900,00</div><div className="w-[80px] py-[5px] text-right pr-1">0,00</div></div></div>
                    <div className="w-[150px] md:w-[220px] shrink-0 bg-white/80"><div className="flex bg-[#c2c2c2] text-[10px] border border-[#999]"><div className="flex-1 py-[5px] px-1 text-right">Total Líquido</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div><div className="flex bg-[#c2c2c2] text-[10px] font-bold border border-[#999] border-t-0"><div className="flex-1 py-[5px] px-1 text-right">TOTAL A PAGAR</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div></div>
                </div>

                <div className="mt-4">
                    <p className="font-bold text-[13px]">Coordenada Bancárias:</p>
                    <p className="text-[12px] break-all">
                        Banco {mask(emp.banco)} {emp.conta ? `nº ${emp.conta} / ` : ''}IBAN {emp.iban ? emp.iban : '***********'}
                    </p>
                </div>

                <div className="mt-auto pt-6 border-t border-black text-[8px]"><span>Licenciado a: {mask(emp.nome)} | NIF: {mask(emp.nif)} | Morada: {mask(emp.endereco)} - {mask(emp.cidade)} | KwanzaGest | Utilizador: {mask(emp.operador)} | Data Impressão 15-09-2026 10:45 | Pág. 1 de 1</span></div>
            </div>
        </div>
    )

    return (
        <>
            <style>{`
        #fatura-pdf-wrapper { display:flex; justify-content:center; align-items:flex-start; width:100%; background:white; }
        #fatura-pdf { transform-origin: top center; }
        @media (max-width: 768px) { #fatura-pdf { transform: scale(0.46); margin-bottom: -620px; width: 210mm!important; min-width: 210mm!important; } }
        @media (min-width: 769px) and (max-width: 1024px) { #fatura-pdf { transform: scale(0.72); margin-bottom: -350px; width: 210mm!important; min-width: 210mm!important; } }
        @media print { #fatura-pdf-wrapper { display:block!important; } #fatura-pdf { transform:none!important; margin:0 auto!important; box-shadow:none!important; border:none!important; }.no-print { display:none!important; } }
      `}</style>

            {/* BARRA FIXA NORMAL */}
            <div className="no-print">
                <Toolbar />
            </div>

            {/* FOLHA */}
            <div id="fatura-pdf-wrapper" className="bg-white p-0 md:p-6 flex justify-center">
                <Folha />
            </div>

            {/* FULLSCREEN OVERLAY */}
            {isFullscreen && (
                <div className="fixed inset-0 bg-white z-[100] overflow-auto">
                    <Toolbar isFixedOverlay={true} />
                    <div className="pt-[56px] bg-[#f8f9fa] min-h-screen flex justify-center p-2 md:p-6">
                        <div className="scale-[0.9] md:scale-100 origin-top">
                            <Folha />
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FaturaPDF
