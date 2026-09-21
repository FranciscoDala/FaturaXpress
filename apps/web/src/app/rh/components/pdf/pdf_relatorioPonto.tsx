import { useMemo } from 'react'
import { Menu, Download, Printer, Share2 } from 'lucide-react'

interface Props {
    dataSelecionada: string
    pontos: any[]
    faltas: any[]
    funcs: any[]
    empresa?: any
    usuario?: any
    minDate: string
    hoje: string
    onClose: ()=>void
}

function fmtHora(iso?: string){ if(!iso) return '---'; return new Date(iso).toLocaleTimeString('pt-AO') }
function fmtDisplay(iso: string){ if(!iso) return '---'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}` }
function prettyFalta(motivo: string){ if(!motivo) return "Nao apareceu"; if(motivo.includes('|')) return motivo.split('|')[1]?.trim() || motivo; return motivo }
function toTitle(str: string){ if(!str) return '---'; return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) }
function formatAtraso(min: number){ if(!min || min <=0) return '---'; if(min < 60) return `${min}min atraso`; const h = Math.floor(min/60); const m = min % 60; return m===0? `${h}h atraso` : `${h}h${String(m).padStart(2,'0')}min atraso` }

export default function RelatorioAuditoriaPonto({ dataSelecionada, pontos, faltas, funcs, empresa, usuario, minDate, hoje, onClose }: Props){
    const emp = {
        nome: empresa?.nome || empresa?.companyName || '---',
        nif: empresa?.nif || '---',
        endereco: empresa?.endereco || empresa?.morada || '---',
        telefone: empresa?.telefone || empresa?.phone || '---',
        email: empresa?.email || '---',
        cidade: empresa?.cidade || '',
        logo: empresa?.logo_url || empresa?.image_url || empresa?.logo || '',
        logo_url: empresa?.logo_url || empresa?.image_url || ''
    }
    const hasLogo =!!emp.logo && emp.logo.trim()!== ''
    const usuarioLogadoNome = usuario?.nome || usuario?.name || usuario?.full_name || empresa?.nome || '---'

    const linhas = useMemo(()=>{
        const porPonto = new Map<string, any[]>(); pontos.forEach(p=>{ if(!porPonto.has(p.funcionario_id)) porPonto.set(p.funcionario_id, []); porPonto.get(p.funcionario_id)!.push(p) })
        const porFalta = new Map<string, any>(); faltas.forEach(f=>{ if(!porFalta.has(f.funcionario_id)) porFalta.set(f.funcionario_id, f) })
        return funcs.map(func=>{
            const lista = (porPonto.get(func.id) || []).sort((a,b)=> +new Date(a.timestamp)- +new Date(b.timestamp))
            const entrada = lista.find(p=>p.tipo==='entrada'); const saida = [...lista].reverse().find(p=>p.tipo==='saida'); const falta = porFalta.get(func.id)
            const isRetro =!!(entrada?.is_retroativo || saida?.is_retroativo || falta?.is_retroativo)
            let statusRaw = 'SEM REGISTO'; if(falta) statusRaw='FALTA'; else if(entrada && saida) statusRaw='CONCLUIDO'; else if(entrada) statusRaw='ENTRADA'; else if(saida) statusRaw='SAIDA'
            let status = ''; if(statusRaw==='FALTA') status='Falta'; else if(statusRaw==='CONCLUIDO') status='Concluído'; else if(statusRaw==='ENTRADA') status='Entrada'; else if(statusRaw==='SAIDA') status='Saída'; else status='Sem Registo'
            const motivo = falta? (falta.motivo_retroativo || prettyFalta(falta.motivo)) : (entrada?.motivo_retroativo || (entrada?.atraso_min? formatAtraso(entrada.atraso_min) : 'Presente'))
            let responsavel = ''; if(falta?.lancado_por_nome) responsavel = falta.lancado_por_nome; else if(entrada?.lancado_por_nome || saida?.lancado_por_nome) responsavel = entrada?.lancado_por_nome || saida?.lancado_por_nome || ''; else if(falta) responsavel = usuarioLogadoNome; else if(lista.length>0) responsavel = toTitle(func.nome); else responsavel = usuarioLogadoNome
            return { nome: toTitle(func.nome), entrada: entrada? fmtHora(entrada.timestamp) : '---', saida: saida? fmtHora(saida.timestamp) : '---', status, motivo: toTitle(motivo), retro: isRetro? 'Sim' : 'Não', responsavel: toTitle(responsavel) }
        })
    },[funcs,pontos,faltas,usuarioLogadoNome])

    const FolhaTela = () => (
        <div id="relatorio-pdf" className="relative bg-white text-black w-[210mm] min-w-[210mm] min-h-[297mm] p-[10mm] flex flex-col border border-gray-200 overflow-hidden mx-auto" style={{ fontFamily: "var(--fonte-principal)" }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                {hasLogo? <img src={emp.logo_url} alt="marca" className="w-[650px] h-[650px] object-contain opacity-[0.10]" /> : <div className="w-[550px] h-[550px] bg-black rounded-full flex items-center justify-center text-white font-black text-[220px] opacity-[0.06]">{emp.nome.charAt(0).toUpperCase()}</div>}
            </div>

            <div className="relative z-10 flex flex-col flex-1">
                <div className="flex gap-3">
                    {hasLogo? <img src={emp.logo} className="w-[110px] h-[90px] object-contain shrink-0" alt="logo" /> : <div className="w-[110px] h-[90px] flex flex-col items-center justify-center shrink-0"><div className="w-[70px] h-[70px] bg-black rounded-full flex items-center justify-center text-white font-black text-[36px]">{emp.nome.charAt(0).toUpperCase()}</div><div className="mt-1 bg-black text-white text-[9px] font-bold px-2 py-[2px]">{emp.nome.toUpperCase().slice(0,10)}</div></div>}
                    <div className="text-[11px] leading-[15px]"><p className="font-bold text-[14px] capitalize">{emp.nome.toLowerCase()}</p><p>NIF: {emp.nif}</p><p>Endereço: {emp.endereco}</p><p>Contactos: {emp.telefone}</p><p>Email: {emp.email}</p><p className="capitalize">{emp.cidade.toLowerCase()}</p></div>
                </div>

                <div className="flex justify-between items-start mt-6 border-b border-dotted border-gray-300 pb-3">
                    <div className="text-[9px] leading-[13px] max-w-[400px]">
                        <p className="font-bold text-[12px]">AUDITORIA DE PONTO</p>
                        <p className="mt-1">Data: {fmtDisplay(dataSelecionada)}</p>
                        <p>Período: {fmtDisplay(minDate)} até {fmtDisplay(hoje)}</p>
                        <p className="mt-1">Total: {funcs.length} | Presentes: {linhas.filter(l=>l.status!=='Falta' && l.status!=='Sem Registo').length} | Faltas: {linhas.filter(l=>l.status==='Falta').length}</p>
                    </div>
                    <div className="text-right leading-[14px]">
                        <p className="font-bold text-[15px]">{fmtDisplay(dataSelecionada)}</p>
                        <p className="text-[#777] text-[11px] mt-1">Relatório Diário</p>
                        <p className="font-bold text-[12px] mt-1">Original</p>
                        <p className="text-[10px] mt-1">Emissão: {new Date().toLocaleString('pt-AO')}</p>
                    </div>
                </div>

                {/* SEM OPERADOR - AGORA 5 COLUNAS */}
                <div className="mt-4 grid grid-cols-[90px_95px_95px_125px_1fr] gap-[5px]">
                    {[
                        { k: 'DATA', v: fmtDisplay(dataSelecionada) },
                        { k: 'PERÍODO', v: fmtDisplay(minDate) },
                        { k: 'ATÉ', v: fmtDisplay(hoje) },
                        { k: 'TOTAL FUNC.', v: `${funcs.length}` },
                        { k: 'RESPONSÁVEL', v: usuarioLogadoNome.slice(0,20) },
                    ].map(b => (
                        <div key={b.k} className="border border-[#bbb] py-[5px] px-1 bg-[rgba(255,255,255,0.40)]"><p className="font-bold text-[10px] truncate">{b.k}</p><p className="text-center text-[11px] mt-[2px] truncate">{b.v}</p></div>
                    ))}
                </div>

                {/* TABELA - RESPONSAVEL CORRIGIDO */}
                <div className="w-full mt-2">
                    <table className="w-full border-collapse table-fixed">
                        <colgroup>
                          <col style={{ width: '24%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '13%' }} />
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '8%' }} />
                          <col style={{ width: '18%' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-[rgba(194,194,194,0.65)] text-[11px] font-bold">
                            <th className="border border-[#999] py-[7px] px-1 text-left">FUNCIONARIO</th>
                            <th className="border border-[#999] py-[7px]">ENTRADA</th>
                            <th className="border border-[#999] py-[7px]">SAIDA</th>
                            <th className="border border-[#999] py-[7px]">STATUS</th>
                            <th className="border border-[#999] py-[7px] text-left">MOTIVO</th>
                            <th className="border border-[#999] py-[7px]">RETRO?</th>
                            <th className="border border-[#999] py-[7px] px-1 text-left text-[10px] leading-[11px]">RESPONSAVEL</th>
                          </tr>
                        </thead>
                        <tbody>
                            {linhas.map((l,i)=>(
                                <tr key={i} className="text-[11px] h-[28px]">
                                  <td className="border border-[#bbb] px-1 bg-[rgba(255,255,255,0.40)] truncate overflow-hidden whitespace-nowrap font-bold">{l.nome}</td>
                                  <td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)]">{l.entrada}</td>
                                  <td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)]">{l.saida}</td>
                                  <td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)] truncate">{l.status}</td>
                                  <td className="border border-[#bbb] px-1 bg-[rgba(255,255,255,0.40)] truncate overflow-hidden whitespace-nowrap">{l.motivo}</td>
                                  <td className="border border-[#bbb] text-center bg-[rgba(255,255,255,0.40)]">{l.retro}</td>
                                  <td className="border border-[#bbb] px-1 bg-[rgba(255,255,255,0.40)] truncate overflow-hidden whitespace-nowrap" title={l.responsavel}>{l.responsavel}</td>
                                </tr>
                            ))}
                            {Array.from({ length: Math.max(0, 12 - linhas.length) }).map((_, k) => (<tr key={k} className="h-[28px]"><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td><td className="border border-[#bbb] bg-[rgba(255,255,255,0.40)]"></td></tr>))}
                        </tbody>
                    </table>
                </div>

                <div className="flex mt-2 gap-1">
                    <div className="flex-1 border border-[#999] min-w-0 overflow-hidden">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] font-bold"><div className="flex-1 border-r border-[#999] py-[6px] px-1">RESUMO</div><div className="w-[50px] border-r border-[#999] py-[6px] text-center shrink-0">QTD</div><div className="w-[125px] border-r border-[#999] py-[6px] text-center shrink-0">PRESENTES</div><div className="w-[125px] py-[6px] text-center shrink-0">FALTAS</div></div>
                        <div className="flex text-[11px]"><div className="flex-1 border-r border-[#999] py-[6px] px-1 bg-[rgba(255,255,255,0.40)] truncate">Ponto do dia {fmtDisplay(dataSelecionada)}</div><div className="w-[50px] border-r border-[#999] py-[6px] text-center bg-[rgba(255,255,255,0.40)] shrink-0">{funcs.length}</div><div className="w-[125px] border-r border-[#999] py-[6px] text-right pr-2 bg-[rgba(255,255,255,0.40)] shrink-0">{linhas.filter(l=>l.status!=='Falta' && l.status!=='Sem Registo').length}</div><div className="w-[125px] py-[6px] text-right pr-2 bg-[rgba(255,255,255,0.40)] shrink-0">{linhas.filter(l=>l.status==='Falta').length}</div></div>
                    </div>
                    <div className="w-[300px] shrink-0">
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] border border-[#999]"><div className="flex-1 py-[7px] px-2 text-right">Total Funcionários</div><div className="w-[135px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[7px] text-right pr-2 shrink-0">{funcs.length}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.65)] text-[11px] border border-[#999] border-t-0"><div className="flex-1 py-[7px] px-2 text-right">Presentes</div><div className="w-[135px] bg-[rgba(255,255,255,0.55)] border-l border-[#999] py-[7px] text-right pr-2 shrink-0">{linhas.filter(l=>l.status!=='Falta' && l.status!=='Sem Registo').length}</div></div>
                        <div className="flex bg-[rgba(194,194,194,0.75)] text-[11px] font-bold border border-[#999] border-t-0"><div className="flex-1 py-[7px] px-2 text-right">FALTAS</div><div className="w-[135px] bg-[rgba(255,255,255,0.65)] border-l border-[#999] py-[7px] text-right pr-2 font-bold shrink-0">{linhas.filter(l=>l.status==='Falta').length}</div></div>
                    </div>
                </div>

                <div className="mt-4 bg-[rgba(255,255,255,0.40)] p-2 text-[11px] border border-dashed border-gray-300 rounded">
                    <p className="font-bold mb-1">Observações:</p>
                    <p>Documento gerado automaticamente por {toTitle(usuarioLogadoNome)} - Sistema de ponto.</p>
                </div>

                <div className="mt-auto pt-8 flex flex-col items-center justify-center text-center">
                    <p className="w-[260px] border-t border-black pt-2 text-[12px]">Assinatura Rh - {toTitle(usuarioLogadoNome)}</p>
                    <p className="mt-1 text-[10px]">Carimbo Da Empresa</p>
                </div>
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[10000] bg-[#525659] overflow-y-auto">
            <style>{`
              @import url('https://fonts.googleapis.com/css2?family=Zalando+Sans+Expanded:ital,wght@0,200..900;1,200..900&display=swap');
              #relatorio-pdf-wrapper{display:flex;justify-content:center;width:100%;background:transparent}
              #relatorio-pdf{transform-origin:top center}
              @media (max-width:768px){
                #relatorio-pdf-wrapper{width:100%!important}
                #relatorio-pdf{transform:scale(0.45);transform-origin:top center;margin-bottom:-55%;width:210mm!important;min-width:210mm!important}
              }
              @media print{.no-print{display:none!important} #relatorio-pdf-wrapper{overflow:visible!important} #relatorio-pdf{transform:none!important; margin:0!important; box-shadow:none!important; border:none!important} }
            `}</style>

            <div className="no-print sticky top-0 z-20 h-[44px] bg-[#323233] flex items-center justify-between px-2 text-white">
                <div className="flex items-center gap-2 min-w-0"><button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded shrink-0"><Menu className="w-4 h-4" /></button><p className="text-[11px] md:text-[13px] font-bold uppercase truncate">Folha De Ponto - {fmtDisplay(dataSelecionada)}</p></div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-[#1e1e1e] text-[10px] px-1.5 py-0.5 rounded">1 / 1</span>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Share2 className="w-4 h-4"/></button>
                    <button onClick={()=>window.print()} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Download className="w-4 h-4"/></button>
                    <button onClick={()=>window.print()} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Printer className="w-4 h-4"/></button>
                </div>
            </div>

            <div id="relatorio-pdf-wrapper">
                <FolhaTela />
            </div>
        </div>
    )
}
