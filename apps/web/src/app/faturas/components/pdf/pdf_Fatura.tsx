import { useState } from 'react'
import { getNumero } from '../../EmitirFaturaPage'

interface Props { fatura: any; empresa: any; cliente: any; onClose?: () => void }

const LogoDefault = ({ nome, size = 'small' }: { nome?: string; size?: 'small' | 'large' }) => {
  const inicial = (nome || 'T').charAt(0).toUpperCase()
  if (size === 'large') {
    return (
      <div className="flex flex-col items-center opacity-[0.05]" style={{fontFamily:"var(--fonte-principal)"}}>
        <div className="w-[550px] h-[550px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[220px]" style={{fontFamily:"var(--fonte-principal)"}}>{inicial}</div>
      </div>
    )
  }
  return (
    <div className="w-[110px] h-[90px] flex flex-col items-center justify-center shrink-0">
      <div className="w-[70px] h-[70px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[36px]" style={{fontFamily:"var(--fonte-principal)"}}>{inicial}</div>
      <div className="mt-1 bg-[#1a5ca8] text-white text-[9px] font-bold px-2 py-[2px]" style={{fontFamily:"var(--fonte-principal)"}}>{(nome || 'TECMICRO').toUpperCase().slice(0,10)}</div>
    </div>
  )
}

