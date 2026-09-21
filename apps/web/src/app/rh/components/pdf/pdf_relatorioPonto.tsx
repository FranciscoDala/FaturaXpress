import { useMemo } from 'react'
import { X } from 'lucide-react'

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

function formatAtraso(min: number){ if(!min || min <=0) return '---'; if(min < 60) return `${min}min atraso`; const h = Math.floor(min/60); const m = min % 60; return m===0? `${h}h atraso` : `${h}h${String(m).padStart(2,'0')}min atraso` }
function fmtHora(iso?: string){ if(!iso) return '---'; return new Date(iso).toLocaleTimeString('pt-AO') }
function fmtDisplay(iso: string){ if(!iso) return '---'; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y}` }
function prettyFalta(motivo: string){ if(!motivo) return "Nao apareceu"; if(motivo.includes('|')) return motivo.split('|')[1]?.trim() || motivo; return motivo }

function toTitle(str: string){
    if(!str) return '---'
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

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
            let status = ''
            if(statusRaw==='FALTA') status='Falta'
            else if(statusRaw==='CONCLUIDO') status='Concluído'
            else if(statusRaw==='ENTRADA') status='Entrada'
            else if(statusRaw==='SAIDA') status='Saída'
            else status='Sem Registo'

            const motivo = falta? (falta.motivo_retroativo || prettyFalta(falta.motivo)) : (entrada?.motivo_retroativo || (entrada?.atraso_min? formatAtraso(entrada.atraso_min) : 'Presente'))
            return {
                nome: toTitle(func.nome),
                entrada: entrada? fmtHora(entrada.timestamp) : '---',
                saida: saida? fmtHora(saida.timestamp) : '---',
                status,
                motivo: toTitle(motivo),
                retro: isRetro? 'Sim' : 'Não',
                quem: toTitle(entrada?.lancado_por_nome || saida?.lancado_por_nome || falta?.lancado_por_nome || (lista.length? 'Próprio' : 'Rh'))
            }
        })
    },[funcs,pontos,faltas])

    return (
        <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto">
            <style>{`
                @media print{.no-print{display:none} #relatorio{border:none; width:210mm!important} }
               .capitalize-first{ text-transform: lowercase; }
               .capitalize-first::first-letter{ text-transform: uppercase; }
            `}</style>
            <div className="no-print sticky top-0 bg-white border-b p-3 flex justify-between items-center">
                <button onClick={()=>window.print()} className="h-9 px-5 bg-black text-white rounded-full text-[12px] font-bold">Imprimir</button>
                <button onClick={onClose} className="h-9 w-9 bg-zinc-100 rounded-full flex items-center justify-center"><X className="w-4 h-4"/></button>
            </div>

            <div id="relatorio" className="w-full max-w-[210mm] min-h-screen md:min-h-[297mm] mx-auto p-3 md:p-[10mm] bg-white text-black font-[Arial] md:border">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 border-b-2 border-black pb-4">
                    <div className="flex gap-3">
                        {emp.logo? <img src={emp.logo} className="w-[65px] h-[65px] md:w-[70px] md:h-[70px] object-contain shrink-0"/> : <div className="w-[65px] h-[65px] flex items-center justify-center font-black text-[22px] shrink-0">{emp.nome.charAt(0).toUpperCase()}</div>}
                        <div className="text-[11px] leading-[14px] md:leading-[15px] min-w-0 flex-1">
                            <p className="font-bold text-[13px] md:text-[14px] leading-tight break-words" style={{textTransform:'capitalize'}}>{emp.nome.toLowerCase()}</p>
                            <p>Nif: {emp.nif}</p>
                            <p className="break-words" style={{textTransform:'capitalize'}}>{emp.endereco.toLowerCase()}</p>
                            <p className="break-words">Tel: {emp.telefone} | Email: {emp.email}</p>
                            <p style={{textTransform:'capitalize'}}>{emp.cidade.toLowerCase()}</p>
                        </div>
                    </div>
                    <div className="text-left md:text-right mt-2 md:mt-0">
                        <p className="font-bold text-[11px] md:text-[12px] border-2 border-black px-3 py-1 inline-block">Auditoria De Ponto</p>
                        <p className="text-[10px] mt-2">Data: {fmtDisplay(dataSelecionada)}</p>
                        <p className="text-[9px]">Emissão: {new Date().toLocaleString('pt-AO')}</p>
                    </div>
                </div>

                <div className="mt-4 text-[10px] flex flex-col md:flex-row md:justify-between gap-1 font-bold" style={{textTransform:'capitalize'}}>
                    <p>Período: {fmtDisplay(minDate)} até {fmtDisplay(hoje)}</p>
                    <p>Total: {funcs.length} | Presentes: {linhas.filter(l=>l.status!=='Falta' && l.status!=='Sem Registo').length} | Faltas: {linhas.filter(l=>l.status==='Falta').length}</p>
                </div>

                <div className="w-full overflow-x-auto mt-4 -mx-3 md:mx-0 px-3 md:px-0">
                    <table className="w-full min-w-[600px] md:min-w-0 border-collapse border border-black text-[10px]">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="border border-black p-1.5 text-left w-[26%] font-normal">Funcionario</th>
                                <th className="border border-black p-1.5 w-[12%] font-normal">Entrada</th>
                                <th className="border border-black p-1.5 w-[12%] font-normal">Saida</th>
                                <th className="border border-black p-1.5 w-[14%] font-normal">Status</th>
                                <th className="border border-black p-1.5 text-left w-[18%] font-normal">Motivo</th>
                                <th className="border border-black p-1.5 w-[7%] font-normal">Retro?</th>
                                <th className="border border-black p-1.5 text-left w-[11%] font-normal">Quem Lançou</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhas.map((l,i)=>(
                                <tr key={i} className="h-[28px]">
                                    <td className="border border-black px-1.5 font-bold">{l.nome}</td>
                                    <td className="border border-black text-center">{l.entrada}</td>
                                    <td className="border border-black text-center">{l.saida}</td>
                                    <td className="border border-black text-center">{l.status}</td>
                                    <td className="border border-black px-1.5">{l.motivo}</td>
                                    <td className="border border-black text-center">{l.retro}</td>
                                    <td className="border border-black px-1.5">{l.quem}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 text-[9px] border-t-2 border-black pt-3">
                    <p className="text-left">Documento gerado automaticamente.</p>
                    <div className="mt-20 md:mt-28 flex flex-col items-center justify-center text-center">
                        <p className="w-[220px] border-t border-black pt-1">Assinatura Rh</p>
                        <p className="mt-1 text-[8px]">Carimbo Da Empresa</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
