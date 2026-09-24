import { Check, X, Eye, Menu, Send } from 'lucide-react'
import SwipeCard from '../card/swipe'
import { getAlertStyle, getStatusKey, isEncaminhado, isAprovado, isRejeitado } from '../utils/status'
import { formatarTexto, formatarTempo, formatarDataCurta } from '../utils/format'

type Props = {
    ativas: any[]
    area: string
    actingId: string | null
    openSwipeId: string | null
    setOpenSwipeId: (id: string | null) => void
    onAction: (id: string, acao: any) => void
    onViewDoc: (id: string) => void
    onIgnore: (n: any) => void
}

export default function AtivasTab({ ativas, area, actingId, openSwipeId, setOpenSwipeId, onAction, onViewDoc, onIgnore }: Props) {
    if (ativas.length === 0) return <p className="py-12 text-center text-[12px] text-black/50">Nenhuma ativa</p>

    return (
        <>
            {ativas.map((n: any) => {
                const nome = n.funcionario?.nome || 'Funcionário'
                const style = getAlertStyle(n)
                const status = getStatusKey(n)
                const _isAprovado = isAprovado(status)
                const _isEncaminhado = isEncaminhado(status)
                const _isRejeitado = isRejeitado(status)
                const temAnexo = !!n.falta?.justificativa_anexo_url
                const isAdmin = area === 'admin'

                // REGRA 2: Se já foi encaminhado, só pode ver doc
                const isFinalizada = _isAprovado || _isRejeitado || _isEncaminhado

                return (
                    <SwipeCard
                        key={n.notificacao_id}
                        id={n.notificacao_id}
                        isOpen={openSwipeId === n.notificacao_id}
                        setOpen={setOpenSwipeId}
                        onDoubleTap={() => {
                            if (status === 'pendente' && n.falta?.id) onIgnore(n)
                        }}
                        actions={
                            <div className="absolute inset-y-0 right-0 w-[300px] bg-[#E8F2FF] flex items-center justify-center">
                                <div className="flex items-center gap-3">
                                    {/* CASO 1: ENCAMINHADA - SÓ VER DOC (vale pra RH e ADMIN) */}
                                    {_isEncaminhado && (
                                        <>
                                            {temAnexo ? (
                                                <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black shadow-sm flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>
                                            ) : <span className="text-[11px] text-black/40">Sem anexo</span>}
                                        </>
                                    )}

                                    {/* CASO 2: APROVADA / REJEITADA - SÓ VER DOC */}
                                    {(_isAprovado || _isRejeitado) && !_isEncaminhado && (
                                        <>
                                            {temAnexo ? (
                                                <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black shadow-sm flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>
                                            ) : <span className="text-[11px] text-black/40">Sem anexo</span>}
                                        </>
                                    )}

                                    {/* CASO 3: PENDENTE / IGNORADA */}
                                    {!isFinalizada && (
                                        <>
                                            <button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'rejeitar')} className="w-11 h-11 rounded-full bg-white border shadow-sm flex items-center justify-center text-red-600 active:scale-90 transition-transform"><X className="w-5 h-5" /></button>

                                            {/* REGRA 1: ADMIN NÃO TEM BOTÃO ENCAMINHAR */}
                                            {!isAdmin && (
                                                <button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 shadow-sm flex items-center justify-center text-white active:scale-90 transition-transform"><Send className="w-[18px] h-[18px]" /></button>
                                            )}

                                            <button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'aprovar')} className="w-11 h-11 rounded-full bg-[#0095ff] shadow-sm flex items-center justify-center text-white active:scale-90 transition-transform"><Check className="w-5 h-5" /></button>
                                            {temAnexo && <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black shadow-sm flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}
                                        </>
                                    )}
                                </div>
                            </div>
                        }
                    >
                        <div className={`px-3 py-2.5 ${style.bg} border-l-4 ${style.border}`}>
                            <div className="flex justify-between gap-2">
                                <div className="min-w-0 flex-1 leading-tight">
                                    <p className="text-[13px] leading-[16px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-medium leading-none ${style.badge}`}>{style.label}</span>
                                    </div>
                                    <p className="text-[12px] leading-[16px] text-black/70 mt-1.5">Doc: <span className="text-[#0095ff]">{formatarTexto(n.falta?.justificativa_tipo || 'Atestado')}</span></p>
                                    {n.falta?.justificativa_obs && <p className="text-[12px] leading-[16px] text-black/60 mt-1">{n.falta.justificativa_obs}</p>}
                                </div>
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className="text-[12px] text-black/70">{formatarDataCurta(n.created_at)}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id ? null : n.notificacao_id) }} className="w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center"><Menu className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    </SwipeCard>
                )
            })}
        </>
    )
}
