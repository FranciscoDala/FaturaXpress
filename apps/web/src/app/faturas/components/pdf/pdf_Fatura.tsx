import { useMemo } from 'react'
import { getNumero } from '../../EmitirFaturaPage'

interface Props {
  fatura: any;
  empresa: any;
  cliente: any;
  onClose?: () => void;
  isFullscreen?: boolean;
  setIsFullscreen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const LogoDefault = ({ nome, size = 'small' }: { nome?: string; size?: 'small' | 'large' }) => {
    const inicial = (nome || 'T').charAt(0).toUpperCase()
    if (size === 'large') {
        return (
            <div className="flex flex-col items-center opacity-[0.12]" style={{ fontFamily: "var(--fonte-principal)" }}>
                <div className="w-[550px] h-[550px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[220px]" style={{ fontFamily: "var(--fonte-principal)" }}>{inicial}</div>
            </div>
        )
    }
    return (
        <div className="w-[110px] h-[90px] flex flex-col items-center justify-center shrink-0">
            <div className="w-[70px] h-[70px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[36px]" style={{ fontFamily: "var(--fonte-principal)" }}>{inicial}</div>
            <div className="mt-1 bg-[#1a5ca8] text-white text-[9px] font-bold px-2 py-[2px]" style={{ fontFamily: "var(--fonte-principal)" }}>{(nome || 'TECMICRO').toUpperCase().slice(0, 10)}</div>
        </div>
    )
}

export const FaturaPDF = ({ fatura, empresa, cliente }: Props) => {
    const itensRaw = fatura?.itens || fatura?.items || []

    const { itens, totais } = useMemo(() => {
        const parsed = itensRaw.map((it: any) => {
            const qtd = Number(it.quantidade?? it.qtd?? it.qty?? 1)
            const preco = Number(it.preco_unit_snapshot?? it.preco_unit?? it.preco?? 0)
            const descPerc = Number(it.desconto_perc?? it.desconto?? 0)
            const ivaPerc = Number(it.taxa_iva?? it.iva?? it.iva_percent?? it.taxa?? 0)
            const bruto = qtd * preco
            const vDesc = bruto * (descPerc / 100)
            const base = bruto - vDesc
            const vIva = base * (ivaPerc / 100)
            const total = base + vIva
            return {
                referencia: it.referencia || it.codigo || it.ref || it.sku || '---',
                nome_snapshot: it.nome_snapshot || it.nome || it.designacao || it.descricao || '---',
                quantidade: qtd,
                unidade: it.unidade || it.un || it.unidade_medida || it.unit || 'UN',
                preco_unit_snapshot: preco,
                desconto_perc: descPerc,
                desconto_valor: vDesc,
                taxa_iva: ivaPerc,
                subtotal_base: base,
                valor_iva: vIva,
                subtotal_linha: Number(it.subtotal_linha?? it.subtotal?? total),
            }
        })
        let liquido = 0, totalIva = 0, totalDesc = 0
        const ivaPorTaxa: Record<string, { incidencia: number, valor: number }> = {}
        parsed.forEach((it: any) => {
            liquido += it.subtotal_base
            totalIva += it.valor_iva
            totalDesc += it.desconto_valor
            const k = `${it.taxa_iva}%`
            if (!ivaPorTaxa[k]) ivaPorTaxa[k] = { incidencia: 0, valor: 0 }
            ivaPorTaxa[k].incidencia += it.subtotal_base
            ivaPorTaxa[k].valor += it.valor_iva
        })
        if (Object.keys(ivaPorTaxa).length === 0) ivaPorTaxa['0%'] = { incidencia: liquido, valor: 0 }
        return { itens: parsed, totais: { liquido, iva: totalIva, desconto: totalDesc, pagar: liquido + totalIva, ivaPorTaxa } }
    }, [itensRaw])

    const fmt = (n: number) => Number(n).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const fmtData = (d: any) => d? new Date(d).toLocaleDateString('pt-AO') : '---'
    const fmtDataHora = (d: any) => d? new Date(d).toLocaleString('pt-AO') : '---'

    const emp = {
        nome: empresa?.nome || '',
        nif: empresa?.nif || '',
        endereco: empresa?.endereco || empresa?.morada || '',
        telefone: empresa?.telefone || empresa?.contactos || '',
        email: empresa?.email || '',
        cidade: empresa?.cidade || '',
        logo: empresa?.logo || '',
        banco: empresa?.banco || 'BAI',
        iban: empresa?.iban || '',
        conta: empresa?.conta_bancaria || '',
    }
    const hasLogo =!!emp.logo
    const mask = (v: string) => v && v.trim()!== ''? v : '---'
    const isOficial = fatura?.tipo_documento === 'fatura'

    // QR AGT Angola padrão: NIF*NrFatura*Data*Total*Hash
    const dataEmissao = fatura?.data_emissao || fatura?.created_at
    const qrContent = isOficial
       ? `${emp.nif}*${fatura.numero_fatura}*${dataEmissao? new Date(dataEmissao).toISOString().split('T')[0] : ''}*${Number(fatura.total_geral).toFixed(2)}*${fatura.hash_agt || ''}`
        : `${getNumero(fatura)}|${fatura?.id}`

    const FolhaTela = () => (
        <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] flex flex-col border border-gray-200 overflow-hidden mx-auto" style={{ fontFamily: "var(--fonte-principal)" }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                {hasLogo? <img src={emp.logo} alt="marca" className="w-[650px] h-[650px] object-contain opacity-[0.10]" /> : <LogoDefault nome={emp.nome} size="large" />}
            </div>
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex gap-3">
                    {hasLogo? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <LogoDefault nome={emp.nome} />}
                    <div className="text-[11px] leading-[15px]"><p className="font-bold text-[14px]">{mask(emp.nome)}</p><p>NIF: {mask(emp.nif)}</p><p>Endereço: {mask(emp.endereco)}</p><p>Contactos: {mask(emp.telefone)}</p><p>Email: {mask(emp.email)}</p><p>{mask(emp.cidade)}</p></div>
                </div>

                <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
                    <div className="text-[9px] leading-[13px] max-w-[300px]">
                        <p className="font-bold text-[12px]">{isOficial? 'FACTURA' : 'FACTURA PROFORMA'}</p>
                        <p className="mt-1">Forma Pag: {fatura?.forma_pagamento || 'dinheiro'}</p>
                        <p>Moeda: AKZ</p>
                        {isOficial && <p className="mt-1 break-all"><b>Hash:</b> {fatura?.hash_agt || '---'}</p>}
                        {isOficial && fatura?.hash_agt_anterior && <p className="break-all"><b>Hash Ant:</b> {fatura.hash_agt_anterior.slice(0,30)}...</p>}
                        {isOficial && <p>Comunicado AGT: {fatura?.comunicado_agt? 'Sim' : 'Não'}</p>}
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="text-right leading-[14px]">
                            <p className="font-bold text-[15px]">{getNumero(fatura) || 'PROFORMA'}</p>
                            <p className="text-[#777] text-[11px] mt-1">{isOficial? 'Regime Geral' : 'Sem valor fiscal'}</p>
                            <p className="font-bold text-[12px] mt-1">{isOficial? 'Original' : 'Proforma'}</p>
                            <p className="text-[10px] mt-1">Emissão: {fmtDataHora(dataEmissao)}</p>
                            <p className="text-[10px]">Venc: {fmtData(fatura?.data_vencimento || fatura?.validade_proforma)}</p>
                        </div>
                        <div className="w-[90px] h-[90px] shrink-0 border p-1 bg-white">
                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrContent)}`} alt="QR AGT" className="w-full h-full" />
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex justify-between">
                    <div className="w-[60%] text-[12px] leading-[16px]">
                        <p className="font-bold text-[13px]">Cliente:</p>
                        <p className="font-bold">{cliente?.nome || 'Consumidor Final'}</p>
                        <p>NIF: {cliente?.nif || '999999999'}</p>
                        <p>{cliente?.endereco || ''} - {cliente?.cidade || ''}</p>
                        <p>{cliente?.telefone || ''} | {cliente?.email || ''}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-[#666]">Processado por programa validado 83/AGT/2019 FaturaXpress</p>
                        {fatura?.proforma_origem_id && <p className="text-[9px] text-[#666]">Origem PP: {fatura.proforma_origem_id.slice(0,8)}</p>}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
                    {[
                        { k: 'CÓD. CLIENTE', v: cliente?.codigo || cliente?.id?.slice(0,8) || '---' },
                        { k: 'DATA EMISSÃO', v: fmtData(dataEmissao) },
                        { k: 'DATA VENC.', v: fmtData(fatura?.data_vencimento) },
                        { k: 'NIF CLIENTE', v: cliente?.nif || '---' },
                        { k: 'VALIDADE PP', v: fmtData(fatura?.validade_proforma) },
                        { k: 'OPERADOR', v: empresa?.nome?.slice(0,10) || 'Sistema' },
                    ].map(b => (
                        <div key={b.k} className="border border-[#bbb] py-[4px] px-1 bg-[rgba(255,255,255,0.40)]"><p className="font-bold text-[8px] truncate">{b.k}</p><p className="text-center text-[10px] mt-[2px] truncate">{b.v}</p></div>
                    ))}
                </div>

                <div className="w-full mt-2">
                    <table className="w-full border-collapse">
                        <colgroup><col style={{ width: '14%' }} /><col style={{ width: '32%' }} /><col style={{ width: '7%' }} /><col style={{ width: '6%' }} /><col style={{ width: '13%' }} /><col style={{ width: '10%' }} /><col style={{ width: '6%' }} /><col style={{ width: '12%' }} /></colgroup>
                        <thead><tr className="bg-[rgba(194,194,194,0.65)] text-[9px] font-bold"><th className="border border-[#999] py-[6px] px-1 text-left">REFERÊNCIA</th><th className="border border-[#999] py-[6px] px-1 text-left">PRODUTO / SERVIÇO</th><th className="border border-[#999] py-[6px]">QTD.</th><th className="border border-[#999] py-[6px]">UN.</th><th className="border border-[#999] py-[6px]">PREÇO UNIT.</th><th className="border border-[#999] py-[6px]">DESCONTO</th><th className="border border-[#999] py-[6px]">TAXA</th><th className="border border-[#999] py-[6px] text-right">VALOR (AKZ)</th></tr></thead>
                        <tbody>
                            {itens.map((it: any, i: number) => (
                                <tr key={i} className="text-[10px] h-[24px]"><td className="border border-[#bbb] px-1 bg-[rgba(255,255,255,0.40)] truncate">{it.referencia}</td><td className="border border-[#bbb] px-1 bg-[rgba(255,255,255,0.40)] truncate">{it.nome_snapshot}</td><td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)]">{it.quantidade}</td><td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)]">{it.unidade}</td><td className="border border-[#bbb] text-right pr-1 bg-[rgba(255,255,255,0.40)]">{fmt(it.preco_unit_snapshot)}</td><td className="border border-[#bbb] text-right pr-1 bg-[rgba(255,255,255,0.40)]">{it.desconto_perc > 0? fmt(it.desconto_valor) : ''}</td><td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)]">{it.taxa_iva}%{it.taxa_iva === 0? '*' : ''}</td><td className="border border-[#bbb] text-right pr-1 bg-[rgba(255,255,255,0.40)] font-semibold">{fmt(it.subtotal_linha)}</td></tr>
                            ))}
                            {Array.from({ length: Math.max(0, 8 - itens.length) }).map((_, k) => (<tr key={k} className="h-[26px]"><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td></tr>))}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-2 gap-1">
                    <div className="flex-1 border border-[#999]">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[9px] font-bold"><div className="flex-1 border-r border-[#999] py-[5px] px-1">IMPOSTO</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center">TAXA</div><div className="w-[80px] border-r border-[#999] py-[5px] text-center">INCIDÊNCIA</div><div className="w-[80px] py-[5px] text-center">VALOR</div></div>
                        {Object.entries(totais.ivaPorTaxa).map(([taxa, d]: any) => (
                            <div key={taxa} className="flex text-[9px]"><div className="flex-1 border-r border-[#999] py-[5px] px-1 bg-[rgba(255,255,255,0.40)]">{Number(taxa.replace('%', '')) === 0? '*M04 Isento' : `IVA ${taxa}`}</div><div className="w-[50px] border-r border-[#999] py-[5px] text-center bg-[rgba(255,255,255,0.40)]">{taxa}</div><div className="w-[80px] border-r border-[#999] py-[5px] text-right pr-1 bg-[rgba(255,255,255,0.40)]">{fmt(d.incidencia)}</div><div className="w-[80px] py-[5px] text-right pr-1 bg-[rgba(255,255,255,0.40)]">{fmt(d.valor)}</div></div>
                        ))}
                    </div>
                    <div className="w-[240px] shrink-0">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[10px] border border-[#999]"><div className="flex-1 py-[6px] px-1 text-right">Total Líquido</div><div className="w-[90px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[6px] text-right pr-1">{fmt(totais.liquido)}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[10px] border border-[#999] border-t-0"><div className="flex-1 py-[6px] px-1 text-right">Total Desconto</div><div className="w-[90px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[6px] text-right pr-1">{fmt(totais.desconto)}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[10px] border border-[#999] border-t-0"><div className="flex-1 py-[6px] px-1 text-right">Total IVA</div><div className="w-[90px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[6px] text-right pr-1">{fmt(totais.iva)}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.75)] text-[11px] font-bold border border-[#999] border-t-0"><div className="flex-1 py-[6px] px-1 text-right">TOTAL A PAGAR (AKZ)</div><div className="w-[90px] bg-[rgba(255,255,255,0.65)] border-l border-[#999] py-[6px] text-right pr-1 font-bold">{fmt(totais.pagar)}</div></div>
                    </div>
                </div>

                <div className="mt-4 bg-[rgba(255,255,255,0.40)] p-1 text-[10px]"><p className="font-bold">Coordenadas Bancárias:</p><p>Banco {mask(emp.banco)} {emp.conta? `nº ${emp.conta} / ` : ''}IBAN {emp.iban? emp.iban : '---'}</p></div>
                {fatura?.observacoes && <div className="mt-2 text-[10px]"><b>Observações:</b> {fatura.observacoes}</div>}
                <div className="mt-auto border-t border-black flex justify-between items-center bg-[rgba(255,255,255,0.40)] px-1 pt-3"><span className="text-[9px] font-bold">Licenciado a: {mask(emp.nome)} | NIF: {mask(emp.nif)} | {mask(emp.endereco)} | Hash AGT validado</span><span className="text-[9px] font-bold">Pág. 1 de 1</span></div>
            </div>
        </div>
    )

    return (
        <>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap');
              #fatura-pdf-wrapper{display:flex;justify-content:center;width:100%;overflow-x:hidden;background:transparent}
              #fatura-pdf{transform-origin:top center}
              @media (max-width:768px){
                #fatura-pdf-wrapper{overflow-x:hidden!important;width:100%!important}
                #fatura-pdf{transform:scale(0.45);transform-origin:top center;margin-bottom:-55%;width:210mm!important;min-width:210mm!important}
              }
            `}</style>
            <div id="fatura-pdf-wrapper">
                <FolhaTela />
            </div>
        </>
    )
}
export default FaturaPDF
