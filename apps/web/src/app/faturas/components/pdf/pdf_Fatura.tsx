import { getNumero } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any }

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
  const d = new Date(fatura.data_emissao || fatura.created_at || '2022-08-19T10:45:00')
  const dataStr = '15-09-2026'
  const hora = '10:45'
  const itens = fatura.itens || fatura.items || [
    { referencia: 'KIT UNO R3', nome_snapshot: 'Arduino Starter Kit Uno R3', quantidade: 1, unidade: 'UN', preco_unit_snapshot: 29900, subtotal_linha: 29900 }
  ]
  const total = 32900

  return (
    <div id="fatura-pdf" className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-[10mm] font-sans text-[12px] leading-[1.3] flex flex-col">

      {/* HEADER - DADOS REAIS */}
      <div className="flex gap-3">
        <img src={empresa?.logo || '/logo-tecmicro.png'} className="w-[110px] h-[90px] object-contain" alt="logo" />
        <div className="text-[12px] leading-[16px]">
          <p className="font-bold text-[15px]">{empresa?.nome || 'Tecmicro, Lda'}</p>
          <p>NIF: {empresa?.nif || '50924984'}</p>
          <p>Endereço: {empresa?.endereco || 'Sassamba'}</p>
          <p>Contactos: {empresa?.telefone || '+244930438947'}</p>
          <p>Email: {empresa?.email || 'killerbless12@gmail.com'}</p>
          <p>Luanda - Angola</p>
        </div>
      </div>

      {/* FACTURA PROFORMA À DIREITA JUNTO AO QR */}
      <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
        <div></div>
        <div className="flex gap-3 items-start">
          <div className="text-right leading-[15px]">
            <p className="font-bold text-[15px]">{getNumero(fatura) || 'Factura Proforma PROFORMA 2026/00007'}</p>
            <p className="text-[#777] text-[12px] mt-1">Regime de Exclusão</p>
            <p className="font-bold text-[13px]">Original</p>
          </div>
          <div className="w-[72px] h-[72px]"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${fatura.id}`} alt="qr" /></div>
        </div>
      </div>

      {/* CLIENTE */}
      <div className="mt-6 flex justify-end">
        <div className="w-[280px] text-[13px] leading-[18px]">
          <p className="font-bold">{cliente?.nome || 'Angel Jorge Llopiz Ibarra'}</p>
          <p className="mt-4">{cliente?.endereco || 'Rua da Moagem - Kikolo'}</p>
          <p>{cliente?.cidade || 'Angola'}</p>
        </div>
      </div>

      <div className="mt-6 text-[9px] text-[#666]">j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest</div>

      {/* BOXES */}
      <div className="mt-2 grid grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
        {[
          { k: 'CÓD. CLIENTE', v: cliente?.codigo || '5015' },
          { k: 'DATA', v: '15-09-2026' },
          { k: 'DATA VENC.', v: '' },
          { k: 'NIF', v: 'Consumidor Final' },
          { k: 'REFª', v: '' },
          { k: 'OPERADOR', v: empresa?.operador || 'Leonardo Pinheiro' },
        ].map(b => (
          <div key={b.k} className="border border-[#bbb] py-[4px] px-1">
            <p className="font-bold text-[10px]">{b.k}</p>
            <p className="text-center text-[11px] mt-[3px]">{b.v}</p>
          </div>
        ))}
      </div>

      {/* TABELA ITENS */}
      <table className="w-full mt-2 border-collapse">
        <thead><tr className="bg-[#c2c2c2] text-[10px] font-bold">
          <th className="border border-[#999] py-[6px] px-1 text-left w-[85px]">REFERÊNCIA</th>
          <th className="border border-[#999] py-[6px] px-1 text-left">PRODUTO / SERVIÇO</th>
          <th className="border border-[#999] py-[6px] w-[38px]">QTD.</th>
          <th className="border border-[#999] py-[6px] w-[38px]">UN.</th>
          <th className="border border-[#999] py-[6px] w-[80px]">PREÇO UNIT.</th>
          <th className="border border-[#999] py-[6px] w-[70px]">DESCONTO</th>
          <th className="border border-[#999] py-[6px] w-[42px]">TAXA</th>
          <th className="border border-[#999] py-[6px] pr-1 w-[85px] text-right">VALOR (AKZ)</th>
        </tr></thead>
        <tbody>
          {itens.map((it: any, i: number) => (
            <tr key={i} className="text-[11px] h-[22px]">
              <td className="border-x border-b border-[#bbb] px-1">{it.referencia}</td>
              <td className="border-x border-b border-[#bbb] px-1">{it.nome_snapshot}</td>
              <td className="border-x border-b border-[#bbb] text-center">{it.quantidade}</td>
              <td className="border-x border-b border-[#bbb] text-center">{it.unidade}</td>
              <td className="border-x border-b border-[#bbb] text-right pr-1">{Number(it.preco_unit_snapshot).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
              <td className="border-x border-b border-[#bbb]"></td>
              <td className="border-x border-b border-[#bbb] text-center">0%*</td>
              <td className="border-x border-b border-[#bbb] text-right pr-1">{Number(it.subtotal_linha).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {Array.from({ length: 7 }).map((_, k) => (
            <tr key={k} className="h-[26px]"><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td><td className="border-x border-b border-[#bbb]"></td></tr>
          ))}
        </tbody>
      </table>

      <div className="flex mt-2">
        <div className="flex-1 border border-[#999]">
          <div className="flex bg-[#c2c2c2] text-[10px] font-bold"><div className="flex-1 border-r border-[#999] py-[5px] px-1">IMPOSTO</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">TAXA</div><div className="w-[80px] border-r border-[#999] py-[5px] text-center">INCIDÊNCIA</div><div className="w-[80px] py-[5px] text-center">VALOR (AKZ)</div></div>
          <div className="flex text-[10px]"><div className="flex-1 border-r border-[#999] py-[5px] px-1">*M04 IVA - Regime de Exclusão</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">0%</div><div className="w-[80px] border-r border-[#999] py-[5px] text-right pr-1">32 900,00</div><div className="w-[80px] py-[5px] text-right pr-1">0,00</div></div>
        </div>
        <div className="w-[220px] ml-1"><div className="flex bg-[#c2c2c2] text-[10px] border border-[#999]"><div className="flex-1 py-[5px] px-1 text-right">Total Líquido (AKZ)</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div><div className="flex bg-[#c2c2c2] text-[10px] font-bold border border-[#999] border-t-0"><div className="flex-1 py-[5px] px-1 text-right">TOTAL A PAGAR (AKZ)</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div></div>
      </div>

      <div className="mt-4"><p className="font-bold text-[13px]">Coordenada Bancárias:</p><p className="text-[12px]">Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p></div>

      <div className="mt-auto pt-6 border-t border-black text-[8px] flex justify-between">
        <span>Licenciado a: TECMICRO, LDA | NIF: 50924984 | Morada: Sassamba - Luanda - Angola | KwanzaGest | www.kwanzagest.co.ao | Utilizador: Leonardo Pinheiro | Data Impressão {dataStr} {hora} | Data Emissão {dataStr} {hora} | Pág. 1 de 1</span>
      </div>
    </div>
  )
}

export default FaturaPDF
