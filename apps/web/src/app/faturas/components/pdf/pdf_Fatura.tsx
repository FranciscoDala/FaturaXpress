import { useMemo } from 'react'
import { getNumero, isNotaCredito } from '../../page'

interface Props {
    fatura: any;
    empresa: any;
    cliente?: any | null;
    onClose?: () => void;
    isFullscreen?: boolean;
    setIsFullscreen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["ver_faturas", "baixar_fatura"],
    rh: [],
    recepcao: ["ver_faturas"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
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

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeBaixar = funcionarioLogado? temPermissao(cargoAtual, 'baixar_fatura') || cargoAtual === 'admin' : true

    const clienteSafe = cliente || {
        nome: fatura?.cliente_nome || 'Consumidor Final',
        nif: fatura?.cliente_nif || '999999999',
        endereco: fatura?.cliente_endereco || '',
        cidade: fatura?.cliente_cidade || '',
        telefone: fatura?.cliente_telefone || '',
        email: fatura?.cliente_email || '',
        codigo: fatura?.cliente_id?.slice(0, 8) || 'AVULSO',
        id: fatura?.cliente_id || null
    }

    const { itens, totais } = useMemo(() => {
        const parsed = itensRaw.map((it: any) => {
            const qtd = Number(it.quantidade?? it.qtd?? it.qty?? 1)
            const preco = Number(it.preco_unit_snapshot?? it.preco_unit?? it.preco?? 0)
            const descPerc = Number(it.desconto_perc?? it.desconto?? 0)
            let ivaPerc: number
            if (it.iva_percent!== undefined && it.iva_percent!== null) ivaPerc = Number(it.iva_percent)
            else if (it.taxa_iva!== undefined && it.taxa_iva!== null) ivaPerc = Number(it.taxa_iva)
            else if (it.iva!== undefined && it.iva!== null) ivaPerc = Number(it.iva)
            else ivaPerc = 0

            const bruto = qtd * preco
            const vDesc = bruto * (descPerc / 100)
            const base = bruto - vDesc
            const vIva = ivaPerc > 0? base * (ivaPerc / 100) : 0
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
                motivo_isencao: it.motivo_isencao || (ivaPerc === 0? 'M04 - Isento' : null)
            }
        })
        let liquido = 0, totalIva = 0, totalDesc = 0
        const ivaPorTaxa: Record<string, { incidencia: number, valor: number }> = {}
        parsed.forEach((it: any) => {
            liquido += it.subtotal_base
            totalIva += it.valor_iva
            totalDesc += it.desconto_valor
            const isIsento = it.taxa_iva === 0
            const k = isIsento? 'Isento' : `${it.taxa_iva}%`
            if (!ivaPorTaxa[k]) ivaPorTaxa[k] = { incidencia: 0, valor: 0 }
            ivaPorTaxa[k].incidencia += it.subtotal_base
            ivaPorTaxa[k].valor += it.valor_iva
        })
        if (Object.keys(ivaPorTaxa).length === 0) ivaPorTaxa['Isento'] = { incidencia: liquido, valor: 0 }
        return { itens: parsed, totais: { liquido, iva: totalIva, desconto: totalDesc, pagar: liquido + totalIva, ivaPorTaxa } }
    }, [itensRaw])

    const fmt = (n: number) => Number(n).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const fmtData = (d: any) => d? new Date(d).toLocaleDateString('pt-AO') : '---'
    const fmtDataHora = (d: any) => d? new Date(d).toLocaleString('pt-AO') : '---'

    const emp = {
        nome: empresa?.nome || empresa?.companyName || '',
        nif: empresa?.nif || '',
        endereco: empresa?.endereco || empresa?.morada || empresa?.address || '',
        telefone: empresa?.telefone || empresa?.contactos || empresa?.phone || '',
        email: empresa?.email || '',
        cidade: empresa?.cidade || empresa?.city || '',
        logo: empresa?.logo_url || empresa?.image_url || empresa?.logo || '',
        logo_url: empresa?.logo_url || empresa?.image_url || '',
        banco1: empresa?.banco1 || '',
        banco2: empresa?.banco2 || '',
        iban: empresa?.iban || '',
        iban2: empresa?.iban2 || '',
        conta: empresa?.conta_bancaria || '',
    }
    const hasLogo =!!emp.logo && emp.logo.trim()!== ''
    const mask = (v: string) => v && v.trim()!== ''? v : '---'
    const isOficial = fatura?.tipo_documento === 'fatura'
    const isNC = isNotaCredito(fatura)

