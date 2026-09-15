import { getNumero, getTotal } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any }

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
    const data = new Date(fatura.data_emissao || fatura.created_at || Date.now())
    const dataStr = data.toLocaleDateString('pt-AO')
    const horaStr = data.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })
    const itens = fatura.itens || fatura.items || []
    const total = Number(fatura.total_geral || getTotal(fatura) || 0)
    const isProforma = fatura.tipo_documento === 'proforma'

    return (
        <div id="fatura-pdf" className="bg-white text-black w-[800px] min-h-[1120px] mx-auto p-[24px] font-sans text-[10px] leading-[1.3] relative">

            {/* TOPO - IGUAL TECMICRO */}
            <div className="flex justify-between items-start">
                <div className="flex gap-3">
                    <img src={empresa?.logo || `https://ui-avatars.com/api/?name=${empresa?.nome || 'T'}&background=002d5e&color=fff&size=90`} className="w-[90px] h-[90px] object-contain" />
                    <div className="text-[11px] leading-[14px]">
                        <p className="font-bold text-[13px]">{empresa?.nome || 'Tecmicro, Lda'}</p>
                        <p>NIF: {empresa?.nif || '5417336556'}</p>
                        <p>Endereço: {empresa?.endereco || 'Av. Deolinda Rodrigues (1º de Maio)'}</p>
                        <p>Contactos: {empresa?.telefone || '+244 222 782 338 / 938 138 238'}</p>
                        <p>Email: {empresa?.email || 'geral@tecmicroangola.com'}</p>
                        <p>www.tecmicroangola.com</p>
                        <p>Luanda - Angola</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[8px] text-gray-400">Este documento não serve de factura</p>
                    <p className="font-bold text-[12px] mt-1">{isProforma? 'Factura Proforma' : 'Factura'} {getNumero(fatura)}</p>
                    <p className="text-[9px] text-gray-500">Regime de Exclusão</p>
                    <p className="font-bold text-[11px]">Original</p>
                    {/* QR fake */}
                    <div className="mt-2 w-[70px] h-[70px] bg-white border ml-auto flex items-center justify-center text-[6px]">QR CODE</div>
                </div>
            </div>

            {/* CLIENTE */}
            <div className="mt-6 ml-[108px] text-[11px] leading-[15px]">
                <p className="font-bold">{cliente?.nome || 'Angel Jorge Llopiz Ibarra'}</p>
                <p>{cliente?.endereco || 'Rua da Moagem - Kikolo'}</p>
                <p>{cliente?.cidade || 'Angola'}</p>
            </div>

            <div className="mt-3 text-[8px] text-[#666] border-b border-dashed border-gray-400 pb-1">
                j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest
            </div>

            {/* META */}
            <div className="grid grid-cols-[70px_85px_85px_110px_70px_1fr] gap-[1px] border border-black mt-[2px]">
                {[
                    { k: 'CÓD. CLIENTE', v: cliente?.id?.slice(0,4) || '5015' },
                    { k: 'DATA', v: dataStr },
                    { k: 'DATA VENC.', v: dataStr },
                    { k: 'NIF', v: 'Consumidor Final' },
                    { k: 'REFª', v: '' },
                    { k: 'OPERADOR', v: empresa?.operador || 'Leonardo Pinheiro' },
                ].map(c => (
                    <div key={c.k} className="border-r last:border-r-0 border-black">
                        <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">{c.k}</div>
                        <div className="text-center py-[4px]">{c.v}</div>
                    </div>
                ))}
            </div>

            {/* ITENS */}
            <table className="w-full mt-[1px] border-collapse border border-black">
                <thead><tr className="bg-[#e5e5e5] text-[8px] font-bold">
                    <th className="border border-black py-[4px] px-1 text-left w-[70px]">REFERÊNCIA</th>
                    <th className="border border-black py-[4px] px-1 text-left">PRODUTO / SERVIÇO</th>
                    <th className="border border-black py-[4px] w-[35px]">QTD.</th>
                    <th className="border border-black py-[4px] w-[35px]">UN.</th>
                    <th className="border border-black py-[4px] w-[75px]">PREÇO UNIT.</th>
                    <th className="border border-black py-[4px] w-[65px]">DESCONTO</th>
                    <th className="border border-black py-[4px] w-[35px]">TAXA</th>
                    <th className="border border-black py-[4px] px-1 text-right w-[85px]">VALOR (AKZ)</th>
                </tr></thead>
                <tbody>
                    {itens.map((it: any, i: number) => (
                        <tr key={i} className="text-[10px]">
                            <td className="border-x border-black px-1 py-[3px]">{it.referencia || it.sku || ''}</td>
                            <td className="border-x border-black px-1 py-[3px]">{it.nome_snapshot || it.descricao || ''}</td>
                            <td className="border-x border-black text-center">{Number(it.quantidade || 1)}</td>
                            <td className="border-x border-black text-center">{it.unidade || 'UN'}</td>
                            <td className="border-x border-black text-right pr-1">{Number(it.preco_unit_snapshot || it.preco_unitario || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                            <td className="border-x border-black text-center"></td>
                            <td className="border-x border-black text-center">0%*</td>
                            <td className="border-x border-black text-right pr-1">{Number(it.subtotal_linha || it.total || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 12 - itens.length) }).map((_, k) => (
                        <tr key={`v-${k}`} className="h-[18px]"><td className="border-x border-black" colSpan={8}></td></tr>
                    ))}
                </tbody>
            </table>

            {/* TOTAIS */}
            <div className="flex justify-between mt-[1px]">
                <div className="w-[60%]">
                    <table className="w-full border-collapse border border-black">
                        <thead><tr className="bg-[#e5e5e5] text-[8px] font-bold"><th className="border border-black py-[3px] text-left px-1">IMPOSTO</th><th className="border border-black w-[50px]">TAXA</th><th className="border border-black w-[80px]">INCIDÊNCIA</th><th className="border border-black w-[80px]">VALOR (AKZ)</th></tr></thead>
                        <tbody><tr className="text-[9px]"><td className="border border-black px-1 py-[3px]">*M04 IVA - Regime de Exclusão</td><td className="border border-black text-center">0%</td><td className="border border-black text-right pr-1">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td><td className="border border-black text-right pr-1">0,00</td></tr></tbody>
                    </table>
                    <div className="mt-3"><p className="font-bold text-[11px]">Coordenada Bancárias:</p><p className="text-[10px]">Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p></div>
                </div>
                <div className="w-[39%]">
                    <table className="w-full border-collapse border border-black text-[10px]">
                        <tbody><tr><td className="bg-[#e5e5e5] border border-black font-bold px-2 py-[4px] text-[9px]">Total Líquido (AKZ)</td><td className="border border-black text-right pr-1">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr>
                        <tr><td className="bg-[#e5e5e5] border border-black font-bold px-2 py-[4px] text-[9px]">TOTAL A PAGAR (AKZ)</td><td className="border border-black text-right pr-1 font-bold">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr></tbody>
                    </table>
                </div>
            </div>

            <div className="absolute bottom-[12px] left-[24px] right-[24px] border-t-[2px] border-black pt-[3px] flex justify-between text-[7px]">
                <span>Licenciado a: {empresa?.nome?.toUpperCase()} | NIF: {empresa?.nif}</span>
                <span>KwanzaGest</span>
                <span>Utilizador: {empresa?.operador || 'Leonardo'}</span>
                <span>Data Impressão {dataStr} {horaStr}</span>
                <span>Pag. 1 de 1</span>
            </div>
        </div>
    )
}
export default FaturaPDF
