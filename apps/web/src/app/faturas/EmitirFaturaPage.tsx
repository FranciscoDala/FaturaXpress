import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { EmitirFaturaSkeleton } from '../../components/EmitirFaturaSkeleton'
import { useRealtime } from '../../hooks/useRealtime'
import { api } from '../../lib/api'
import TabEmitir from './components/tab/tab_faturaEmitir'
import TabCurso from './components/tab/tab_faturaEmcurso'
import TabEmitidas from './components/tab/tab_faturaEmitida'
import GlobalAreas from '../../components/GlobalAreas'

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

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["ver_faturas", "emitir_fatura", "emitir_proforma", "ver_proforma", "ver_ft"],
    rh: [],
    recepcao: ["ver_proforma", "emitir_proforma", "ver_ft"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
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

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVerProforma = funcionarioLogado? temPermissao(cargoAtual, 'ver_proforma') || temPermissao(cargoAtual, 'ver_faturas') || cargoAtual === 'admin' : true
    const podeVerFT = funcionarioLogado? temPermissao(cargoAtual, 'ver_ft') || temPermissao(cargoAtual, 'ver_faturas') || cargoAtual === 'admin' : true
    const podeEmitir = funcionarioLogado? temPermissao(cargoAtual, 'emitir_fatura') || temPermissao(cargoAtual, 'emitir_proforma') || cargoAtual === 'admin' : true

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

    useEffect(() => {
        if (!podeVerProforma && activeTab === 'curso' && podeVerFT) setActiveTab('emitidas')
        if (!podeVerFT && activeTab === 'emitidas' && podeVerProforma) setActiveTab('curso')
        if (!podeEmitir && activeTab === 'emitir') {
            if (podeVerProforma) setActiveTab('curso')
            else if (podeVerFT) setActiveTab('emitidas')
        }
    }, [cargoAtual])

    const { ncOrigensEmitidas, ftOnlyEmitidas, ftAtivasEmitidas } = useMemo(() => {
        const origens = new Set<string>()
        faturasEmitidas.forEach((f: any) => {
            if (f.tipo_documento === 'nota_credito' && f.fatura_origem_id) origens.add(f.fatura_origem_id)
        })
        const ftOnly = faturasEmitidas.filter((f: any) => f.tipo_documento === 'fatura')
        const ftAtivas = ftOnly.filter((f: any) =>!origens.has(f.id) && f.status!== 'cancelada')
        return { ncOrigensEmitidas: origens, ftOnlyEmitidas: ftOnly, ftAtivasEmitidas: ftAtivas }
    }, [faturasEmitidas])

    const { ftOnlyTodas } = useMemo(() => {
        const ftOnly = faturasTodas.filter((f: any) => f.tipo_documento === 'fatura' && f.status!== 'apagada')
        return { ftOnlyTodas: ftOnly }
    }, [faturasTodas])

    const totalFaturadoCliente = useMemo(() => {
        return ftAtivasEmitidas.reduce((s: number, f: any) => s + Number(f.total_geral || f.total || 0), 0)
    }, [ftAtivasEmitidas])

    const totalDocsCliente = useMemo(() => {
        return faturasCurso.length + ftOnlyEmitidas.length
    }, [faturasCurso, ftOnlyEmitidas])

    const planId = (empresa?.subscription_plan || 'free').toLowerCase()
    const planInfo = PLAN_LIMITS[planId] || PLAN_LIMITS.free
    const faturasMes = useMemo(() => {
        return ftOnlyTodas.filter((f: any) => {
            const d = new Date(f.created_at || f.data_emissao)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length
    }, [ftOnlyTodas])

    const isInitialLoading = loadingEmpresa &&!empresa
    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-white">
                <EmitirFaturaSkeleton />
            </div>
        )
    }

    if (!podeVerProforma &&!podeVerFT &&!podeEmitir) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="text-center max-w-[360px] bg-white border rounded-[24px] p-8 shadow-sm">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-3"/>
                    <p className="font-bold text-[16px]">Sem permissão</p>
                    <p className="text-[13px] text-gray-500 mt-2">Cargo <b>{cargoAtual.toUpperCase()}</b> não tem acesso a faturas</p>
                    <button onClick={() => navigate('/app/dashboard')} className="mt-4 w-full h-11 bg-black text-white rounded-full text-[13px] font-bold">Voltar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white relative">
            <GlobalAreas />
            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div>
                        <div className="bubble bubble-2"></div>
                        <div className="bubble bubble-3"></div>
                        <div className="bubble bubble-4"></div>
                        <div className="bubble bubble-5"></div>
                        <div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start text-left">
                        <div className="relative w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] shrink-0 self-start">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[5px] border-white shadow-sm">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(cliente?.nome || 'Avulso')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={cliente?.nome || 'Avulso'} />
                            </div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2px] border-white shadow bg-[#22c55e]"></div>
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-row justify-between items-start gap-3 w-full">
                                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                    <h1 className="text-[16px] sm:text-[19px] font-bold text-[#1a202c] uppercase tracking-wide leading-tight truncate max-w-[180px] sm:max-w-[320px]">{cliente?.nome || 'CLIENTE AVULSO'} <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full ml-2">{cargoAtual.toUpperCase()}</span></h1>
                                    <div className="mt-2.5 space-y-0 text-[12px] sm:text-[13px] text-gray-700 leading-[1.4]">
                                        <p><span className="font-medium text-gray-500">NIF:</span> {cliente?.nif || '999999999'}</p>
                                        <p><span className="font-medium text-gray-500">Tel:</span> {cliente?.telefone || '---'}</p>
                                        <p className="truncate max-w-[220px] sm:max-w-none"><span className="font-medium text-gray-500">Email:</span> {cliente?.email || '---'}</p>
                                        <p className="line-clamp-2"><span className="font-medium text-gray-500">Endereço:</span> {cliente?.endereco || '---'}{cliente?.cidade? ` • ${cliente.cidade}` : ''}{cliente?.provincia? ` • ${cliente.provincia}` : ''}</p>
                                    </div>
                                    <div className="mt-4 space-y-1">
                                        <p className="text-[11px] text-gray-500">Faturas emitidas - {loadingCounts? '...' : `${totalDocsCliente} docs`}</p>
                                        <p className="text-[11px] text-gray-500">Total pago faturas(agt) - <span className="text-[#FF3B30] font-bold text-[13px]">{loadingCounts? '...' : `${totalFaturadoCliente.toFixed(2)} KZ`}</span></p>
                                        <p className="text-[11px] text-gray-600 font-medium">
                                            Fatura FT - {loadingCounts? '...' : planInfo.max? `${faturasMes}/${planInfo.max} FT este mês` : `${faturasMes} FT este mês (Ilimitado)`}
                                        </p>
                                        {ncOrigensEmitidas.size > 0 && (
                                            <p className="text-[10px] text-gray-400">{ncOrigensEmitidas.size} FT anulada(s) por NC - conta 1 só</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 pl-2">
                                    <button onClick={() => navigate('/app/dashboard')} className="bg-[#FF3B30] text-white text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 hover:bg-[#e6362c] transition">
                                        <ArrowLeft className="w-4 h-4" />
                                        Voltar
                                    </button>
                                </div>
                            </div>

                            {/* CARDS PP / FT - SEM BARRAS */}
                            <div className="mt-5 flex gap-2 max-w-[520px] w-full">
                                {podeVerProforma && (
                                    <button
                                        onClick={() => setActiveTab('curso')}
                                        className={`flex-1 h-[62px] rounded-[20px] border bg-white px-4 flex flex-col justify-center text-left shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all
                                        ${activeTab === 'curso'? 'border-[#0095ff] ring-2 ring-[#0095ff]/20 bg-[#F0F7FF]' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <p className={`text-[18px] font-bold leading-none ${activeTab === 'curso'? 'text-[#0095ff]' : 'text-gray-900'}`}>{loadingCounts? '...' : faturasCurso.length}</p>
                                        <p className="text-[11px] text-gray-500 mt-1 font-medium">Proforma PP</p>
                                    </button>
                                )}
                                {podeVerFT && (
                                    <button
                                        onClick={() => setActiveTab('emitidas')}
                                        className={`flex-1 h-[62px] rounded-[20px] border bg-white px-4 flex flex-col justify-center text-left shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all
                                        ${activeTab === 'emitidas'? 'border-[#0095ff] ring-2 ring-[#0095ff]/20 bg-[#F0F7FF]' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <p className={`text-[18px] font-bold leading-none ${activeTab === 'emitidas'? 'text-[#0095ff]' : 'text-gray-900'}`}>{loadingCounts? '...' : ftOnlyEmitidas.length}</p>
                                        <p className="text-[11px] text-gray-500 mt-1 font-medium">Fatura AGT FT</p>
                                    </button>
                                )}
                                {podeEmitir && (
                                    <button
                                        onClick={() => setActiveTab('emitir')}
                                        className={`w-[110px] h-[62px] rounded-[20px] border flex flex-col justify-center items-center shadow-[0_4px_20px_rgba(0,0,0,0.05)] transition-all
                                        ${activeTab === 'emitir'? 'bg-[#0095ff] border-[#0095ff] text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}
                                    >
                                        <p className="text-[20px] font-bold leading-none">+</p>
                                        <p className="text-[11px] mt-1 font-medium">Emitir</p>
                                    </button>
                                )}
                            </div>
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
                    {podeEmitir && (activeTab === 'emitir' ||!clienteId) && <TabEmitir clienteId={clienteId || undefined} onEmitida={() => { if (clienteId) { fetchFaturas(); setActiveTab('curso'); toast.success('Fatura criada!', { description: clienteId? 'Proforma gerada com sucesso.' : 'Documento avulso gerado.' }) } else { navigate('/app/dashboard') } }} />}
                    {clienteId && activeTab === 'curso' && podeVerProforma && <TabCurso faturas={faturasCurso} cliente={cliente!} empresa={empresa} onRefresh={fetchFaturas} />}
                    {clienteId && activeTab === 'emitidas' && podeVerFT && <TabEmitidas faturas={faturasEmitidas} cliente={cliente!} empresa={empresa} onRefresh={fetchFaturas} />}
                    {clienteId && activeTab === 'curso' &&!podeVerProforma && <div className="px-4 text-center py-10 bg-white border rounded-[20px] text-[13px] text-gray-500">Sem permissão para ver Proformas</div>}
                    {clienteId && activeTab === 'emitidas' &&!podeVerFT && <div className="px-4 text-center py-10 bg-white border rounded-[20px] text-[13px] text-gray-500">Sem permissão para ver FT</div>}
                </div>
            </div>
        </div>
    )
}
