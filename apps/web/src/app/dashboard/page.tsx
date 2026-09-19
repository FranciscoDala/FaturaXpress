import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, ChevronDown, Users, FileDown, Check, Power, Receipt, Menu, Pencil, Database, Search, Crown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardSkeleton } from '../../components/DashboardSkeleton'
import { useRealtime } from '../../hooks/useRealtime'
import ClienteModal from './components/modals/modal_Cliente'
import ProdutoModal from './components/modals/modal_Produto'
import ModalConfirmDelete from './components/modals/modal_ConfirmDelete'
import ModalSaftAO from './components/modals/modal_SaftAO'
import ModalConfirmSair from './components/modals/modal_ConfirmSair'
import ModalEmpresa from './components/modals/modal_Empresa'
import TabelaClientes from './components/tables/tabela_Cliente'
import CardsProdutos from './components/cards/cards_Produto'
import TabEmitir from '../faturas/components/tab/tab_faturaEmitir'
import TabCurso from '../faturas/components/tab/tab_faturaEmcurso'
import TabEmitidas from '../faturas/components/tab/tab_faturaEmitida'
import { api } from '../../lib/api'

interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
interface Produto { id: string; nome: string; codigo: string; categoria: string | null; preco_venda: number | string; stock_atual: number; unidade: string; imagem_url: string | null; ativo: boolean; descricao?: string | null; tipo?: 'produto' | 'servico' | 'kit'; controlar_stock?: boolean; iva?: number }

type FaturaTab = 'curso' | 'emitidas' | 'emitir'
type ListView = 'clientes' | 'produtos' | 'servicos'
type HomeView = 'faturas' | 'gestao'

interface EmpresaFormFull {
    companyName: string; nif: string; email: string; phone: string; address: string; city: string; province: string;
    iban?: string; iban2?: string; banco1?: string; banco2?: string; logo_url?: string; image_url?: string; logoFile?: File | null
}

const LIST_OPTIONS = [
    { value: 'clientes', label: 'Clientes' },
    { value: 'produtos', label: 'Produtos' },
    { value: 'servicos', label: 'Serviços' },
]

const LS_KEYS = {
    view: 'dashboard_homeView',
    ftab: 'dashboard_faturaTab',
    list: 'dashboard_listView',
}

