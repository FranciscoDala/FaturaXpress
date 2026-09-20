import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportPontoPDF(data: string, pontos: any[], faltas: any[]){
  const doc = new jsPDF()
  doc.setFontSize(14)
  doc.text(`Relatório Ponto - ${data}`, 14, 15)
  doc.setFontSize(9)
  doc.text(`Gerado em ${new Date().toLocaleString('pt-AO')}`, 14, 22)

  autoTable(doc, {
    startY: 28,
    head: [['Funcionário','Tipo','Hora','Retro?','Quem lançou','Motivo']],
    body: pontos.map((p:any)=>[
      p.funcionario_nome || p.funcionario_id.slice(0,8),
      p.tipo,
      new Date(p.timestamp).toLocaleTimeString(),
      p.is_retroativo? 'SIM' : 'NÃO',
      p.lancado_por_nome || '-',
      p.motivo_retroativo || '-'
    ])
  })

  const finalY = (doc as any).lastAutoTable.finalY || 50
  autoTable(doc, {
    startY: finalY + 10,
    head: [['Faltas do dia']],
    body: faltas.map((f:any)=>[`${f.funcionario_nome || f.funcionario_id} - ${f.motivo} ${f.is_retroativo?'[RETRO: '+f.motivo_retroativo+']':''}`])
  })

  doc.save(`ponto-${data}.pdf`)
}
