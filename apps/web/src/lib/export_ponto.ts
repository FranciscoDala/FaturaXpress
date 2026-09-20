import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function formatAtraso(min: number) {
    if (!min || min <= 0) return '---'
    if (min < 60) return `${min}min`
    const h = Math.floor(min / 60)
    const m = min % 60
    return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}min`
}
function fmtHora(iso?: string) { if (!iso) return '---'; return new Date(iso).toLocaleTimeString('pt-AO') }
function fmtDisplay(iso: string) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
function prettyFalta(motivo: string) { if (!motivo) return "Nao apareceu"; if (motivo.includes('|')) return motivo.split('|')[1]?.trim() || motivo; return motivo }

export function exportPontoPDF(data: string, pontos: any[], faltas: any[], funcs: any[] = [], minDate?: string, hoje?: string) {
    const doc = new jsPDF('l', 'mm', 'a4')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`RELATORIO DE AUDITORIA DE PONTO - ${fmtDisplay(data)}`, 14, 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Janela: ${minDate ? fmtDisplay(minDate) + ' ate ' + fmtDisplay(hoje || data) : '7 dias'} | Gerado: ${new Date().toLocaleString('pt-AO')}`, 14, 14)

    const porPonto = new Map<string, any[]>()
    pontos.forEach(p => { if (!porPonto.has(p.funcionario_id)) porPonto.set(p.funcionario_id, []); porPonto.get(p.funcionario_id)!.push(p) })
    const porFalta = new Map<string, any>()
    faltas.forEach(f => { if (!porFalta.has(f.funcionario_id)) porFalta.set(f.funcionario_id, f) })

    const body = funcs.map((func: any) => {
        const lista = (porPonto.get(func.id) || []).sort((a: any, b: any) => +new Date(a.timestamp) - +new Date(b.timestamp))
        const entrada = lista.find((p: any) => p.tipo === 'entrada')
        const saida = [...lista].reverse().find((p: any) => p.tipo === 'saida')
        const falta = porFalta.get(func.id)
        let status = 'SEM REGISTO'; if (falta) status = 'FALTA'; else if (entrada && saida) status = 'COMPLETO'; else if (entrada) status = 'SÓ ENTRADA'
        const motivo = falta ? prettyFalta(falta.motivo) : (entrada?.atraso_min ? formatAtraso(entrada.atraso_min) + ' atraso' : 'Presente')
        return [func.nome, entrada ? fmtHora(entrada.timestamp) : '---', saida ? fmtHora(saida.timestamp) : '---', status, motivo, (entrada?.is_retroativo || falta?.is_retroativo) ? 'SIM' : 'NAO', entrada?.lancado_por_nome || falta?.lancado_por_nome || 'Proprio']
    })

    autoTable(doc, {
        startY: 18,
        head: [['Funcionario', 'Entrada', 'Saida', 'Status', 'Motivo / Atraso', 'Retro?', 'Quem Lancou']],
        body,
        styles: { fontSize: 7, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        theme: 'grid'
    })
    doc.save(`auditoria-ponto-${data}.pdf`)
}
