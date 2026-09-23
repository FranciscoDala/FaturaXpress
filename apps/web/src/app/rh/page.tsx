import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Crown, Power, Search, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import GlobalAreas from '../../components/GlobalAreas'
import ModalConfirmSair from '../dashboard/components/modals/modal_ConfirmSair'
import ModalUsuario from './components/modals/modal_UsuarioView'
import ModalFuncionario from './components/modals/modal_Funcionario'
import TabPresente from './components/tab/tab_func_presente'
import TabFerias from './components/tab/tab_func_ferias'
import TabPonto from './components/tab/ponto/ponto'
import TabPedidos from './components/tab/tab_pedidos'
import TabRecibos from './components/tab/tab_recibos'
import TabNotificacoes from './components/tab/tab_notificacoes'
import { api } from '../../lib/api'

type RHTab = 'presente' | 'ferias' | 'ponto' | 'pedidos' | 'recibos' | 'notificacoes'
const LS_KEYS = { tab: 'rh_tab' }
const PLAN_LIMITS: Record<string, { label: string }> = { free: { label: 'FREE' }, plus: { label: 'PLUS' }, premium: { label: 'PREMIUM' }, diamond: { label: 'DIAMOND' }, }

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["emitir_ft", "emitir_pp", "ver_faturas", "ver_relatorios"],
    recepcao: ["emitir_ft", "emitir_pp", "ver_faturas"],
    rh: ["gerir_funcionarios", "gerir_areas", "ver_funcionarios", "ver_ponto", "ver_pedidos", "ver_notificacoes"]
}