const PLAN_LIMITS: Record<string, { label: string, max: number | null, color: string }> = {
    free: { label: 'FREE', max: 5, color: 'bg-gray-100 text-gray-700 border-gray-200' },
    plus: { label: 'PLUS', max: 100, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    premium: { label: 'PREMIUM', max: 500, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    diamond: { label: 'DIAMOND', max: null, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
}

function getInitialFromStorage(searchParams: URLSearchParams) {
    const urlView = searchParams.get('view') as HomeView | null
    const urlFtab = searchParams.get('ftab') as FaturaTab | null
    const urlList = searchParams.get('list') as ListView | null
    const lsView = localStorage.getItem(LS_KEYS.view) as HomeView | null
    const lsFtab = localStorage.getItem(LS_KEYS.ftab) as FaturaTab | null
    const lsList = localStorage.getItem(LS_KEYS.list) as ListView | null
    return {
        view: urlView || lsView || 'faturas' as HomeView,
        ftab: urlFtab || lsFtab || 'curso' as FaturaTab,
        list: urlList || lsList || 'clientes' as ListView,
    }
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const init = getInitialFromStorage(searchParams)

    const [companyName, setCompanyName] = useState('')
    const [empresa, setEmpresa] = useState<any>(null)
    const [modalClienteOpen, setModalClienteOpen] = useState(false)
    const [modalProdutoOpen, setModalProdutoOpen] = useState(false)
    const [modalSaftOpen, setModalSaftOpen] = useState(false)
    const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false)
    const [modalSairOpen, setModalSairOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
    const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

    const [homeView, setHomeView] = useState<HomeView>(init.view)
    const [faturaTab, setFaturaTab] = useState<FaturaTab>(init.ftab)
    const [listView, setListView] = useState<ListView>(init.list)

    const [clientes, setClientes] = useState<Cliente[]>([])
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [faturasCurso, setFaturasCurso] = useState<any[]>([])
    const [faturasEmitidas, setFaturasEmitidas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingFaturas, setLoadingFaturas] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const limit = 20

    const [deleteTarget, setDeleteTarget] = useState<{ type: 'cliente' | 'produto', id: string, nome: string } | null>(null)
    const [deleting, setDeleting] = useState(false)

    const [openListSelect, setOpenListSelect] = useState(false)
    const [openNovo, setOpenNovo] = useState(false)
    const listWrapperRef = useRef<HTMLDivElement>(null)
    const listBtnRef = useRef<HTMLButtonElement>(null)
    const novoWrapperRef = useRef<HTMLDivElement>(null)
    const novoBtnRef = useRef<HTMLButtonElement>(null)
    const [listDropdownPos, setListDropdownPos] = useState({ top: 0, left: 0, width: 320 })
    const [novoDropdownPos, setNovoDropdownPos] = useState({ top: 0, left: 0, width: 320 })

    const [formEmpresa, setFormEmpresa] = useState<EmpresaFormFull>({
        companyName: '', nif: '', email: '', phone: '', address: '', city: '', province: '',
        iban: '', iban2: '', banco1: '', banco2: '', logo_url: '', image_url: ''
    })
    const [savingEmpresa, setSavingEmpresa] = useState(false)

    const { ncOrigensSet, faturasFTOnly, faturasFTAtivas } = useMemo(() => {
        const origens = new Set<string>()
        faturasEmitidas.forEach((f: any) => {
            if (f.tipo_documento === 'nota_credito' && f.fatura_origem_id) {
                origens.add(f.fatura_origem_id)
            }
        })
        const ftOnly = faturasEmitidas.filter((f: any) => f.tipo_documento === 'fatura')
        const ftAtivas = ftOnly.filter((f: any) =>!origens.has(f.id) && f.status!== 'cancelada')
        return { ncOrigensSet: origens, faturasFTOnly: ftOnly, faturasFTAtivas: ftAtivas }
    }, [faturasEmitidas])

    const totalFaturado = useMemo(() => {
        return faturasFTAtivas.reduce((s: any, f: any) => s + Number(f.total_geral || f.total || 0), 0)
    }, [faturasFTAtivas])

    const totalDocs = useMemo(() => {
        return faturasCurso.length + faturasFTOnly.length
    }, [faturasCurso, faturasFTOnly])

    const planId = (empresa?.subscription_plan || 'free').toLowerCase()
    const planInfo = PLAN_LIMITS[planId] || PLAN_LIMITS.free
    const faturasMes = useMemo(() => {
        return faturasFTOnly.filter((f: any) => {
            const d = new Date(f.created_at || f.data_emissao)
            const now = new Date()
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }).length
    }, [faturasFTOnly])

    const isAtLimit = planInfo.max? faturasMes >= planInfo.max : false

    // CLIENTES QUE JÁ TEM FATURA - NÃO PODE APAGAR (SAFT)
    const clientesComFatura = useMemo(() => {
        const ids = new Set<string>()
        ;[...faturasCurso,...faturasEmitidas].forEach((f: any) => {
            if (f.cliente_id) ids.add(String(f.cliente_id))
        })
        return ids
    }, [faturasCurso, faturasEmitidas])

    const isInitialLoading =!empresa && (loading || loadingFaturas)

    useEffect(() => {
        localStorage.setItem(LS_KEYS.view, homeView)
        localStorage.setItem(LS_KEYS.ftab, faturaTab)
        localStorage.setItem(LS_KEYS.list, listView)
        const params = new URLSearchParams(searchParams)
        params.set('view', homeView)
        params.set('ftab', faturaTab)
        params.set('list', listView)
        setSearchParams(params, { replace: true })
    }, [homeView, faturaTab, listView])

    const fetchFaturasGeral = async () => {
        try {
            setLoadingFaturas(true)
            const res = await api.get('/api/faturas', { params: { limit: 500 } })
            const all = Array.isArray(res.data)? res.data : (res.data.items || [])
            setFaturasCurso(all.filter((f: any) => f.tipo_documento === 'proforma'))
            setFaturasEmitidas(all.filter((f: any) => f.tipo_documento === 'fatura' || f.tipo_documento === 'nota_credito' ||!!f.hash_agt))
        } catch { } finally { setLoadingFaturas(false) }
    }

    const fetchClientes = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/clientes', { params: { skip, limit, search } }); setClientes(res.data.items); if (listView === 'clientes') setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar clientes', { description: 'Verifique sua conexão.' }) } finally { setLoading(false) }
    }
    const fetchProdutos = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/produtos', { params: { skip, limit, search } }); setProdutos(res.data.items); setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar produtos', { description: 'Tente novamente.' }) } finally { setLoading(false) }
    }

    const fetchEmpresa = async () => {
        try {
            const r = await api.get('/api/auth/me')
            const comp = r.data.company || r.data
            setEmpresa(comp)
            const nome = comp.nome || comp.companyName || localStorage.getItem("company_name")
            if (nome) { setCompanyName(nome); localStorage.setItem("company_name", nome) }
            setFormEmpresa({
                companyName: comp.nome || comp.companyName || '',
                nif: comp.nif || '',
                email: comp.email || '',
                phone: comp.telefone || comp.phone || '',
                address: comp.endereco || comp.address || '',
                city: comp.cidade || comp.city || '',
                province: comp.provincia || comp.province || '',
                iban: comp.iban || '',
                iban2: comp.iban2 || '',
                banco1: comp.banco1 || comp.banco || '',
                banco2: comp.banco2 || '',
                logo_url: comp.logo_url || comp.image_url || '',
                image_url: comp.image_url || comp.logo_url || ''
            })
        } catch (err: any) { if (err?.response?.status === 401) { localStorage.clear(); navigate('/login') } }
    }

    useRealtime({
        onEvent: (msg) => {
            if (msg.event === 'faturas:changed') fetchFaturasGeral()
            if (msg.event === 'clientes:changed') { fetchClientes(); fetchFaturasGeral() }
            if (msg.event === 'produtos:changed') fetchProdutos()
            if (msg.event === 'company:changed') fetchEmpresa()
        }
    })

    useEffect(() => {
        const name = localStorage.getItem("company_name");
        if (name) setCompanyName(name);
        fetchEmpresa(); fetchFaturasGeral()
    }, [])
    useEffect(() => { setPage(1) }, [listView])
    useEffect(() => { if (homeView === 'gestao') { if (listView === 'clientes') fetchClientes(); else fetchProdutos() } }, [page, listView, search, homeView])

    const updateListPos = () => {
        if (listBtnRef.current) {
            const r = listBtnRef.current.getBoundingClientRect()
            setListDropdownPos({ top: r.bottom + 8, left: r.left, width: r.width })
        }
    }
    const updateNovoPos = () => {
        if (novoBtnRef.current) {
            const r = novoBtnRef.current.getBoundingClientRect()
            const width = 320
            const isMobile = window.innerWidth < 768
            const left = isMobile? window.innerWidth - width - 16 : r.right - width
            setNovoDropdownPos({ top: r.bottom + 8, left: Math.max(16, left), width })
        }
    }
    useEffect(() => { if (openListSelect) updateListPos() }, [openListSelect])
    useEffect(() => { if (openNovo) updateNovoPos() }, [openNovo])
    useEffect(() => {
        if (!openListSelect &&!openNovo) return
        const handle = () => { if (openListSelect) updateListPos(); if (openNovo) updateNovoPos() }
        window.addEventListener('scroll', handle, true)
        window.addEventListener('resize', handle)
        return () => { window.removeEventListener('scroll', handle, true); window.removeEventListener('resize', handle) }
    }, [openListSelect, openNovo])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (listWrapperRef.current &&!listWrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-list-dropdown]')) setOpenListSelect(false)
            if (novoWrapperRef.current &&!novoWrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-novo-dropdown]')) setOpenNovo(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-white">
                <DashboardSkeleton />
            </div>
        )
    }

    const handleOpenCreateCliente = () => { setClienteSelecionado(null); setModalClienteOpen(true); setOpenNovo(false) }
    const handleOpenEditCliente = (c: Cliente) => { setClienteSelecionado(c); setModalClienteOpen(true) }
    const handleOpenCreateProduto = () => { setProdutoSelecionado(null); setModalProdutoOpen(true); setOpenNovo(false) }
    const handleOpenEditProduto = (p: Produto) => { setProdutoSelecionado(p); setModalProdutoOpen(true) }
    const handleEmitirFatura = (c: Cliente) => navigate(`/faturas/nova?cliente_id=${c.id}`)
    const handleLogout = () => setModalSairOpen(true)
    const handleConfirmLogout = () => { localStorage.clear(); toast.success("Sessão encerrada", { description: "Até breve!" }); setModalSairOpen(false); navigate('/login') }

    const handleNovoAction = (v: string) => {
        setOpenNovo(false)
        if (v === 'ver_registros') { setHomeView('gestao'); setSearch('') }
        if (v === 'ver_faturas') { setHomeView('faturas'); setFaturaTab('curso') }
        if (v === 'cliente') handleOpenCreateCliente()
        if (v === 'produto') handleOpenCreateProduto()
        if (v === 'emitir') { setHomeView('faturas'); setFaturaTab('emitir') }
        if (v === 'saft') setModalSaftOpen(true)
    }

    const handleRequestDeleteCliente = (id: string) => {
        if (clientesComFatura.has(id)) {
            toast.error('Não pode apagar', { description: 'Este cliente já tem faturas emitidas no SAFT.' })
            return
        }
        const c = clientes.find(x => x.id === id);
        setDeleteTarget({ type: 'cliente', id, nome: c?.nome || 'este cliente' })
    }
    const handleRequestDeleteProduto = (p: Produto) => setDeleteTarget({ type: 'produto', id: p.id, nome: p.nome })
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.type === 'cliente') {
                await api.delete(`/api/clientes/${deleteTarget.id}`);
                toast.success('Cliente apagado', { description: `${deleteTarget.nome} foi removido.` });
                fetchClientes();
                fetchFaturasGeral()
            } else {
                await api.delete(`/api/produtos/${deleteTarget.id}`);
                toast.success('Produto apagado', { description: `${deleteTarget.nome} foi removido.` });
                fetchProdutos()
            }
            setDeleteTarget(null)
        } catch (err: any) {
            const detail = err.response?.data?.detail || err.message
            console.error("DELETE ERRO:", err.response?.data)

            if (detail?.toLowerCase().includes("fatura") || detail?.toLowerCase().includes("saft")) {
                toast.error('Não pode apagar', { description: 'Este cliente já tem faturas emitidas no SAFT.' })
            } else if (err.response?.status === 500) {
                toast.error('Erro no servidor', { description: 'Cliente tem movimentações, não pode ser apagado.' })
            } else {
                toast.error(detail || 'Erro ao apagar', { description: detail })
            }
        } finally { setDeleting(false) }
    }

    const handleSaveEmpresa = async (data: EmpresaFormFull) => {
        setSavingEmpresa(true)
        try {
            if (data.logoFile) {
                const fd = new FormData()
                fd.append('logo', data.logoFile)
                await api.put('/api/auth/company/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            }
            await api.put('/api/auth/company', {
                companyName: data.companyName,
                nif: data.nif,
                email: data.email,
                phone: data.phone,
                address: data.address,
                city: data.city,
                province: data.province,
                banco1: data.banco1,
                banco2: data.banco2,
                iban: data.iban,
                iban2: data.iban2,
            })
            toast.success('Empresa atualizada', { description: 'Dados salvos com sucesso.' })
            setModalEmpresaOpen(false)
            fetchEmpresa()
        }
        catch (e: any) { toast.error('Erro ao atualizar empresa', { description: e?.response?.data?.detail || 'Verifique os dados.' }) } finally { setSavingEmpresa(false) }
    }

    const ProdutoModalAny = ProdutoModal as any
    const produtosFiltrados = listView === 'servicos'? produtos.filter(p => p.tipo === 'servico') : listView === 'produtos'? produtos.filter(p => p.tipo!== 'servico') : produtos

    return (
        <div className="min-h-screen bg-white">
            <ClienteModal open={modalClienteOpen} cliente={clienteSelecionado} onClose={() => setModalClienteOpen(false)} onSuccess={() => { toast.success(clienteSelecionado? 'Cliente atualizado' : 'Cliente criado', { description: clienteSelecionado? 'Dados atualizados.' : 'Cliente adicionado com sucesso.' }); fetchClientes() }} />
            <ProdutoModalAny open={modalProdutoOpen} produto={produtoSelecionado} onClose={() => setModalProdutoOpen(false)} onSuccess={() => { toast.success(produtoSelecionado? 'Produto atualizado' : 'Produto criado', { description: 'Operação concluída.' }); fetchProdutos() }} />
            <ModalEmpresa open={modalEmpresaOpen} initialData={formEmpresa} saving={savingEmpresa} onClose={() => setModalEmpresaOpen(false)} onSave={handleSaveEmpresa} />
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget?.nome} loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
            <ModalSaftAO open={modalSaftOpen} onClose={() => setModalSaftOpen(false)} />
            <ModalConfirmSair open={modalSairOpen} companyName={companyName} onClose={() => setModalSairOpen(false)} onConfirm={handleConfirmLogout} />
            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start text-left">
                        <div className="relative w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] shrink-0 self-start">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[5px] border-white shadow-sm">
                                <img src={empresa?.logo_url || empresa?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={companyName} />
                            </div>
                            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2px] border-white shadow" style={{ background: empresa?.is_active === false? '#ef4444' : '#22c55e' }}></div>
                            <button onClick={() => setModalEmpresaOpen(true)} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center hover:bg-gray-50">
                                <Pencil className="w-3.5 h-3.5 text-gray-700" />
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
                                        {(empresa?.iban || empresa?.iban2) && (
                                            <p className="break-all text-[11px]"><span className="font-medium text-gray-500">IBAN:</span> {empresa?.iban}{empresa?.iban2? ` | ${empresa?.iban2}` : ''}</p>
                                        )}
                                    </div>
                                    <div className="mt-4 space-y-0 w-full">
                                        <p className="text-[11px] text-gray-500">Faturas emitidas - {loadingFaturas? '...' : `${totalDocs} docs`}</p>
                                        <p className="text-[11px] text-gray-500">Total pago faturas(agt) - <span className="text-[#FF3B30] font-bold text-[13px]">{loadingFaturas? '...' : `${totalFaturado.toFixed(2)} KZ`}</span></p>
                                        <p className="text-[11px] text-gray-600 font-medium">
                                            Faturas por mês - {loadingFaturas? '...' : planInfo.max? `${faturasMes}(${planInfo.max}) este mês` : `${faturasMes}, este mês (Ilimitado)`}
                                        </p>
                                        {isAtLimit && (
                                            <div className="flex items-center gap-1 text-[11px] text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-[12px] w-full max-w-full">
                                                Limite free atingido, atualiza o seu plano!
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 pl-2">
                                    <div className="relative">
                                        <div className="absolute -top-3 -right-2 z-10">
                                            <span className="text-[8px] font-bold tracking-wide bg-white border border-yellow-200 text-yellow-700 px-1.5 py-[1px] rounded-full shadow-sm">
                                                {planInfo.label}
                                            </span>
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
                                <button onClick={() => { setHomeView('faturas'); setFaturaTab('curso') }} className={`flex-1 py-2 ${homeView === 'faturas' && faturaTab === 'curso'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{loadingFaturas? '...' : faturasCurso.length}</p>
                                    <p className="text-[11px] text-gray-500">Proforma PP</p>
                                </button>
                                <button onClick={() => { setHomeView('faturas'); setFaturaTab('emitidas') }} className={`flex-1 py-2 border-l ${homeView === 'faturas' && faturaTab === 'emitidas'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{loadingFaturas? '...' : faturasFTOnly.length}</p>
                                    <p className="text-[11px] text-gray-500">Fatura AGT FT</p>
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
              .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border:1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; will-change: transform; }
              .bubble-1 { width:80px; height:80px; left:10%; top:20%; }.bubble-2 { width:120px; height:120px; left:70%; top:10%; }.bubble-3 { width:60px; height:60px; left:40%; top:60%; }.bubble-4 { width:40px; height:40px; left:85%; top:50%; }.bubble-5 { width:100px; height:100px; left:5%; top:70%; }.bubble-6 { width:50px; height:50px; left:55%; top:15%; }
                      @keyframes floatBubble { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-25px) scale(0.95);} }
                    `}</style>
                </div>

                {openNovo && (
                    <div data-novo-dropdown style={{ top: novoDropdownPos.top, left: novoDropdownPos.left, width: novoDropdownPos.width, maxWidth: '92vw' }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-200 overflow-hidden p-1.5 z-[9999]">
                        <button onClick={() => handleNovoAction('ver_faturas')} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${homeView === 'faturas'? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>
                            <Receipt className="w-4 h-4 text-black" /> Faturas
                        </button>
                        <button onClick={() => handleNovoAction('ver_registros')} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${homeView === 'gestao'? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>
                            <Database className="w-4 h-4 text-black" /> Registros
                        </button>
                        <div className="h-[1px] bg-gray-200 my-2 mx-2" />
                        <button onClick={() => handleNovoAction('emitir')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-100 text-black">
                            <Receipt className="w-4 h-4 text-black" /> Emitir fatura
                        </button>
                        <button onClick={() => handleNovoAction('cliente')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-100 text-black">
                            <Users className="w-4 h-4 text-black" /> Novo cliente
                        </button>
                        <button onClick={() => handleNovoAction('produto')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-100 text-black">
                            <Package className="w-4 h-4 text-black" /> Novo produto
                        </button>
                        <button onClick={() => handleNovoAction('saft')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-100 text-black">
                            <FileDown className="w-4 h-4 text-black" /> Exportar SAFT(agt)
                        </button>
                    </div>
                )}

                <div className="w-full py-6">
                    {homeView === 'faturas' && (
                        <div className="w-full py-2">
                            {faturaTab === 'emitir' && <TabEmitir onEmitida={() => { fetchFaturasGeral(); setFaturaTab('curso') }} />}
                            {faturaTab === 'curso' && <TabCurso faturas={faturasCurso} cliente={null as any} empresa={empresa} onRefresh={fetchFaturasGeral} />}
                            {faturaTab === 'emitidas' && <TabEmitidas faturas={faturasEmitidas} cliente={null as any} empresa={empresa} onRefresh={fetchFaturasGeral} />}
                        </div>
                    )}
                    {homeView === 'gestao' && (
                        <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-3 mb-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <div ref={listWrapperRef} className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-40">
                                    <button ref={listBtnRef} onClick={() => setOpenListSelect(!openListSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                                        <span className="text-gray-900 capitalize">{LIST_OPTIONS.find(o => o.value === listView)?.label || listView}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openListSelect? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                                <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-0">
                                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={listView === 'clientes'? 'Buscar cliente por nome ou NIF' : listView === 'servicos'? 'Buscar serviço por nome' : 'Buscar produto por nome ou código'} className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                                </div>
                            </div>
                            {openListSelect && (
                                <div data-list-dropdown style={{ top: listDropdownPos.top, left: listDropdownPos.left, width: listDropdownPos.width }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-200 overflow-hidden p-1.5 z-[9999]">
                                    {LIST_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => { setListView(opt.value as any); setOpenListSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${listView === opt.value? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-100 text-black'}`}>
                                            {opt.label} {listView === opt.value && <Check className="w-4 h-4 text-black" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div id="tabela">
                                {listView === 'clientes'? (
                                    <TabelaClientes
                                        clientes={clientes}
                                        loading={loading}
                                        search={search}
                                        setSearch={setSearch}
                                        page={page}
                                        setPage={setPage}
                                        total={total}
                                        limit={limit}
                                        onEdit={handleOpenEditCliente}
                                        onDelete={handleRequestDeleteCliente}
                                        onEmitirFatura={handleEmitirFatura}
                                        clientesComFatura={clientesComFatura as any}
                                    />
                                ) : (
                                    <CardsProdutos produtos={produtosFiltrados} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditProduto} onDelete={handleRequestDeleteProduto} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
