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
            let status = 'SEM REGISTO'; if(falta) status='FALTA'; else if(entrada && saida) status='COMPLETO'; else if(entrada) status='SÓ ENTRADA'; else if(saida) status='SÓ SAIDA'
            const motivo = falta? (falta.motivo_retroativo || prettyFalta(falta.motivo)) : (entrada?.motivo_retroativo || (entrada?.atraso_min? formatAtraso(entrada.atraso_min) : 'Presente'))
            return { nome: func.nome, entrada: entrada? fmtHora(entrada.timestamp) : '---', saida: saida? fmtHora(saida.timestamp) : '---', status, motivo, retro: isRetro? 'SIM' : 'NAO', quem: entrada?.lancado_por_nome || saida?.lancado_por_nome || falta?.lancado_por_nome || (lista.length? 'Proprio' : 'RH') }
        })
    },[funcs,pontos,faltas])

    return (
        <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto">
            <style>{`@media print{.no-print{display:none} #relatorio{border:none} }`}</style>
            <div className="no-print sticky top-0 bg-white border-b p-3 flex justify-between items-center">
                <button onClick={()=>window.print()} className="h-9 px-5 bg-black text-white rounded-full text-[12px] font-bold">Imprimir</button>
                <button onClick={onClose} className="h-9 w-9 bg-zinc-100 rounded-full flex items-center justify-center"><X className="w-4 h-4"/></button>
            </div>

            <div id="relatorio" className="w-[210mm] min-h-[297mm] mx-auto p-[12mm] bg-white text-black font-[Arial] border">
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                    <div className="flex gap-4">
                        {emp.logo? <img src={emp.logo} className="w-[70px] h-[70px] object-contain border"/> : <div className="w-[70px] h-[70px] border-2 border-black flex items-center justify-center font-black text-[22px]">{emp.nome.charAt(0)}</div>}
                        <div className="text-[11px] leading-[15px]">
                            <p className="font-bold text-[14px] uppercase">{emp.nome}</p>
                            <p>NIF: {emp.nif}</p>
                            <p>{emp.endereco}</p>
                            <p>Tel: {emp.telefone} | Email: {emp.email}</p>
                            <p>{emp.cidade}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-[12px] border-2 border-black px-3 py-1">AUDITORIA DE PONTO</p>
                        <p className="text-[10px] mt-2">Data: {fmtDisplay(dataSelecionada)}</p>
                        <p className="text-[9px]">Emissao: {new Date().toLocaleString('pt-AO')}</p>
                    </div>
                </div>

                <div className="mt-4 text-[10px] flex justify-between font-bold">
                    <p>Periodo: {fmtDisplay(minDate)} ate {fmtDisplay(hoje)}</p>
                    <p>Total: {funcs.length} | Presentes: {linhas.filter(l=>l.status!=='FALTA' && l.status!=='SEM REGISTO').length} | Faltas: {linhas.filter(l=>l.status==='FALTA').length}</p>
                </div>

                <table className="w-full mt-4 border-collapse border border-black text-[10px]">
                    <thead><tr className="bg-black text-white"><th className="border border-black p-1.5 text-left w-[26%]">FUNCIONARIO</th><th className="border border-black p-1.5 w-[10%]">ENTRADA</th><th className="border border-black p-1.5 w-[10%]">SAIDA</th><th className="border border-black p-1.5 w-[12%]">STATUS</th><th className="border border-black p-1.5 text-left w-[20%]">MOTIVO / ATRASO</th><th className="border border-black p-1.5 w-[8%]">RETRO?</th><th className="border border-black p-1.5 text-left w-[14%]">QUEM LANCOU</th></tr></thead>
                    <tbody>{linhas.map((l,i)=>(<tr key={i} className="h-[26px]"><td className="border border-black px-1.5 font-bold">{l.nome}</td><td className="border border-black text-center">{l.entrada}</td><td className="border border-black text-center">{l.saida}</td><td className="border border-black text-center font-bold">{l.status}</td><td className="border border-black px-1.5">{l.motivo}</td><td className="border border-black text-center">{l.retro}</td><td className="border border-black px-1.5">{l.quem}</td></tr>))}</tbody>
                </table>

                <div className="mt-6 text-[9px] leading-[13px] border-t-2 border-black pt-3 flex justify-between">
                    <div><p>Documento gerado automaticamente.</p></div>
                    <div className="text-right"><p>Assinatura RH: _________________________</p></div>
                </div>
            </div>
        </div>
    )
}
