import { getNumero } from '../../EmitirFaturaPage'

interface Props {
  fatura: any
  empresa: any
  cliente: any
}

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
  const isProforma = fatura.tipo_documento === 'proforma'
  return (
    <div id="fatura-pdf" className="bg-white text-black w-[210mm] min-h-[297mm] p-[12mm] mx-auto text-[11px] leading-[1.4]">
      <div className="flex justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-[18px] font-black uppercase">{empresa?.nome || 'EMPRESA'}</h1>
          <p>NIF: {empresa?.nif}</p>
          <p>{empresa?.endereco}</p>
        </div>
        <div className="text-right">
          <h2 className="text-[22px] font-bold">{isProforma? 'PROFORMA' : 'FATURA'}</h2>
          <p className="font-bold text-[14px]">{getNumero(fatura)}</p>
          <p>{new Date(fatura.data_emissao || fatura.created_at).toLocaleDateString('pt-AO')}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div className="border p-3">
          <p className="font-bold text-[9px] text-gray-500">CLIENTE</p>
          <p className="font-bold text-[12px]">{cliente?.nome}</p>
          <p>NIF {cliente?.nif}</p>
          <p>{cliente?.endereco} - {cliente?.cidade}</p>
        </div>
        <div className="border p-3 bg-gray-50">
          <p className="font-bold text-[9px]">DETALHES</p>
          <p>Forma: {fatura.forma_pagamento}</p>
        </div>
      </div>

      <table className="w-full mt-6 border-collapse">
        <thead><tr className="bg-black text-white text-[9px]"><th className="p-2 text-left">DESC</th><th className="p-2 text-right">QTD</th><th className="p-2 text-right">PREÇO</th><th className="p-2 text-right">TOTAL</th></tr></thead>
        <tbody>{fatura.itens?.map((it: any, i: number) => (<tr key={i} className="border-b"><td className="p-2">{it.nome_snapshot}</td><td className="p-2 text-right">{Number(it.quantidade).toFixed(0)}</td><td className="p-2 text-right">{Number(it.preco_unit_snapshot).toFixed(2)}</td><td className="p-2 text-right font-bold">{Number(it.subtotal_linha).toFixed(2)}</td></tr>))}</tbody>
      </table>

      <div className="flex justify-end mt-4">
        <div className="w-[200px] border">
          <div className="flex justify-between p-2 border-b"><span>Subtotal</span><span>{Number(fatura.subtotal).toFixed(2)}</span></div>
          <div className="flex justify-between p-2 bg-black text-white font-bold"><span>TOTAL</span><span>{Number(fatura.total_geral).toFixed(2)} KZ</span></div>
        </div>
      </div>
    </div>
  )
}

export default FaturaPDF
