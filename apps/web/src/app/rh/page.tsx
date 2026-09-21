import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Crown, Power, Search, Menu } from 'lucide-react'
import { toast } from 'sonner'
import GlobalAreas from '../../components/GlobalAreas'
import ModalConfirmSair from '../dashboard/components/modals/modal_ConfirmSair'
import ModalUsuario from './components/modals/modal_UsuarioView'
import ModalFuncionario from './components/modals/modal_Funcionario'
import TabPresente from './components/tab/tab_func_presente'
import TabFerias from './components/tab/tab_func_ferias'
import TabPonto from './components/tab/tab_ponto'
import TabPedidos from './components/tab/tab_pedidos'
import TabRecibos from './components/tab/tab_recibos'
import { api } from '../../lib/api'

type RHTab = 'presente' | 'ferias' | 'ponto' | 'pedidos' | 'recibos'
const LS_KEYS = { tab: 'rh_tab' }

const PLAN_LIMITS: Record<string, { label: string }> = {
    free: { label: 'FREE' },
    plus: { label: 'PLUS' },
    premium: { label: 'PREMIUM' },
    diamond: { label: 'DIAMOND' },
}

function getInitialFromStorage(searchParams: URLSearchParams) {
    const urlTab = searchParams.get('rtab') as RHTab | null
    const lsTab = localStorage.getItem(LS_KEYS.tab) as RHTab | null
    return { tab: (urlTab || lsTab || 'presente') as RHTab }
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
    const [modalFuncOpen, setModalFuncOpen] = useState(false)
    const [funcSelecionado, setFuncSelecionado] = useState<any>(null)
    const [savingFunc, setSavingFunc] = useState(false)

    const [funcionarios, setFuncionarios] = useState<any[]>([])
    const [loadingFunc, setLoadingFunc] = useState(true)

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
        } catch {}
    }, [])

    const fetchFuncionarios = useCallback(async () => {
        setLoadingFunc(true)
        try {
            const { data } = await api.get('/api/funcionarios')
            const mapped = data.map((f: any) => ({
             ...f,
                area: f.area_principal?.nome || f.area_principal_id || 'Geral',
                cargo: f.cargo || 'rh',
                status: f.status || (f.ativo === false? 'ferias' : 'ativo'),
                telefone: f.telefone || f.contacto_emergencia || '',
                email: f.email || ''
            }))
            setFuncionarios(mapped)
        } catch {
            toast.error('Erro ao carregar funcionários')
        } finally {
            setLoadingFunc(false)
        }
    }, [])

    useEffect(() => { fetchMe(); fetchFuncionarios() }, [fetchMe, fetchFuncionarios])

    useEffect(() => {
        localStorage.setItem(LS_KEYS.tab, rhTab)
        const params = new URLSearchParams(searchParams)
        params.set('rtab', rhTab)
        setSearchParams(params, { replace: true })
    }, [rhTab])

    const updateNovoPos = () => {
        if (novoBtnRef.current) {
            const r = novoBtnRef.current.getBoundingClientRect()
            const width = 320
            const isMobile = window.innerWidth < 768
            const left = isMobile? window.innerWidth - width - 16 : r.right - width
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
            if (novoWrapperRef.current &&!novoWrapperRef.current.contains(e.target as Node) &&!target.closest('[data-novo-dropdown]')) setOpenNovo(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const handleLogout = () => setModalSairOpen(true)
    const handleConfirmLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); setModalSairOpen(false); navigate('/login') }

    const handleOpenCreateFunc = () => { setFuncSelecionado(null); setModalFuncOpen(true); setOpenNovo(false) }
    const handleOpenEditFunc = (f: any) => { setFuncSelecionado(f); setModalFuncOpen(true) }

    const handleSaveFuncionario = async (data: any) => {
        setSavingFunc(true)
        try {
            if (funcSelecionado?.id) {
                await api.put(`/api/funcionarios/${funcSelecionado.id}`, data)
                toast.success('Funcionário atualizado')
            } else {
                await api.post('/api/funcionarios', data)
                toast.success('Funcionário criado')
            }
            setModalFuncOpen(false)
            setFuncSelecionado(null)
            await fetchFuncionarios()
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Erro ao salvar funcionário')
        } finally { setSavingFunc(false) }
    }

    const funcionariosFiltrados = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return funcionarios
        return funcionarios.filter(f =>
            f.nome?.toLowerCase().includes(q) ||
            f.cargo?.toLowerCase().includes(q) ||
            String(f.area).toLowerCase().includes(q) ||
            f.numero_bi?.toLowerCase().includes(q)
        )
    }, [search, funcionarios])

    const presentes = funcionariosFiltrados.filter(f => f.status === 'ativo')
    const ferias = funcionariosFiltrados.filter(f => f.status === 'ferias')
    const totalPresentes = funcionarios.filter(f => f.status === 'ativo').length
    const totalFerias = funcionarios.filter(f => f.status === 'ferias').length

    return (
        <div className="min-h-screen bg-white relative">
            <GlobalAreas />
            <ModalConfirmSair open={modalSairOpen} companyName={companyName} onClose={() => setModalSairOpen(false)} onConfirm={handleConfirmLogout} />
            <ModalUsuario open={modalUsuarioOpen} usuario={usuario} empresa={empresa} onClose={() => setModalUsuarioOpen(false)} />
            <ModalFuncionario open={modalFuncOpen} funcionario={funcSelecionado} saving={savingFunc} onClose={() => { setModalFuncOpen(false); setFuncSelecionado(null) }} onSave={handleSaveFuncionario} />

            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start text-left">
                        <div className="relative w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] shrink-0 self-start">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[5px] border-white shadow-sm">
                                <img src={logoUrlSafe || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={companyName} />
                            </div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2px] border-white shadow" style={{ background: empresa?.is_active === false? '#ef4444' : '#22c55e' }}></div>
                            <button onClick={() => setModalUsuarioOpen(true)} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center hover:bg-gray-50">
                                <User className="w-3.5 h-3.5 text-gray-700" />
                            </button>
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-row justify-between items-start gap-3 w-full">
                                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                    <h1 className="text-[16px] sm:text-[19px] font-bold text-[#1a202c] uppercase tracking-wide leading-tight truncate max-w-[180px] sm:max-w-[320px]">{companyName || 'CONNECT'}</h1>
                                    <div className="mt-2.5 space-y-0 text-[12px] sm:text-[13px] text-gray-700 leading-[1.4]">
                                        <p><span className="font-medium text-gray-500">NIF:</span> {empresa?.nif || '---'}</p>
                                        <p><span className="font-medium text-gray-500">Tel:</span> {empresa?.telefone || empresa?.phone || '---'}</p>
                                        <p className="truncate max-w-[220px] sm:max-w-none"><span className="font-medium text-gray-500">Email:</span> {empresa?.email || '---'}</p>
                                    </div>
                                    <div className="mt-4 space-y-0 w-full">
                                        <p className="text-[11px] text-gray-500">Funcionários - {loadingFunc? '...' : `${funcionarios.length} registados`}</p>
                                        <p className="text-[11px] text-gray-500">Ativos - <span className="text-[#22c55e] font-bold text-[13px]">{totalPresentes} ativos</span></p>
                                        <p className="text-[11px] text-gray-600 font-medium">Férias - {totalFerias} este mês</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 pl-2">
                                    <div className="relative">
                                        <div className="absolute -top-3 -right-2 z-10">
                                            <span className="text-[8px] font-bold tracking-wide bg-white border border-yellow-200 text-yellow-700 px-1.5 py-[1px] rounded-full shadow-sm">{planInfo.label}</span>
                                        </div>
                                        <button onClick={() => navigate('/assinatura')} className="w-10 h-10 rounded-full bg-white border border-yellow-200 shadow flex items-center justify-center text-[#f59e0b] hover:bg-yellow-50 transition">
                                            <Crown className="w-[18px] h-[18px]" />
                                        </button>
                                    </div>
                                    <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-[#FF3B30] border border-[#FF3B30] shadow flex items-center justify-center text-white hover:bg-[#e6352b] transition">
                                        <Power className="w-[18px] h-[18px]" />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-5 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                                <button onClick={() => setRhTab('presente')} className={`flex-1 py-2 ${rhTab === 'presente'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{totalPresentes}</p><p className="text-[11px] text-gray-500">Presentes</p>
                                </button>
                                <button onClick={() => setRhTab('ferias')} className={`flex-1 py-2 border-l ${rhTab === 'ferias'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{totalFerias}</p><p className="text-[11px] text-gray-500">Férias</p>
                                </button>
                                <button onClick={() => setRhTab('ponto')} className={`flex-1 py-2 border-l ${rhTab === 'ponto'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">●</p><p className="text-[11px] text-gray-500">Ponto</p>
                                </button>
                                <button onClick={() => setRhTab('pedidos')} className={`flex-1 py-2 border-l ${rhTab === 'pedidos'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">!</p><p className="text-[11px] text-gray-500">Pedidos</p>
                                </button>
                                <div ref={novoWrapperRef} className="flex-[0.6] border-l relative">
                                    <button ref={novoBtnRef} onClick={() => setOpenNovo(!openNovo)} className={`w-full h-full flex items-center justify-center ${openNovo? 'bg-[#0095ff] text-white' : 'bg-white text-gray-800 hover:bg-gray-50'}`}>
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
                        <button onClick={() => { setRhTab('presente'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] ${rhTab === 'presente'? 'bg-[#E6F0FF] font-semibold' : 'hover:bg-gray-100'} text-black`}>Presentes</button>
                        <button onClick={() => { setRhTab('ferias'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] ${rhTab === 'ferias'? 'bg-[#E6F0FF] font-semibold' : 'hover:bg-gray-100'} text-black`}>Férias</button>
                        <button onClick={() => { setRhTab('ponto'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] ${rhTab === 'ponto'? 'bg-[#E6F0FF] font-semibold' : 'hover:bg-gray-100'} text-black`}>Ponto hoje</button>
                        <button onClick={() => { setRhTab('pedidos'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] ${rhTab === 'pedidos'? 'bg-[#E6F0FF] font-semibold' : 'hover:bg-gray-100'} text-black`}>Pedidos RH</button>
                        <button onClick={() => { setRhTab('recibos'); setOpenNovo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] ${rhTab === 'recibos'? 'bg-[#E6F0FF] font-semibold' : 'hover:bg-gray-100'} text-black`}>Recibos</button>
                        <div className="h-[1px] bg-gray-200 my-2 mx-2" />
                        <button onClick={handleOpenCreateFunc} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] hover:bg-gray-100 text-black">+ Novo funcionário</button>
                    </div>
                )}

                <div className="w-full py-6">
                    <div className="w-full px-4 sm:px-0 mt-0">
                        {(rhTab === 'presente' || rhTab === 'ferias') && (
                            <div className="flex gap-4 overflow-x-auto pb-3 mb-4 [&::-webkit-scrollbar]:hidden">
                                <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] flex-shrink-0">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={rhTab === 'ferias'? 'Buscar em férias' : 'Buscar funcionário'} className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow" />
                                </div>
                            </div>
                        )}

                        <div id="tabela">
                            {loadingFunc? <p className="text-center py-16 bg-white rounded-[20px] border text-black/50">Carregando...</p> : (
                                <>
                                    {rhTab === 'presente' && <TabPresente funcionarios={presentes} search={search} onEdit={handleOpenEditFunc} />}
                                    {rhTab === 'ferias' && <TabFerias funcionarios={ferias} search={search} onEdit={handleOpenEditFunc} />}
                                    {rhTab === 'ponto' && <TabPonto empresa={empresa} />}
                                    {rhTab === 'pedidos' && <TabPedidos />}
                                    {rhTab === 'recibos' && <TabRecibos />}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
