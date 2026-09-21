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
function toTitle(str: string){ if(!str) return '---'; return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) }

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
        <div className="fixed inset-0 z-[10000] bg-[#323233] flex flex-col overflow-hidden">
            <style>{`
                @media print{
                   .no-print{display:none!important}
                   .pdf-bg{background:white!important}
                    #relatorio{box-shadow:none!important; margin:0!important; width:210mm!important; border:none!important}
                }
            `}</style>

            {/* HEADER ESTILO PDF VIEWER */}
            <div className="no-print h-[56px] bg-[#323233] flex items-center justify-between px-3 md:px-4 shrink-0 text-white">
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><X className="w-4 h-4"/></button>
                    <p className="text-[13px] md:text-[14px] font-bold tracking-wide">FOLHA DE PONTO - {fmtDisplay(dataSelecionada)}</p>
                    <span className="hidden md:flex text-[11px] bg-white/10 px-2 py-0.5 rounded">1 / 1</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="hidden md:flex text-[11px] bg-white/10 px-2 py-0.5 rounded">100%</span>
                    <button onClick={()=>window.print()} className="h-8 px-4 bg-white text-black rounded-full text-[12px] font-bold hover:bg-zinc-200">Imprimir</button>
                </div>
            </div>

            {/* AREA DA FOLHA - FUNDO ESCURO */}
            <div className="pdf-bg flex-1 overflow-y-auto overflow-x-auto bg-[#525659] p-2 md:p-6 flex justify-center items-start">
                <div id="relatorio" className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black font-[Arial] shadow-[0_0_25px_rgba(0,0,0,0.6)] p-4 md:p-[12mm] mx-auto">

                    <div className="text-center mb-4">
                        <p className="font-bold text-[16px] md:text-[18px]">Folha De Ponto - Período: {fmtDisplay(minDate)} até {fmtDisplay(hoje)}</p>
                    </div>

                    <div className="flex gap-4 border border-black p-2 mb-3">
                        {emp.logo? <img src={emp.logo} className="w-[75px] h-[75px] object-contain shrink-0"/> : <div className="w-[75px] h-[75px] flex items-center justify-center font-black text-[24px] shrink-0">{emp.nome.charAt(0).toUpperCase()}</div>}
                        <div className="text-[13px] md:text-[14px] leading-[18px] md:leading-[20px] min-w-0 flex-1">
                            <p className="font-bold text-[15px] md:text-[16px] capitalize">{emp.nome.toLowerCase()}</p>
                            <p>Nif: {emp.nif}</p>
                            <p className="capitalize">{emp.endereco.toLowerCase()} - {emp.cidade.toLowerCase()}</p>
                            <p>Tel: {emp.telefone} | Email: {emp.email}</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:justify-between gap-1 text-[13px] md:text-[14px] font-bold mb-3 capitalize">
                        <p>Período: {fmtDisplay(minDate)} até {fmtDisplay(hoje)}</p>
                        <p>Total: {funcs.length} | Presentes: {linhas.filter(l=>l.status!=='Falta' && l.status!=='Sem Registo').length} | Faltas: {linhas.filter(l=>l.status==='Falta').length}</p>
                    </div>

                    <table className="w-full border-collapse border border-black text-[13px] md:text-[14px]">
                        <thead>
                            <tr className="bg-black text-white">
                                <th className="border border-black p-2 text-left font-normal">Funcionario</th>
                                <th className="border border-black p-2 font-normal">Entrada</th>
                                <th className="border border-black p-2 font-normal">Saida</th>
                                <th className="border border-black p-2 font-normal">Status</th>
                                <th className="border border-black p-2 text-left font-normal">Motivo</th>
                                <th className="border border-black p-2 font-normal">Retro?</th>
                                <th className="border border-black p-2 text-left font-normal">Quem Lançou</th>
                            </tr>
                        </thead>
                        <tbody>
                            {linhas.map((l,i)=>(
                                <tr key={i} className="h-[34px]">
                                    <td className="border border-black px-2 font-bold">{l.nome}</td>
                                    <td className="border border-black text-center">{l.entrada}</td>
                                    <td className="border border-black text-center">{l.saida}</td>
                                    <td className="border border-black text-center">{l.status}</td>
                                    <td className="border border-black px-2">{l.motivo}</td>
                                    <td className="border border-black text-center">{l.retro}</td>
                                    <td className="border border-black px-2">{l.quem}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mt-6 text-[13px]">
                        <p>Documento gerado automaticamente.</p>
                    </div>

                    <div className="mt-24 md:mt-32 flex flex-col items-center justify-center text-center">
                        <div className="w-[260px] border-t border-black pt-2">
                            <p className="text-[14px] font-bold">Assinatura Rh</p>
                        </div>
                        <p className="mt-2 text-[11px]">Carimbo Da Empresa</p>
                        <p className="mt-1 text-[10px] text-zinc-500">Emissão: {new Date().toLocaleString('pt-AO')}</p>
                    </div>

                </div>
            </div>
        </div>
    )
}
