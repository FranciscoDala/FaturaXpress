import { getNumero } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any }

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
  const d = new Date(fatura.data_emissao || fatura.created_at || '2022-08-19T10:45:00')
  const dataStr = d.toLocaleDateString('pt-AO').split('/').join('-')
  const total = Number(fatura.total_geral || 29900)
  const itens = fatura.itens || fatura.items || [
    { referencia: 'KIT UNO R3', nome: 'Arduino Starter Kit Uno R3', qtd: 1, un: 'UN', preco: 29900, valor: 29900 }
  ]

  return (
    <div id="fatura-pdf" className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto p-[12mm] font-sans text-[11px] leading-[1.25]">

      {/* HEADER - IGUAL TECMICRO */}
      <div className="flex gap-4">
        <img src={empresa?.logo || '/logo-tecmicro.png'} alt="logo" className="w-[110px] h-[90px] object-contain" />
        <div className="leading-[15px]">
          <p className="font-bold text-[14px]">{empresa?.nome || 'Tecmicro, Lda'}</p>
          <p>NIF: {empresa?.nif || '5417336556'}</p>
          <p>Endereço: {empresa?.endereco || 'Av. Deolinda Rodrigues (1º de Maio)'}</p>
          <p>Contactos: {empresa?.telefone || '+244 222 782 338 / 938 138 238'}</p>
          <p>Email: {empresa?.email || 'geral@tecmicroangola.com'}</p>
          <p className="font-medium">www.tecmicroangola.com</p>
          <p>Luanda - Angola</p>
        </div>
      </div>

      <div className="flex justify-between items-start mt-8">
        <p className="text-[10px] text-[#999] font-semibold">Este documento não serve de factura</p>
        <div className="flex gap-3 items-start">
          <div className="text-right leading-[14px]">
            <p className="font-bold text-[13px]">Factura Proforma {getNumero(fatura) || 'PP 2022/702'}</p>
            <p className="text-[11px] text-[#777]">Regime de Exclusão</p>
            <p className="font-bold text-[13px]">Original</p>
          </div>
          <div className="w-[72px] h-[72px] border">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${fatura.id}`} alt="qr" className="w-full h-full" />
          </div>
        </div>
      </div>

      {/* CLIENTE - ALINHADO A DIREITA COMO NA FOTO */}
      <div className="mt-6 flex justify-end">
        <div className="w-[250px] text-[11px] leading-[16px]">
          <p className="font-bold">{cliente?.nome || 'Angel Jorge Llopiz Ibarra'}</p>
          <p className="mt-6">{cliente?.endereco || 'Rua da Moagem - Kikolo'}</p>
          <p>{cliente?.cidade || 'Angola'}</p>
        </div>
      </div>

      <div className="mt-8 flex justify-between text-[8px] text-[#666]">
        <span>j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest</span>
        <span className="border-b border-dotted border-gray-400 w-[220px]"></span>
      </div>

      {/* CAIXAS META - CÓD CLIENTE ETC */}
      <div className="mt-3 grid grid-cols-[85px_90px_90px_115px_85px_1fr] gap-[6px]">
        {[
          { k: 'CÓD. CLIENTE', v: cliente?.codigo || '5015' },
          { k: 'DATA', v: dataStr },
          { k: 'DATA VENC.', v: '' },
          { k: 'NIF', v: 'Consumidor Final' },
          { k: 'REFª', v: '' },
          { k: 'OPERADOR', v: empresa?.operador || 'Leonardo Pinheiro' },
        ].map(b => (
          <div key={b.k} className="border border-[#bbb] bg-white px-1 py-1">
            <p className="font-bold text-[9px] uppercase">{b.k}</p>
            <p className="text-[10px] text-center mt-1">{b.v}</p>
          </div>
        ))}
      </div>

      {/* TABELA - CABEÇALHO CINZA */}
      <table className="w-full mt-2 border-collapse">
        <thead>
          <tr className="bg-[#d0d0d0] text-[9px] font-bold uppercase">
            <th className="border border-[#999] py-1 px-1 text-left w-[80px]">Referência</th>
            <th className="border border-[#999] py-1 px-1 text-left">Produto / Serviço</th>
            <th className="border border-[#999] py-1 w-[35px]">Qtd.</th>
            <th className="border border-[#999] py-1 w-[35px]">Un.</th>
            <th className="border border-[#999] py-1 w-[80px]">Preço Unit.</th>
            <th className="border border-[#999] py-1 w-[70px]">Desconto</th>
            <th className="border border-[#999] py-1 w-[40px]">Taxa</th>
            <th className="border border-[#999] py-1 px-1 text-right w-[85px]">Valor (AKZ)</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it: any, i: number) => (
            <tr key={i} className="text-[10px]">
              <td className="border border-[#999] px-1 py-1">{it.referencia || it.sku}</td>
              <td className="border border-[#999] px-1 py-1">{it.nome_snapshot || it.nome || 'Arduino Starter Kit Uno R3'}</td>
              <td className="border border-[#999] text-center py-1">{it.quantidade || it.qtd || 1}</td>
              <td className="border border-[#999] text-center py-1">{it.unidade || it.un || 'UN'}</td>
              <td className="border border-[#999] text-right pr-1 py-1">{Number(it.preco_unit_snapshot || it.preco || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
              <td className="border border-[#999] text-center py-1"></td>
              <td className="border border-[#999] text-center py-1">0%*</td>
              <td className="border border-[#999] text-right pr-1 py-1">{Number(it.subtotal_linha || it.valor || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RODAPÉ IGUAL FOTO ANTERIOR */}
      <div className="flex mt-[1px]">
        <div className="w-[60%] border border-black">
          <table className="w-full text-[8px]"><thead><tr className="bg-[#e5e5e5] font-bold"><th className="border border-black text-left px-1">IMPOSTO</th><th className="border border-black w-[40px]">TAXA</th><th className="border border-black w-[70px]">INCIDÊNCIA</th><th className="border border-black w-[70px]">VALOR (AKZ)</th></tr></thead>
          <tbody><tr><td className="border border-black px-1">*M04 IVA - Regime de Exclusão</td><td className="border border-black text-center">0%</td><td className="border border-black text-right pr-1">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td><td className="border border-black text-right pr-1">0,00</td></tr></tbody></table>
        </div>
        <div className="w-[40%] border border-black border-l-0">
          <table className="w-full text-[9px]"><tbody><tr><td className="bg-[#e5e5e5] border border-black font-bold px-1 py-1 text-[8px]">Total Líquido (AKZ)</td><td className="border border-black text-right pr-1">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td className="bg-[#e5e5e5] border border-black font-bold px-1 py-1 text-[8px]">TOTAL A PAGAR (AKZ)</td><td className="border border-black text-right pr-1 font-bold">{total.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr></tbody></table>
        </div>
      </div>

      <div className="mt-3 text-[9px]"><p className="font-bold">Coordenada Bancárias:</p><p>Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p></div>
    </div>
  )
}

export default FaturaPDF
