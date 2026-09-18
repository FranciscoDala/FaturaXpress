import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Crown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { EmitirFaturaSkeleton } from '../../components/EmitirFaturaSkeleton'
import { useRealtime } from '../../hooks/useRealtime'
import { api } from '../../lib/api'
import TabEmitir from './components/tab/tab_faturaEmitir'
import TabCurso from './components/tab/tab_faturaEmcurso'
import TabEmitidas from './components/tab/tab_faturaEmitida'

export interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
export type Tab = 'emitir' | 'curso' | 'emitidas'

export const getNumero = (f: any) => f?.numero_nota_credito || f?.numero_fatura || f?.numero_proforma || f?.numero || f?.id?.slice(0, 8) || '---'
export const getTotal = (f: any) => Number(f?.total_geral?? f?.total?? 0)
export const getData = (f: any) => f?.data_emissao || f?.created_at || f?.data
export const isFaturaOficial = (f: any) => f?.tipo_documento === 'fatura' &&!!f?.hash_agt
export const isNotaCredito = (f: any) => f?.tipo_documento === 'nota_credito'

const VALID_TABS: Tab[] = ['emitir', 'curso', 'emitidas']
const PLAN_LIMITS: Record<string, { label: string, max: number | null }> = {
    free: { label: 'FREE', max: 5 },
    plus: { label: 'PLUS', max: 100 },
    premium: { label: 'PREMIUM', max: 500 },
    diamond: { label: 'DIAMOND', max: null },
}

