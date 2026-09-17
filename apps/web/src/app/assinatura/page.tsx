import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Crown, Gem, Check, ArrowLeft, Gift } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = import.meta.env.VITE_API_URL || 'https://faturaxpress-backend.onrender.com'

const ICON_MAP: any = {
  free: Gift,
  plus: Rocket,
  premium: Crown,
  diamond: Gem,
}

const CHECK_STYLE: any = {
  free: { bg: 'bg-gray-200', icon: 'text-gray-500', btn: 'bg-black text-white hover:bg-zinc-800' },
  plus: { bg: 'bg-[#ff2d87]', icon: 'text-white', btn: 'bg-black text-white hover:bg-zinc-800' },
  premium: { bg: 'bg-[#00d68f]', icon: 'text-white', btn: 'bg-gradient-to-r from-[#ff0055] to-[#ff3ac0] text-white shadow-[0_6px_18px_rgba(255,0,135,0.25)]', popular: true },
  diamond: { bg: 'bg-[#ff2d87]', icon: 'text-white', btn: 'bg-black text-white hover:bg-zinc-800' },
}

function SkeletonCard() {
    return (
        <div className="snap-center shrink-0 w-[88%] md:w-auto relative rounded-[24px] bg-white border border-black/[0.06] p-5 flex flex-col min-h-[400px] shadow-[0_8px_30px_rgba(0,0,0,0.06)] animate-pulse">
            <div className="flex flex-col items-center text-center">
                <div className="w-8 h-8 rounded-[9px] bg-gray-200 mb-4" />
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-3 w-6 bg-gray-100 rounded" />
                <div className="h-8 w-20 bg-gray-200 rounded" />
                <div className="h-3 w-8 bg-gray-100 rounded" />
            </div>
            <div className="mt-5 space-y-3 flex-1">
                <div className="h-3 w-full bg-gray-100 rounded-full" />
                <div className="h-3 w-[90%] bg-gray-100 rounded-full" />
                <div className="h-3 w-[85%] bg-gray-100 rounded-full" />
                <div className="h-3 w-[80%] bg-gray-100 rounded-full" />
                <div className="h-3 w-[75%] bg-gray-100 rounded-full" />
            </div>
            <div className="mt-5 h-[40px] w-full bg-gray-200 rounded-full" />
        </div>
    )
}

