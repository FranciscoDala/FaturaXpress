import { useEffect, useState, useRef } from 'react'
import { X, Check, Copy, Upload, CreditCard, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

interface PagamentoManual { nome: string; paypay: string; kwik: string; iban: string; banco: string }
interface Subscription { id: string; reference: string; amount: number; status: string; plan_id: string; provider: string }
interface Props {
    open: boolean
    checkoutInfo: { subscription: Subscription; pagamento_manual: PagamentoManual; paypay_disponivel: boolean } | null
    onClose: () => void
    onSuccess: () => void
    apiBase: string
}

type AnalysisState = 'idle' | 'analyzing' | 'valid' | 'invalid'

const MSG_INVALIDO = 'Comprovativo inválido'
const MSG_INVALIDO_DETALHE = 'Este comprovativo não é válido.'

const ENTIDADE_PAYPAY = '958462694'
const REFERENCIA_PAYPAY = '10116'
const IBAN_PAYPAY = 'AO06 0420 0000 0000 0423 1532 6'

export default function PagamentoModal({ open, checkoutInfo, onClose, onSuccess, apiBase }: Props) {
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [analysis, setAnalysis] = useState<AnalysisState>('idle')
    const [progress, setProgress] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
            const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading && analysis !== 'analyzing') onClose() }
            window.addEventListener('keydown', onKey)
            return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey) }
        }
    }, [open, loading, analysis, onClose])

    useEffect(() => {
        if (open) {
            setFile(null); setAnalysis('idle'); setProgress(0); setErrorMsg(''); setLoading(false)
        }
    }, [open])

    const extractTextFromPdf = async (f: File): Promise<string> => {
        const buffer = await f.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
        let fullText = ''
        const pages = Math.min(pdf.numPages, 2)
        for (let i = 1; i <= pages; i++) {
            const page = await pdf.getPage(i)
            const content = await page.getTextContent()
            const strings = (content.items as any[]).map((it: any) => it.str).join(' ')
            fullText += '\n' + strings
        }
        return fullText
    }

    const validateContent = (rawText: string, fileName: string): { ok: boolean, msg: string } => {
        if (!checkoutInfo) return { ok: false, msg: MSG_INVALIDO_DETALHE }
        const text = rawText.toLowerCase()
        const refFull = checkoutInfo.subscription.reference.toLowerCase()
        const refShort = refFull.split('-').pop() || ''
        const amount = checkoutInfo.subscription.amount

        if (text.includes('factura') || text.includes('fatura') || text.includes('proforma') || text.includes('nota de encomenda')) {
            return { ok: false, msg: MSG_INVALIDO_DETALHE }
        }

        const hasAmount = text.includes(amount.toString()) || text.includes(amount.toString().replace('.', ' '))

        const hasRef = text.includes(refFull) || (refShort.length >= 6 && text.includes(refShort))

        const hasBenef = text.includes('0420') || text.includes('0423') || text.includes('1532') || text.includes('dala') || text.includes('958462694') || text.includes('925 886 593') || text.includes('131331201') || text.includes('10116')

        if (!hasAmount || !hasRef || !hasBenef) {
            return { ok: false, msg: MSG_INVALIDO_DETALHE }
        }

        return { ok: true, msg: 'ok' }
    }

    const handleFileSelect = async (f: File | null) => {
        if (!f) return

        if (f.type !== 'application/pdf') {
            setErrorMsg(MSG_INVALIDO_DETALHE)
            setAnalysis('invalid')
            toast.error(MSG_INVALIDO, { position: 'top-center' })
            return
        }
        if (f.size > 5 * 1024 * 1024) {
            setErrorMsg(MSG_INVALIDO_DETALHE)
            setAnalysis('invalid')
            toast.error(MSG_INVALIDO, { position: 'top-center' })
            return
        }
        if (f.size < 5 * 1024) {
            setErrorMsg(MSG_INVALIDO_DETALHE)
            setAnalysis('invalid')
            toast.error(MSG_INVALIDO, { position: 'top-center' })
            return
        }

        setFile(f)
        setAnalysis('analyzing')
        setProgress(15)
        setErrorMsg('')

        try {
            setProgress(30)
            const rawText = await extractTextFromPdf(f)
            setProgress(75)

            if (rawText.trim().length < 20) {
                setErrorMsg(MSG_INVALIDO_DETALHE)
                setAnalysis('invalid')
                setProgress(100)
                toast.error(MSG_INVALIDO, { position: 'top-center' })
                return
            }

            const result = validateContent(rawText, f.name)
            setProgress(100)
            await new Promise(r => setTimeout(r, 400))

            if (result.ok) {
                setAnalysis('valid')
                setErrorMsg('')
            } else {
                setErrorMsg(result.msg)
                setAnalysis('invalid')
                toast.error(MSG_INVALIDO, { position: 'top-center' })
            }
        } catch (err) {
            console.error(err)
            setErrorMsg(MSG_INVALIDO_DETALHE)
            setAnalysis('invalid')
            setProgress(100)
            toast.error(MSG_INVALIDO, { position: 'top-center' })
        }
    }

    const resetInput = () => {
        setFile(null)
        setAnalysis('idle')
        setProgress(0)
        setErrorMsg('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    if (!open || !checkoutInfo) return null

    const copy = async (text: string) => {
        await navigator.clipboard.writeText(text)
        toast.success('Copiado!', { position: 'top-center' })
    }

    const handleSend = async () => {
        if (!file || analysis !== 'valid') return
        setLoading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await api.post(`${apiBase}/comprovativo/${checkoutInfo.subscription.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            if (res.data.status === 'paid') {
                toast.success('Pagamento validado! Plano liberado automaticamente', { position: 'top-center' })
            } else {
                toast.success('Comprovativo enviado! Validação em até 30min', { position: 'top-center' })
            }
            onSuccess()
            onClose()
        } catch (e: any) {
            setAnalysis('invalid')
            setErrorMsg(MSG_INVALIDO_DETALHE)
            toast.error(MSG_INVALIDO, { position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />
            <div className="relative bg-white rounded-[24px] w-full max-w-[520px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-black" />
                    </div>
                    <button onClick={onClose} disabled={loading || analysis === 'analyzing'} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
                        <X className="w-4 h-4 text-black" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-black leading-tight">Finalizar pagamento</h3>
                    <p className="text-[13.5px] text-black mt-1 leading-relaxed">
                        Plano {checkoutInfo.subscription.plan_id.toUpperCase()} • {checkoutInfo.subscription.amount.toLocaleString()} Kz • Ref {checkoutInfo.subscription.reference}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    <div className="flex flex-col gap-4">
                        {/* METODO 1 - PAGAMENTO POR REFERENCIA */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[12px] font-bold text-black uppercase tracking-wide">1. Pagamento por Referência (Multicaixa Express)</span>
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-[12px] flex flex-col gap-2">
                                <div className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 flex items-center justify-between">
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] text-black uppercase font-semibold">Entidade</span>
                                        <span className="text-[13px] font-mono font-bold text-black">{ENTIDADE_PAYPAY}</span>
                                    </div>
                                    <button onClick={() => copy(ENTIDADE_PAYPAY)} className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 ml-2"><Copy className="w-3 h-3 text-white" /></button>
                                </div>
                                <div className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 flex items-center justify-between">
                                    <div className="flex flex-col leading-none">
                                        <span className="text-[10px] text-black uppercase font-semibold">Referência</span>
                                        <span className="text-[13px] font-mono font-bold text-black">{REFERENCIA_PAYPAY}</span>
                                    </div>
                                    <button onClick={() => copy(REFERENCIA_PAYPAY)} className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 ml-2"><Copy className="w-3 h-3 text-white" /></button>
                                </div>
                                <p className="text-[11px] text-black leading-relaxed">Abra o Multicaixa Express &gt; Pagamentos &gt; Pagamento por Referência &gt; Insira Entidade {ENTIDADE_PAYPAY} e Referência {REFERENCIA_PAYPAY}. Na descrição escreva <b>{checkoutInfo.subscription.reference}</b></p>
                            </div>
                        </div>

                        {/* METODO 2 - TRANSFERENCIA */}
                        <div className="flex flex-col gap-2">
                            <span className="text-[12px] font-bold text-black uppercase tracking-wide">2. Transferência Bancária (PayPay Africa)</span>
                            <div className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 flex items-center justify-between">
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-black uppercase font-semibold">IBAN - {checkoutInfo.pagamento_manual.banco || 'PayPay Africa'}</span>
                                    <span className="text-[13px] font-mono font-bold text-black truncate">{IBAN_PAYPAY}</span>
                                </div>
                                <button onClick={() => copy(IBAN_PAYPAY)} className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 ml-2"><Copy className="w-3 h-3 text-white" /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 flex items-center justify-between">
                                    <div className="flex flex-col leading-none"><span className="text-[10px] text-black font-semibold">PayPay</span><span className="text-[13px] font-mono font-bold text-black">{checkoutInfo.pagamento_manual.paypay}</span></div>
                                    <button type="button" onClick={() => copy(checkoutInfo.pagamento_manual.paypay)} className="w-6 h-6 rounded-full bg-black flex items-center justify-center"><Copy className="w-3 h-3 text-white" /></button>
                                </div>
                                <div className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 flex items-center justify-between">
                                    <div className="flex flex-col leading-none"><span className="text-[10px] text-black font-semibold">KWiK</span><span className="text-[13px] font-mono font-bold text-black">{checkoutInfo.pagamento_manual.kwik}</span></div>
                                    <button type="button" onClick={() => copy(checkoutInfo.pagamento_manual.kwik)} className="w-6 h-6 rounded-full bg-black flex items-center justify-center"><Copy className="w-3 h-3 text-white" /></button>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-[12px] text-[11.5px] text-black leading-relaxed">
                            Titular: <b className="text-black">{checkoutInfo.pagamento_manual.nome}</b><br />
                            No comprovativo deve constar a ref <b className="text-black">{checkoutInfo.subscription.reference}</b> na descrição/mensagem
                        </div>

                        <div className="mt-1 flex flex-col gap-2">
                            <label className="text-[13px] font-medium text-black">Comprovativo (PDF original - máx 5MB)</label>

                            {analysis === 'idle' && (
                                <label className="w-full h-[44px] bg-white border border-dashed border-gray-300 rounded-[12px] px-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition">
                                    <Upload className="w-4 h-4 text-black" />
                                    <span className="text-[13px] text-black truncate max-w-[260px]">Clique para selecionar PDF</span>
                                    <input ref={fileInputRef} type="file" hidden accept="application/pdf" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
                                </label>
                            )}

                            {analysis === 'analyzing' && (
                                <div className="w-full min-h-[80px] bg-white border border-gray-200 rounded-[12px] px-4 py-4 flex flex-col items-center justify-center gap-2">
                                    <Loader2 className="w-6 h-6 text-black animate-spin" />
                                    <span className="text-[13px] font-medium text-black">Validando comprovativo... {Math.min(progress, 100)}%</span>
                                    <span className="text-[11px] text-black truncate max-w-[260px]">{file?.name}</span>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                                        <div className="h-full bg-black transition-all duration-200" style={{ width: `${Math.min(progress, 100)}%` }} />
                                    </div>
                                </div>
                            )}

                            {analysis === 'valid' && (
                                <div className="w-full bg-[#EAFBF0] border border-[#B6F0C8] rounded-[12px] px-4 py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-white" /></div>
                                    <div className="flex flex-col">
                                        <span className="text-[13px] font-bold text-black">Comprovativo válido</span>
                                        <span className="text-[11px] text-black truncate max-w-[200px]">{file?.name}</span>
                                    </div>
                                    <button type="button" onClick={resetInput} className="ml-auto text-[11px] text-black underline">Trocar</button>
                                </div>
                            )}

                            {analysis === 'invalid' && (
                                <div className="flex flex-col gap-2">
                                    <div className="w-full bg-[#FEF2F2] border border-[#FECACA] rounded-[12px] px-4 py-3 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-white" /></div>
                                        <div className="flex flex-col">
                                            <span className="text-[13px] font-bold text-black">Comprovativo inválido</span>
                                            <span className="text-[11px] text-black">{errorMsg || MSG_INVALIDO_DETALHE}</span>
                                        </div>
                                    </div>
                                    <label className="w-full h-[44px] bg-white border border-dashed border-red-300 rounded-[12px] px-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-50 transition">
                                        <Upload className="w-4 h-4 text-black" />
                                        <span className="text-[13px] text-black">Selecionar outro PDF</span>
                                        <input ref={fileInputRef} type="file" hidden accept="application/pdf" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
                                    </label>
                                </div>
                            )}
                        </div>

                        <p className="text-[10px] text-black text-center">Validamos o comprovativo automaticamente</p>
                    </div>
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-2">
                    <button type="button" onClick={onClose} disabled={loading || analysis === 'analyzing'} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition">
                        <X className="w-5 h-5 text-black" />
                    </button>
                    <button type="button" onClick={handleSend} disabled={loading || analysis !== 'valid'} className="flex-1 h-11 rounded-full bg-black text-white font-semibold hover:bg-gray-800 shadow-[0_6px_20px_rgba(0,0,0,0.35)] flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Check className="w-5 h-5 text-white" />}{loading ? '' : ''}
                    </button>
                </div>
            </div>
        </div>
    )
}
