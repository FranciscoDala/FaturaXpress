import { getAlertStyle, getStatusKey } from '../utils/status'
import { formatarTempo, formatarDataCurta, getDataChave } from '../utils/format'

export default function HistoricoTab({ agrupado }: { agrupado: [string, any[]][] }) {
    if (agrupado.length === 0) return <p className="py-12 text-center text-[12px] text-black/50">Histórico vazio (7 dias)</p>

    return (
        <>
            {agrupado.map(([dataChave, lista]) => {
                const d = new Date(dataChave)
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
                const isHoje = getDataChave(hoje.toISOString()) === dataChave
                const isOntem = getDataChave(ontem.toISOString()) === dataChave
                const label = isHoje ? `HOJE • ${formatarDataCurta(d.toISOString())}` : isOntem ? `ONTEM • ${formatarDataCurta(d.toISOString())}` : formatarDataCurta(d.toISOString()).toUpperCase()
                return (
                    <div key={dataChave}>
                        <div className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur px-3 py-1.5 border-b">
                            <p className="text-[11px] font-bold text-black/60 tracking-wide">{label}</p>
                        </div>
                        {lista.map((n: any) => {
                            const style = getAlertStyle(n)
                            const nome = n.funcionario?.nome || 'Funcionário'
                            return (
                                <div key={n.notificacao_id} className={`px-3 py-2.5 border-b last:border-b-0 ${style.bg} border-l-4 ${style.border}`}>
                                    <div className="flex justify-between gap-2">
                                        <div className="min-w-0 flex-1 leading-tight">
                                            <p className="text-[13px] leading-[16px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                            <div className="mt-1"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-medium leading-none ${style.badge}`}>{style.label}</span></div>
                                            <p className="text-[11px] text-black/50 mt-1">{formatarDataCurta(n.updated_at || n.created_at)} • {new Date(n.updated_at || n.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                        <span className="text-[12px] text-black/70">{formatarDataCurta(n.updated_at || n.created_at)}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )
            })}
        </>
    )
}
