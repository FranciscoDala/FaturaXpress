import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmtHora(iso?: string){
  if(!iso) return '---'
  return new Date(iso).toLocaleTimeString('pt-AO')
}
function fmtDisplay(iso: string){
  if(!iso) return ''
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}
function prettyFalta(motivo: string){
  if(!motivo) return "Não apareceu"
  if(motivo.includes('|')) return motivo.split('|')[1]?.trim() || motivo
  return motivo
}

export function exportPontoPDF(
  data: string,
  pontos: any[],
  faltas: any[],
  funcs: any[] = [],
  minDate?: string,
  hoje?: string
){
  const doc = new jsPDF('l','mm','a4')
  doc.setFontSize(14)
  doc.text(`Relatório Diário de Ponto - ${fmtDisplay(data)}`, 14, 12)
  doc.setFontSize(9)
  doc.text(`Gerado: ${new Date().toLocaleString('pt-AO')} | Janela: ${minDate? fmtDisplay(minDate)+' até '+fmtDisplay(hoje||data) : '7 dias'} | Total: ${funcs.length || pontos.length} func.`, 14, 18)

  const porPonto = new Map<string, any[]>()
  pontos.forEach(p=>{
    if(!porPonto.has(p.funcionario_id)) porPonto.set(p.funcionario_id, [])
    porPonto.get(p.funcionario_id)!.push(p)
  })
  const porFalta = new Map<string, any>()
  faltas.forEach(f=>{
    if(!porFalta.has(f.funcionario_id)) porFalta.set(f.funcionario_id, f)
  })

  const listaFuncs = funcs.length? funcs : [...new Set([...pontos.map((p:any)=>p.funcionario_id),...faltas.map((f:any)=>f.funcionario_id)])].map(id=>({id, nome: pontos.find((p:any)=>p.funcionario_id===id)?.funcionario_nome || faltas.find((f:any)=>f.funcionario_id===id)?.funcionario_nome || (id as string).slice(0,8)}))

  const body = listaFuncs.map((func:any)=>{
    const lista = (porPonto.get(func.id) || []).sort((a:any,b:any)=> +new Date(a.timestamp) - +new Date(b.timestamp))
    const entrada = lista.find((p:any)=>p.tipo==='entrada')
    const saida = [...lista].reverse().find((p:any)=>p.tipo==='saida')
    const falta = porFalta.get(func.id)

    const isRetro = (entrada?.is_retroativo || saida?.is_retroativo || falta?.is_retroativo)? 'SIM' : 'NÃO'
    const quem = entrada?.lancado_por_nome || saida?.lancado_por_nome || falta?.lancado_por_nome || (lista.length? 'Próprio' : falta? 'RH' : '---')
    const horaLanc = entrada?.lancado_em || saida?.lancado_em || falta?.lancado_em || ''
    const horaLancFmt = horaLanc? fmtHora(horaLanc) : (entrada? fmtHora(entrada.timestamp) : '---')

    let status = 'SEM REGISTO'
    if(falta) status = 'FALTA'
    else if(entrada && saida) status = 'COMPLETO'
    else if(entrada) status = 'SÓ ENTRADA'
    else if(saida) status = 'SÓ SAÍDA'

    const motivo = falta? (falta.motivo_retroativo || prettyFalta(falta.motivo)) : (entrada?.motivo_retroativo || saida?.motivo_retroativo || (entrada?.atraso_min? `${entrada.atraso_min}min atraso` : '---'))

    return [
      func.nome,
      entrada? fmtHora(entrada.timestamp) : '---',
      saida? fmtHora(saida.timestamp) : '---',
      status,
      (motivo||'---').slice(0,40),
      isRetro,
      (quem||'---').slice(0,18),
      horaLancFmt
    ]
  })

  autoTable(doc, {
    startY: 22,
    head: [['Funcionário','Entrada','Saída','Status','Motivo','Retro?','Quem Lançou','H. Lanç.']],
    body,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [26,92,168], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60 },
      3: { cellWidth: 28 },
      4: { cellWidth: 70 },
    },
    // FIX DO ERRO TS - CAST PARA any[]
    didParseCell: (hook) => {
      if(hook.section==='body'){
        const raw = hook.row.raw as any[]
        const status = raw?.[3] as string
        const retro = raw?.[5] as string
        if(status==='FALTA'){
          (hook.cell.styles as any).fillColor = [255,240,240]
        }
        if(retro==='SIM' && status!=='FALTA'){
          (hook.cell.styles as any).fillColor = [255,251,235]
        }
      }
    }
  })

  const finalY = (doc as any).lastAutoTable.finalY || 30
  const totalPres = body.filter((b:any)=>b[3]!=='FALTA' && b[3]!=='SEM REGISTO').length
  const totalFaltas = body.filter((b:any)=>b[3]==='FALTA').length
  const totalRetro = body.filter((b:any)=>b[5]==='SIM').length

  doc.setFontSize(9)
  doc.text(`Resumo: Presentes ${totalPres} | Faltas ${totalFaltas} | Retroativos ${totalRetro}`, 14, finalY + 8)

  doc.save(`ponto-${data}.pdf`)
}