    const dataEmissao = fatura?.data_emissao || fatura?.created_at
    const numeroDoc = isNC? fatura.numero_nota_credito : fatura?.numero_fatura || getNumero(fatura)
    const dataISO = dataEmissao? new Date(dataEmissao).toISOString().split('T')[0] : ''
    const tipoDoc = isNC? 'NC' : 'FT'
    const nifCliente = clienteSafe?.nif || '999999999'
    const totalGeral = Number(fatura?.total_geral || totais.pagar || 0).toFixed(2)
    const totalIva = Number(fatura?.total_iva || totais.iva || 0).toFixed(2)
    const totalBase = Number(fatura?.subtotal || totais.liquido || 0).toFixed(2)

    const qrContent = (isOficial || isNC)
? `A:${(emp.nif || '').toString().padStart(10, '0')}*B:${nifCliente}*C:AO*D:${tipoDoc}*E:${numeroDoc}*F:${dataISO}*G:${totalGeral}*H:${fatura.hash_agt || ''}*I1:AO*J1:${(emp.endereco || 'Luanda').slice(0, 35)}*L1:${emp.cidade || 'Luanda'}*N:${totalIva}*O:${totalBase}*Q:${fatura.hash_agt_anterior || ''}`
        : `${getNumero(fatura)}|${fatura?.id}`

    const tituloDoc = isNC? 'NOTA DE CRÉDITO' : isOficial? 'FACTURA' : 'FACTURA PROFORMA'

    const sigla1 = emp.banco1? emp.banco1.split('-')[0].trim() : ''
    const sigla2 = emp.banco2? emp.banco2.split('-')[0].trim() : ''

    const FolhaTela = () => (
        <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] flex flex-col border border-gray-200 overflow-hidden mx-auto" style={{ fontFamily: "var(--fonte-principal)" }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                {hasLogo? <img src={emp.logo_url} alt="marca" className="w-[650px] h-[650px] object-contain opacity-[0.10]" /> : <LogoDefault nome={emp.nome} size="large" />}
            </div>
            {!podeBaixar && (
                <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
                    <p className="text-[80px] font-black text-black/[0.06] rotate-[-25deg] tracking-widest">SÓ LEITURA</p>
                </div>
            )}
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex gap-3">
                    {hasLogo? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <LogoDefault nome={emp.nome} />}
                    <div className="text-[11px] leading-[15px]"><p className="font-bold text-[14px]">{mask(emp.nome)}</p><p>NIF: {mask(emp.nif)}</p><p>Endereço: {mask(emp.endereco)}</p><p>Contactos: {mask(emp.telefone)}</p><p>Email: {mask(emp.email)}</p><p>{mask(emp.cidade)}</p></div>
                </div>

