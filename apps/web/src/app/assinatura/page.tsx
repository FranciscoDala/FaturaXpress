import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Crown, Gem, Check, ArrowLeft, Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import PagamentoModal from './components/modals/modal_pagamento'
import { api } from '../../lib/api'

const ASSINATURA_BASE = '/api/assinatura'
const MODO_TESTE = true
const PRECOS_TESTE: any = {
    free: 0,
    plus: 1,
    premium: 2,
    diamond: 3,
    '5000': 1,
    '8500': 2,
    '18000': 3
}

const ICON_MAP: any = { free: Gift, plus: Rocket, premium: Crown, diamond: Gem }
const CHECK_STYLE: any = {
    free: { bg: 'bg-gray-200', icon: 'text-gray-500', btn: 'bg-black text-white hover:bg-zinc-800' },
    plus: { bg: 'bg-[#ff2d87]', icon: 'text-white', btn: 'bg-black text-white hover:bg-zinc-800' },
    premium: { bg: 'bg-[#00d68f]', icon: 'text-white', btn: 'bg-gradient-to-r from-[#ff0055] to-[#ff3ac0] text-white shadow-[0_6px_18px_rgba(255,0,135,0.25)]', popular: true },
    diamond: { bg: 'bg-[#ff2d87]', icon: 'text-white', btn: 'bg-black text-white hover:bg-zinc-800' },
}

function SkeletonCard() {
    return (
        <div className="snap-center shrink-0 w-[88%] md:w-auto rounded-[24px] bg-white border border-black/[0.06] p-5 flex flex-col min-h-[420px]">
            <div className="flex flex-col items-center text-center animate-pulse w-full">
                <div className="w-8 h-8 bg-gray-200 rounded-[9px] mb-4" />
                <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-16 bg-gray-100 rounded mb-6" />
                <div className="h-8 w-24 bg-gray-200 rounded mb-6" />
                <div className="w-full space-y-3">
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-5/6 bg-gray-100 rounded" />
                    <div className="h-3 w-4/6 bg-gray-100 rounded" />
                </div>
                <div className="mt-auto pt-5 w-full h-[40px] bg-gray-200 rounded-full" />
            </div>
        </div>
    )
}

function SkeletonBtnSair() {
    return <div className="h-[36px] w-[92px] rounded-full bg-gray-200 animate-pulse mb-6" />
}

