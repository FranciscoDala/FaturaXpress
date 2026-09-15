import { getNumero, getTotal } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any }

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
  const d = new Date(fatura.data_emissao || fatura.created_at || '2022-08-19T10:45:00')
  const dataStr = d.toLocaleDateString('pt-AO').split('/').join('-')
  const itens = fatura.itens || fatura.items || [

    { referencia: 'KIT UNO R3', nome_snapshot: 'Arduino Starter Kit Uno R3', quantidade: 1, unidade: 'UN', preco_unit_snapshot: 29900, subtotal_linha: 29900, obs: 'ENTREGA3 (Camama, Benfica, Zona Verde)\nKikolo' },
    { referencia: 'ENT3', nome_snapshot: '', quantidade: 1, unidade: 'EX', preco_unit_snapshot: 3000, subtotal_linha: 3000 }
  ]
  const total = Number(fatura.total_geral || 32900)

  return (
    <div id="fatura-pdf" className="bg-white text-black w-[800px] mx-auto p-[22px] font-sans text-[10px] leading-[1.2]">

      {/* TOPO */}
      <div className="flex justify-between items-start">
        <div className="flex gap-[10px]">
          <div className="w-[75px] h-[75px] rounded-full bg-[#0a3d6b] flex items-center justify-center text-white font-black text-[28px] overflow-hidden">
            <img src={empresa?.logo || "https://i.imgur.com/QhW5hQp.png"} className="w-full h-full object-contain" alt="logo" />
          </div>
          <div className="text-[10px] leading-[13px]">
            <p className="font-bold text-[12px]">{empresa?.nome || 'Tecmicro, Lda'}</p>
            <p>NIF: {empresa?.nif || '5417336556'}</p>
            <p>Endereço: {empresa?.endereco || 'Av. Deolinda Rodrigues (1º de Maio)'}</p>
            <p>Contactos: {empresa?.telefone || '+244 222 782 338 / 938 138 238'}</p>
            <p>Email: {empresa?.email || 'geral@tecmicroangola.com'}</p>
            <p className="font-bold">www.tecmicroangola.com</p>
            <p>Luanda - Angola</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] text-[#888] text-left">Este documento não serve de factura</p>
          <div className="flex gap-2 items-start justify-end mt-2">
            <div className="text-right leading-[12px]">
              <p className="font-bold text-[11px]">Factura Proforma {getNumero(fatura) || 'PP 2022/702'}</p>
              <p className="text-[9px] text-[#666]">Regime de Exclusão</p>
              <p className="font-bold text-[10px]">Original</p>
            </div>
            <div className="w-[60px] h-[60px] bg-white border border-black">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${fatura.id || 'teste'}`} className="w-full h-full" alt="qr" />
            </div>
          </div>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="mt-[20px] ml-[85px] text-[10px] leading-[13px]">
        <p className="font-bold">{cliente?.nome || 'Angel Jorge Llopiz Ibarra'}</p>
        <p className="mt-[10px]">{cliente?.endereco || 'Rua da Moagem - Kikolo'}</p>
        <p>{cliente?.cidade || 'Angola'}</p>
      </div>

      {/* LINHA VALIDAÇÃO */}
      <div className="mt-[12px] text-[7.5px] text-[#555] border-b border-dotted border-gray-400 pb-[2px]">
        j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest
      </div>

      {/* CABEÇALHO CÓD CLIENTE */}
      <div className="grid grid-cols-[60px_75px_75px_110px_50px_1fr] border border-black border-t-0">
        <div className="border-r border-black"><div className="bg-[#e9e9e9] text-center font-bold text-[7.5px] py-[3px] border-b border-black">CÓD. CLIENTE</div><div className="text-center py-[4px]">{cliente?.codigo || '5015'}</div></div>
        <div className="border-r border-black"><div className="bg-[#e9e9e9] text-center font-bold text-[7.5px] py-[3px] border-b border-black">DATA</div><div className="text-center py-[4px]">{dataStr}</div></div>
        <div className="border-r border-black"><div className="bg-[#e9e9e9] text-center font-bold text-[7.5px] py-[3px] border-b border-black">DATA VENC.</div><div className="text-center py-[4px]">{dataStr}</div></div>
        <div className="border-r border-black"><div className="bg-[#e9e9e9] text-center font-bold text-[7.5px] py-[3px] border-b border-black">NIF</div><div className="text-center py-[4px] text-[9px]">Consumidor Final</div></div>
        <div className="border-r border-black"><div className="bg-[#e9e9e9] text-center font-bold text-[7.5px] py-[3px] border-b border-black">REFª</div><div className="text-center py-[4px]"></div></div>
        <div><div className="bg-[#e9e9e9] text-center font-bold text-[7.5px] py-[3px] border-b border-black">OPERADOR</div><div className="text-center py-[4px] text-[8px]">{empresa?.operador || 'Leonardo Pinheiro'}</div></div>
      </div>

      {/* TABELA ITENS - IGUAL FOTO */}
      <table className="w-full border-collapse border border-black border-t-0">
        <thead>
          <tr className="bg-[#e9e9e9] text-[7.5px] font-bold">
            <th className="border border-black py-[4px] px-1 text-left w-[60px]">REFERÊNCIA</th>
            <th className="border border-black py-[4px] px-1 text-left">PRODUTO / SERVIÇO</th>
            <th className="border border-black py-[4px] w-[28px]">QTD.</th>
            <th className="border border-black py-[4px] w-[28px]">UN.</th>
            <th className="border border-black py-[4px] w-[62px]">PREÇO UNIT.</th>
            <th className="border border-black py-[4px] w-[55px]">DESCONTO</th>
            <th className="border border-black py-[4px] w-[28px]">TAXA</th>
            <th className="border border-black py-[4px] px-1 text-right w-[70px]">VALOR (AKZ)</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it: any, i: number) => (
            <tr key={i} className="text-[9px] align-top">
              <td className="border-x border-black px-1 py-[2px]">{it.referencia || ''}</td>
              <td className="border-x border-black px-1 py-[2px] whitespace-pre-line">
                {it.nome_snapshot || it.descricao}
                {it.obs && <div className="text-[8px] mt-[2px]">{it.obs}</div>}
              </td>
              <td className="border-x border-black text-center py-[2px]">{it.quantidade}</td>
              <td className="border-x border-black text-center py-[2px]">{it.unidade || 'UN'}</td>
              <td className="border-x border-black text-right pr-1 py-[2px]">{Number(it.preco_unit_snapshot || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
              <td className="border-x border-black text-center py-[2px]"></td>
              <td className="border-x border-black text-center py-[2px]">0%*</td>
              <td className="border-x border-black text-right pr-1 py-[2px]">{Number(it.subtotal_linha || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 10 - itens.length) }).map((_, k) => (
            <tr key={`e-${k}`} className="h-[18px]"><td className="border-x border-black" colSpan={8}></td></tr>
          ))}
        </tbody>
      </table>

      {/* RODAPÉ TOTAIS - IGUAL FOTO 2 */}
      <div className="flex">
        <div className="w-[62%] border border-black border-t-0 border-r-0">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#e9e9e9] text-[7.5px] font-bold">
                <th className="border border-black py-[3px] text-left px-1">IMPOSTO</th>
                <th className="border border-black w-[35px]">TAXA</th>
                <th className="border border-black w-[65px]">INCIDÊNCIA</th>
                <th className="border border-black w-[65px]">VALOR (AKZ)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[8px]"><td className="border border-black px-1 py-[2px]">*M04 IVA - Regime de Exclusão</td><td className="border border-black text-center">0%</td><td className="border border-black text-right pr-1">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td><td className="border border-black text-right pr-1">0,00</td></tr>
              <tr className="h-[16px]"><td className="border border-black" colSpan={4}></td></tr>
            </tbody>
          </table>
        </div>
        <div className="w-[38%] border border-black border-t-0">
          <table className="w-full border-collapse text-[8.5px]">
            <tbody>
              <tr><td className="bg-[#e9e9e9] border border-black font-bold px-1 py-[3px] text-[7.5px]">Total Líquido (AKZ)</td><td className="border border-black text-right pr-1 py-[3px]">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr>
              <tr><td className="bg-[#e9e9e9] border border-black font-bold px-1 py-[3px] text-[7.5px]">TOTAL A PAGAR (AKZ)</td><td className="border border-black text-right pr-1 py-[3px] font-bold">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr>
              <tr className="h-[18px]"><td className="border border-black" colSpan={2}></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* COORDENADAS */}
      <div className="mt-[12px] text-[9px]">
        <p className="font-bold text-[10px]">Coordenada Bancárias:</p>
        <p>Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p>
      </div>

      {/* FOOTER FINAL */}
      <div className="mt-[20px] border-t-[1.5px] border-black pt-[3px] text-[6.5px] flex justify-between">
        <span>Licenciado a: {empresa?.nome?.toUpperCase() || 'TECMICRO, LDA'} | NIF: {empresa?.nif || '5417336556'} | Morada: Av Deolinda Rodrigues - Kilamba Kiaxi - Luanda - Angola | KwanzaGest | www.kwanzagest.co.ao</span>
      </div>
      <div className="flex justify-between text-[6.5px] mt-[1px]">
        <span>Utilizador: {empresa?.operador || 'Leonardo Pinheiro'}</span>
        <span>Data Impressão {dataStr} {d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>Data Emissão {dataStr} {d.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>Pag. 1 de 1</span>
      </div>
    </div>
  )
}

export default FaturaPDF