export default function AssinaturaPage() {
    const navigate = useNavigate()
    const [plans, setPlans] = useState<any[]>([])
    const [loading, setLoading] = useState<string | null>(null)
    const [isLoadingPlans, setIsLoadingPlans] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        async function fetchPlans() {
            try {
                const res = await fetch(`${API_URL}/api/assinatura/plans`)
                const data = await res.json()
                setPlans(data)
            } catch (e) {
                toast.error('Erro ao carregar planos')
            } finally {
                setIsLoadingPlans(false)
            }
        }
        fetchPlans()
    }, [])

    useEffect(() => {
        if (!isLoadingPlans && window.innerWidth < 768) {
            setTimeout(() => {
                document.getElementById('card-1')?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' })
            }, 120)
        }
    }, [isLoadingPlans])

    const handleSubscribe = async (plan: any) => {
        if (plan.id === 'free' || plan.price_raw === 0) {
            toast.info('Você já está no plano FREE')
            return
        }
        setLoading(plan.id)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${API_URL}/api/assinatura/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ plan_id: plan.id })
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Erro ao criar checkout')
            }
            const data = await res.json()
            toast.success(`Referência ${data.reference} criada - Kz ${data.amount}`)
            // TODO: redirecionar para Xpress aqui com data.payment_url ou data.reference
            console.log('checkout', data)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-white relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-[#f8f5ff] via-white to-[#fff5f8]" />
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[70%] bg-gradient-to-b from-[#ff00c8]/10 via-[#7a00ff]/10 to-transparent rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#ff00c8]/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#7a00ff]/10 rounded-full blur-[120px]" />
                <div className="bubble bubble-1" />
                <div className="bubble bubble-2" />
                <div className="bubble bubble-3" />
            </div>

            <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 py-6">
                <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-2 bg-[#FF3B30] hover:bg-[#e6352b] text-white px-4 py-2 rounded-full text-[13px] font-medium mb-6 shadow-[0_2px_10px_rgba(255,59,48,0.3)] transition">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>

                <div ref={scrollRef} className="flex md:grid md:grid-cols-4 gap-[5px] overflow-x-auto snap-x snap-mandatory scroll-smooth pb-8 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
                    {isLoadingPlans
                      ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                        : plans.map((plan, idx) => {
                            const Icon = ICON_MAP[plan.id] || Gift
                            const style = CHECK_STYLE[plan.id] || CHECK_STYLE.free
                            return (
                                <div
                                    id={`card-${idx}`}
                                    key={plan.id}
                                    className={`snap-center shrink-0 w-[88%] md:w-auto relative rounded-[24px] bg-white border p-5 flex flex-col min-h-[400px] transition-all duration-300 hover:-translate-y-1
                  ${style.popular || plan.popular? 'border-[#ff2d87]/30 shadow-[0_20px_60px_rgba(255,45,135,0.18)] md:scale-[1.02]' : 'border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}
                `}
                                >
                                    <div className="flex flex-col items-center text-center">
                                        <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center mb-4 ${style.popular || plan.popular? 'bg-gradient-to-br from-[#ff0099] to-[#ff7ac4]' : 'bg-black'}`}>
                                            <Icon className="w-4 h-4 text-white" />
                                        </div>
                                        <h3 className="text-[17px] font-extrabold text-black tracking-wide">{plan.name}</h3>
                                        <p className="text-[11px] text-gray-500 mt-0.5">{plan.sub}</p>
                                    </div>

                                    <div className="mt-4 flex items-baseline justify-center gap-1">
                                        <span className="text-[10px] text-gray-400">Kz</span>
                                        <span className="text-[30px] font-extrabold text-[#ff2d87] leading-none">{plan.price}</span>
                                        <span className="text-[10px] text-gray-400">/mês</span>
                                    </div>

                                    <div className="mt-5 space-y-2.5 flex-1">
                                        {plan.features?.map((f: string, i: number) => (
                                            <div key={i} className="flex items-center gap-2.5 text-[12px] text-gray-700">
                                                <div className={`w-4 h-4 rounded-full ${style.bg} flex items-center justify-center shrink-0`}>
                                                    <Check className={`w-2.5 h-2.5 ${style.icon}`} strokeWidth={3} />
                                                </div>
                                                {f}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handleSubscribe(plan)}
                                        disabled={!!loading}
                                        className={`mt-5 w-full h-[40px] rounded-full text-[12px] font-bold transition disabled:opacity-50
                    ${style.btn}
                  `}
                                    >
                                        {loading === plan.id? '...' : plan.price_raw === 0? 'Plano atual' : 'Assinar agora'}
                                    </button>
                                </div>
                            )
                        })}
                </div>

                <div className="text-center mt-1">
                    <p className="text-[10px] tracking-[0.2em] text-gray-400 uppercase">Assinatura mensal / Cancele quando quiser</p>
                </div>
            </div>

            <style>{`
  .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(255,0,200,0.15), rgba(122,0,255,0.04) 65%); border:1px solid rgba(255,0,200,0.1); box-shadow: inset 0 0 10px rgba(255,255,255,0.5), 0 2px 20px rgba(255,0,200,0.08); animation: floatBubble 9s infinite ease-in-out; }
  .bubble-1 { width:80px; height:80px; left:10%; top:20%; }
  .bubble-2 { width:120px; height:120px; left:70%; top:15%; animation-delay:1s; }
  .bubble-3 { width:60px; height:60px; left:40%; top:60%; animation-delay:2s; }
        @keyframes floatBubble { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-20px);} }
      `}</style>
        </div>
    )
}
