import { useMemo } from 'react'

interface Props {
    dataSelecionada: string
    pontos: any[]
    faltas: any[]
    funcs: any[]
    empresa: any
    minDate?: string
    hoje?: string
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
            <div className="mt-1 bg-[#1a5ca8] text-white text-[9px] font-bold px-2 py-[2px]">{(nome || 'TECMICRO').toUpperCase().slice(0, 10)}</div>
        </div>
    )
}

function formatAtraso(min: number){
    if(!min || min <=0) return '---'
    if(min < 60) return `${min}min atraso`
    const h = Math.floor(min/60)
    const m = min % 60
    return m===0? `${h}h atraso` : `${h}h${String(m).padStart(2,'0')}min atraso`
}
function fmtHora(iso?: string){ if(!iso) return '---'; return new Date(iso).toLocaleTimeString('pt-AO') }
function fmtDisplay(iso: string){ if(!iso) return '---'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}` }
function prettyFalta(motivo: string){ if(!motivo) return "Não apareceu"; if(motivo.includes('|')) return motivo.split('|')[1]?.trim() || motivo; return motivo }

export const RelatorioAuditoriaPonto = ({ dataSelecionada, pontos, faltas, funcs, empresa, minDate, hoje }: Props) => {

    const emp = {
        nome: empresa?.nome || empresa?.companyName || '',
        nif: empresa?.nif || '',
        endereco: empresa?.endereco || empresa?.morada || '',
        telefone: empresa?.telefone || empresa?.contactos || '',
        email: empresa?.email || '',
        cidade: empresa?.cidade || '',
        logo: empresa?.logo_url || empresa?.image_url || empresa?.logo || '',
        logo_url: empresa?.logo_url || empresa?.image_url || '',
    }
    const hasLogo =!!emp.logo
    const mask = (v: string) => v && v.trim()!==''? v : '---'

    const linhas = useMemo(()=>{
        const porPonto = new Map<string, any[]>()
        pontos.forEach(p=>{ if(!porPonto.has(p.funcionario_id)) porPonto.set(p.funcionario_id, []); porPonto.get(p.funcionario_id)!.push(p) })
        const porFalta = new Map<string, any>()
        faltas.forEach(f=>{ if(!porFalta.has(f.funcionario_id)) porFalta.set(f.funcionario_id, f) })

        return funcs.map(func=>{
            const lista = (porPonto.get(func.id) || []).sort((a,b)=> +new Date(a.timestamp)- +new Date(b.timestamp))
            const entrada = lista.find(p=>p.tipo==='entrada')
            const saida = [...lista].reverse().find(p=>p.tipo==='saida')
            const falta = porFalta.get(func.id)
            const isRetro = (entrada?.is_retroativo || saida?.is_retroativo || falta?.is_retroativo)
            let status = 'SEM REGISTO'; if(falta) status='FALTA'; else if(entrada && saida) status='COMPLETO'; else if(entrada) status='SÓ ENTRADA'
            const motivo = falta? (falta.motivo_retroativo || prettyFalta(falta.motivo)) : (entrada?.motivo_retroativo || (entrada?.atraso_min? formatAtraso(entrada.atraso_min) : 'Presente'))

            return {
                nome: func.nome,
                entrada: entrada? fmtHora(entrada.timestamp) : '---',
                saida: saida? fmtHora(saida.timestamp) : '---',
                status,
                motivo,
                retro: isRetro? 'SIM' : 'NÃO',
                quem: entrada?.lancado_por_nome || saida?.lancado_por_nome || falta?.lancado_por_nome || (lista.length? 'Próprio' : 'RH'),
                lanc: entrada?.lancado_em || falta?.lancado_em? fmtHora(entrada?.lancado_em || falta?.lancado_em) : entrada? fmtHora(entrada.timestamp) : '---',
                isFalta:!!falta,
                isRetro
            }
        })
    },[funcs,pontos,faltas])

    const totais = {
        presentes: linhas.filter(l=>l.status!=='FALTA' && l.status!=='SEM REGISTO').length,
        faltas: linhas.filter(l=>l.status==='FALTA').length,
        retro: linhas.filter(l=>l.retro==='SIM').length
    }

    const Folha = () => (
        <div id="fatura-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] flex flex-col border border-gray-200 overflow-hidden mx-auto" style={{ fontFamily: "var(--fonte-principal)" }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">{hasLogo? <img src={emp.logo_url} alt="marca" className="w-[650px] h-[650px] object-contain opacity-[0.10]" /> : <LogoDefault nome={emp.nome} size="large" />}</div>
            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex gap-3">
                    {hasLogo? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <LogoDefault nome={emp.nome} />}
                    <div className="text-[11px] leading-[15px]"><p className="font-bold text-[14px]">{mask(emp.nome)}</p><p>NIF: {mask(emp.nif)}</p><p>Endereço: {mask(emp.endereco)}</p><p>Contactos: {mask(emp.telefone)}</p><p>Email: {mask(emp.email)}</p><p>{mask(emp.cidade)}</p></div>
                </div>

                <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
                    <div className="text-[9px] leading-[13px] max-w-[300px]">
                        <p className="font-bold text-[12px]">RELATÓRIO DE AUDITORIA DE PONTO</p>
                        <p className="mt-1">Data Auditada: <b>{fmtDisplay(dataSelecionada)}</b></p>
                        <p>Janela Retro: {minDate? fmtDisplay(minDate): '---'} até {hoje? fmtDisplay(hoje): fmtDisplay(dataSelecionada)}</p>
                        <p>Regime: Auditoria 100% - Retro 7 dias</p>
                    </div>
                    <div className="flex gap-3 items-start">
                        <div className="text-right leading-[14px]">
                            <p className="font-bold text-[15px]">PONTO-{dataSelecionada}</p>
                            <p className="text-[#777] text-[11px] mt-1">Original - Auditoria</p>
                            <p className="font-bold text-[12px] mt-1">Validação RH</p>
                            <p className="text-[10px] mt-1">Emissão: {new Date().toLocaleString('pt-AO')}</p>
                        </div>
                        <div className="w-[90px] h-[90px] shrink-0 border p-1 bg-white flex items-center justify-center text-[8px] font-bold text-center">AUDITORIA<br/>PONTO</div>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-[90px_95px_95px_125px_115px_1fr] gap-[5px]">
                    {[
                        { k: 'DATA', v: fmtDisplay(dataSelecionada) },
                        { k: 'TOTAL FUNC.', v: `${funcs.length}` },
                        { k: 'PRESENTES', v: `${totais.presentes}` },
                        { k: 'FALTAS', v: `${totais.faltas}` },
                        { k: 'RETROATIVOS', v: `${totais.retro}` },
                        { k: 'RESPONSÁVEL', v: 'RH' },
                    ].map(b => (<div key={b.k} className="border border-[#bbb] py-[5px] px-1 bg-[rgba(255,255,255,0.40)]"><p className="font-bold text-[10px] truncate">{b.k}</p><p className="text-center text-[11px] mt-[2px] truncate font-bold">{b.v}</p></div>))}
                </div>

                <div className="w-full mt-2">
                    <table className="w-full border-collapse table-fixed">
                        <colgroup><col style={{ width: '22%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '12%' }} /><col style={{ width: '20%' }} /><col style={{ width: '7%' }} /><col style={{ width: '12%' }} /><col style={{ width: '9%' }} /></colgroup>
                        <thead><tr className="bg-[#1a5ca8] text-white text-[10px] font-bold"><th className="border border-[#999] py-[7px] px-1 text-left">FUNCIONÁRIO</th><th className="border border-[#999] py-[7px]">ENTRADA</th><th className="border border-[#999] py-[7px]">SAÍDA</th><th className="border border-[#999] py-[7px]">STATUS</th><th className="border border-[#999] py-[7px] text-left">MOTIVO / ATRASO</th><th className="border border-[#999] py-[7px]">RETRO?</th><th className="border border-[#999] py-[7px] text-left">QUEM LANÇOU</th><th className="border border-[#999] py-[7px]">H. LANÇ.</th></tr></thead>
                        <tbody>
                            {linhas.map((it, i) => (
                                <tr key={i} className={`text-[11px] h-[28px] ${it.isFalta? 'bg-[#FFF0F0]' : it.isRetro? 'bg-[#FFFBEB]' : 'bg-[rgba(255,255,255,0.40)]'}`}>
                                  <td className="border border-[#bbb] px-1 truncate font-bold">{it.nome}</td>
                                  <td className="border border-[#bbb] text-center">{it.entrada}</td>
                                  <td className="border border-[#bbb] text-center">{it.saida}</td>
                                  <td className="border border-[#bbb] text-center"><span className={`px-1.5 py-[1px] rounded-full text-[9px] font-bold ${it.status==='FALTA'? 'bg-red-600 text-white' : it.status==='COMPLETO'? 'bg-green-600 text-white' : 'bg-gray-200'}`}>{it.status}</span></td>
                                  <td className="border border-[#bbb] px-1 truncate" title={it.motivo}>{it.motivo}</td>
                                  <td className="border border-[#bbb] text-center font-bold">{it.retro}</td>
                                  <td className="border border-[#bbb] px-1 truncate">{it.quem}</td>
                                  <td className="border border-[#bbb] text-center tabular-nums">{it.lanc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 bg-[rgba(255,255,255,0.40)] p-2 text-[10px] border border-dashed border-gray-300 rounded leading-[14px]">
                    <p className="font-bold mb-1">Observação Auditoria:</p>
                    <p>• 177min = convertido automaticamente para 2h57min atraso • 308min = 5h08min atraso</p>
                    <p>• RETRO SIM indica lançamento nos últimos 7 dias com motivo obrigatório e responsável identificado</p>
                    <p>• Este documento serve como prova de presença/falta para efeitos de RH</p>
                </div>

                <div className="mt-auto border-t border-black flex justify-between items-center bg-[rgba(255,255,255,0.40)] px-1 pt-3"><span className="text-[9px] font-bold">Licenciado a: {mask(emp.nome)} | NIF: {mask(emp.nif)} | Relatório Ponto - Auditoria 100%</span><span className="text-[9px] font-bold">Pág. 1 de 1</span></div>
            </div>
        </div>
    )

    return (
        <>
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap'); #fatura-pdf-wrapper{display:flex;justify-content:center;width:100%;overflow-x:hidden;background:transparent} #fatura-pdf{transform-origin:top center} @media (max-width:768px){ #fatura-pdf-wrapper{overflow-x:hidden!important;width:100%!important} #fatura-pdf{transform:scale(0.45);transform-origin:top center;margin-bottom:-55%;width:210mm!important;min-width:210mm!important} }`}</style>
            <div id="fatura-pdf-wrapper"><Folha /></div>
        </>
    )
}
export default RelatorioAuditoriaPonto
