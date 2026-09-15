import { getNumero, getTotal } from '../../EmitirFaturaPage'

interface Props {
    fatura: any
    empresa: any
    cliente: any
}

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
    const data = new Date(fatura.data_emissao || fatura.created_at || Date.now())
    const dataStr = data.toLocaleDateString('pt-AO') // 19-08-2022
    const itens = fatura.itens || fatura.items || []

    const total = Number(fatura.total_geral || getTotal(fatura) || 0)

    return (
        <div id="fatura-pdf" className="bg-white text-black w-[800px] mx-auto p-[20px] font-sans text-[10px] leading-[1.3]">

            {/* LINHA VALIDAÇÃO - igual na foto */}
            <div className="text-[9px] text-[#555] mb-[2px]">
                j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest
            </div>

            {/* CABEÇALHO META - CÓD CLIENTE etc */}
            <div className="grid grid-cols-[70px_85px_85px_110px_70px_1fr] gap-[1px] border border-black">
                <div className="border-r border-black">
                    <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">CÓD. CLIENTE</div>
                    <div className="text-center py-[4px] text-[10px]">{cliente?.codigo || '5015'}</div>
                </div>
                <div className="border-r border-black">
                    <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">DATA</div>
                    <div className="text-center py-[4px] text-[10px]">{dataStr}</div>
                </div>
                <div className="border-r border-black">
                    <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">DATA VENC.</div>
                    <div className="text-center py-[4px] text-[10px]">{dataStr}</div>
                </div>
                <div className="border-r border-black">
                    <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">NIF</div>
                    <div className="text-center py-[4px] text-[10px]">Consumidor Final</div>
                </div>
                <div className="border-r border-black">
                    <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">REFª</div>
                    <div className="text-center py-[4px] text-[10px]"></div>
                </div>
                <div>
                    <div className="bg-[#e5e5e5] text-center font-bold text-[8px] py-[3px] border-b border-black">OPERADOR</div>
                    <div className="text-center py-[4px] text-[10px]">{empresa?.operador || 'Leonardo Pinheiro'}</div>
                </div>
            </div>

            {/* TABELA ITENS - igual print 1 */}
            <table className="w-full mt-[1px] border-collapse border border-black">
                <thead>
                    <tr className="bg-[#e5e5e5] text-[8px] font-bold">
                        <th className="border border-black py-[4px] px-1 text-left w-[70px]">REFERÊNCIA</th>
                        <th className="border border-black py-[4px] px-1 text-left">PRODUTO / SERVIÇO</th>
                        <th className="border border-black py-[4px] w-[35px]">QTD.</th>
                        <th className="border border-black py-[4px] w-[35px]">UN.</th>
                        <th className="border border-black py-[4px] w-[75px]">PREÇO UNIT.</th>
                        <th className="border border-black py-[4px] w-[65px]">DESCONTO</th>
                        <th className="border border-black py-[4px] w-[35px]">TAXA</th>
                        <th className="border border-black py-[4px] px-1 text-right w-[85px]">VALOR (AKZ)</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map((it: any, i: number) => (
                        <tr key={i} className="text-[10px]">
                            <td className="border-x border-black px-1 py-[3px] align-top">{it.referencia || it.sku || it.nome_snapshot?.slice(0, 10).toUpperCase() || `KIT UNO R3`}</td>
                            <td className="border-x border-black px-1 py-[3px] align-top">
                                <div>{it.nome_snapshot || it.descricao || it.produto || 'Arduino Starter Kit Uno R3'}</div>
                                {it.observacao && <div className="text-[8px] text-[#666]">{it.observacao}</div>}
                                {i === 0 && <div className="text-[8px] text-[#666] mt-[2px]">ENTREGA3 (Camama, Benfica, Zona Verde)<br />Kikolo</div>}
                            </td>
                            <td className="border-x border-black text-center py-[3px]">{Number(it.quantidade || 1)}</td>
                            <td className="border-x border-black text-center py-[3px]">{it.unidade || 'UN'}</td>
                            <td className="border-x border-black text-right pr-1 py-[3px]">{Number(it.preco_unit_snapshot || it.preco_unitario || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                            <td className="border-x border-black text-center py-[3px]"></td>
                            <td className="border-x border-black text-center py-[3px]">0%*</td>
                            <td className="border-x border-black text-right pr-1 py-[3px]">{Number(it.subtotal_linha || it.total || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    ))}
                    {/* linhas vazias para manter altura igual ao modelo */}
                    {Array.from({ length: Math.max(0, 10 - itens.length) }).map((_, k) => (
                        <tr key={`v-${k}`} className="h-[16px]">
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                            <td className="border-x border-black"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* RODAPÉ TOTAIS + IMPOSTO - igual print 2 */}
            <div className="flex justify-between mt-[1px]">
                <div className="w-[62%]">
                    <table className="w-full border-collapse border border-black">
                        <thead>
                            <tr className="bg-[#e5e5e5] text-[8px] font-bold">
                                <th className="border border-black py-[3px] text-left px-1">IMPOSTO</th>
                                <th className="border border-black py-[3px] w-[50px]">TAXA</th>
                                <th className="border border-black py-[3px] w-[80px]">INCIDÊNCIA</th>
                                <th className="border border-black py-[3px] w-[80px]">VALOR (AKZ)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="text-[9px]">
                                <td className="border border-black px-1 py-[3px]">*M04 IVA - Regime de Exclusão</td>
                                <td className="border border-black text-center py-[3px]">0%</td>
                                <td className="border border-black text-right pr-1 py-[3px]">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                                <td className="border border-black text-right pr-1 py-[3px]">0,00</td>
                            </tr>
                            <tr className="h-[16px]">
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="mt-3">
                        <p className="font-bold text-[11px]">Coordenada Bancárias:</p>
                        <p className="text-[10px]">Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p>
                    </div>
                </div>

                <div className="w-[37%]">
                    <table className="w-full border-collapse border border-black">
                        <tbody className="text-[10px]">
                            <tr>
                                <td className="bg-[#e5e5e5] border border-black font-bold px-2 py-[4px] text-[9px]">Total Líquido (AKZ)</td>
                                <td className="border border-black text-right pr-1 py-[4px]">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td className="bg-[#e5e5e5] border border-black font-bold px-2 py-[4px] text-[9px]">TOTAL A PAGAR (AKZ)</td>
                                <td className="border border-black text-right pr-1 py-[4px] font-bold">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="h-[24px]">
                                <td className="border border-black" colSpan={2}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* LINHA FINAL - Licenciado etc */}
            <div className="mt-4 border-t-[2px] border-black pt-[3px] flex justify-between text-[7px] text-black">
                <span>Licenciado a: {empresa?.nome?.toUpperCase() || 'TECMICRO, LDA'} | NIF: {empresa?.nif || '5417336556'} | Morada: AV Deolinda Rodrigues - Kilamba Kiaxi - Luanda - Angola</span>
            </div>
            <div className="flex justify-between text-[7px] text-black mt-[1px]">
                <span>KwanzaGest | www.kwanzagest.co.ao</span>
                <span>Utilizador: {empresa?.operador || 'Leonardo Pinheiro'}</span>
                <span>Data Impressão {dataStr} 10:45</span>
                <span>Data Emissão {dataStr} 10:45</span>
                <span>Pag. 1 de 1</span>
            </div>
        </div>
    )
}

export default FaturaPDF
