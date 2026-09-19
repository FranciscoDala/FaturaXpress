import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Crown, Power, Search, Menu } from 'lucide-react'
import { toast } from 'sonner'
import GlobalAreas from '../../components/GlobalAreas'
import ModalConfirmSair from '../dashboard/components/modals/modal_ConfirmSair'
import ModalUsuario from './components/modals/modal_UsuarioView'
import TabPresente from './components/tab/tab_func_presente'
import TabFerias from './components/tab/tab_func_ferias'
import { api } from '../../lib/api'

type RHTab = 'presente' | 'ferias'

const LS_KEYS = {
    tab: 'rh_tab',
}

const PLAN_LIMITS: Record<string, { label: string }> = {
    free: { label: 'FREE' },
    plus: { label: 'PLUS' },
    premium: { label: 'PREMIUM' },
    diamond: { label: 'DIAMOND' },
}

const FUNC_MOCK = [
    { id: '1', nome: 'Ana Silva', cargo: 'Gestora RH', area: 'RH', foto: '', status: 'ativo' as const, email: 'ana@empresa.com', telefone: '930000001' },
    { id: '2', nome: 'João Pedro', cargo: 'Recrutador', area: 'RH', foto: '', status: 'ferias' as const, email: 'joao@empresa.com', telefone: '930000002' },
    { id: '3', nome: 'Casimiro Quiala', cargo: 'Contabilista', area: 'Financeiro', foto: '', status: 'ativo' as const, email: 'casimiro@empresa.com', telefone: '930438947' },
    { id: '4', nome: 'Deolinda Rodrigues', cargo: 'Vendedora', area: 'Comercial', foto: '', status: 'ativo' as const, email: 'deolinda@empresa.com', telefone: '930000003' },
]

function getInitialFromStorage(searchParams: URLSearchParams) {
    const urlTab = searchParams.get('rtab') as RHTab | null
    const lsTab = localStorage.getItem(LS_KEYS.tab) as RHTab | null
    return {
        tab: urlTab || lsTab || 'presente' as RHTab,
    }
}

