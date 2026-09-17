import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Crown, Gem, Check, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'plus',
    name: 'PLUS',
    sub: 'Para quem está começando',
    price: '5.000',
    suffix: 'Kz /mês',
    icon: Rocket,
    features: [
      '05 Faturas por mês',
      'Biblioteca Básica',
      '1 Empresa',
      'Suporte por email',
      'Acesso imediato',
    ],
    color: 'pink',
    check: 'bg-[#ff2d87]',
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    sub: 'Para negócios profissionais',
    price: '8.500',
    suffix: 'Kz /mês',
    icon: Crown,
    features: [
      'Faturas ilimitadas',
      'Biblioteca Premium',
      'Fatura AGT FT + SAFT',
      'QR Code AGT',
      'Suporte WhatsApp',
    ],
    color: 'green',
    check: 'bg-[#00d68f]',
    popular: true,
  },
  {
    id: 'diamond',
    name: 'DIAMOND',
    sub: 'Para Agências e Equipes',
    price: '18.000',
    suffix: 'Kz /mês',
    icon: Gem,
    features: [
      'Tudo do Premium',
      'Multi-empresas',
      'API e Webhooks',
      'Suporte prioritário',
      'Onboarding dedicado',
    ],
    color: 'pink',
    check: 'bg-[#ff2d87]',
  },
]

export default function AssinaturaPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* FUNDO BRANCO + EFEITO BIBLIOTECA ROXO */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#f8f5ff] via-white to-[#fff5f8]" />
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[70%] bg-gradient-to-b from-[#ff00c8]/10 via-[#7a00ff]/10 to-transparent rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#ff00c8]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#7a00ff]/10 rounded-full blur-[120px]" />
        <div className="bubble bubble-1" />
        <div className="bubble bubble-2" />
        <div className="bubble bubble-3" />
      </div>

      <div className="relative z-10 max-w-[1150px] mx-auto px-4 sm:px-8 py-6">
        <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-black text-[13px] mb-6">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* HEADER IGUAL IMAGEM */}
        <div className="text-center max-w-[600px] mx-auto mb-10">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-[#ff2d87]/20 bg-black text-white text-[11px] mb-8">
            <span className="w-6 h-6 rounded bg-[#ff2d87] flex items-center justify-center">◧</span>
            Acesse agora faturaxpress.onrender.com
            <span className="w-6 h-6 rounded-full bg-[#ff2d87]/20 flex items-center justify-center">↘</span>
          </div>
          <h1 className="text-[34px] sm:text-[48px] font-bold leading-[0.9] tracking-tight">
            <span className="font-light text-black">Torne-se</span><br />
            <span className="bg-gradient-to-r from-[#ff0099] to-[#ff6ab5] bg-clip-text text-transparent">membro</span>
          </h1>
          <p className="text-[14px] text-gray-500 mt-4 leading-snug">
            Assine agora e pare de perder tempo<br />criando faturas do zero.
          </p>
        </div>

        {/* CARDS - 1 NO MOBILE COM SWIPE */}
        <div className="flex md:grid md:grid-cols-3 gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-8 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`snap-center shrink-0 w-[88%] md:w-auto relative rounded-[28px] bg-[#0f0f0f] border p-6 sm:p-7 flex flex-col min-h-[520px] transition-all duration-300 hover:-translate-y-1
                  ${plan.popular? 'border-[#ff2d87]/50 shadow-[0_20px_60px_rgba(255,45,135,0.25)] md:scale-[1.03]' : 'border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.1)]'}
                `}
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mb-6 ${plan.popular? 'bg-gradient-to-br from-[#ff0099] to-[#ff7ac4]' : 'bg-[#2a2a2a]'}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-[20px] font-extrabold text-white tracking-wide">{plan.name}</h3>
                  <p className="text-[12px] text-white/50 mt-1">{plan.sub}</p>
                </div>

                <div className="mt-7 flex items-baseline justify-center gap-1">
                  <span className="text-[11px] text-white/60">Kz</span>
                  <span className="text-[38px] font-extrabold text-[#ff2d87] leading-none">{plan.price}</span>
                  <span className="text-[11px] text-white/50">/{plan.suffix.split('/')[1] || 'mês'}</span>
                </div>

                <div className="mt-8 space-y-4 flex-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-[13px] text-white/80">
                      <div className={`w-5 h-5 rounded-full ${plan.check} flex items-center justify-center shrink-0`}>
                        <Check className="w-3 h-3 text-black" strokeWidth={3} />
                      </div>
                      {f}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setLoading(plan.id)
                    setTimeout(() => {
                      toast.success(`Plano ${plan.name} - integrar Xpress`)
                      setLoading(null)
                    }, 600)
                  }}
                  className={`mt-8 w-full h-[44px] rounded-full text-[13px] font-bold transition
                    ${plan.popular? 'bg-gradient-to-r from-[#ff0055] to-[#ff3ac0] text-white shadow-[0_8px_20px_rgba(255,0,135,0.35)]' : 'bg-[#2a2a2a] text-white hover:bg-[#333]'}
                  `}
                >
                  {loading === plan.id? '...' : 'Assinar agora'}
                </button>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-2">
          <p className="text-[10px] tracking-[0.2em] text-gray-400 uppercase">Assinatura mensal / Cancele quando quiser</p>
          <button className="mt-6 h-[44px] px-6 rounded-full bg-gradient-to-r from-[#ff0055] to-[#c800ff] text-white text-[13px] font-bold inline-flex items-center gap-2">
            Assine e torne-se membro agora <Crown className="w-4 h-4" />
          </button>
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
