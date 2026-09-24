import { Check, X, Eye, Menu, Send, Clock, Ban } from 'lucide-react'
import SwipeCard from '../card/swipe'
import { getAlertStyle, getStatusKey, isEncaminhado, isAprovado, isRejeitado, isRetornoAdmin } from '../utils/status'
import { formatarTexto, formatarTempo, formatarDataCurta } from '../utils/format'

type Props = {
    ativas: any[]
    area: string
    actingId: string | null
    openSwipeId: string | null
    setOpenSwipeId: (id: string | null) => void
    onAction: (id: string, acao: any) => void
    onActionAtraso: (funcionarioId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => void
    onViewDoc: (id: string) => void
    onIgnore: (n: any) => void
    onLida: (notificacaoId: string) => void
}

export default function AtivasTab({ ativas, area, actingId, openSwipeId, setOpenSwipeId, onAction, onActionAtraso, onViewDoc, onIgnore, onLida }: Props) {
    if (ativas.length === 0) return <p className="py-12 text-center text-[12px] text-black/50">Nenhuma notificação ativa</p>

    return (
        <>
            {ativas.map((n: any) => {
                const nome = n.funcionario?.nome || n.funcionario_nome || 'Funcionário'
                const style = getAlertStyle(n)
                const status = getStatusKey(n)
                const _isAprovado = isAprovado(status)
                const _isEncaminhado = isEncaminhado(status)
                const _isRejeitado = isRejeitado(status)
                const isAtraso = n.tipo === 'atraso_excedido'
                const temAnexo =!!n.falta?.justificativa_anexo_url
                const isAdmin = area === 'admin'
                const _isRetorno = isRetornoAdmin(n)
                const isFinalizada = _isAprovado || _isRejeitado || _isEncaminhado
                const funcionarioId = n.funcionario_id || n.funcionario?.id

                // RETORNO DO ADMIN - Card verde com OK
                if (_isRetorno) {
                    return (
                        <SwipeCard
                            key={n.notificacao_id}
                            id={n.notificacao_id}
                            isOpen={openSwipeId === n.notificacao_id}
                            setOpen={setOpenSwipeId}
                            swipeWidth={100}
                            actions={
                                <div className="absolute inset-y-0 right-0 bg-green-100 flex items-center justify-end px-3" style={{ width: 100 }}>
                                    <button onClick={() => onLida(n.notificacao_id)} className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center"><Check className="w-5 h-5" /></button>
                                </div>
                            }
                        >
                            <div className={`px-3 py-2.5 ${style.bg} border-l-4 ${style.border}`}>
                                <div className="flex justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[13px]"><span className="font-bold">Admin respondeu</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p>
                                        <span className={`mt-1 inline-flex px-2.5 py-1 rounded-full text-[11px] border ${style.badge}`}>{style.label}</span>
                                        <p className="text-[12px] text-black/70 mt-1">A notificação de <b>{nome}</b> enviada dia {formatarDataCurta(n.falta?.data_inicio)} foi { _isAprovado? 'aprovada' : 'rejeitada'} pelo Admin.</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className="text-[11px] text-black/50">{formatarDataCurta(n.created_at)}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id? null : n.notificacao_id) }} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"><Menu className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </SwipeCard>
                    )
                }

                if (isAtraso) {
                    const botoesAtraso = []
                    if (isFinalizada) botoesAtraso.push('label')
                    else {
                        botoesAtraso.push('ignorar')
                        if (!isAdmin) botoesAtraso.push('encaminhar')
                        botoesAtraso.push('aplicar')
                    }
                    const qtd = botoesAtraso.length
                    const swipeWidth = qtd === 1? 90 : qtd === 2? 150 : qtd === 3? 210 : 300
                    const isFew = qtd <= 3
                    return (
                        <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId} swipeWidth={swipeWidth} onDoubleTap={() => { if (status === 'pendente') onIgnore(n) }} actions={<div className="absolute inset-y-0 right-0 bg-[#FFF3E0] flex items-center" style={{ width: swipeWidth }}><div className={`flex items-center gap-3 w-full px-3 ${isFew? 'justify-end' : 'justify-center'}`}>{isFinalizada? (<span className="text-[11px] font-bold text-black/40">{style.label}</span>) : (<><button disabled={!!actingId} onClick={() => onActionAtraso(funcionarioId, 'ignorar')} className="w-11 h-11 rounded-full bg-white border shadow-sm flex items-center justify-center text-blue-600"><Ban className="w-5 h-5" /></button>{!isAdmin && (<button disabled={!!actingId} onClick={() => onActionAtraso(funcionarioId, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-white"><Send className="w-[18px] h-[18px]" /></button>)}<button disabled={!!actingId} onClick={() => onActionAtraso(funcionarioId, 'aplicar')} className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white"><Clock className="w-5 h-5" /></button></>)}</div></div>}>
                            <div className={`px-3 py-2.5 ${style.bg} border-l-4 ${style.border}`}><div className="flex justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-[13px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p><div className="mt-1 flex flex-wrap gap-1"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border ${style.badge}`}>{style.label}</span></div><p className="text-[12px] text-black/70 mt-1.5">{n.qtd_atrasos} atrasos em {n.periodo} (limite: {n.qtd_para_falta})</p></div><div className="flex flex-col items-end gap-2 shrink-0"><span className="text-[12px] text-black/70">{formatarDataCurta(n.created_at)}</span><button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id? null : n.notificacao_id) }} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"><Menu className="w-4 h-4" /></button></div></div></div>
                        </SwipeCard>
                    )
                }

                const botoesFalta = []
                if (_isEncaminhado) botoesFalta.push(temAnexo? 'ver' : 'sem')
                else if (_isAprovado || _isRejeitado) botoesFalta.push(temAnexo? 'ver' : 'sem')
                else {
                    botoesFalta.push('rejeitar')
                    if (!isAdmin) botoesFalta.push('encaminhar')
                    botoesFalta.push('aprovar')
                    if (temAnexo) botoesFalta.push('ver')
                }
                const qtdFalta = botoesFalta.length
                const swipeWidthFalta = qtdFalta === 1? 90 : qtdFalta === 2? 150 : qtdFalta === 3? 210 : 300
                const isFewFalta = qtdFalta <= 3

                return (
                    <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId} swipeWidth={swipeWidthFalta} onDoubleTap={() => { if (status === 'pendente' && n.falta?.id) onIgnore(n) }} actions={<div className="absolute inset-y-0 right-0 bg-[#E8F2FF] flex items-center" style={{ width: swipeWidthFalta }}><div className={`flex items-center gap-3 w-full px-3 ${isFewFalta? 'justify-end' : 'justify-center'}`}>{_isEncaminhado && (<>{temAnexo? (<button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>) : <span className="text-[11px] text-black/40">Sem anexo</span>}</>)}{(_isAprovado || _isRejeitado) &&!_isEncaminhado && (<>{temAnexo? (<button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>) : <span className="text-[11px] text-black/40">Sem anexo</span>}</>)}{!isFinalizada && (<><button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'rejeitar')} className="w-11 h-11 rounded-full bg-white border flex items-center justify-center text-red-600"><X className="w-5 h-5" /></button>{!isAdmin && (<button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-white"><Send className="w-[18px] h-[18px]" /></button>)}<button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'aprovar')} className="w-11 h-11 rounded-full bg-[#0095ff] flex items-center justify-center text-white"><Check className="w-5 h-5" /></button>{temAnexo && <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}</>)}</div></div>}>
                        <div className={`px-3 py-2.5 ${style.bg} border-l-4 ${style.border}`}><div className="flex justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-[13px] truncate"><span className="font-bold text-black">{nome}</span><span className="text-black/60"> · {formatarTempo(n.created_at)}</span></p><div className="mt-1 flex flex-wrap gap-1"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border ${style.badge}`}>{style.label}</span></div><p className="text-[12px] text-black/70 mt-1.5">Doc: <span className="text-[#0095ff]">{formatarTexto(n.falta?.justificativa_tipo || 'Atestado')}</span></p>{n.falta?.justificativa_obs && <p className="text-[12px] text-black/60 mt-1 line-clamp-2">{n.falta.justificativa_obs}</p>}{n.falta?.lancado_por_nome && <p className="text-[11px] text-black/40 mt-1">Lançado por: {n.falta.lancado_por_nome}</p>}</div><div className="flex flex-col items-end gap-2 shrink-0"><span className="text-[12px] text-black/70">{formatarDataCurta(n.created_at)}</span><button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id? null : n.notificacao_id) }} className="w-7 h-7 rounded-full bg-white border flex items-center justify-center"><Menu className="w-4 h-4" /></button></div></div></div>
                    </SwipeCard>
                )
            })}
        </>
    )
}
