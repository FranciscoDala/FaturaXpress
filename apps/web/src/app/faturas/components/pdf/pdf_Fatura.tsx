import { getNumero, getTotal } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any }

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
  const d = new Date(fatura?.data_emissao || new Date())
  const dataStr = '15-09-2026' // data real pedida
  const itens = fatura?.itens || fatura?.items || [
    { referencia: 'KIT UNO R3', nome_snapshot: 'Arduino Starter Kit Uno R3', quantidade: 1, unidade: 'UN', preco_unit_snapshot: 29900, subtotal_linha: 29900 }
  ]
  const total = getTotal? getTotal(fatura) : 32900

  return (
    <div id="fatura-pdf" className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-[10mm] font-sans flex flex-col">

      {/* HEADER EMPRESA REAL + FACTURA À DIREITA */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className="w-[70px] h-[70px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[42px]">T</div>
          <div className="text-[10px] leading-[14px] text-[#444]">
            <p className="font-bold text-[20px] text-[#1a5ca8] leading-[22px]">{empresa?.nome || 'Tecmicro, Lda'}</p>
            <p className="mt-1">NIF: {empresa?.nif || '50924984'}</p>
            <p>Endereço: {empresa?.endereco || 'Sassamba'}</p>
            <p>Contactos: {empresa?.telefone || '+244930438947'}</p>
            <p>Email: {empresa?.email || 'killerbless12@gmail.com'}</p>
            <p>Luanda - Angola</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-bold text-[18px] leading-[20px] text-black">Factura Proforma</p>
          <p className="font-bold text-[15px] text-black">{getNumero(fatura) || 'PROFORMA 2026/00007'}</p>
          <p className="text-[11px] text-[#888] mt-1">Regime de Exclusão</p>
          <p className="text-[11px] text-[#888]">Original</p>
          <div className="mt-2 w-[78px] h-[78px] ml-auto">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=78x78&data=${fatura?.id || 'PROFORMA-2026-00007'}`} alt="qr" className="w-full h-full" />
          </div>
        </div>
      </div>

      <div className="border-t border-[#ccc] mt-6"></div>

      {/* CLIENTE + BOXES META REAL */}
      <div className="flex justify-between mt-6">
        <div className="text-[11px] leading-[16px]">
          <p className="font-bold text-[#1a5ca8] text-[16px]">Cliente:</p>
          <p className="font-bold text-[14px] text-black mt-1">{cliente?.nome || 'Angel Jorge Llopiz Ibarra'}</p>
          <p className="mt-1">{cliente?.endereco || 'Rua da Moagem - Kikolo, Angola'}</p>
        </div>

        <div className="grid grid-cols-3 gap-[6px] w-[380px]">
          <div className="border border-[#999]"><div className="bg-[#e2e2e2] text-center font-bold text-[8px] py-[4px]">CÓD CLIENTE</div><div className="text-center py-[6px] font-bold text-[12px]">{cliente?.codigo || '5015'}</div></div>
          <div className="border border-[#999]"><div className="bg-[#e2e2e2] text-center font-bold text-[8px] py-[4px]">DATA</div><div className="text-center py-[6px] font-bold text-[12px]">{dataStr}</div></div>
          <div className="border border-[#999]"><div className="bg-[#e2e2e2] text-center font-bold text-[8px] py-[4px]">DATA VENC</div><div className="text-center py-[6px] text-[12px]"></div></div>
          <div className="border border-[#999]"><div className="bg-[#e2e2e2] text-center font-bold text-[8px] py-[4px]">NIF</div><div className="text-center py-[6px] font-bold text-[10px]">Consumidor Final</div></div>
          <div className="border border-[#999]"><div className="bg-[#e2e2e2] text-center font-bold text-[8px] py-[4px]">REFª</div><div className="text-center py-[6px] text-[12px]"></div></div>
          <div className="border border-[#999]"><div className="bg-[#e2e2e2] text-center font-bold text-[8px] py-[4px]">OPERADOR</div><div className="text-center py-[6px] font-bold text-[10px]">{empresa?.operador || 'Leonardo Pinheiro'}</div></div>
        </div>
      </div>

      {/* TABELA BONITA */}
      <table className="w-full mt-6 border-collapse">
        <thead>
          <tr className="bg-[#6b6b6b] text-white text-[8.5px] font-bold uppercase">
            <th className="py-[7px] px-2 text-left border border-[#6b6b6b] w-[85px]">Referencia</th>
            <th className="py-[7px] px-2 text-left border border-[#6b6b6b]">Produto/Servico</th>
            <th className="py-[7px] text-center border border-[#6b6b6b] w-[35px]">QTD</th>
            <th className="py-[7px] text-center border border-[#6b6b6b] w-[35px]">UN</th>
            <th className="py-[7px] text-right pr-2 border border-[#6b6b6b] w-[75px]">Preco Unit</th>
            <th className="py-[7px] text-center border border-[#6b6b6b] w-[60px]">Desconto</th>
            <th className="py-[7px] text-center border border-[#6b6b6b] w-[40px]">Taxa</th>
            <th className="py-[7px] text-right pr-2 border border-[#6b6b6b] w-[85px]">Valor (AKZ)</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it: any, i: number) => (
            <tr key={i} className="text-[10px]">
              <td className="border border-[#bbb] px-2 py-[7px] font-bold">{it.referencia}</td>
              <td className="border border-[#bbb] px-2 py-[7px]">{it.nome_snapshot}</td>
              <td className="border border-[#bbb] text-center py-[7px]">{it.quantidade}</td>
              <td className="border border-[#bbb] text-center py-[7px]">{it.unidade}</td>
              <td className="border border-[#bbb] text-right pr-2 py-[7px]">{Number(it.preco_unit_snapshot).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
              <td className="border border-[#bbb] text-center py-[7px]"></td>
              <td className="border border-[#bbb] text-center py-[7px]">0%*</td>
              <td className="border border-[#bbb] text-right pr-2 py-[7px] font-bold">{Number(it.subtotal_linha).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 8 - itens.length) }).map((_, k) => (
            <tr key={k} className="h-[28px]"><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td></tr>
          ))}
        </tbody>
      </table>

      {/* RODAPÉ IMPOSTO + TOTAIS */}
      <div className="flex mt-[6px]">
        <div className="flex-1 grid grid-cols-[1fr_55px_75px_75px] gap-[4px]">
          <div className="bg-[#d0d0d0] border border-[#999]"><div className="font-bold text-[8px] py-1 px-1">IMPOSTO</div><div className="bg-white border-t border-[#999] text-[9px] py-2 px-1">*M04 IVA - Regime de Exclusão</div></div>
          <div className="bg-[#d0d0d0] border border-[#999]"><div className="font-bold text-[8px] py-1 text-center">TAXA</div><div className="bg-[#e8e8e8] border-t border-[#999] text-[10px] py-2 text-center font-bold">0%</div></div>
          <div className="bg-[#d0d0d0] border border-[#999]"><div className="font-bold text-[8px] py-1 text-center">INCIDÊNCIA</div><div className="bg-[#e8e8e8] border-t border-[#999] text-[10px] py-2 text-center font-bold">32 900,00</div></div>
          <div className="bg-[#d0d0d0] border border-[#999]"><div className="font-bold text-[8px] py-1 text-center">VALOR (AKZ)</div><div className="bg-[#e8e8e8] border-t border-[#999] text-[10px] py-2 text-center font-bold">0,00</div></div>
        </div>
        <div className="w-[175px] ml-[4px] bg-[#6b6b6b] text-white text-right px-2 py-1 flex flex-col justify-center">
          <div className="text-[11px]">Total Liquido (AKZ)</div>
          <div className="font-bold text-[14px]">32 900,00</div>
          <div className="mt-1 pt-1 border-t border-[#999] text-[9px]">TOTAL A PAGAR (AKZ) <span className="font-bold text-[13px] ml-1">32 900,00</span></div>
        </div>
      </div>

      <div className="mt-4">
        <p className="font-bold text-[#1a5ca8] text-[13px]">Coordenada Bancárias:</p>
        <p className="text-[11px] mt-1">Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p>
      </div>

      <div className="mt-auto pt-4 border-t border-black">
        <div className="flex justify-between text-[7px] text-black">
          <span>Licenciado a: TECMICRO, LDA | NIF: 50924984 | Morada: Sassamba | Luanda - Angola</span>
          <span className="font-bold">j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest</span>
        </div>
        <div className="flex justify-between text-[7px] mt-1">
          <span>Licenciado a TECMICRO LDA | NIF 50924984 | Morada Sassamba | Luanda - Angola</span>
          <span>Data Emissão {dataStr}</span>
          <span>Pág. 1 de 1</span>
        </div>
      </div>
    </div>
  )
}

export default FaturaPDF