function temPermissao(cargo: string | undefined, perm: string) {
    if (!cargo) return false
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo.toLowerCase()] || []
    return perms.includes(perm) || perms.includes("*")
}
function isoToday() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function getInitialFromStorage(searchParams: URLSearchParams) {
    const urlTab = searchParams.get('rtab') as RHTab | null
    const lsTab = localStorage.getItem(LS_KEYS.tab) as RHTab | null
    return { tab: (urlTab || lsTab || 'ponto') as RHTab }
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
    const [pontoHoje, setPontoHoje] = useState<any[]>([])
    const [loadingFunc, setLoadingFunc] = useState(true)
    const [rhTab, setRhTab] = useState<RHTab>(init.tab)
    const [search, setSearch] = useState('')
    const [notifCount, setNotifCount] = useState(0)

    const logoUrlSafe = useMemo(() => {
        const raw = empresa?.logo_url || empresa?.image_url || ''
        if (!raw) return ''
        return raw.replace(/^http:\/\//i, 'https://')
    }, [empresa])

    const funcionarioLogado = useMemo(() => {
        try { const raw = localStorage.getItem("funcionario"); if (!raw) return null; return JSON.parse(raw) } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const isAdmin = cargoAtual === 'admin'
    const podeGerirRH = isAdmin || temPermissao(cargoAtual, 'gerir_funcionarios')
    const podeVerPonto = isAdmin || temPermissao(cargoAtual, 'ver_ponto') || temPermissao(cargoAtual, 'gerir_funcionarios')
    const planId = (empresa?.subscription_plan || 'free').toLowerCase()
    const planInfo = PLAN_LIMITS[planId] || PLAN_LIMITS.free

    const fetchMe = useCallback(async () => {
        try {
            const tipo = localStorage.getItem("login_tipo") || "company"
            const url = tipo === "funcionario" ? "/api/auth/me-funcionario" : "/api/auth/me"
            const r = await api.get(url)
            const func = r.data.funcionario || null
            let compRaw = r.data.company || r.data.empresa || r.data.company_data || r.data || null
            if (func) {
                compRaw = compRaw || func.empresa || func.company || func.empresa_data || null
                localStorage.setItem("funcionario", JSON.stringify(func))
            }
            if (tipo === "funcionario") {
                const incompleta = !compRaw || (!compRaw.telefone && !compRaw.phone && !compRaw.endereco && !compRaw.address)
                if (incompleta) {
                    try {
                        const cached = JSON.parse(localStorage.getItem("empresa") || "null")
                        if (cached) { compRaw = { ...cached, ...(compRaw || {}) } }
                    } catch { }
                }
            } else {
                if (compRaw) localStorage.setItem("empresa", JSON.stringify(compRaw))
            }
            const comp = compRaw || {}
            setEmpresa(comp)
            setUsuario(func || r.data.user || r.data)
            const nome = comp.nome || comp.companyName || comp.name || localStorage.getItem("company_name")
            if (nome) { setCompanyName(nome); localStorage.setItem("company_name", nome) }
        } catch (err: any) {
            if (err?.response?.status === 401) { localStorage.clear(); navigate('/login') }
        }
    }, [navigate])

    const fetchFuncionarios = useCallback(async () => {
        setLoadingFunc(true)
        try {
            const { data } = await api.get('/api/funcionarios')
            setFuncionarios(data.map((f: any) => ({ ...f, area: f.area_principal?.nome || f.area || 'Geral', cargo: f.cargo || 'rh', status: f.status || (f.ativo === false ? 'ferias' : 'ativo'), telefone: f.telefone || '', email: f.email || '' })))
        } catch { toast.error('Erro ao carregar funcionários') } finally { setLoadingFunc(false) }
    }, [])

    const fetchPontoHoje = useCallback(async () => {
        try {
            const r = await api.get(`/api/rh/ponto?data=${isoToday()}`)
            setPontoHoje(Array.isArray(r.data) ? r.data : (r.data.items || []))
        } catch { setPontoHoje([]) }
    }, [])

    const fetchNotifCount = useCallback(async () => {
        try {
            const area = cargoAtual === 'admin' ? 'admin' : 'rh'
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}&status=pendente`)
            const total = Array.isArray(data) ? data.length : 0
            setNotifCount(total)
            window.dispatchEvent(new CustomEvent('notificacoes-count', { detail: { count: total } }))
        } catch { setNotifCount(0) }
    }, [cargoAtual])

    useEffect(() => { fetchMe(); fetchFuncionarios(); fetchPontoHoje() }, [fetchMe, fetchFuncionarios, fetchPontoHoje])
    useEffect(() => {
        fetchNotifCount()
        const id = setInterval(fetchNotifCount, 15000)
        window.addEventListener('notificacoes-refresh' as any, fetchNotifCount as any)
        return () => { clearInterval(id); window.removeEventListener('notificacoes-refresh' as any, fetchNotifCount as any) }
    }, [fetchNotifCount])

    useEffect(() => { localStorage.setItem(LS_KEYS.tab, rhTab); const params = new URLSearchParams(searchParams); params.set('rtab', rhTab); setSearchParams(params, { replace: true }) }, [rhTab])
    useEffect(() => {
        const handler = (e: any) => { if (e.detail?.rtab) setRhTab(e.detail.rtab) }
        window.addEventListener('rh-nav' as any, handler)
        return () => window.removeEventListener('rh-nav' as any, handler)
    }, [])

    const handleLogout = () => setModalSairOpen(true)
    const handleConfirmLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); setModalSairOpen(false); navigate('/login') }
    const handleOpenEditFunc = (f: any) => { if (!podeGerirRH) { toast.error('Sem permissão'); return } setFuncSelecionado(f); setModalFuncOpen(true) }
    const handleSaveFuncionario = async (data: any) => {
        setSavingFunc(true)
        try {
            if (funcSelecionado?.id) await api.put(`/api/funcionarios/${funcSelecionado.id}`, data)
            else await api.post('/api/funcionarios', data)
            toast.success('Salvo'); setModalFuncOpen(false); setFuncSelecionado(null); await fetchFuncionarios(); await fetchPontoHoje()
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro') } finally { setSavingFunc(false) }
    }

    const presentesIds = useMemo(() => {
        const ids = new Set<string>()
        pontoHoje.forEach((p: any) => { if ((p.tipo || '').toLowerCase() === 'entrada') ids.add(String(p.funcionario_id)) })
        return ids
    }, [pontoHoje])

    const totalFuncionarios = funcionarios.length
    const totalPresentesHoje = presentesIds.size

    const funcionariosFiltrados = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return funcionarios
        return funcionarios.filter(f => f.nome?.toLowerCase().includes(q) || f.cargo?.toLowerCase().includes(q) || String(f.area).toLowerCase().includes(q))
    }, [search, funcionarios])

    const presentes = useMemo(() => funcionariosFiltrados.filter(f => presentesIds.has(String(f.id))), [funcionariosFiltrados, presentesIds])
    const ferias = useMemo(() => funcionariosFiltrados.filter(f => !presentesIds.has(String(f.id))), [funcionariosFiltrados, presentesIds])

    if (funcionarioLogado && !podeGerirRH && !podeVerPonto) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-6">
                <div className="max-w-[400px] w-full bg-white border rounded-[24px] p-8 text-center shadow-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 mx-auto" /><h2 className="text-[18px] font-bold mt-4">Sem acesso</h2>
                    <button onClick={() => navigate('/app/dashboard')} className="mt-6 w-full h-11 rounded-full bg-[#0095ff] text-white">Voltar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-white relative">
            <GlobalAreas />
            <ModalConfirmSair open={modalSairOpen} companyName={companyName} onClose={() => setModalSairOpen(false)} onConfirm={handleConfirmLogout} />
            <ModalUsuario open={modalUsuarioOpen} usuario={usuario} empresa={empresa} onClose={() => setModalUsuarioOpen(false)} />
            <ModalFuncionario open={modalFuncOpen} funcionario={funcSelecionado} saving={savingFunc} onClose={() => { setModalFuncOpen(false); setFuncSelecionado(null) }} onSave={handleSaveFuncionario} />
            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0"><div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start text-left">
                        <div className="relative w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] shrink-0 self-start">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[5px] border-white shadow-sm"><img src={logoUrlSafe || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={companyName} /></div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2px] border-white shadow bg-[#22c55e]"></div>
                            <button onClick={() => setModalUsuarioOpen(true)} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center hover:bg-gray-50"><User className="w-3.5 h-3.5 text-gray-700" /></button>
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-row justify-between items-start gap-3 w-full">
                                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <h1 className="text-[16px] sm:text-[19px] font-bold text-[#1a202c] uppercase tracking-wide leading-tight truncate max-w-[180px] sm:max-w-[320px]">{companyName || 'CONNECT'}</h1>
                                        {funcionarioLogado && (
                                            <span className="inline-flex items-center px-2.5 py-[3px] rounded-full bg-[#E6F0FF] border border-blue-200 text-[10px] font-bold text-[#0095ff] tracking-wide">
                                                {funcionarioLogado.cargo?.toUpperCase()} • {funcionarioLogado.nome?.split(' ')[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2.5 space-y-0 text-[12px] sm:text-[13px] text-gray-700 leading-[1.45]">
                                        <p><span className="font-medium text-gray-500">NIF:</span> {empresa?.nif || '5002063956'}</p>
                                        <p><span className="font-medium text-gray-500">Tel:</span> {empresa?.telefone || empresa?.phone || '+244930438947'}</p>
                                        <p className="truncate max-w-[240px] sm:max-w-none"><span className="font-medium text-gray-500">Email:</span> {empresa?.email || 'casimiroquiala2010@gmail.com'}</p>
                                        <p className="line-clamp-2"><span className="font-medium text-gray-500">Endereço:</span> {(empresa?.endereco || empresa?.address || 'Sassamba')} • {empresa?.cidade || empresa?.city || 'Saurimo'} • {empresa?.provincia || empresa?.province || 'Lunda-Sul'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 pl-2"><div className="relative"><div className="absolute -top-3 -right-2 z-10"><span className="text-[8px] font-bold tracking-wide bg-white border border-yellow-200 text-yellow-700 px-1.5 py-[1px] rounded-full shadow-sm">{planInfo.label}</span></div><button onClick={() => navigate('/assinatura')} className="w-10 h-10 rounded-full bg-white border border-yellow-200 shadow flex items-center justify-center text-[#f59e0b] hover:bg-yellow-50 transition"><Crown className="w-[18px] h-[18px]" /></button></div><button onClick={handleLogout} className="w-10 h-10 rounded-full bg-[#FF3B30] border border-[#FF3B30] shadow flex items-center justify-center text-white hover:bg-[#e6352b] transition"><Power className="w-[18px] h-[18px]" /></button></div>
                            </div>
                            <div className="mt-5 flex max-w-[520px] w-full bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden shadow-sm">
                                <button onClick={() => setRhTab('presente')} className={`flex-1 py-2.5 flex flex-col justify-center items-center text-center border-r border-gray-200 transition ${rhTab === 'presente' ? 'bg-[#F0F7FF] text-[#0095ff]' : 'bg-white text-gray-800 hover:bg-gray-50'}`}>
                                    <p className="text-[15px] font-bold leading-none">{loadingFunc ? '...' : totalFuncionarios}</p>
                                    <p className="text-[11px] text-gray-500 mt-[2px]">Funcionários</p>
                                </button>
                                <button onClick={() => setRhTab('ponto')} className={`flex-1 py-2.5 flex flex-col justify-center items-center text-center transition ${rhTab === 'ponto' ? 'bg-[#F0F7FF] text-[#0095ff]' : 'bg-white text-gray-800 hover:bg-gray-50'}`}>
                                    <p className="text-[15px] font-bold leading-none">{totalPresentesHoje}</p>
                                    <p className="text-[11px] text-gray-500 mt-[2px]">Presentes</p>
                                </button>
                            </div>
                        </div>
                    </div>
                    <style>{`.bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border:1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; }.bubble-1 { width:80px; height:80px; left:10%; top:20%; }.bubble-2 { width:120px; height:120px; left:70%; top:10%; }.bubble-3 { width:60px; height:60px; left:40%; top:60%; }.bubble-4 { width:40px; height:40px; left:85%; top:50%; }.bubble-5 { width:100px; height:100px; left:5%; top:70%; }.bubble-6 { width:50px; height:50px; left:55%; top:15%; } @keyframes floatBubble { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-25px) scale(0.95);} }`}</style>
                </div>
                <div className="w-full py-6">
                    <div className="w-full px-4 sm:px-0 mt-0">
                        {(rhTab === 'presente' || rhTab === 'ferias') && (
                            <div className="flex gap-4 overflow-x-auto pb-3 mb-4 [&::-webkit-scrollbar]:hidden">
                                <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] flex-shrink-0">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar funcionário..." className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow" />
                                </div>
                            </div>
                        )}
                        <div id="tabela">
                            {loadingFunc ? <p className="text-center py-16 bg-white rounded-[20px] border text-black/50">Carregando...</p> : (
                                <>
                                    {rhTab === 'presente' && <TabPresente funcionarios={presentes} search={search} onEdit={handleOpenEditFunc} />}
                                    {rhTab === 'ferias' && <TabFerias funcionarios={presentes.length ? presentes : funcionariosFiltrados} search={search} onEdit={handleOpenEditFunc} />}
                                    {rhTab === 'ponto' && <TabPonto empresa={empresa} usuario={usuario} />}
                                    {rhTab === 'pedidos' && <TabPedidos />}
                                    {rhTab === 'recibos' && <TabRecibos />}
                                    {rhTab === 'notificacoes' && <TabNotificacoes cargoAtual={cargoAtual} />}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