export const FaturaPDF = ({ fatura, empresa, cliente, onClose }: Props) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showBaixar, setShowBaixar] = useState(false)

  const itensRaw = fatura?.itens || fatura?.items || []
  const itens = itensRaw.map((it:any) => ({
    referencia: it.referencia || it.codigo || it.ref || it.sku || '***********',
    nome_snapshot: it.nome_snapshot || it.nome || it.designacao || it.descricao || '***********',
    quantidade: it.quantidade?? it.qtd?? it.qty?? 1,
    unidade: it.unidade || it.un || it.unidade_medida || it.unit || 'UN',
    preco_unit_snapshot: it.preco_unit_snapshot?? it.preco_unit?? it.preco?? 0,
    subtotal_linha: it.subtotal_linha?? it.subtotal?? it.total?? 0,
  }))

  const emp = {
    nome: empresa?.nome || '',
    nif: empresa?.nif || '',
    endereco: empresa?.endereco || empresa?.morada || '',
    telefone: empresa?.telefone || empresa?.contactos || '',
    email: empresa?.email || '',
    cidade: empresa?.cidade || '',
    logo: empresa?.logo || '',
    operador: empresa?.operador || '',
    banco: empresa?.banco || 'BAI',
    iban: empresa?.iban || '',
    conta: empresa?.conta_bancaria || '',
  }
  const hasLogo =!!emp.logo
  const mask = (v: string) => v && v.trim()!== ''? v : '***********'

  const buildPrintHTML = () => {
    const logoHTML = hasLogo
    ? `<img src="${emp.logo}" style="width:110px;height:90px;object-fit:contain" />`
      : `<div style="width:70px;height:70px;background:#1a5ca8;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:36px;font-family:'Zalando Sans Expanded',sans-serif">${(emp.nome||'T').charAt(0)}</div>`

    const watermarkHTML = hasLogo
    ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:650px;height:650px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0">
           <img src="${emp.logo}" style="width:100%;height:100%;object-fit:contain;opacity:0.05" />
         </div>`
      : ''

    const itensRows = itens.map((it:any) => `
      <tr style="height:22px;font-size:11px">
        <td style="border:1px solid #bbb;padding:2px 4px;font-family:'Zalando Sans Expanded',sans-serif">${it.referencia}</td>
        <td style="border:1px solid #bbb;padding:2px 4px;font-family:'Zalando Sans Expanded',sans-serif">${it.nome_snapshot}</td>
        <td style="border:1px solid #bbb;text-align:center;font-family:'Zalando Sans Expanded',sans-serif">${it.quantidade}</td>
        <td style="border:1px solid #bbb;text-align:center;font-family:'Zalando Sans Expanded',sans-serif">${it.unidade}</td>
        <td style="border:1px solid #bbb;text-align:right;padding-right:4px;font-family:'Zalando Sans Expanded',sans-serif">${Number(it.preco_unit_snapshot).toLocaleString('pt-AO',{minimumFractionDigits:2})}</td>
        <td style="border:1px solid #bbb"></td>
        <td style="border:1px solid #bbb;text-align:center;font-family:'Zalando Sans Expanded',sans-serif">0%*</td>
        <td style="border:1px solid #bbb;text-align:right;padding-right:4px;font-family:'Zalando Sans Expanded',sans-serif">${Number(it.subtotal_linha).toLocaleString('pt-AO',{minimumFractionDigits:2})}</td>
      </tr>
    `).join('')

    const emptyRows = Array.from({length:8}).map(()=>`<tr style="height:26px"><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td><td style="border:1px solid #bbb"></td></tr>`).join('')

    return `
      <div style="width:210mm;min-height:297mm;padding:10mm;font-family:'Zalando Sans Expanded',sans-serif;font-size:12px;color:black;background:white;position:relative;box-sizing:border-box;overflow:hidden">
        ${watermarkHTML}
        <div style="position:relative;z-index:1;display:flex;flex-direction:column;min-height:277mm;font-family:'Zalando Sans Expanded',sans-serif">
          <div style="display:flex;gap:12px">
            ${logoHTML}
            <div style="font-size:12px;line-height:16px;font-family:'Zalando Sans Expanded',sans-serif">
              <div style="font-weight:700;font-size:15px">${mask(emp.nome)}</div>
              <div>NIF: ${mask(emp.nif)}</div>
              <div>Endereço: ${mask(emp.endereco)}</div>
              <div>Contactos: ${mask(emp.telefone)}</div>
              <div>Email: ${mask(emp.email)}</div>
              <div>${mask(emp.cidade)}</div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:24px;border-bottom:1px dotted #ccc;padding-bottom:12px">
            <div></div>
            <div style="display:flex;gap:12px">
              <div style="text-align:right;line-height:15px;font-family:'Zalando Sans Expanded',sans-serif">
                <div style="font-weight:700;font-size:15px">${getNumero(fatura) || 'PROFORMA 2026/00007'}</div>
                <div style="color:#777;font-size:12px;margin-top:2px">Regime de Exclusão</div>
                <div style="font-weight:700;font-size:13px">Original</div>
              </div>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${fatura?.id || 'PROFORMA'}" style="width:72px;height:72px" />
            </div>
          </div>
          <div style="margin-top:24px;display:flex;justify-content:flex-end">
            <div style="width:280px;text-align:right;font-size:13px;line-height:18px;font-family:'Zalando Sans Expanded',sans-serif">
              <div style="font-weight:700">${cliente?.nome || '***********'}</div>
              <div style="margin-top:8px">${cliente?.endereco || '***********'}</div>
              <div>${cliente?.cidade || '***********'}</div>
            </div>
          </div>
          <div style="margin-top:24px;font-size:9px;color:#666">Processado por programa validado 83/AGT/2019 KwanzaGest</div>
          <div style="margin-top:8px;display:grid;grid-template-columns:90px 95px 95px 125px 115px 1fr;gap:5px">
            <div style="border:1px solid #bbb;padding:4px"><div style="font-weight:700;font-size:10px">CÓD. CLIENTE</div><div style="text-align:center;font-size:11px;margin-top:3px">${cliente?.codigo || '***********'}</div></div>
            <div style="border:1px solid #bbb;padding:4px"><div style="font-weight:700;font-size:10px">DATA</div><div style="text-align:center;font-size:11px;margin-top:3px">15-09-2026</div></div>
            <div style="border:1px solid #bbb;padding:4px"><div style="font-weight:700;font-size:10px">DATA VENC.</div><div style="text-align:center;font-size:11px;margin-top:3px">***********</div></div>
            <div style="border:1px solid #bbb;padding:4px"><div style="font-weight:700;font-size:10px">NIF</div><div style="text-align:center;font-size:11px;margin-top:3px">${cliente?.nif || 'Consumidor Final'}</div></div>
            <div style="border:1px solid #bbb;padding:4px"><div style="font-weight:700;font-size:10px">REFª</div><div style="text-align:center;font-size:11px;margin-top:3px">***********</div></div>
            <div style="border:1px solid #bbb;padding:4px"><div style="font-weight:700;font-size:10px">OPERADOR</div><div style="text-align:center;font-size:11px;margin-top:3px">${mask(emp.operador)}</div></div>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;table-layout:fixed">
            <thead><tr style="background:#c2c2c2;font-size:10px;font-weight:700">
              <th style="border:1px solid #999;padding:6px 4px;text-align:left;width:18%;font-family:'Zalando Sans Expanded',sans-serif">REFERÊNCIA</th>
              <th style="border:1px solid #999;padding:6px 4px;text-align:left;font-family:'Zalando Sans Expanded',sans-serif">PRODUTO / SERVIÇO</th>
              <th style="border:1px solid #999;padding:6px;width:8%;font-family:'Zalando Sans Expanded',sans-serif">QTD.</th>
              <th style="border:1px solid #999;padding:6px;width:6%;font-family:'Zalando Sans Expanded',sans-serif">UN.</th>
              <th style="border:1px solid #999;padding:6px;width:15%;font-family:'Zalando Sans Expanded',sans-serif">PREÇO UNIT.</th>
              <th style="border:1px solid #999;padding:6px;width:10%;font-family:'Zalando Sans Expanded',sans-serif">DESCONTO</th>
              <th style="border:1px solid #999;padding:6px;width:8%;font-family:'Zalando Sans Expanded',sans-serif">TAXA</th>
              <th style="border:1px solid #999;padding:6px;width:14%;text-align:right;font-family:'Zalando Sans Expanded',sans-serif">VALOR (AKZ)</th>
            </tr></thead>
            <tbody>${itensRows}${emptyRows}</tbody>
          </table>
          <div style="display:flex;margin-top:8px;gap:4px">
            <div style="flex:1;border:1px solid #999"><div style="display:flex;background:#c2c2c2;font-size:10px;font-weight:700"><div style="flex:1;border-right:1px solid #999;padding:5px 4px">IMPOSTO</div><div style="width:50px;border-right:1px solid #999;padding:5px;text-align:center">TAXA</div><div style="width:80px;border-right:1px solid #999;padding:5px;text-align:center">INCIDÊNCIA</div><div style="width:80px;padding:5px;text-align:center">VALOR</div></div><div style="display:flex;font-size:10px"><div style="flex:1;border-right:1px solid #999;padding:5px 4px">*M04 IVA - Regime de Exclusão</div><div style="width:50px;border-right:1px solid #999;padding:5px;text-align:center">0%</div><div style="width:80px;border-right:1px solid #999;padding:5px;text-align:right">32 900,00</div><div style="width:80px;padding:5px;text-align:right">0,00</div></div></div>
            <div style="width:220px"><div style="display:flex;background:#c2c2c2;font-size:10px;border:1px solid #999"><div style="flex:1;padding:5px 4px;text-align:right">Total Líquido</div><div style="width:80px;background:white;border-left:1px solid #999;padding:5px;text-align:right">32 900,00</div></div><div style="display:flex;background:#c2c2c2;font-size:10px;font-weight:700;border:1px solid #999;border-top:0"><div style="flex:1;padding:5px 4px;text-align:right">TOTAL A PAGAR</div><div style="width:80px;background:white;border-left:1px solid #999;padding:5px;text-align:right">32 900,00</div></div></div>
          </div>
          <div style="margin-top:16px"><div style="font-weight:700;font-size:13px">Coordenada Bancárias:</div><div style="font-size:12px">Banco ${mask(emp.banco)} ${emp.conta? `nº ${emp.conta} / `: ''}IBAN ${emp.iban? emp.iban : '***********'}</div></div>
          <div style="margin-top:auto;padding-top:24px;border-top:1px solid black;font-size:8px">Licenciado a: ${mask(emp.nome)} | NIF: ${mask(emp.nif)} | Morada: ${mask(emp.endereco)} | Pág. 1 de 1</div>
        </div>
      </div>
    `
  }

  const handlePrint = () => {
    const html = buildPrintHTML()
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>${getNumero(fatura)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap');
            @page{size:A4;margin:0}
            body{margin:0;padding:0;background:white;font-family:'Zalando Sans Expanded',sans-serif}
            *{ -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; font-family:'Zalando Sans Expanded', sans-serif!important; font-optical-sizing:auto; }
            img{ -webkit-print-color-adjust:exact!important; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `)
    win.document.close()
    win.onload = () => setTimeout(()=>{ win.focus(); win.print() }, 1000)
  }

  const handleBaixarPDF = () => { setShowBaixar(false); handlePrint() }

  const Toolbar = ({ overlay = false }: { overlay?: boolean }) => (
    <div className={`no-print w-full bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-4 py-2 ${overlay? 'fixed top-0 left-0 z-[100] shadow-md' : 'sticky top-0 z-50'}`} style={{fontFamily:"var(--fonte-principal)"}}>
      <div className="flex items-center gap-2">
        <button onClick={() => overlay? setIsFullscreen(false) : onClose?.()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-[20px] font-bold">✕</button>
        <div className="relative flex items-center">
          <button onClick={handleBaixarPDF} className="bg-[#137333] hover:bg-[#0f5c29] text-white px-4 py-[8px] rounded-l-md flex items-center gap-2 text-[14px] font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Baixar
          </button>
          <button onClick={() => setShowBaixar(!showBaixar)} className="bg-[#137333] hover:bg-[#0f5c29] text-white px-2 py-[8px] rounded-r-md border-l border-[#0f5c29]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {showBaixar && (
            <div className="absolute top-[38px] left-0 bg-white border border-gray-200 shadow-lg rounded-md w-[200px] z-50">
              <button onClick={handleBaixarPDF} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px]">Baixar PDF</button>
              <button onClick={() => { setShowBaixar(false); handlePrint() }} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-[14px]">Imprimir</button>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="1.8"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
      </button>
    </div>
  )

  const FolhaTela = () => (
    <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] flex flex-col border border-gray-300 overflow-hidden mx-auto" style={{fontFamily:"var(--fonte-principal)"}}>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        {hasLogo? <img src={emp.logo} alt="marca" className="w-[550px] h-[550px] object-contain opacity-[0.05]" /> : <LogoDefault nome={emp.nome} size="large" />}
      </div>
      <div className="relative z-10 flex flex-col flex-1" style={{fontFamily:"var(--fonte-principal)"}}>
        <div className="flex gap-3">
          {hasLogo? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <LogoDefault nome={emp.nome} />}
          <div className="text-[12px] leading-[16px]" style={{fontFamily:"var(--fonte-principal)"}}>
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
            <div className="text-right leading-[15px]" style={{fontFamily:"var(--fonte-principal)"}}>
              <p className="font-bold text-[15px]">{getNumero(fatura) || 'PROFORMA 2026/00007'}</p>
              <p className="text-[#777] text-[12px] mt-1">Regime de Exclusão</p>
              <p className="font-bold text-[13px]">Original</p>
            </div>
            <div className="w-[72px] h-[72px] shrink-0"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${fatura?.id || 'PROFORMA'}`} alt="qr" /></div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <div className="w-[280px] text-[13px] leading-[18px] text-right" style={{fontFamily:"var(--fonte-principal)"}}>
            <p className="font-bold">{cliente?.nome || '***********'}</p>
            <p className="mt-2">{cliente?.endereco || '***********'}</p>
            <p>{cliente?.cidade || '***********'}</p>
          </div>
        </div>
        <div className="mt-6 text-[9px] text-[#666]" style={{fontFamily:"var(--fonte-principal)"}}>Processado por programa validado 83/AGT/2019 KwanzaGest</div>
        <div className="mt-2 grid grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
          {[
            { k: 'CÓD. CLIENTE', v: cliente?.codigo || '***********' },
            { k: 'DATA', v: '15-09-2026' },
            { k: 'DATA VENC.', v: '***********' },
            { k: 'NIF', v: cliente?.nif || '00643232LS045' },
            { k: 'REFª', v: '***********' },
            { k: 'OPERADOR', v: mask(emp.operador) },
          ].map(b => (
            <div key={b.k} className="border border-[#bbb] py-[4px] px-1 bg-white/80"><p className="font-bold text-[10px] truncate" style={{fontFamily:"var(--fonte-principal)"}}>{b.k}</p><p className="text-center text-[11px] mt-[3px] truncate" style={{fontFamily:"var(--fonte-principal)"}}>{b.v}</p></div>
          ))}
        </div>
        <div className="w-full mt-2 bg-white/80">
          <table className="w-full border-collapse table-fixed">
            <thead><tr className="bg-[#c2c2c2] text-[10px] font-bold" style={{fontFamily:"var(--fonte-principal)"}}><th className="border border-[#999] py-[6px] px-1 text-left w-[18%]">REFERÊNCIA</th><th className="border border-[#999] py-[6px] px-1 text-left">PRODUTO / SERVIÇO</th><th className="border border-[#999] py-[6px] w-[8%]">QTD.</th><th className="border border-[#999] py-[6px] w-[6%]">UN.</th><th className="border border-[#999] py-[6px] w-[15%]">PREÇO UNIT.</th><th className="border border-[#999] py-[6px] w-[10%]">DESCONTO</th><th className="border border-[#999] py-[6px] w-[8%]">TAXA</th><th className="border border-[#999] py-[6px] w-[14%] text-right">VALOR (AKZ)</th></tr></thead>
            <tbody>
              {itens.map((it: any, i: number) => (
                <tr key={i} className="text-[11px] h-[22px]" style={{fontFamily:"var(--fonte-principal)"}}><td className="border border-[#bbb] px-1 truncate">{it.referencia}</td><td className="border border-[#bbb] px-1 truncate">{it.nome_snapshot}</td><td className="border border-[#bbb] text-center">{it.quantidade}</td><td className="border border-[#bbb] text-center">{it.unidade}</td><td className="border border-[#bbb] text-right pr-1">{Number(it.preco_unit_snapshot).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td><td className="border border-[#bbb]"></td><td className="border border-[#bbb] text-center">0%*</td><td className="border border-[#bbb] text-right pr-1">{Number(it.subtotal_linha).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td></tr>
              ))}
              {Array.from({ length: 8 }).map((_, k) => (<tr key={k} className="h-[26px]"><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td><td className="border border-[#bbb]"></td></tr>))}
            </tbody>
          </table>
        </div>
        <div className="flex mt-2 gap-1">
          <div className="flex-1 border border-[#999] bg-white/80"><div className="flex bg-[#c2c2c2] text-[10px] font-bold"><div className="flex-1 border-r border-[#999] py-[5px] px-1">IMPOSTO</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">TAXA</div><div className="w-[80px] border-r border-[#999] py-[5px] text-center">INCIDÊNCIA</div><div className="w-[80px] py-[5px] text-center">VALOR</div></div><div className="flex text-[10px]"><div className="flex-1 border-r border-[#999] py-[5px] px-1">*M04 IVA - Regime de Exclusão</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">0%</div><div className="w-[80px] border-r border-[#999] py-[5px] text-right pr-1">32 900,00</div><div className="w-[80px] py-[5px] text-right pr-1">0,00</div></div></div>
          <div className="w-[220px] shrink-0 bg-white/80"><div className="flex bg-[#c2c2c2] text-[10px] border border-[#999]"><div className="flex-1 py-[5px] px-1 text-right">Total Líquido</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div><div className="flex bg-[#c2c2c2] text-[10px] font-bold border border-[#999] border-t-0"><div className="flex-1 py-[5px] px-1 text-right">TOTAL A PAGAR</div><div className="w-[80px] bg-white border-l border-[#999] py-[5px] text-right pr-1">32 900,00</div></div></div>
        </div>
        <div className="mt-4" style={{fontFamily:"var(--fonte-principal)"}}>
          <p className="font-bold text-[13px]">Coordenada Bancárias:</p>
          <p className="text-[12px] break-all">Banco {mask(emp.banco)} {emp.conta? `nº ${emp.conta} / `: ''}IBAN {emp.iban? emp.iban : '***********'}</p>
        </div>
        <div className="mt-auto pt-6 border-t border-black text-[8px]" style={{fontFamily:"var(--fonte-principal)"}}><span>Licenciado a: {mask(emp.nome)} | NIF: {mask(emp.nif)} | Morada: {mask(emp.endereco)} | Pág. 1 de 1</span></div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap');
        #fatura-pdf-wrapper { display:flex; justify-content:center; background:white; width:100%; overflow:hidden; font-family:var(--fonte-principal); }
        #fatura-pdf { transform-origin: top center; font-family:var(--fonte-principal); }
        @media (max-width: 768px) { #fatura-pdf { transform: scale(0.46); margin-bottom: -620px; width:210mm!important; min-width:210mm!important; } }
        @media (min-width: 769px) and (max-width: 1024px) { #fatura-pdf { transform: scale(0.72); margin-bottom: -350px; } }
      `}</style>

      <Toolbar />
      <div id="fatura-pdf-wrapper" className="bg-white p-0 md:p-6"><FolhaTela /></div>

      {isFullscreen && (
        <div className="fixed inset-0 bg-white z-[100] overflow-auto no-print">
          <Toolbar overlay={true} />
          <div className="pt-[56px] bg-[#f8f9fa] min-h-screen flex justify-center p-4"><FolhaTela /></div>
        </div>
      )}
    </>
  )
}

export default FaturaPDF