export default function RHPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const init = getInitialFromStorage(searchParams)

    const [empresa, setEmpresa] = useState<any>(null)
    const [usuario, setUsuario] = useState<any>(null)
    const [companyName, setCompanyName] = useState(localStorage.getItem("company_name") || '')
    const [modalSairOpen, setModalSairOpen] = useState(false)
    const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false)
    const [rhTab, setRhTab] = useState<RHTab>(init.tab)
    const [search, setSearch] = useState('')

    const [openNovo, setOpenNovo] = useState(false)
    const novoWrapperRef = useRef<HTMLDivElement>(null)
    const novoBtnRef = useRef<HTMLButtonElement>(null)
    const [novoDropdownPos, setNovoDropdownPos] = useState({ top: 0, left: 0, width: 320 })

    const logoUrlSafe = useMemo(() => {
        const raw = empresa?.logo_url || empresa?.image_url || ''
        if (!raw) return ''
        return raw.replace(/^http:\/\//i, 'https://')
    }, [empresa])

    const planId = (empresa?.subscription_plan || 'free').toLowerCase()
    const planInfo = PLAN_LIMITS[planId] || PLAN_LIMITS.free

    const fetchMe = useCallback(async () => {
        try {
            const r = await api.get('/api/auth/me')
            const comp = r.data.company || r.data
            const user = r.data.user || r.data
            setEmpresa(comp)
            setUsuario(user)
            const nome = comp.nome || comp.companyName || localStorage.getItem("company_name")
            if (nome) { setCompanyName(nome); localStorage.setItem("company_name", nome) }
        } catch { }
    }, [])

    useEffect(() => { fetchMe() }, [fetchMe])

    useEffect(() => {
        localStorage.setItem(LS_KEYS.tab, rhTab)
        const params = new URLSearchParams(searchParams)
        params.set('rtab', rhTab)
        setSearchParams(params, { replace: true })
    }, [rhTab])

    // dropdown position igual dashboard
    const updateNovoPos = () => {
        if (novoBtnRef.current) {
            const r = novoBtnRef.current.getBoundingClientRect()
            const width = 320
            const isMobile = window.innerWidth < 768
            const left = isMobile ? window.innerWidth - width - 16 : r.right - width
            setNovoDropdownPos({ top: r.bottom + 8, left: Math.max(16, left), width })
        }
    }
    useEffect(() => { if (openNovo) updateNovoPos() }, [openNovo])
    useEffect(() => {
        if (!openNovo) return
        const handle = () => updateNovoPos()
        window.addEventListener('scroll', handle, true)
        window.addEventListener('resize', handle)
        return () => { window.removeEventListener('scroll', handle, true); window.removeEventListener('resize', handle) }
    }, [openNovo])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (novoWrapperRef.current && !novoWrapperRef.current.contains(e.target as Node) && !target.closest('[data-novo-dropdown]')) setOpenNovo(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const handleLogout = () => setModalSairOpen(true)
    const handleConfirmLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); setModalSairOpen(false); navigate('/login') }

    const funcionariosFiltrados = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return FUNC_MOCK
        return FUNC_MOCK.filter(f =>
            f.nome.toLowerCase().includes(q) ||
            f.cargo.toLowerCase().includes(q) ||
            f.area.toLowerCase().includes(q)
        )
    }, [search])

    const presentes = funcionariosFiltrados.filter(f => f.status === 'ativo')
    const ferias = funcionariosFiltrados.filter(f => f.status === 'ferias')
    const totalPresentes = FUNC_MOCK.filter(f => f.status === 'ativo').length
    const totalFerias = FUNC_MOCK.filter(f => f.status === 'ferias').length

    return (
        <div className="min-h-screen bg-white relative">
            <GlobalAreas />
            <ModalConfirmSair open={modalSairOpen} companyName={companyName} onClose={() => setModalSairOpen(false)} onConfirm={handleConfirmLogout} />
            <ModalUsuario open={modalUsuarioOpen} usuario={usuario} empresa={empresa} onClose={() => setModalUsuarioOpen(false)} />

            <div className="max-w-[1100px] mx-auto">
                {/* HEADER IGUAL DASHBOARD */}
                <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start text-left">
                        <div className="relative w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] shrink-0 self-start">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[5px] border-white shadow-sm">
                                <img src={logoUrlSafe || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={companyName} />
                            </div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2px] border-white shadow" style={{ background: empresa?.is_active === false ? '#ef4444' : '#22c55e' }}></div>
                            <button onClick={() => setModalUsuarioOpen(true)} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center hover:bg-gray-50">
                                <User className="w-3.5 h-3.5 text-gray-700" />
                            </button>
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-row justify-between items-start gap-3 w-full">
                                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                    <h1 className="text-[16px] sm:text-[19px] font-bold text-[#1a202c] uppercase tracking-wide leading-tight truncate max-w-[180px] sm:max-w-[320px]">{companyName || 'CONNECT'}</h1>
                                    <div className="mt-2.5 space-y-0 text-[12px] sm:text-[13px] text-gray-700 leading-[1.4]">
                                        <p><span className="font-medium text-gray-500">NIF:</span> {empresa?.nif || '50924984'}</p>
                                        <p><span className="font-medium text-gray-500">Tel:</span> {empresa?.telefone || empresa?.phone || '+244930438947'}</p>
                                        <p className="truncate max-w-[220px] sm:max-w-none"><span className="font-medium text-gray-500">Email:</span> {empresa?.email || 'killerbless12@gmail.com'}</p>
                                        <p className="line-clamp-2"><span className="font-medium text-gray-500">Endereço:</span> {(empresa?.endereco || empresa?.address || 'Sassamba')} • {empresa?.cidade || empresa?.city || 'Saurimo'} • {empresa?.provincia || empresa?.province || 'Lunda-Sul'}</p>
                                    </div>
                                    <div className="mt-4 space-y-0 w-full">
                                        <p className="text-[11px] text-gray-500">Funcionários - {FUNC_MOCK.length} registados</p>
                                        <p className="text-[11px] text-gray-500">Ativos - <span className="text-[#22c55e] font-bold text-[13px]">{totalPresentes} ativos</span></p>
                                        <p className="text-[11px] text-gray-600 font-medium">Férias - {totalFerias} este mês</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 pl-2">
                                    <div className="relative">
                                        <div className="absolute -top-3 -right-2 z-10">
                                            <span className="text-[8px] font-bold tracking-wide bg-white border border-yellow-200 text-yellow-700 px-1.5 py-[1px] rounded-full shadow-sm">{planInfo.label}</span>
                                        </div>
                                        <button onClick={() => navigate('/assinatura')} className="w-10 h-10 rounded-full bg-white border border-yellow-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#f59e0b] hover:bg-yellow-50 transition shrink-0">
                                            <Crown className="w-[18px] h-[18px]" />
                                        </button>
                                    </div>
                                    <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-[#FF3B30] border border-[#FF3B30] shadow-[0_2px_12px_rgba(255,59,48,0.25)] flex items-center justify-center text-white hover:bg-[#e6352b] transition shrink-0">
                                        <Power className="w-[18px] h-[18px]" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-5 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                                <button onClick={() => setRhTab('presente')} className={`flex-1 py-2 ${rhTab === 'presente' ? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{totalPresentes}</p><p className="text-[11px] text-gray-500">Presentes</p>
                                </button>
                                <button onClick={() => setRhTab('ferias')} className={`flex-1 py-2 border-l ${rhTab === 'ferias' ? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{totalFerias}</p><p className="text-[11px] text-gray-500">Férias</p>
                                </button>
                                <div ref={novoWrapperRef} className="flex-[0.6] border-l relative">
                                    <button ref={novoBtnRef} onClick={() => setOpenNovo(!openNovo)} className={`w-full h-full flex items-center justify-center ${openNovo ? 'bg-[#0095ff] text-white' : 'bg-white text-gray-800 hover:bg-gray-50'}`}>
                                        <Menu className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>{`
           .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border:1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; }
           .bubble-1 { width:80px; height:80px; left:10%; top:20%; }.bubble-2 { width:120px; height:120px; left:70%; top:10%; }.bubble-3 { width:60px; height:60px; left:40%; top:60%; }.bubble-4 { width:40px; height:40px; left:85%; top:50%; }.bubble-5 { width:100px; height:100px; left:5%; top:70%; }.bubble-6 { width:50px; height:50px; left:55%; top:15%; }
            @keyframes floatBubble { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-25px) scale(0.95);} }
          `}</style>
                </div>

                {openNovo && (
                    <div data-novo-dropdown style={{ top: novoDropdownPos.top, left: novoDropdownPos.left, width: novoDropdownPos.width, maxWidth: '92vw' }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-200 overflow-hidden p-1.5 z-[9999]">
                        <button onClick={() => { setRhTab('presente'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${rhTab === 'presente' ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>Presentes</button>
                        <button onClick={() => { setRhTab('ferias'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${rhTab === 'ferias' ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>Férias</button>
                        <div className="h-[1px] bg-gray-200 my-2 mx-2" />
                        <button onClick={() => { setOpenNovo(false); toast.info('Em breve: novo funcionário') }} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-100 text-black">+ Novo funcionário</button>
                    </div>
                )}

                <div className="w-full py-6">
                    {/* BUSCA igual dashboard gestao */}
                    <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-3 mb-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-0">
                                <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder={rhTab === 'ferias' ? 'Buscar em férias por nome' : 'Buscar funcionário por nome, cargo ou área'} className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                            </div>
                        </div>

                        <div id="tabela">
                            {rhTab === 'presente' && <TabPresente funcionarios={presentes} search={search} />}
                            {rhTab === 'ferias' && <TabFerias funcionarios={ferias} search={search} />}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
