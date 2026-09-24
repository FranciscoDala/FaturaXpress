import { Eye, Menu } from 'lucide-react'
import SwipeCard from '../card/swipe'
import { getAlertStyle } from '../utils/status'
import { formatarTempo, formatarDataCurta, getDataChave } from '../utils/format'

type Props = {
    agrupado: [string, any[]][]
    onViewDoc?: (faltaId: string) => void
    openSwipeId?: string | null
    setOpenSwipeId?: (id: string | null) => void
}

function NomeComHora({ nome, tempo, data }: { nome: string, tempo: string, data: string }) {
    const partes = nome.trim().split(' ').filter(Boolean)
    const ultimo = partes.pop() || ''
    const resto = partes.join(' ')
    return (
        <span className="text-[13px] leading-[19px] break-words whitespace-normal">
            {resto && <span className="font-bold text-black">{resto} </span>}
            <span className="font-bold text-black whitespace-nowrap">
                {ultimo}
                <span className="text-[11px] text-black/50 font-normal ml-1.5 whitespace-nowrap">• {tempo} - {data}</span>
            </span>
        </span>
    )
}

export default function HistoricoTab({ agrupado, onViewDoc, openSwipeId, setOpenSwipeId }: Props) {
    if (agrupado.length === 0) return <p className="py-12 text-center text-[12px] text-black/50">Histórico vazio (7 dias)</p>

    return (
        <>
            {agrupado.map(([dataChave, lista]) => {
                const d = new Date(dataChave)
                const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
                const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
                const isHoje = getDataChave(hoje.toISOString()) === dataChave
                const isOntem = getDataChave(ontem.toISOString()) === dataChave
                const label = isHoje? `HOJE • ${formatarDataCurta(d.toISOString())}` : isOntem? `ONTEM • ${formatarDataCurta(d.toISOString())}` : formatarDataCurta(d.toISOString()).toUpperCase()
                return (
                    <div key={dataChave}>
                        <div className="sticky top-0 z-10 bg-gray-100/90 backdrop-blur px-3 py-1.5 border-b">
                            <p className="text-[11px] font-bold text-black/60 tracking-wide">{label}</p>
                        </div>
                        {lista.map((n: any) => {
                            const style = getAlertStyle(n) as any
                            const nomeFunc = n.funcionario?.nome || n.funcionario_nome || 'Funcionário'
                            const temAnexo =!!n.falta?.justificativa_anexo_url
                            const faltaId = n.falta?.id
                            const tempo = formatarTempo(n.created_at)
                            const dataCurta = formatarDataCurta(n.updated_at || n.created_at)
                            const isSwipe =!!setOpenSwipeId

                            const content = (
                                <div className={`px-3 py-2.5 border-b last:border-b-0 ${style.bg} border-l-4 ${style.border}`}>
                                    <div className="flex justify-between gap-3 items-start">
                                        <div className="min-w-0 flex-1 leading-tight">Justificação de falta de •
                                            <NomeComHora nome={nomeFunc} tempo={tempo} data={dataCurta} />
                                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-bold leading-none ${style.badge} break-words whitespace-normal`}>{style.label}</span>
                                            </div>
                                            <p className="text-[11px] text-black/60 mt-1 break-words">Responsável: {style.aprovador}</p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0 self-center">
                                            {temAnexo && faltaId && onViewDoc &&!isSwipe && (
                                                <button onClick={() => onViewDoc(faltaId)} className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shadow-sm">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            )}
                                            {isSwipe? (
                                                <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId!(openSwipeId === n.notificacao_id? null : n.notificacao_id) }} className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm">
                                                    <Menu className="w-4 h-4 text-black" />
                                                </button>
                                            ) : (
                                                <span className="text-[11px] text-black/50 whitespace-nowrap">{dataCurta}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )

                            if (!isSwipe) return <div key={n.notificacao_id}>{content}</div>

                            return (
                                <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId!} swipeWidth={temAnexo? 130 : 70} actions={
                                    <div className="absolute inset-y-0 right-0 bg-gray-100 flex items-center justify-end px-3 gap-2" style={{ width: temAnexo? 130 : 70 }}>
                                        {temAnexo && faltaId && onViewDoc && (
                                            <button onClick={() => onViewDoc(faltaId)} className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        )}
                                        <span className="text-[11px] text-black/50 whitespace-nowrap">{dataCurta}</span>
                                    </div>
                                }>
                                    {content}
                                </SwipeCard>
                            )
                        })}
                    </div>
                )
            })}
        </>
    )
}
