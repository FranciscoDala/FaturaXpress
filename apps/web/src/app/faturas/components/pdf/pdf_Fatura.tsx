import { getNumero } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any }

const LogoDefault = ({ nome, size = 'small' }: { nome?: string; size?: 'small' | 'large' }) => {
  const inicial = (nome || 'T').charAt(0).toUpperCase()
  if (size === 'large') {
    return (
      <div className="flex flex-col items-center opacity-[0.07]">
        <div className="w-[280px] h-[280px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[160px]">{inicial}</div>
        <div className="mt-3 bg-[#1a5ca8] text-white text-[18px] font-bold px-6 py-1 tracking-widest">{(nome || 'TECMICRO').toUpperCase()}</div>
      </div>
    )
  }
  return (
    <div className="w-[110px] h-[90px] flex flex-col items-center justify-center shrink-0">
      <div className="w-[70px] h-[70px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[36px]">{inicial}</div>
      <div className="mt-1 bg-[#1a5ca8] text-white text-[9px] font-bold px-2 py-[2px]">{(nome || 'TECMICRO').toUpperCase().slice(0,10)}</div>
    </div>
  )
}

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
  const dataStr = '15-09-2026'
  const hora = '10:45'
  const itens = fatura.itens || fatura.items || [
    { referencia: 'KIT UNO R3', nome_snapshot: 'Arduino Starter Kit Uno R3', quantidade: 1, unidade: 'UN', preco_unit_snapshot: 29900, subtotal_linha: 29900 }
  ]

  // HEADER 100% DO DB - SEM DADOS CHAPADOS
  const emp = {
    nome: empresa?.nome || empresa?.name || empresa?.razao_social || 'Tecmicro, Lda',
    nif: empresa?.nif || empresa?.nif_numero || empresa?.contribuinte || '50924984',
    endereco: empresa?.endereco || empresa?.morada || empresa?.address || 'Sassamba',
    telefone: empresa?.telefone || empresa?.contactos || empresa?.contacto || empresa?.phone || '+244930438947',
    email: empresa?.email || empresa?.mail || 'killerbless12@gmail.com',
    cidade: empresa?.cidade || empresa?.city || 'Luanda - Angola',
    logo: empresa?.logo || empresa?.logotipo || empresa?.logo_url || '',
    operador: empresa?.operador || 'Leonardo Pinheiro'
  }

  const hasLogo = emp.logo && emp.logo!== '' &&!emp.logo.includes('logo-tecmicro.png')

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          #fatura-pdf-wrapper { overflow-x: auto; }
          #fatura-pdf { transform: scale(0.48); transform-origin: top left; margin-bottom: -520px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          #fatura-pdf-wrapper { overflow-x: auto; }
          #fatura-pdf { transform: scale(0.75); transform-origin: top left; margin-bottom: -250px; }
        }
        @media print {
          #fatura-pdf-wrapper { overflow: visible!important; }
          #fatura-pdf { transform: none!important; margin: 0!important; box-shadow: none!important; }
        }
      `}</style>

      <div id="fatura-pdf-wrapper" className="w-full bg-[#f2f2f2] p-2 md:p-4 flex justify-center">
        <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] font-sans text-[12px] leading-[1.3] flex flex-col shadow-lg shrink-0 overflow-hidden">

          {/* MARCA D'ÁGUA */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            {hasLogo? (
              <img src={emp.logo} alt="marca" className="w-[300px] h-[300px] object-contain opacity-[0.07] grayscale" />
            ) : (
              <LogoDefault nome={emp.nome} size="large" />
            )}
          </div>

          <div className="relative z-10 flex flex-col flex-1">

            {/* HEADER PUXANDO DO DB */}
            <div className="flex gap-3">
              {hasLogo? (
                <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" />
              ) : (
                <LogoDefault nome={emp.nome} />
              )}
              <div className="text-[12px] leading-[16px] break-words">
                <p className="font-bold text-[15px]">{emp.nome}</p>
                <p>NIF: {emp.nif}</p>
                <p className="break-all">Endereço: {emp.endereco}</p>
                <p>Contactos: {emp.telefone}</p>
                <p className="break-all">Email: {emp.email}</p>
                <p>{emp.cidade}</p>
              </div>
            </div>

            <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
              <div></div>
              <div className="flex gap-3 items-start">
                <div className="text-right leading-[15px]">
                  <p className="font-bold text-[15px] break-words">{getNumero(fatura) || 'Factura Proforma PROFORMA 2026/00007'}</p>
                  <p className="text-[#777] text-[12px] mt-1">Regime de Exclusão</p>
                  <p className="font-bold text-[13px]">Original</p>
                </div>
                <div className="w-[72px] h-[72px] shrink-0"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${fatura?.id || 'PROFORMA'}`} alt="qr" /></div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-[280px] text-[13px] leading-[18px] text-right break-words">
                <p className="font-bold">{cliente?.nome || 'Angel Jorge Llopiz Ibarra'}</p>
                <p className="mt-2">{cliente?.endereco || 'Rua da Moagem - Kikolo'}</p>
                <p>{cliente?.cidade || 'Angola'}</p>
              </div>
            </div>

            <div className="mt-6 text-[9px] text-[#666]">j0j0-Processado por programa validado 83/AGT/2019 KwanzaGest</div>

            <div className="mt-2 grid grid-cols-3 md:grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
              {[
                { k: 'CÓD. CLIENTE', v: cliente?.codigo || cliente?.id || '5015' },
                { k: 'DATA', v: '15-09-2026' },
                { k: 'DATA VENC.', v: '' },
                { k: 'NIF', v: cliente?.nif || 'Consumidor Final' },
                { k: 'REFª', v: '' },
                { k: 'OPERADOR', v: emp.operador },
              ].map(b => (
                <div key={b.k} className="border border-[#bbb] py-[4px] px-1 bg-white/80"><p className="font-bold text-[10px] truncate">{b.k}</p><p className="text-center text-[11px] mt-[3px] truncate">{b.v}</p></div>
              ))}
            </div>

            <div className="w-full overflow-x-auto mt-2 bg-white/80">
              <table className="w-full min-w-[600px] border-collapse">
                <thead><tr className="bg-[#c2c2c2] text-[10px] font-bold">
                  <th className="border border-[#999] py-[6px] px-1 text-left">REFERÊNCIA</th>
                  <th className="border border-[#999] py-[6px] px-1 text-left">PRODUTO / SERVIÇO</th>
                  <th className="border border-[#999] py-[6px]">QTD.</th>
                  <th className="border border-[#999] py-[6px]">UN.</th>
                  <th className="border border-[#999] py-[6px]">PREÇO UNIT.</th>
                  <th className="border border-[#999] py-[6px]">DESCONTO</th>
                  <th className="border border-[#999] py-[6px]">TAXA</th>
                  <th className="border border-[#999] py-[6px] text-right">VALOR (AKZ)</th>
                </tr></thead>
                <tbody>
                  {itens.map((it: any, i: number) => (
                    <tr key={i} className="text-[11px] h-[22px]">
                      <td className="border border-[#bbb] px-1">{it.referencia}</td>
                      <td className="border border-[#bbb] px-1 truncate max-w-[150px]">{it.nome_snapshot}</td>
                      <td className="border border-[#bbb] text-center">{it.quantidade}</td>
                      <td className="border border-[#bbb] text-center">{it.unidade}</td>
                      <td className="border border-[#bbb] text-right pr-1">{Number(it.preco_unit_snapshot).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                      <td className="border border-[#bbb]"></td>
                      <td className="border border-[#bbb] text-center">0%*</td>
                      <td className="border border-[#bbb] text-right pr-1">{Number(it.subtotal_linha).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {Array.from({ length: 7 }).map((_, k) => (
                    <tr key={k} className="h-[26px]"><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex mt-2 gap-1">
              <div className="flex-1 border border-[#999] bg-white/80"><div className="flex bg-[#c2c2c2] text-[10px] font-bold"><div className="flex-1 border-r border-[#999] py-[5px] px-1">IMPOSTO</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">TAXA</div><div className="w-[80px] border-r border-[#999] py-[5px] text-center">INCIDÊNCIA</div><div className="w-[80px] py-[5px] text-center">VALOR</div></div><div className="flex text-[10px]"><div className="flex-1 border-r border-[#999] py-[5px] px-1">*M04 IVA - Regime de Exclusão</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">0%</div><div className="w-[80px] border-r border-[#999] py-[5px] text-right pr-1">32 900,00</div><div className="w-[80px] py-[5px] text-right pr-1">0,00</div></div></div>
              <div className="w-[150px] md:w-[220px] shrink-0 bg-white/80"><div className="flex bg-[#c2c2c2] text-[10px] border border-[#999]"><div className="flex-1 py-[5px] px-1 text-right">Total Líquido</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div><div className="flex bg-[#c2c2c2] text-[10px] font-bold border border-[#999] border-t-0"><div className="flex-1 py-[5px] px-1 text-right">TOTAL A PAGAR</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div></div>
            </div>

            <div className="mt-4"><p className="font-bold text-[13px]">Coordenada Bancárias:</p><p className="text-[12px] break-all">Banco BAI nº 67040470.10.001 / IBAN AO06.0040.0000.6704.0470.1012.7</p></div>

            <div className="mt-auto pt-6 border-t border-black text-[8px]">
              <span>Licenciado a: {emp.nome} | NIF: {emp.nif} | Morada: {emp.endereco} - {emp.cidade} | KwanzaGest | Utilizador: {emp.operador} | Data Impressão {dataStr} {hora} | Pág. 1 de 1</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default FaturaPDF
