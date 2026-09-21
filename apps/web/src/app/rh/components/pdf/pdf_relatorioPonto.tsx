import { useMemo } from 'react'
import { X, Menu, Minus, Plus, Download, Printer, Share2, FileText, RotateCw, Type, Highlighter, Undo2, Redo2 } from 'lucide-react'

interface Props {
    dataSelecionada: string
    pontos: any[]
    faltas: any[]
    funcs: any[]
    empresa?: any
    minDate: string
    hoje: string
    onClose: ()=>void
}

function fmtHora(iso?: string){ if(!iso) return '---'; return new Date(iso).toLocaleTimeString('pt-AO') }
function fmtDisplay(iso: string){ if(!iso) return '---'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}` }
function prettyFalta(motivo: string){ if(!motivo) return "Nao apareceu"; if(motivo.includes('|')) return motivo.split('|')[1]?.trim() || motivo; return motivo }
function toTitle(str: string){ if(!str) return '---'; return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) }
function formatAtraso(min: number){ if(!min || min <=0) return '---'; if(min < 60) return `${min}min atraso`; const h = Math.floor(min/60); const m = min % 60; return m===0? `${h}h atraso` : `${h}h${String(m).padStart(2,'0')}min atraso` }

export default function RelatorioAuditoriaPonto({ dataSelecionada, pontos, faltas, funcs, empresa, minDate, hoje, onClose }: Props){
    const emp = {
        nome: empresa?.nome || empresa?.companyName || '---',
        nif: empresa?.nif || '---',
        endereco: empresa?.endereco || empresa?.morada || '---',
        telefone: empresa?.telefone || empresa?.phone || '---',
        email: empresa?.email || '---',
        cidade: empresa?.cidade || '',
        logo: empresa?.logo_url || empresa?.image_url || empresa?.logo || ''
    }

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
            return { nome: toTitle(func.nome), entrada: entrada? fmtHora(entrada.timestamp) : '---', saida: saida? fmtHora(saida.timestamp) : '---', status, motivo: toTitle(motivo), retro: isRetro? 'Sim' : 'Não', quem: toTitle(entrada?.lancado_por_nome || saida?.lancado_por_nome || falta?.lancado_por_nome || (lista.length? 'Próprio' : 'Rh')) }
        })
    },[funcs,pontos,faltas])

    return (
        <div className="fixed inset-0 z-[10000] bg-[#525659] overflow-y-auto overflow-x-hidden">
            <style>{`
                @media print{.no-print{display:none!important} #relatorio{box-shadow:none!important; margin:0!important; width:100%!important; max-width:210mm!important} }
                *{word-wrap:break-word}
            `}</style>

            {/* BARRA PADRÃO PDF */}
            <div className="no-print sticky top-0 z-20 h-[44px] bg-[#323233] flex items-center justify-between px-2 text-white">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded shrink-0"><Menu className="w-4 h-4" /></button>
                    <p className="text-[11px] md:text-[13px] font-bold uppercase truncate">Folha De Ponto Padrão</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <span className="bg-[#1e1e1e] text-[10px] px-1.5 py-0.5 rounded">1 / 1</span>
                    <div className="hidden md:flex items-center gap-1 ml-2">
                        <Minus className="w-3.5 h-3.5 opacity-60" /><span className="bg-black text-[11px] px-2 py-0.5">100%</span><Plus className="w-3.5 h-3.5 opacity-60" />
                    </div>
                    <div className="flex items-center gap-1 ml-1">
                        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Share2 className="w-4 h-4"/></button>
                        <button onClick={()=>window.print()} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Download className="w-4 h-4"/></button>
                        <button onClick={()=>window.print()} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded"><Printer className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>

            <div className="w-full flex justify-center p-0 md:p-6">
                {/* FOLHA QUE CABE NO CELULAR */}
                <div id="relatorio" className="w-full md:max-w-[210mm] bg-white text-black font-[Arial] shadow-none md:shadow-[0_0_25px_rgba(0,0,0,0.6)] p-3 md:p-[12mm] box-border">

                    {/* HEADER RESPONSIVO */}
                    <div className="flex flex-col md:flex-row md:justify-between gap-3 border-b-2 border-black pb-3">
                        <div className="flex gap-2 min-w-0">
                            {emp.logo? <img src={emp.logo} className="w-[48px] h-[48px] md:w-[70px] md:h-[70px] object-contain shrink-0" /> : <div className="w-[48px] h-[48px] md:w-[70px] md:h-[70px] flex items-center justify-center font-black text-[18px] shrink-0 bg-gray-100">{emp.nome.charAt(0).toUpperCase()}</div>}
                            <div className="text-[11px] md:text-[14px] leading-[15px] md:leading-[18px] min-w-0 flex-1 break-words">
                                <p className="font-bold text-[12px] md:text-[15px] capitalize leading-tight">{emp.nome.toLowerCase()}</p>
                                <p className="text-[10px] md:text-[13px]">Nif: {emp.nif}</p>
                                <p className="capitalize text-[10px] md:text-[13px]">{emp.endereco.toLowerCase()}</p>
                                <p className="text-[10px] md:text-[13px] break-all">Tel: {emp.telefone} | {emp.email}</p>
                                <p className="capitalize text-[10px] md:text-[13px]">{emp.cidade.toLowerCase()}</p>
                            </div>
                        </div>
                        <div className="flex md:flex-col justify-between md:justify-start md:text-right gap-2 shrink-0">
                            <p className="font-bold text-[11px] md:text-[13px] border-2 border-black px-2 py-1 text-center w-fit md:w-auto">Auditoria De Ponto</p>
                            <div className="text-[10px] md:text-[12px]">
                                <p>Data: {fmtDisplay(dataSelecionada)}</p>
                                <p className="text-[9px] md:text-[10px]">Emissão: {new Date().toLocaleString('pt-AO')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 text-[10px] md:text-[13px] flex flex-col md:flex-row md:justify-between gap-1 font-bold capitalize">
                        <p>Período: {fmtDisplay(minDate)} até {fmtDisplay(hoje)}</p>
                        <p>Total: {funcs.length} | Presentes: {linhas.filter(l=>l.status!=='Falta' && l.status!=='Sem Registo').length} | Faltas: {linhas.filter(l=>l.status==='Falta').length}</p>
                    </div>

                    {/* TABELA QUE NÃO ESTOURA */}
                    <div className="w-full mt-3 overflow-hidden">
                        <table className="w-full table-fixed border-collapse border border-black text-[10px] md:text-[13px]">
                            <thead>
                                <tr className="bg-black text-white">
                                    <th className="border border-black p-1 md:p-2 text-left font-normal w-[28%]">Funcionario</th>
                                    <th className="border border-black p-1 md:p-2 font-normal w-[13%]">Entrada</th>
                                    <th className="border border-black p-1 md:p-2 font-normal w-[10%]">Saida</th>
                                    <th className="border border-black p-1 md:p-2 font-normal w-[14%]">Status</th>
                                    <th className="border border-black p-1 md:p-2 text-left font-normal w-[14%]">Motivo</th>
                                    <th className="border border-black p-1 md:p-2 font-normal w-[8%]">Retro?</th>
                                    <th className="border border-black p-1 md:p-2 text-left font-normal w-[13%]">Quem Lançou</th>
                                </tr>
                            </thead>
                            <tbody>
                                {linhas.map((l,i)=>(
                                    <tr key={i} className="h-[32px] md:h-[36px]">
                                        <td className="border border-black px-1 md:px-2 font-bold break-words leading-[11px] md:leading-normal">{l.nome}</td>
                                        <td className="border border-black text-center px-0.5">{l.entrada}</td>
                                        <td className="border border-black text-center">{l.saida}</td>
                                        <td className="border border-black text-center px-0.5 leading-[10px] md:leading-normal">{l.status}</td>
                                        <td className="border border-black px-1 break-words leading-[10px] md:leading-normal">{l.motivo}</td>
                                        <td className="border border-black text-center">{l.retro}</td>
                                        <td className="border border-black px-1 break-words leading-[10px] md:leading-normal">{l.quem}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 text-[10px] md:text-[12px] border-t-2 border-black pt-3">
                        <p>Documento gerado automaticamente.</p>
                        <div className="mt-20 md:mt-36 flex flex-col items-center justify-center text-center">
                            <p className="w-[200px] md:w-[260px] border-t border-black pt-2 text-[12px] md:text-[14px]">Assinatura Rh</p>
                            <p className="mt-1 text-[9px] md:text-[11px]">Carimbo Da Empresa</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
