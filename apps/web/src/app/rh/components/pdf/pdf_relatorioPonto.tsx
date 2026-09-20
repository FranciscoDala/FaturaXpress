import { useMemo } from 'react'

interface Props {
    dataSelecionada: string
    funcs: any[]
    pontos: any[]
    faltas: any[]
    empresa?: any
}

const LogoDefault = ({ nome, size = 'small' }: { nome?: string; size?: 'small' | 'large' }) => {
    const inicial = (nome || 'T').charAt(0).toUpperCase()
    if (size === 'large') {
        return (
            <div className="flex flex-col items-center opacity-[0.12]" style={{ fontFamily: "var(--fonte-principal)" }}>
                <div className="w-[550px] h-[550px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[220px]">{inicial}</div>
            </div>
        )
    }
    return (
        <div className="w-[110px] h-[90px] flex flex-col items-center justify-center shrink-0">
            <div className="w-[70px] h-[70px] bg-[#1a5ca8] rounded-full flex items-center justify-center text-white font-black text-[36px]">{inicial}</div>
            <div className="mt-1 bg-[#1a5ca8] text-white text-[9px] font-bold px-2 py-[2px]">{(nome || 'PONTO').toUpperCase().slice(0, 10)}</div>
        </div>
    )
}

export const RelatorioPontoPDF = ({ dataSelecionada, funcs, pontos, faltas, empresa }: Props) => {

    const fmtHora = (iso: string) => iso? new Date(iso).toLocaleTimeString('pt-AO') : '---'
    const fmtData = (iso: string) => {
        if(!iso) return '---'
        const [y,m,d] = iso.split('-')
        return `${d}/${m}/${y}`
    }

    // JUNTA TUDO EM 1 LISTA UNICA
    const linhas = useMemo(() => {
        const porFuncPonto = new Map<string, any[]>()
        pontos.forEach(p => {
            if(!porFuncPonto.has(p.funcionario_id)) porFuncPonto.set(p.funcionario_id, [])
            porFuncPonto.get(p.funcionario_id)!.push(p)
        })
        const porFuncFalta = new Map<string, any>()
        faltas.forEach(f => porFuncFalta.set(f.funcionario_id, f))

        // Remove duplicadas de falta (caso do Domingos)
        const vistos = new Set<string>()

        return funcs.map(func => {
            const lista = (porFuncPonto.get(func.id) || []).sort((a,b)=> +new Date(a.timestamp) - +new Date(b.timestamp))
            const entrada = lista.find(p=>p.tipo==='entrada')
            const saida = [...lista].reverse().find(p=>p.tipo==='saida')
            const falta = porFuncFalta.get(func.id)

            const temDuplicada = vistos.has(func.id + (falta?._id||falta?.id||''))
            if(falta) vistos.add(func.id + (falta?._id||falta?.id||''))

            const isRetro = (entrada?.is_retroativo || saida?.is_retroativo || falta?.is_retroativo)? 'SIM' : 'NÃO'
            const quem = entrada?.lancado_por_nome || saida?.lancado_por_nome || falta?.lancado_por_nome || (lista.length? 'Próprio' : 'RH')
            const horaLanc = entrada?.lancado_em || saida?.lancado_em || falta?.lancado_em || entrada?.timestamp || saida?.timestamp || '---'
            const motivo = falta? (falta.motivo_retroativo || falta.motivo) : (entrada?.motivo_retroativo || saida?.motivo_retroativo || (entrada?.atraso_min? `${entrada.atraso_min}min atraso` : '---'))

            let status = 'SEM REGISTO'
            if(falta) status = 'FALTA'
            else if(entrada && saida) status = 'COMPLETO'
            else if(entrada) status = 'SÓ ENTRADA'
            else if(saida) status = 'SÓ SAÍDA'

            return {
                nome: func.nome,
                entrada: entrada? fmtHora(entrada.timestamp) : '---',
                saida: saida? fmtHora(saida.timestamp) : '---',
                status,
                motivo: motivo?.slice(0,40) || '---',
                retro: isRetro,
                quem: quem?.slice(0,15) || '---',
                lanc: horaLanc!=='---'? new Date(horaLanc).toLocaleTimeString('pt-AO') : '---',
                isRetroRow: isRetro==='SIM',
                isFalta:!!falta
            }
        })
    }, [funcs, pontos, faltas])

    const emp = {
        nome: empresa?.nome || 'Empresa',
        nif: empresa?.nif || '---',
        endereco: empresa?.endereco || '',
        logo: empresa?.logo_url || empresa?.logo || '',
    }
    const hasLogo =!!emp.logo

    const Folha = () => (
        <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] flex flex-col border border-gray-200 overflow-hidden mx-auto" style={{ fontFamily: "var(--fonte-principal)" }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                {hasLogo? <img src={emp.logo} alt="marca" className="w-[650px] h-[650px] object-contain opacity-[0.10]" /> : <LogoDefault nome={emp.nome} size="large" />}
            </div>
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex gap-3">
                    {hasLogo? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <LogoDefault nome={emp.nome} />}
                    <div className="text-[11px] leading-[15px]">
                        <p className="font-bold text-[14px]">{emp.nome}</p>
                        <p>NIF: {emp.nif}</p>
                        <p>Endereço: {emp.endereco || '---'}</p>
                    </div>
                </div>

                <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
                    <div className="text-[9px] leading-[13px] max-w-[300px]">
                        <p className="font-bold text-[12px]">RELATÓRIO DIÁRIO DE PONTO</p>
                        <p className="mt-1">Data: <b>{fmtData(dataSelecionada)}</b></p>
                        <p>Janela retro: 7 dias</p>
                        <p>Total funcionários: {funcs.length}</p>
                    </div>
                    <div className="text-right leading-[14px]">
                        <p className="font-bold text-[15px]">PONTO - {fmtData(dataSelecionada)}</p>
                        <p className="text-[#777] text-[11px] mt-1">Original • Auditoria</p>
                        <p className="text-[10px] mt-1">Gerado: {new Date().toLocaleString('pt-AO')}</p>
                    </div>
                </div>

                {/* TABELA ÚNICA DETALHADA - MESMO MODELO DA FATURA */}
                <div className="w-full mt-4">
                    <table className="w-full border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '9%' }} />
                          <col style={{ width: '9%' }} />
                          <col style={{ width: '12%' }} />
                          <col style={{ width: '20%' }} />
                          <col style={{ width: '7%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '10%' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-[rgba(26,92,168,0.85)] text-white text-[10px] font-bold">
                            <th className="border border-[#999] py-[7px] px-1 text-left">FUNCIONÁRIO</th>
                            <th className="border border-[#999] py-[7px]">ENTRADA</th>
                            <th className="border border-[#999] py-[7px]">SAÍDA</th>
                            <th className="border border-[#999] py-[7px]">STATUS</th>
                            <th className="border border-[#999] py-[7px] text-left">MOTIVO</th>
                            <th className="border border-[#999] py-[7px]">RETRO?</th>
                            <th className="border border-[#999] py-[7px] text-left">QUEM LANÇOU</th>
                            <th className="border border-[#999] py-[7px]">H. LANÇ.</th>
                          </tr>
                        </thead>
                        <tbody>
                            {linhas.map((l,i)=>(
                                <tr key={i} className={`text-[10px] h-[28px] ${l.isFalta? 'bg-[#FFF0F0]' : l.isRetroRow? 'bg-[#FFFBEB]' : 'bg-[rgba(255,255,255,0.40)]'}`}>
                                  <td className="border border-[#bbb] px-1 truncate font-bold">{l.nome}</td>
                                  <td className="border border-[#bbb] text-center">{l.entrada}</td>
                                  <td className="border border-[#bbb] text-center">{l.saida}</td>
                                  <td className="border border-[#bbb] text-center font-bold">
                                    <span className={`px-1.5 py-[1px] rounded-full text-[9px] ${l.status==='FALTA'? 'bg-red-600 text-white' : l.status==='COMPLETO'? 'bg-green-600 text-white' : 'bg-gray-200'}`}>{l.status}</span>
                                  </td>
                                  <td className="border border-[#bbb] px-1 truncate" title={l.motivo}>{l.motivo}</td>
                                  <td className="border border-[#bbb] text-center font-bold">{l.retro}</td>
                                  <td className="border border-[#bbb] px-1 truncate">{l.quem}</td>
                                  <td className="border border-[#bbb] text-center tabular-nums">{l.lanc}</td>
                                </tr>
                            ))}
                            {Array.from({ length: Math.max(0, 12 - linhas.length) }).map((_, k) => (<tr key={k} className="h-[28px]"><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td></tr>))}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-2 gap-1">
                    <div className="flex-1 border border-[#999] min-w-0 overflow-hidden">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] font-bold">
                          <div className="flex-1 border-r border-[#999] py-[6px] px-1">RESUMO</div>
                          <div className="w-[125px] py-[6px] text-center">QTD</div>
                        </div>
                        <div className="flex text-[11px]"><div className="flex-1 border-r border-[#999] py-[6px] px-1 bg-[rgba(255,255,255,0.40)]">Total Presentes</div><div className="w-[125px] py-[6px] text-center bg-[rgba(255,255,255,0.40)]">{linhas.filter(l=>l.status!=='FALTA' && l.status!=='SEM REGISTO').length}</div></div>
                        <div className="flex text-[11px]"><div className="flex-1 border-r border-[#999] py-[6px] px-1 bg-[rgba(255,255,255,0.40)]">Total Faltas</div><div className="w-[125px] py-[6px] text-center bg-[rgba(255,255,255,0.40)]">{linhas.filter(l=>l.status==='FALTA').length}</div></div>
                        <div className="flex text-[11px]"><div className="flex-1 border-r border-[#999] py-[6px] px-1 bg-[rgba(255,255,255,0.40)]">Retroativos</div><div className="w-[125px] py-[6px] text-center bg-[rgba(255,255,255,0.40)]">{linhas.filter(l=>l.retro==='SIM').length}</div></div>
                    </div>
                    <div className="w-[300px] shrink-0 border border-[#999] p-2 text-[10px] leading-[14px] bg-[rgba(255,255,255,0.40)]">
                        <p className="font-bold">Legenda Auditoria:</p>
                        <p>• RETRO SIM = ponto/falta lançado nos últimos 7 dias com motivo obrigatório</p>
                        <p>• QUEM LANÇOU = quem bateu no sistema (RH auditado)</p>
                        <p>• MOTIVO = justificação da falta ou atraso</p>
                    </div>
                </div>

                <div className="mt-auto border-t border-black flex justify-between items-center bg-[rgba(255,255,255,0.40)] px-1 pt-3">
                  <span className="text-[9px] font-bold">Licenciado a: {emp.nome} | Relatório Ponto Auditado | Janela 7 dias</span>
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
              @media (max-width:768px){
                #fatura-pdf-wrapper{overflow-x:hidden!important;width:100%!important}
                #fatura-pdf{transform:scale(0.45);transform-origin:top center;margin-bottom:-55%;width:210mm!important;min-width:210mm!important}
              }
            `}</style>
            <div id="fatura-pdf-wrapper"><Folha /></div>
        </>
    )
}
export default RelatorioPontoPDF