export default function AssinaturaPage() {
    const navigate = useNavigate()
    const [plans, setPlans] = useState<any[]>([])
    const [currentPlan, setCurrentPlan] = useState<string>('free')
    const [loading, setLoading] = useState<string | null>(null)
    const [isLoadingPlans, setIsLoadingPlans] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showPayModal, setShowPayModal] = useState(false)
    const [checkoutInfo, setCheckoutInfo] = useState<any>(null)

    useEffect(() => {
        async function fetchPlans() {
            try {
                setIsLoadingPlans(true)
                const [plansRes, meRes] = await Promise.all([
                    api.get(`${ASSINATURA_BASE}/plans`),
                    api.get('/api/auth/me').catch(() => ({ data: {} }))
                ])
                const data = plansRes.data
                let list = Array.isArray(data)? data : Array.isArray(data?.plans)? data.plans : []

                if (MODO_TESTE) {
                    list = list.map((p: any) => {
                        const novoPreco = PRECOS_TESTE[p.id]?? PRECOS_TESTE[String(p.price_raw)]?? p.price_raw
                        return {
                           ...p,
                            price_raw: novoPreco,
                            price: novoPreco === 0? '0' : novoPreco.toLocaleString('pt-AO', { minimumFractionDigits: 2 }),
                            price_display: `${novoPreco.toFixed(2).replace('.', ',')} Kz`
                        }
                    })
                }

                setPlans(list)
                const comp = meRes.data?.company || meRes.data
                if (comp?.subscription_plan) {
                    setCurrentPlan(comp.subscription_plan.toLowerCase())
                }
            } catch (e: any) {
                toast.error('Erro ao carregar planos', { description: e?.response?.data?.detail || e.message })
                setPlans([])
            } finally {
                setIsLoadingPlans(false)
            }
        }
        fetchPlans()
    }, [])

    useEffect(() => {
        if (!isLoadingPlans && window.innerWidth < 768 && plans.length > 0) {
            setTimeout(() => document.getElementById('card-1')?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' }), 150)
        }
    }, [isLoadingPlans, plans])

    const handleSubscribe = async (plan: any) => {
        if (plan.id === currentPlan) {
            toast.info(`Você já está no plano ${plan.name}`, { description: 'Este é seu plano atual.' })
            return
        }
        if (plan.id === 'free' || plan.price_raw === 0) {
            toast.info('Plano FREE', { description: 'Você já está no FREE. Escolha um plano pago para upgrade.' })
            return
        }
        setLoading(plan.id)
        try {
            const res = await api.post(`${ASSINATURA_BASE}/checkout`, { plan_id: plan.id })
            const body = res.data
            const infoRes = await api.get(`${ASSINATURA_BASE}/checkout/${body.subscription_id}`)
            setCheckoutInfo(infoRes.data)
            setShowPayModal(true)
            toast.success('Checkout criado', { description: `Plano ${plan.name} - finalize o pagamento.` })
        } catch (e: any) {
            const msg = e?.response?.data?.detail || e.message
            if (e?.response?.status === 401) {
                toast.error('Sessão expirada', { description: 'Faça login novamente.' })
            } else {
                toast.error('Erro ao assinar', { description: msg, position: 'top-center' })
            }
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-white relative">
            <div className="absolute inset-0 pointer-events-none"><div className="absolute inset-0 bg-gradient-to-br from-[#f8f5ff] via-white to-[#fff5f8]" /></div>
            <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 py-6">
                {isLoadingPlans? (
                    <SkeletonBtnSair />
                ) : (
                    <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-2 bg-[#FF3B30] hover:bg-[#e6352b] text-white px-4 py-2 rounded-full text-[13px] font-medium mb-6 shadow-[0_2px_10px_rgba(255,59,48,0.3)] transition">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                )}
                {!isLoadingPlans && (
                    <div className="mb-6 text-center">
                        <p className="text-[13px] text-gray-600">Seu plano atual: <span className="font-bold uppercase text-black">{currentPlan}</span> - Proformas sempre livres, FT respeita limite do plano</p>
                    </div>
                )}
                <div ref={scrollRef} className="flex md:grid md:grid-cols-4 gap-[12px] overflow-x-auto overflow-y-visible snap-x snap-mandatory pt-4 pb-10 -mx-4 px-4 md:mx-0 md:px-2 md:pt-6 md:pb-12 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {isLoadingPlans? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : plans.map((plan, idx) => {
                        const Icon = ICON_MAP[plan.id] || Gift
                        const style = CHECK_STYLE[plan.id] || CHECK_STYLE.free
                        const isCurrent = plan.id === currentPlan
                        return (
                            <div id={`card-${idx}`} key={plan.id} className={`snap-center shrink-0 w-[88%] md:w-auto rounded-[24px] bg-white border p-5 flex flex-col min-h-[420px] transition-all duration-300 ${isCurrent? 'ring-2 ring-[#0095ff] border-[#0095ff]/50' : ''} ${style.popular || plan.popular? 'border-[#ff2d87]/30 shadow-[0_20px_60px_rgba(255,45,135,0.18)] md:scale-[1.02] md:-translate-y-1' : 'border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]'}`}>
                                {isCurrent && <div className="text-[10px] font-bold text-[#0095ff] bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1 self-center mb-2">PLANO ATUAL</div>}
                                <div className="flex flex-col items-center text-center">
                                    <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center mb-4 ${style.popular? 'bg-gradient-to-br from-[#ff0099] to-[#ff7ac4]' : 'bg-black'}`}><Icon className="w-4 h-4 text-white" /></div>
                                    <h3 className="text-[17px] font-extrabold tracking-wide text-black">{plan.name}</h3><p className="text-[11px] text-gray-500 mt-0.5">{plan.sub}</p>
                                </div>
                                <div className="mt-4 flex items-baseline justify-center gap-1"><span className="text-[10px] text-gray-400">Kz</span><span className="text-[30px] font-extrabold text-[#ff2d87] leading-none">{plan.price_display || plan.price}</span><span className="text-[10px] text-gray-400">/mês</span></div>
                                <div className="mt-5 space-y-2.5 flex-1">{Array.isArray(plan.features) && plan.features.map((f: string, i: number) => (<div key={i} className="flex items-center gap-2.5 text-[12px] text-gray-700"><div className={`w-4 h-4 rounded-full ${style.bg} flex items-center justify-center shrink-0`}><Check className={`w-2.5 h-2.5 ${style.icon}`} strokeWidth={3} /></div>{f}</div>))}</div>
                                <button onClick={() => handleSubscribe(plan)} disabled={!!loading || isCurrent} className={`mt-5 w-full h-[40px] rounded-full text-[12px] font-bold transition disabled:opacity-50 flex items-center justify-center ${isCurrent? 'bg-gray-100 text-gray-500 border' : style.btn}`}>{loading === plan.id? <Loader2 className="w-4 h-4 animate-spin" /> : isCurrent? 'Plano atual' : plan.price_raw === 0? 'Plano FREE' : 'Assinar agora'}</button>
                            </div>
                        )
                    })}
                </div>
                <p className="text-center text-[10px] tracking-[0.2em] text-gray-400 uppercase mt-1">MODO TESTE - Assinatura mensal / Cancele quando quiser | Proforma sempre livre</p>
            </div>
            <PagamentoModal open={showPayModal} checkoutInfo={checkoutInfo} apiBase={ASSINATURA_BASE} onClose={() => setShowPayModal(false)} onSuccess={() => { toast.success('Assinatura ativada!', { description: 'Seu plano foi atualizado com sucesso.' }); navigate('/app/dashboard') }} />
        </div>
    )
}
