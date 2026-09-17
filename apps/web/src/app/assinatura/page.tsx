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
    features: ['Até 5 faturas por mês', '1 cliente e 5 produtos', 'Faturas Proforma PP', 'Exportação PDF'],
    cta: 'Usar Grátis',
    popular: false,
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
  },
  {
    id: 'pro',
    name: 'Pro',
    sub: 'Alta complexidade e volume',
    price: 'de 18.000 Kz',
    suffix: '/ mês',
    features: [
      'Tudo do Middle',
      'Multi-empresa + API',
      'Utilizadores ilimitados',
      'Webhooks e relatórios avançados',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pro',
    popular: false,
  },
]

export default function AssinaturaPage() {
  const navigate = useNavigate()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleSelect = (planId: string) => {
    setLoadingPlan(planId)
    setTimeout(() => {
      toast.info(`Checkout ${planId} - ligar Xpress depois`)
      setLoadingPlan(null)
    }, 700)
  }

  return (
    <div className="min-h-screen bg-white text-black relative overflow-hidden">
      {/* FUNDO BRANCO COM EFEITO BIBLIOTECA */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8F2FF] via-[#F6F9FF] to-white" />
        <div className="bubble bubble-1" />
        <div className="bubble bubble-2" />
        <div className="bubble bubble-3" />
        <div className="bubble bubble-4" />
        <div className="bubble bubble-5" />
        <div className="bubble bubble-6" />
      </div>

      <div className="relative z-10 max-w-[1150px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <button
          onClick={() => navigate('/app/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 text-[13px] font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-[26px] sm:text-[36px] font-extrabold tracking-tight">Escolha seu plano</h1>
          <p className="text-[13px] sm:text-[14px] text-gray-500 mt-2">Arraste para o lado no celular para ver todos os planos</p>
        </div>

        {/* CARROSSEL NO MOBILE - 1 CARD POR VEZ COM ARRASTE */}
        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-6 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`snap-center shrink-0 w-[88%] sm:w-[85%] md:w-auto min-h-[520px] relative rounded-[26px] border bg-[#111111] text-white p-6 sm:p-7 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                plan.popular
                 ? 'border-[#ff7a18]/30 shadow-[0_0_0_1px_rgba(255,122,24,0.2),0_20px_60px_rgba(255,90,24,0.25)] md:-mt-3 md:pt-10'
                  : 'border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.15)]'
              }`}
            >
              {/* TOP GRADIENT IGUAL PRINT */}
              <div className="absolute top-0 left-0 right-0 h-[160px] bg-gradient-to-b from-[#ff8a2e] via-[#a84315] to-[#111111]" />
              <div className="absolute top-0 left-0 right-0 h-[160px] bg-gradient-to-b from-white/15 to-transparent mix-blend-overlay" />

              <div className="relative z-10 flex flex-col h-full">
                <div>
                  <h3 className="text-[26px] font-bold flex items-center gap-2">
                    {plan.id === 'middle' && <Crown className="w-5 h-5" />}
                    {plan.id === 'light' && <Zap className="w-5 h-5 opacity-70" />}
                    {plan.id === 'pro' && <Building2 className="w-5 h-5 opacity-70" />}
                    {plan.name}
                  </h3>
                  <p className="text-[12px] text-white/50 mt-1">{plan.sub}</p>
                </div>

                <div className="mt-8 flex items-baseline gap-2">
                  <span className="text-[30px] font-extrabold tracking-tight">от {plan.price}</span>
                  <span className="text-[13px] text-white/40">{plan.suffix}</span>
                </div>

                <div className="my-6 h-[1px] bg-white/10" />

                <p className="text-[13px] font-semibold text-white mb-4">Подходит для:</p>

                <ul className="space-y-3.5 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug text-white/65">
                      <span className="mt-0.5 w-[18px] h-[18px] rounded-full border border-white/15 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-white/60" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(plan.id)}
                  className="mt-8 w-full h-[48px] rounded-full bg-gradient-to-r from-[#2a0a0a] via-[#7a2a16] to-[#ffb06a] border border-white/10 flex items-center justify-between pl-6 pr-1.5 text-[14px] font-semibold hover:brightness-110 transition"
                >
                  <span>{loadingPlan === plan.id? '...' : plan.cta}</span>
                  <span className="w-10 h-10 rounded-full bg-black/30 border border-white/20 flex items-center justify-center backdrop-blur">
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <h2 className="text-[18px] sm:text-[22px] font-bold">
            Не знаешь какой тариф выбрать?<br />
            <span className="text-gray-500 font-medium">Сделаем бесплатный расчет стоимости</span>
          </h2>
        </div>
      </div>

      <style>{`
       .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.18), rgba(0,149,255,0.04) 65%); border:1px solid rgba(0,149,255,0.12); box-shadow: inset 0 0 10px rgba(255,255,255,0.6), 0 2px 12px rgba(0,149,255,0.08); animation: floatBubble 9s infinite ease-in-out; }
       .bubble-1 { width:90px; height:90px; left:8%; top:18%; animation-delay:0s; }
       .bubble-2 { width:140px; height:140px; left:68%; top:8%; animation-delay:1s; }
       .bubble-3 { width:70px; height:70px; left:38%; top:55%; animation-delay:2s; }
       .bubble-4 { width:50px; height:50px; left:82%; top:45%; animation-delay:0.5s; }
       .bubble-5 { width:110px; height:110px; left:4%; top:70%; animation-delay:1.5s; }
       .bubble-6 { width:60px; height:60px; left:52%; top:12%; animation-delay:2.5s; }
        @keyframes floatBubble { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-24px) scale(0.96);} }
      `}</style>
    </div>
  )
}
