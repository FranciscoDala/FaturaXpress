import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ArrowUpRight, ArrowLeft, Crown, Zap, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
    {
        id: 'light',
        name: 'Light',
        sub: 'Para começar a faturar',
        price: 'Grátis',
        suffix: '/ para sempre',
        features: [
            'Até 5 faturas por mês',
            '1 cliente e 5 produtos',
            'Faturas Proforma PP',
            'Exportação PDF',
        ],
        cta: 'Usar Grátis',
        popular: false,
        color: 'from-zinc-800 to-zinc-900',
    },
    {
        id: 'middle',
        name: 'Middle',
        sub: 'Zolotaia seredina - Mais vendido',
        price: 'de 8.500 Kz',
        suffix: '/ mês',
        features: [
            'Faturas ilimitadas',
            'Clientes e produtos ilimitados',
            'Fatura AGT FT certificada',
            'SAFT-AO + QR Code AGT',
            'Suporte via WhatsApp',
        ],
        cta: 'Assinar Middle',
        popular: true,
        color: 'from-[#ff7a18] via-[#af3d10] to-black',
    },
    {
        id: 'pro',
        name: 'Pro',
        sub: 'Alta complexidade e volume',
        price: 'de 18.000 Kz',
        suffix: '/ mês',
        features: [
            'Tudo do Middle',
            'Multi-empresa',
            'Utilizadores ilimitados',
            'API e Webhooks',
            'Suporte prioritário e onboarding',
        ],
        cta: 'Assinar Pro',
        popular: false,
        color: 'from-zinc-800 to-zinc-900',
    },
]

export default function AssinaturaPage() {
    const navigate = useNavigate()
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

    const handleSelect = async (planId: string) => {
        setLoadingPlan(planId)
        // TODO: integrar com Xpress/EMIS aqui
        // const res = await api.post('/api/assinatura/checkout', { plano: planId })
        // window.location.href = res.data.checkout_url
        setTimeout(() => {
            toast.info(`Checkout do plano ${planId} - ligar com GPO em breve`)
            setLoadingPlan(null)
        }, 800)
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden">
            {/* efeito biblioteca - glow de fundo */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-[30%] left-1/2 -translate-x-1/2 w-[120%] h-[60%] bg-gradient-to-b from-[#ff5a1f]/30 to-transparent blur-[120px]" />
                <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-[#7a1a0a]/60 to-transparent" />
                <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-[#ff7a18]/10 rounded-full blur-[80px]" />
                <div className="absolute top-[40%] right-[10%] w-96 h-96 bg-[#ff3b30]/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-[1100px] mx-auto px-4 sm:px-8 py-8">
                <button
                    onClick={() => navigate('/app/dashboard')}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white mb-8 text-[13px]"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar ao dashboard
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-start">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.id}
                            className={`group relative rounded-[24px] border border-white/10 bg-[#111111] p-6 sm:p-7 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.6)] ${plan.popular ? 'md:-mt-4 md:mb-4 md:pt-10 shadow-[0_0_0_1px_rgba(255,122,24,0.3),0_20px_80px_rgba(255,90,24,0.25)]' : ''
                                }`}
                        >
                            {/* glow top igual da imagem */}
                            <div className={`absolute top-0 left-0 right-0 h-[180px] bg-gradient-to-b ${plan.color} opacity-90`} />
                            <div className="absolute top-0 left-0 right-0 h-[180px] bg-gradient-to-b from-white/10 to-transparent mix-blend-overlay" />

                            <div className="relative z-10">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-[26px] font-bold tracking-tight flex items-center gap-2">
                                            {plan.id === 'middle' && <Crown className="w-5 h-5 text-white/80" />}
                                            {plan.id === 'light' && <Zap className="w-5 h-5 text-white/60" />}
                                            {plan.id === 'pro' && <Building2 className="w-5 h-5 text-white/60" />}
                                            {plan.name}
                                        </h3>
                                        <p className="text-[12px] text-white/50 mt-1">{plan.sub}</p>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-baseline gap-2">
                                    <span className="text-[28px] font-bold">от {plan.price}</span>
                                    <span className="text-[12px] text-white/50">{plan.suffix}</span>
                                </div>

                                <div className="my-6 h-[1px] bg-gradient-to-r from-white/10 via-white/5 to-transparent" />

                                <p className="text-[13px] font-semibold text-white mb-4">Подходит для:</p>

                                <ul className="space-y-3.5">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="flex gap-2.5 text-[13px] leading-[1.3] text-white/70">
                                            <span className="mt-0.5 w-4 h-4 rounded-full border border-white/20 flex items-center justify-center shrink-0 group-hover:border-white/30 transition">
                                                <Check className="w-2.5 h-2.5 text-white/70" />
                                            </span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => handleSelect(plan.id)}
                                    disabled={!!loadingPlan}
                                    className="mt-8 w-full h-[46px] rounded-full bg-gradient-to-r from-[#2a0a0a] via-[#8a2a1a] to-[#ffb067] border border-white/10 flex items-center justify-between px-1.5 pl-5 pr-1.5 text-[13.5px] font-medium hover:from-[#3a1010] hover:to-[#ffc07a] transition-all disabled:opacity-60"
                                >
                                    <span>{loadingPlan === plan.id ? 'Aguarde...' : plan.cta}</span>
                                    <span className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center">
                                        <ArrowUpRight className="w-4 h-4" />
                                    </span>
                                </button>
                            </div>

                            {/* efeito biblioteca - inner shine */}
                            <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
                        </div>
                    ))}
                </div>

                <div className="mt-16 text-center pb-10">
                    <h2 className="text-[22px] sm:text-[28px] font-bold leading-tight">
                        Não sabes qual tarifa escolher?
                        <br />
                        <span className="text-white/80">Fazemos cálculo gratuito do custo</span>
                    </h2>
                    <button
                        onClick={() => toast.success('Fala connosco no WhatsApp: +244 930 438 947')}
                        className="mt-6 text-[13px] text-white/60 underline hover:text-white"
                    >
                        Falar com suporte
                    </button>
                </div>
            </div>

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        * { font-family: Inter, sans-serif; }
      `}</style>
        </div>
    )
}
