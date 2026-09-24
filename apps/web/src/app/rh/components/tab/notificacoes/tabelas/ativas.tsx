import { Check, X, Eye, Menu, Send, Clock, Ban } from 'lucide-react'
import SwipeCard from '../card/swipe'
import { getAlertStyle, getStatusKey, isEncaminhado, isAprovado, isRejeitado, isRetornoAdmin } from '../utils/status'
import { formatarTexto, formatarTempo, formatarDataCurta, getDataChave } from '../utils/format'

type Props = {
    agrupado: [string, any[]][]
    area: string
    actingId: string | null
    openSwipeId: string | null
    setOpenSwipeId: (id: string | null) => void
    onAction: (id: string, acao: any) => void
    onActionAtraso: (funcionarioId: string, acao: 'aplicar' | 'ignorar' | 'encaminhar') => void
    onViewDoc: (id: string) => void
    onIgnore: (n: any) => void
    onLida: (id: string) => void
}

export default function AtivasTab({ agrupado, area, actingId, openSwipeId, setOpenSwipeId, onAction, onActionAtraso, onViewDoc, onIgnore, onLida }: Props) {
    if (agrupado.length === 0) return <p className="py-12 text-center text-[12px] text-black/50">Nenhuma notificação ativa</p>

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
                            const nomeFunc = n.funcionario?.nome || n.funcionario_nome || 'Funcionário'
                            const style = getAlertStyle(n) as any
                            const status = getStatusKey(n)
                            const _isAprovado = isAprovado(status)
                            const _isEncaminhado = isEncaminhado(status)
                            const _isRejeitado = isRejeitado(status)
                            const _isRetorno = isRetornoAdmin(n)
                            const isAtraso = n.tipo === 'atraso_excedido'
                            const temAnexo = !!n.falta?.justificativa_anexo_url
                            const isAdmin = area === 'admin'
                            const isFinalizada = _isAprovado || _isRejeitado || _isEncaminhado
                            const funcionarioId = n.funcionario_id || n.funcionario?.id
                            const aprovadorNome = style.aprovador || n.aprovado_por_nome || n.falta?.aprovado_por_nome || 'Admin'

                            if (_isRetorno) {
                                return (
                                    <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId} swipeWidth={temAnexo ? 170 : 110} actions={
                                        <div className="absolute inset-y-0 right-0 bg-green-100 flex items-center justify-end px-3 gap-2" style={{ width: temAnexo ? 170 : 110 }}>
                                            {temAnexo && <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}
                                            <button disabled={!!actingId} onClick={() => onLida(n.notificacao_id)} className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center font-bold text-[12px]">OK</button>
                                        </div>
                                    }>
                                        <div className={`px-3 py-3 ${style.bg} border-l-4 ${style.border}`}>
                                            <div className="flex justify-between gap-3 items-start">
                                                <div className="min-w-0 flex-1 leading-tight">
                                                    <div className="text-[13px] leading-[18px] break-words whitespace-normal">
                                                        <span className="font-bold text-black">{aprovadorNome}</span>
                                                        <span className="font-medium text-black"> respondeu • </span>
                                                        <span className="font-bold text-black">{nomeFunc}</span>
                                                    </div>
                                                    <span className="text-[11px] text-black/50 font-normal mt-0.5 inline-block">• {formatarTempo(n.created_at)}</span>
                                                    <div className="mt-1.5"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-bold ${style.badge}`}>{style.label}</span></div>
                                                    <p className="text-[12px] text-black/70 mt-1 break-words">Falta do dia {formatarDataCurta(n.falta?.data_inicio || n.created_at)} foi {_isAprovado ? 'aprovada' : 'rejeitada'}.</p>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id ? null : n.notificacao_id) }} className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center self-center shrink-0 shadow-sm"><Menu className="w-4 h-4 text-black" /></button>
                                            </div>
                                        </div>
                                    </SwipeCard>
                                )
                            }

                            if (isAtraso) {
                                const swipeWidth = isFinalizada ? 90 : (!isAdmin ? 210 : 150)
                                return (
                                    <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId} swipeWidth={swipeWidth} onDoubleTap={() => { if (status === 'pendente') onIgnore(n) }} actions={
                                        <div className="absolute inset-y-0 right-0 bg-[#FFF3E0] flex items-center justify-end px-3 gap-2" style={{ width: swipeWidth }}>
                                            {isFinalizada ? (
                                                <span className="text-[11px] font-bold text-black/60">{style.label}</span>
                                            ) : (
                                                <>
                                                    <button disabled={!!actingId} onClick={() => onActionAtraso(funcionarioId, 'ignorar')} className="w-11 h-11 rounded-full bg-white border flex items-center justify-center text-blue-600"><Ban className="w-5 h-5" /></button>
                                                    {!isAdmin && <button disabled={!!actingId} onClick={() => onActionAtraso(funcionarioId, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-white"><Send className="w-[18px] h-[18px]" /></button>}
                                                    <button disabled={!!actingId} onClick={() => onActionAtraso(funcionarioId, 'aplicar')} className="w-11 h-11 rounded-full bg-orange-500 flex items-center justify-center text-white"><Clock className="w-5 h-5" /></button>
                                                </>
                                            )}
                                        </div>
                                    }>
                                        <div className={`px-3 py-3 ${style.bg} border-l-4 ${style.border}`}>
                                            <div className="flex justify-between gap-3 items-start">
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] leading-[18px] break-words whitespace-normal">
                                                        <span className="font-bold text-black">{nomeFunc}</span>
                                                    </div>
                                                    <span className="text-[11px] text-black/50 font-normal mt-0.5 inline-block">• {formatarTempo(n.created_at)}</span>
                                                    <div className="mt-1"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-bold ${style.badge}`}>{style.label}</span></div>
                                                    <p className="text-[12px] text-black/70 mt-1 break-words">{n.qtd_atrasos} atrasos em {n.periodo}</p>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id ? null : n.notificacao_id) }} className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center self-center shrink-0 shadow-sm"><Menu className="w-4 h-4 text-black" /></button>
                                            </div>
                                        </div>
                                    </SwipeCard>
                                )
                            }

                            const botoesFalta = isFinalizada ? (temAnexo ? ['ver'] : []) : ['rejeitar', ...(!isAdmin ? ['encaminhar'] : []), 'aprovar', ...(temAnexo ? ['ver'] : [])]

                            if (botoesFalta.length === 0) {
                                return (
                                    <div key={n.notificacao_id} className={`px-3 py-3 border-b last:border-b-0 ${style.bg} border-l-4 ${style.border}`}>
                                        <div className="flex justify-between gap-3 items-center">
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <p className="text-[13px] leading-[18px] truncate whitespace-nowrap">
                                                    <span className="font-bold text-black">Justificação de falta de • {nomeFunc} <b className="text-[11px] text-black/50 font-normal ml-1.5">• {formatarTempo(n.created_at)}</b></span>

                                                </p>
                                                <div className="mt-1"><span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-bold ${style.badge}`}>{style.label}</span></div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id ? null : n.notificacao_id) }} className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center self-center shrink-0 shadow-sm"><Menu className="w-4 h-4 text-black" /></button>
                                        </div>
                                    </div>
                                )
                            }

                            const swipeWidthFalta = botoesFalta.length === 1 ? 90 : botoesFalta.length === 2 ? 150 : botoesFalta.length === 3 ? 210 : 300

                            return (
                                <SwipeCard key={n.notificacao_id} id={n.notificacao_id} isOpen={openSwipeId === n.notificacao_id} setOpen={setOpenSwipeId} swipeWidth={swipeWidthFalta} onDoubleTap={() => { if (status === 'pendente' && n.falta?.id) onIgnore(n) }} actions={
                                    <div className="absolute inset-y-0 right-0 bg-[#E8F2FF] flex items-center justify-end px-3 gap-2" style={{ width: swipeWidthFalta }}>
                                        {isFinalizada ? (
                                            <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>
                                        ) : (
                                            <>
                                                <button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'rejeitar')} className="w-11 h-11 rounded-full bg-white border flex items-center justify-center text-red-600"><X className="w-5 h-5" /></button>
                                                {!isAdmin && <button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'encaminhar')} className="w-11 h-11 rounded-full bg-amber-500 flex items-center justify-center text-white"><Send className="w-[18px] h-[18px]" /></button>}
                                                <button disabled={!!actingId} onClick={() => onAction(n.falta?.id, 'aprovar')} className="w-11 h-11 rounded-full bg-[#0095ff] flex items-center justify-center text-white"><Check className="w-5 h-5" /></button>
                                                {temAnexo && <button onClick={() => onViewDoc(n.falta.id)} className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white"><Eye className="w-5 h-5" /></button>}
                                            </>
                                        )}
                                    </div>
                                }>
                                    <div className={`px-3 py-3 ${style.bg} border-l-4 ${style.border}`}>
                                        <div className="flex justify-between gap-3 items-start">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] leading-[18px] break-words whitespace-normal">
                                                    <span className="font-bold text-black">Justificação de falta de • {nomeFunc}</span>
                                                </div>
                                                <span className="text-[11px] text-black/50 font-normal mt-0.5 inline-block">• {formatarTempo(n.created_at)}</span>
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border font-bold ${style.badge}`}>{style.label}</span>
                                                </div>
                                                <p className="text-[12px] text-black mt-1.5 break-words">Documento anexado: <span className="text-[#0095ff] font-bold">{formatarTexto(n.falta?.justificativa_tipo || 'Atestado')}</span></p>
                                                {n.falta?.justificativa_obs && <p className="text-[12px] text-black/60 line-clamp-2 break-words">{n.falta.justificativa_obs}</p>}
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); setOpenSwipeId(openSwipeId === n.notificacao_id ? null : n.notificacao_id) }} className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center self-center shrink-0 shadow-sm"><Menu className="w-4 h-4 text-black" /></button>
                                        </div>
                                    </div>
                                </SwipeCard>
                            )
                        })}
                    </div>
                )
            })}
        </>
    )
}