                <div className={`flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3 ${isNC? 'bg-[#FFF0F0]' : ''}`}>
                    <div className="text-[9px] leading-[13px] max-w-[300px]">
                        <p className={`font-bold text-[12px] ${isNC? 'text-red-600' : ''}`}>{tituloDoc}</p>
                        <p className="mt-1">Forma Pag: {fatura?.forma_pagamento || 'dinheiro'}</p>
                        <p>Moeda: AKZ</p>
                        {isNC && <p className="mt-1"><b>Motivo:</b> {fatura?.motivo_credito || '---'}</p>}
                        {isNC && fatura?.fatura_origem_id && <p><b>Ref FT:</b> {fatura.fatura_origem_id.slice(0, 8)}</p>}
                        {(isOficial || isNC) && <p className="mt-1 break-all"><b>Hash:</b> {fatura?.hash_agt || '---'}</p>}
                        {(isOficial || isNC) && fatura?.hash_agt_anterior && <p className="break-all"><b>Hash Ant:</b> {fatura.hash_agt_anterior.slice(0, 30)}...</p>}
                        {(isOficial || isNC) && <p>Comunicado AGT: {fatura?.comunicado_agt? 'Sim' : 'Não'}</p>}
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="text-right leading-[14px]">
                            <p className={`font-bold text-[15px] ${isNC? 'text-red-600' : ''}`}>{numeroDoc || 'PROFORMA'}</p>
                            <p className="text-[#777] text-[11px] mt-1">{isNC? 'Anula FT' : isOficial? 'Regime Geral' : 'Sem valor fiscal'}</p>
                            <p className="font-bold text-[12px] mt-1">{isNC? 'CÓPIA NC' : isOficial? 'ORIGINAL' : 'PROFORMA'}</p>
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
                        <p className="font-bold">{clienteSafe?.nome || 'Consumidor Final'}</p>
                        <p>NIF: {clienteSafe?.nif || '999999999'}</p>
                        <p>{clienteSafe?.endereco || ''} - {clienteSafe?.cidade || ''}</p>
                        <p>{clienteSafe?.telefone || ''} | {clienteSafe?.email || ''}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-[#666]">Processado por programa validado 83/AGT/2019 FaturaXpress</p>
                        {fatura?.proforma_origem_id && <p className="text-[9px] text-[#666]">Origem PP: {fatura.proforma_origem_id.slice(0, 8)}</p>}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
                    {[
                        { k: 'CÓD. CLIENTE', v: clienteSafe?.codigo || clienteSafe?.id?.slice(0, 8) || 'AVULSO' },
                        { k: 'DATA EMISSÃO', v: fmtData(dataEmissao) },
                        { k: 'DATA VENC.', v: fmtData(fatura?.data_vencimento) },
                        { k: 'NIF CLIENTE', v: clienteSafe?.nif || '---' },
                        { k: 'VALIDADE PP', v: fmtData(fatura?.validade_proforma) },
                        { k: 'OPERADOR', v: empresa?.nome?.slice(0, 10) || 'Sistema' },
                    ].map(b => (
                        <div key={b.k} className="border border-[#bbb] py-[5px] px-1 bg-[rgba(255,255,255,0.40)]"><p className="font-bold text-[10px] truncate">{b.k}</p><p className="text-center text-[11px] mt-[2px] truncate">{b.v}</p></div>
                    ))}
                </div>

                <div className="w-full mt-2 overflow-x-auto no-scrollbar">
                    <table className="w-full border-collapse table-auto min-w-[720px]">
                        <colgroup>
                          <col style={{ width: '68px' }} />
                          <col style={{ width: 'auto' }} />
                          <col style={{ width: '56px' }} />
                          <col style={{ width: '56px' }} />
                          <col style={{ width: '96px' }} />
                          <col style={{ width: '82px' }} />
                          <col style={{ width: '68px' }} />
                          <col style={{ width: '118px' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-[rgba(194,194,194,0.65)] text-[10.5px] font-bold">
                            <th className="border border-[#999] py-[7px] px-2 text-left whitespace-nowrap">REF</th>
                            <th className="border border-[#999] py-[7px] px-2 text-left">PRODUTO / SERVIÇO</th>
                            <th className="border border-[#999] py-[7px] px-1 text-center">QTD.</th>
                            <th className="border border-[#999] py-[7px] px-1 text-center">UN.</th>
                            <th className="border border-[#999] py-[7px] px-2 text-right">PREÇO UNIT.</th>
                            <th className="border border-[#999] py-[7px] px-2 text-right">DESCONTO</th>
                            <th className="border border-[#999] py-[7px] px-1 text-center">TAXA</th>
                            <th className="border border-[#999] py-[7px] px-2 text-right">VALOR (AKZ)</th>
                          </tr>
                        </thead>
                        <tbody>
                            {itens.map((it: any, i: number) => (
                                <tr key={i} className="text-[11px] align-top">
                                  <td className="border border-[#bbb] px-2 py-[6px] bg-[rgba(255,255,255,0.40)] text-[10px] font-medium whitespace-nowrap">{it.referencia}</td>
                                  <td className="border border-[#bbb] px-2 py-[6px] bg-[rgba(255,255,255,0.40)] whitespace-normal break-words leading-[14px]" title={it.nome_snapshot}>
                                    {it.nome_snapshot}
                                  </td>
                                  <td className="border border-[#bbb] text-center px-1 py-[6px] bg-[rgba(255,255,255,0.40)] tabular-nums">{it.quantidade}</td>
                                  <td className="border border-[#bbb] text-center px-1 py-[6px] bg-[rgba(255,255,255,0.40)]">{it.unidade}</td>
                                  <td className="border border-[#bbb] text-right px-2 py-[6px] bg-[rgba(255,255,255,0.40)] whitespace-nowrap tabular-nums">{fmt(it.preco_unit_snapshot)}</td>
                                  <td className="border border-[#bbb] text-right px-2 py-[6px] bg-[rgba(255,255,255,0.40)] whitespace-nowrap tabular-nums">{it.desconto_perc > 0? fmt(it.desconto_valor) : '-'}</td>
                                  <td className="border border-[#bbb] text-center px-1 py-[6px] bg-[rgba(255,255,255,0.40)] whitespace-nowrap">{it.taxa_iva === 0? 'Isento' : `${it.taxa_iva}%`}</td>
                                  <td className="border border-[#bbb] text-right px-2 py-[6px] bg-[rgba(255,255,255,0.40)] font-semibold whitespace-nowrap tabular-nums">{fmt(it.subtotal_linha)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-2 gap-1">
                    <div className="flex-1 border border-[#999] min-w-0 overflow-hidden">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] font-bold">
                          <div className="flex-1 border-r border-[#999] py-[6px] px-1">IMPOSTO</div>
                          <div className="w-[50px] border-r border-[#999] py-[6px] text-center shrink-0">TAXA</div>
                          <div className="w-[125px] border-r border-[#999] py-[6px] text-center shrink-0">INCIDÊNCIA</div>
                          <div className="w-[125px] py-[6px] text-center shrink-0">VALOR</div>
                        </div>
                        {Object.entries(totais.ivaPorTaxa).map(([taxa, d]: any) => {
                            const isIsento = taxa === 'Isento'
                            return (
                            <div key={taxa} className="flex text-[11px]">
                              <div className="flex-1 border-r border-[#999] py-[6px] px-1 bg-[rgba(255,255,255,0.40)] truncate">{isIsento? '*M04 Isento' : `IVA ${taxa}`}</div>
                              <div className="w-[50px] border-r border-[#999] py-[6px] text-center bg-[rgba(255,255,255,0.40)] shrink-0">{taxa}</div>
                              <div className="w-[125px] border-r border-[#999] py-[6px] text-right pr-2 bg-[rgba(255,255,255,0.40)] shrink-0 whitespace-nowrap tabular-nums">{fmt(d.incidencia)}</div>
                              <div className="w-[125px] py-[6px] text-right pr-2 bg-[rgba(255,255,255,0.40)] shrink-0 whitespace-nowrap tabular-nums">{fmt(d.valor)}</div>
                            </div>
                        )})}
                    </div>
                    <div className="w-[300px] shrink-0">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] border border-[#999]"><div className="flex-1 py-[7px] px-2 text-right">Total Líquido</div><div className="w-[135px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[7px] text-right pr-2 whitespace-nowrap tabular-nums shrink-0">{fmt(totais.liquido)}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] border border-[#999] border-t-0"><div className="flex-1 py-[7px] px-2 text-right">Total Desconto</div><div className="w-[135px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[7px] text-right pr-2 whitespace-nowrap tabular-nums shrink-0">{fmt(totais.desconto)}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] border border-[#999] border-t-0"><div className="flex-1 py-[7px] px-2 text-right">Total IVA</div><div className="w-[135px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[7px] text-right pr-2 whitespace-nowrap tabular-nums shrink-0">{fmt(totais.iva)}</div></div>
                        <div className={`flex text-[11px] font-bold border border-[#999] border-t-0 ${isNC? 'bg-[#FFD6D6]' : 'bg-[rgba(194,194,194,0.75)]'}`}>
                          <div className="flex-1 py-[7px] px-2 text-right">TOTAL A PAGAR (AKZ)</div>
                          <div className="w-[135px] bg-[rgba(255,255,255,0.65)] border-l border-[#999] py-[7px] text-right pr-2 font-bold whitespace-nowrap tabular-nums shrink-0">{fmt(totais.pagar)}</div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 bg-[rgba(255,255,255,0.40)] p-2 text-[11px] border border-dashed border-gray-300 rounded">
                    <p className="font-bold mb-1">Coordenadas Bancárias:</p>
                    {emp.iban? <p>IBAN - {sigla1 || 'BAI'}: {emp.iban}</p> : <p>IBAN 1: ---</p>}
                    {emp.iban2? <p>IBAN - {sigla2 || emp.banco2}: {emp.iban2}</p> : null}
                    {!emp.iban &&!emp.iban2 && <p>IBAN ---</p>}
                </div>
                {fatura?.observacoes && <div className="mt-2 text-[11px]"><b>Observações:</b> {fatura.observacoes}</div>}
                <div className="mt-auto border-t border-black flex justify-between items-center bg-[rgba(255,255,255,0.40)] px-1 pt-3">
                    <span className="text-[9px] font-bold">Endereço: {mask(emp.endereco)} - Hash AGT validado</span>
                    <span className="text-[9px] font-bold">Pág. 1 de 1</span>
                </div>
            </div>
        </div>
    )

    return (
        <>
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap');
              #fatura-pdf-wrapper{display:flex;justify-content:center;width:100%;overflow-x:hidden;background:transparent}
              #fatura-pdf{transform-origin:top center}
          .no-scrollbar::-webkit-scrollbar{display:none}
          .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
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