export default function EmitirFaturaPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const clienteId = searchParams.get('cliente_id')

    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [empresa, setEmpresa] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<Tab>(() => {
        const tabUrl = searchParams.get('tab') as Tab | null
        if (tabUrl && VALID_TABS.includes(tabUrl)) return tabUrl
        if (clienteId) {
            const saved = localStorage.getItem(`fatura_tab_${clienteId}`) as Tab | null
            if (saved && VALID_TABS.includes(saved)) return saved
        }
        return 'emitir'
    })
    const [faturasCurso, setFaturasCurso] = useState<any[]>([])
    const [faturasEmitidas, setFaturasEmitidas] = useState<any[]>([])
    const [faturasTodas, setFaturasTodas] = useState<any[]>([])
    const [loadingCounts, setLoadingCounts] = useState(true)
    const [loadingEmpresa, setLoadingEmpresa] = useState(true)

    useEffect(() => {
        if (window.location.search) {
            const outer = new URLSearchParams(window.location.search)
            const hash = window.location.hash
            if (hash &&!hash.includes('cliente_id=')) {
                const newHash = hash.split('?')[0] + '?' + outer.toString()
                window.history.replaceState(null, '', window.location.pathname + newHash)
                setSearchParams(outer, { replace: true })
            } else if (!hash) {
                window.history.replaceState(null, '', window.location.pathname)
            }
        }
    }, [])

    const fetchFaturas = useCallback(async () => {
        if (!clienteId) return
        try {
            setLoadingCounts(true)
            const res = await api.get('/api/faturas', { params: { cliente_id: clienteId, limit: 100 } })
            const all = Array.isArray(res.data)? res.data : (res.data.items || [])
            setFaturasCurso(all.filter((f: any) => f.tipo_documento === 'proforma' && ['rascunho', 'pendente', 'em_curso'].includes(f.status)))
            setFaturasEmitidas(all.filter((f: any) => f.tipo_documento === 'fatura' || f.tipo_documento === 'nota_credito' || ['concluida', 'emitida', 'cancelada'].includes(f.status)))
        } catch { }
        finally { setLoadingCounts(false) }
    }, [clienteId])

    const fetchFaturasGeralPlano = useCallback(async () => {
        try {
            const res = await api.get('/api/faturas', { params: { limit: 500 } })
            const all = Array.isArray(res.data)? res.data : (res.data.items || [])
            setFaturasTodas(all)
        } catch {}
    }, [])

    const handleRealtime = useCallback((msg: any) => {
        if (msg.event === 'faturas:changed') { fetchFaturas(); fetchFaturasGeralPlano() }
    }, [fetchFaturas, fetchFaturasGeralPlano])
    useRealtime({ onEvent: handleRealtime })

    useEffect(() => {
        if (clienteId) {
            api.get(`/api/clientes/${clienteId}`).then(r => setCliente(r.data)).catch(() => setCliente(null))
        }
        setLoadingEmpresa(true)
        api.get('/api/auth/me').then(r => {
            const comp = r.data.company || r.data
            setEmpresa({
              ...comp,
                nome: comp.nome || comp.companyName,
                endereco: comp.endereco || comp.address,
                cidade: comp.cidade || comp.city,
                telefone: comp.telefone || comp.phone,
                provincia: comp.provincia || comp.province,
                logo_url: comp.logo_url || comp.image_url,
                image_url: comp.image_url || comp.logo_url,
                iban: comp.iban,
                iban2: comp.iban2,
                banco1: comp.banco1,
                banco2: comp.banco2,
                subscription_plan: comp.subscription_plan || 'free'
            })
        }).catch(() => {
            setEmpresa({ nome: 'FaturaXpress', nif: '---', endereco: 'Luanda', subscription_plan: 'free' })
        }).finally(() => setLoadingEmpresa(false))
        fetchFaturasGeralPlano()
    }, [clienteId, fetchFaturasGeralPlano])

    useEffect(() => {
        if (!clienteId) return
        localStorage.setItem(`fatura_tab_${clienteId}`, activeTab)
        const currentTab = searchParams.get('tab')
        const currentCid = searchParams.get('cliente_id')
        if (currentTab!== activeTab || currentCid!== clienteId) {
            const newParams = new URLSearchParams(searchParams)
            newParams.set('tab', activeTab)
            if (clienteId) newParams.set('cliente_id', clienteId)
            setSearchParams(newParams, { replace: true })
        }
    }, [activeTab])

    useEffect(() => {
        if (clienteId) fetchFaturas()
    }, [clienteId, fetchFaturas])

    const planId = (empresa?.subscription_plan || 'free').toLowerCase()
    const planInfo = PLAN_LIMITS[planId] || PLAN_LIMITS.free
    const faturasMes = faturasTodas.filter((f: any) => {
        const d = new Date(f.created_at || f.data_emissao)
        const now = new Date()
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && f.tipo_documento === 'fatura' && f.status!== 'apagada'
    }).length
    const isAtLimit = planInfo.max? faturasMes >= planInfo.max : false

    const isInitialLoading = loadingEmpresa &&!empresa
    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-white">
                <EmitirFaturaSkeleton />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-8 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div>
                        <div className="bubble bubble-2"></div>
                        <div className="bubble bubble-3"></div>
                        <div className="bubble bubble-4"></div>
                        <div className="bubble bubble-5"></div>
                        <div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start text-left">
                        <div className="w-[96px] h-[96px] sm:w-[132px] sm:h-[132px] rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm shrink-0 self-start">
                            <img src={empresa?.logo_url || empresa?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cliente?.nome || 'Avulso')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={cliente?.nome || 'Avulso'} />
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex flex-row justify-between items-start gap-4 w-full">
                                <div className="flex flex-col items-start text-left">
                                    <h1 className="text-[22px] sm:text-[24px] font-bold text-[#1a202c] text-left">{cliente?.nome || 'Cliente Avulso - Emitir Direto'}</h1>
                                    <div className="flex gap-1.5 mt-1.5 justify-start">
                                        <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">{cliente? 'Cliente' : 'Avulso'}</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">NIF {cliente?.nif || '999999999'}</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-blue-50 border border-blue-200 text-blue-700 rounded flex items-center gap-1"><Crown className="w-3 h-3" /> {planInfo.label} {planInfo.max? `${faturasMes}/${planInfo.max}` : 'Ilimitado'}</span>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[13px] text-[#4a5568] text-left">
                                        {cliente? (
                                            <>
                                                <p>{cliente.email}</p>
                                                <p>{cliente.telefone}</p>
                                                <p>{cliente.cidade? `${cliente.endereco} - ${cliente.cidade}` : cliente.endereco}</p>
                                            </>
                                        ) : (
                                            <p className="text-gray-500">Sem cadastro - preencha nome/NIF na emissão. Pode salvar depois.</p>
                                        )}
                                    </div>
                                    {isAtLimit && (
                                        <div className="mt-3 flex items-center gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full">
                                            <AlertTriangle className="w-4 h-4" />
                                            Limite {planInfo.label} atingido. Proforma livre, FT bloqueada.
                                            <button onClick={() => navigate('/assinatura')} className="ml-2 bg-[#0095ff] text-white px-2.5 py-1 rounded-full text-[10px]">Upgrade</button>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => navigate('/app/dashboard')} className="bg-[#FF3B30] text-white text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 hover:bg-[#e6362c] transition">
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            </div>
                            {clienteId? (
                                <div className="mt-6 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                                    <button onClick={() => setActiveTab('curso')} className={`flex-1 py-2 ${activeTab === 'curso'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                        <p className="text-[13px] font-bold">{loadingCounts? '...' : faturasCurso.length}</p>
                                        <p className="text-[11px] text-gray-500">Proformas PP</p>
                                    </button>
                                    <button onClick={() => setActiveTab('emitidas')} className={`flex-1 py-2 border-l ${activeTab === 'emitidas'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                        <p className="text-[13px] font-bold">{loadingCounts? '...' : faturasEmitidas.length}</p>
                                        <p className="text-[11px] text-gray-500">Faturas FT + NC</p>
                                    </button>
                                    <button onClick={() => setActiveTab('emitir')} className={`flex-[1.2] border-l text-[13px] font-semibold ${activeTab === 'emitir'? 'bg-[#0095ff] text-white' : 'bg-[#8ecfff] text-white'}`}>+ Emitir Fatura</button>
                                </div>
                            ) : (
                                <div className="mt-6 bg-white/80 border rounded-[3px] p-2 max-w-[520px] text-[11px] text-gray-600">Modo Avulso: emissão rápida sem precisar salvar cliente</div>
                            )}
                        </div>
                    </div>
                    <style>{`
             .bubble { position: absolute; border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border: 1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; will-change: transform; }
             .bubble-1 { width: 80px; height: 80px; left: 10%; top: 20%; animation-delay: 0s; }
             .bubble-2 { width: 120px; height: 120px; left: 70%; top: 10%; animation-delay: 1s; animation-duration: 10s; }
             .bubble-3 { width: 60px; height: 60px; left: 40%; top: 60%; animation-delay: 2s; }
             .bubble-4 { width: 40px; height: 40px; left: 85%; top: 50%; animation-delay: 0.5s; animation-duration: 7s; }
             .bubble-5 { width: 100px; height: 100px; left: 5%; top: 70%; animation-delay: 1.5s; animation-duration: 9s; }
             .bubble-6 { width: 50px; height: 50px; left: 55%; top: 15%; animation-delay: 2.5s; }
                @keyframes floatBubble { 0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.55; } 25% { transform: translateY(-15px) translateX(10px) scale(1.05); opacity: 0.85; } 50% { transform: translateY(-25px) translateX(-5px) scale(0.95); opacity: 0.45; } 75% { transform: translateY(-10px) translateX(-10px) scale(1.02); opacity: 0.7; } }
                    `}</style>
                </div>
                <div className="w-full py-6">
                    {(activeTab === 'emitir' ||!clienteId) && <TabEmitir clienteId={clienteId || undefined} onEmitida={() => { if (clienteId) { fetchFaturas(); setActiveTab('curso'); toast.success('Fatura criada!', { description: clienteId? 'Proforma gerada com sucesso.' : 'Documento avulso gerado.' }) } else { navigate('/app/dashboard') } }} />}
                    {clienteId && activeTab === 'curso' && <TabCurso faturas={faturasCurso} cliente={cliente!} empresa={empresa} onRefresh={fetchFaturas} />}
                    {clienteId && activeTab === 'emitidas' && <TabEmitidas faturas={faturasEmitidas} cliente={cliente!} empresa={empresa} onRefresh={fetchFaturas} />}
                </div>
            </div>
        </div>
    )
}
