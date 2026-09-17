import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Rocket, Crown, Gem, Check, ArrowLeft, Gift, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import PagamentoModal from './components/modals/modal_pagamento'

const API_URL = import.meta.env.VITE_API_URL || 'https://faturaxpress-backend.onrender.com'
const ASSINATURA_BASE = `${API_URL}/assinatura`

const ICON_MAP: any = { free: Gift, plus: Rocket, premium: Crown, diamond: Gem }
const CHECK_STYLE: any = {
  free: { bg: 'bg-gray-200', icon: 'text-gray-500', btn: 'bg-black text-white' },
  plus: { bg: 'bg-[#ff2d87]', icon: 'text-white', btn: 'bg-black text-white' },
  premium: { bg: 'bg-[#00d68f]', icon: 'text-white', btn: 'bg-gradient-to-r from-[#ff0055] to-[#ff3ac0] text-white shadow-[0_6px_18px_rgba(255,0,135,0.25)]', popular: true },
  diamond: { bg: 'bg-[#ff2d87]', icon: 'text-white', btn: 'bg-black text-white' },
}

function SkeletonCard() {
  return <div className="snap-center shrink-0 w-[88%] md:w-auto rounded-[24px] bg-white border p-5 min-h-[400px] animate-pulse"><div className="w-8 h-8 bg-gray-200 rounded-[9px] mx-auto mb-4" /><div className="h-4 w-20 bg-gray-200 rounded mx-auto" /></div>
}

export default function AssinaturaPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [showPayModal, setShowPayModal] = useState(false)
  const [checkoutInfo, setCheckoutInfo] = useState<any>(null)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch(`${ASSINATURA_BASE}/plans`)
        setPlans(await res.json())
      } catch { toast.error('Erro ao carregar planos') }
      finally { setIsLoadingPlans(false) }
    }
    fetchPlans()
  }, [])

  useEffect(() => {
    if (!isLoadingPlans && window.innerWidth < 768) {
      setTimeout(() => document.getElementById('card-1')?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' }), 120)
    }
  }, [isLoadingPlans])

  const handleSubscribe = async (plan: any) => {
    if (plan.id === 'free' || plan.price_raw === 0) return toast.info('Você já está no FREE')
    setLoading(plan.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${ASSINATURA_BASE}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan_id: plan.id })
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail) }
      const data = await res.json()
      const infoRes = await fetch(`${ASSINATURA_BASE}/checkout/${data.subscription_id}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const info = await infoRes.json()
      setCheckoutInfo(info)
      setShowPayModal(true)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(null) }
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"><div className="absolute inset-0 bg-gradient-to-br from-[#f8f5ff] via-white to-[#fff5f8]" /></div>
      <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-8 py-6">
        <button onClick={() => navigate('/app/dashboard')} className="flex items-center gap-2 bg-[#FF3B30] text-white px-4 py-2 rounded-full text-[13px] mb-6"><ArrowLeft className="w-4 h-4" /> Voltar</button>

        <div ref={scrollRef} className="flex md:grid md:grid-cols-4 gap-[12px] overflow-x-auto snap-x snap-mandatory pb-8 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
          {isLoadingPlans? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />) : plans.map((plan, idx) => {
            const Icon = ICON_MAP[plan.id] || Gift
            const style = CHECK_STYLE[plan.id] || CHECK_STYLE.free
            return (
              <div id={`card-${idx}`} key={plan.id} className={`snap-center shrink-0 w-[88%] md:w-auto rounded-[24px] bg-white border p-5 flex flex-col min-h-[400px] hover:-translate-y-1 transition-all ${style.popular || plan.popular? 'border-[#ff2d87]/30 shadow-[0_20px_60px_rgba(255,45,135,0.18)] md:scale-[1.02]' : 'border-black/[0.06] shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`}>
                <div className="flex flex-col items-center text-center">
                  <div className={`w-8 h-8 rounded-[9px] flex items-center justify-center mb-4 ${style.popular? 'bg-gradient-to-br from-[#ff0099] to-[#ff7ac4]' : 'bg-black'}`}><Icon className="w-4 h-4 text-white" /></div>
                  <h3 className="text-[17px] font-extrabold">{plan.name}</h3><p className="text-[11px] text-gray-500">{plan.sub}</p>
                </div>
                <div className="mt-4 flex items-baseline justify-center gap-1"><span className="text-[10px] text-gray-400">Kz</span><span className="text-[30px] font-extrabold text-[#ff2d87] leading-none">{plan.price}</span><span className="text-[10px] text-gray-400">/mês</span></div>
                <div className="mt-5 space-y-2.5 flex-1">{plan.features?.map((f: string, i: number) => (<div key={i} className="flex items-center gap-2.5 text-[12px] text-gray-700"><div className={`w-4 h-4 rounded-full ${style.bg} flex items-center justify-center shrink-0`}><Check className={`w-2.5 h-2.5 ${style.icon}`} strokeWidth={3} /></div>{f}</div>))}</div>
                <button onClick={() => handleSubscribe(plan)} disabled={!!loading} className={`mt-5 w-full h-[40px] rounded-full text-[12px] font-bold disabled:opacity-50 ${style.btn}`}>{loading === plan.id? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : plan.price_raw === 0? 'Plano atual' : 'Assinar agora'}</button>
              </div>
            )
          })}
        </div>
        <p className="text-center text-[10px] tracking-[0.2em] text-gray-400 uppercase mt-1">Assinatura mensal / Cancele quando quiser</p>
      </div>

      <PagamentoModal
        open={showPayModal}
        checkoutInfo={checkoutInfo}
        apiBase={ASSINATURA_BASE}
        onClose={() => setShowPayModal(false)}
        onSuccess={() => { /* pode dar refetch em /me aqui */ }}
      />
    </div>
  )
}
