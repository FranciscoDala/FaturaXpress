import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, ChevronDown, Users, FileDown, Check, Power, Receipt, Menu, Wrench, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'
import ProdutoModal from './components/modals/modal_Produto'
import ModalConfirmDelete from './components/modals/modal_ConfirmDelete'
import ModalSaftAO from './components/modals/modal_SaftAO'
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

const LIST_OPTIONS = [
    { value: 'clientes', label: 'Clientes' },
    { value: 'produtos', label: 'Produtos / Serviços' },
]

export default function DashboardPage() {
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('')
    const [empresa, setEmpresa] = useState<any>(null)
    const [modalClienteOpen, setModalClienteOpen] = useState(false)
    const [modalProdutoOpen, setModalProdutoOpen] = useState(false)
    const [modalSaftOpen, setModalSaftOpen] = useState(false)
    const [modalEmpresaOpen, setModalEmpresaOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
    const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

    const [homeView, setHomeView] = useState<HomeView>('faturas')
    const [faturaTab, setFaturaTab] = useState<FaturaTab>('curso')
    const [listView, setListView] = useState<ListView>('clientes')

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

    // form empresa edit
    const [formEmpresa, setFormEmpresa] = useState({ companyName: '', nif: '', email: '', phone: '', address: '', city: '', province: '' })
    const [savingEmpresa, setSavingEmpresa] = useState(false)

    const totalFaturado = faturasEmitidas.reduce((s: any, f: any) => s + Number(f.total_geral || f.total || 0), 0)
    const totalDocs = faturasCurso.length + faturasEmitidas.length

    const fetchFaturasGeral = async () => {
        try {
            setLoadingFaturas(true)
            const res = await api.get('/api/faturas', { params: { limit: 500 } })
            const all = Array.isArray(res.data) ? res.data : (res.data.items || [])
            setFaturasCurso(all.filter((f: any) => f.tipo_documento === 'proforma'))
            setFaturasEmitidas(all.filter((f: any) => f.tipo_documento === 'fatura' || f.tipo_documento === 'nota_credito' || !!f.hash_agt))
        } catch { } finally { setLoadingFaturas(false) }
    }

    const fetchClientes = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/clientes', { params: { skip, limit, search } }); setClientes(res.data.items); if (listView === 'clientes') setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar clientes') } finally { setLoading(false) }
    }
    const fetchProdutos = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/produtos', { params: { skip, limit, search } }); setProdutos(res.data.items); setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar produtos') } finally { setLoading(false) }
    }

    const fetchEmpresa = async () => {
        try {
            const r = await api.get('/api/auth/me')
            const comp = r.data.company || r.data
            setEmpresa(comp)
            const nome = comp.nome || comp.companyName || localStorage.getItem("company_name")
            if (nome) {
                setCompanyName(nome)
                localStorage.setItem("company_name", nome)
            }
            setFormEmpresa({
                companyName: comp.nome || comp.companyName || '',
                nif: comp.nif || '',
                email: comp.email || '',
                phone: comp.telefone || comp.phone || '',
                address: comp.endereco || comp.address || '',
                city: comp.cidade || comp.city || '',
                province: comp.provincia || comp.province || ''
            })
        } catch (err: any) {
            if (err?.response?.status === 401) {
                localStorage.clear()
                navigate('/login')
            }
        }
    }

    useEffect(() => {
        const name = localStorage.getItem("company_name");
        if (name) setCompanyName(name);
        fetchEmpresa()
        fetchFaturasGeral()
    }, [])
    useEffect(() => { setPage(1) }, [listView])
    useEffect(() => { if (homeView === 'gestao') { if (listView === 'clientes') fetchClientes(); else fetchProdutos() } }, [page, listView, search, homeView])

    const updateListPos = () => {
        if (listBtnRef.current) {
            const r = listBtnRef.current.getBoundingClientRect()
            const isMobile = window.innerWidth < 768
            setListDropdownPos({ top: r.bottom + 8, left: isMobile ? 16 : r.left, width: isMobile ? window.innerWidth - 32 : r.width })
        }
    }
    const updateNovoPos = () => {
        if (novoBtnRef.current) {
            const r = novoBtnRef.current.getBoundingClientRect()
            const width = 320
            const isMobile = window.innerWidth < 768
            const left = isMobile ? window.innerWidth - width - 16 : r.right - width
            setNovoDropdownPos({ top: r.bottom + 8, left: Math.max(16, left), width })
        }
    }
    useEffect(() => { if (openListSelect) updateListPos() }, [openListSelect])
    useEffect(() => { if (openNovo) updateNovoPos() }, [openNovo])
    useEffect(() => {
        if (!openListSelect && !openNovo) return
        const handle = () => { if (openListSelect) updateListPos(); if (openNovo) updateNovoPos() }
        window.addEventListener('scroll', handle, true)
        window.addEventListener('resize', handle)
        return () => { window.removeEventListener('scroll', handle, true); window.removeEventListener('resize', handle) }
    }, [openListSelect, openNovo])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (listWrapperRef.current && !listWrapperRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-list-dropdown]')) setOpenListSelect(false)
            if (novoWrapperRef.current && !novoWrapperRef.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('[data-novo-dropdown]')) setOpenNovo(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const handleOpenCreateCliente = () => { setClienteSelecionado(null); setModalClienteOpen(true); setOpenNovo(false) }
    const handleOpenEditCliente = (c: Cliente) => { setClienteSelecionado(c); setModalClienteOpen(true) }
    const handleOpenCreateProduto = () => { setProdutoSelecionado(null); setModalProdutoOpen(true); setOpenNovo(false) }
    const handleOpenEditProduto = (p: Produto) => { setProdutoSelecionado(p); setModalProdutoOpen(true) }
    const handleEmitirFatura = (c: Cliente) => navigate(`/faturas/nova?cliente_id=${c.id}`)
    const handleLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); navigate('/login') }

    const handleNovoAction = (v: string) => {
        setOpenNovo(false)
        if (v === 'ver_clientes') { setHomeView('gestao'); setListView('clientes'); setSearch('') }
        if (v === 'ver_produtos') { setHomeView('gestao'); setListView('produtos'); setSearch('') }
        if (v === 'ver_servicos') { setHomeView('gestao'); setListView('servicos'); setSearch('') }
        if (v === 'ver_faturas') { setHomeView('faturas'); setFaturaTab('curso') }
        if (v === 'cliente') handleOpenCreateCliente()
        if (v === 'produto') handleOpenCreateProduto()
        if (v === 'emitir') { setHomeView('faturas'); setFaturaTab('emitir') }
        if (v === 'saft') setModalSaftOpen(true)
    }

    const handleRequestDeleteCliente = (id: string) => { const c = clientes.find(x => x.id === id); setDeleteTarget({ type: 'cliente', id, nome: c?.nome || 'este cliente' }) }
    const handleRequestDeleteProduto = (p: Produto) => setDeleteTarget({ type: 'produto', id: p.id, nome: p.nome })
    const handleConfirmDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            if (deleteTarget.type === 'cliente') { await api.delete(`/api/clientes/${deleteTarget.id}`); toast.success('Cliente apagado'); fetchClientes(); fetchFaturasGeral() }
            else { await api.delete(`/api/produtos/${deleteTarget.id}`); toast.success('Produto apagado'); fetchProdutos() }
            setDeleteTarget(null)
        } catch { toast.error('Erro ao apagar') } finally { setDeleting(false) }
    }

    const handleSaveEmpresa = async () => {
        setSavingEmpresa(true)
        try {
            await api.put('/api/auth/company', formEmpresa)
            toast.success('Empresa atualizada')
            setModalEmpresaOpen(false)
            fetchEmpresa()
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Erro ao atualizar empresa')
        } finally { setSavingEmpresa(false) }
    }

    const ProdutoModalAny = ProdutoModal as any
    const produtosFiltrados = listView === 'servicos' ? produtos.filter(p => p.tipo === 'servico') : listView === 'produtos' ? produtos.filter(p => p.tipo !== 'servico') : produtos

    return (
        <div className="min-h-screen bg-white">
            <ClienteModal open={modalClienteOpen} cliente={clienteSelecionado} onClose={() => setModalClienteOpen(false)} onSuccess={() => { toast.success(clienteSelecionado ? 'Atualizado' : 'Criado'); fetchClientes() }} />
            <ProdutoModalAny open={modalProdutoOpen} produto={produtoSelecionado} onClose={() => setModalProdutoOpen(false)} onSuccess={() => { toast.success(produtoSelecionado ? 'Produto atualizado' : 'Produto criado'); fetchProdutos() }} />
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget?.nome} loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
            <ModalSaftAO open={modalSaftOpen} onClose={() => setModalSaftOpen(false)} />

            {/* MODAL EDITAR EMPRESA */}
            {modalEmpresaOpen && (
                <div className="fixed inset-0 z-[10000] bg-black/40 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] w-full max-w-[520px] max-h-[90vh] overflow-auto p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h3 className="font-bold text-[16px]">Editar Empresa</h3>
                            <button onClick={() => setModalEmpresaOpen(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div><label className="text-[11px] text-gray-500">Nome da empresa</label><input value={formEmpresa.companyName} onChange={e => setFormEmpresa({ ...formEmpresa, companyName: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[11px] text-gray-500">NIF</label><input value={formEmpresa.nif} onChange={e => setFormEmpresa({ ...formEmpresa, nif: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                                <div><label className="text-[11px] text-gray-500">Telefone</label><input value={formEmpresa.phone} onChange={e => setFormEmpresa({ ...formEmpresa, phone: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                            </div>
                            <div><label className="text-[11px] text-gray-500">Email</label><input value={formEmpresa.email} onChange={e => setFormEmpresa({ ...formEmpresa, email: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                            <div><label className="text-[11px] text-gray-500">Endereço</label><input value={formEmpresa.address} onChange={e => setFormEmpresa({ ...formEmpresa, address: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[11px] text-gray-500">Cidade</label><input value={formEmpresa.city} onChange={e => setFormEmpresa({ ...formEmpresa, city: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                                <div><label className="text-[11px] text-gray-500">Província</label><input value={formEmpresa.province} onChange={e => setFormEmpresa({ ...formEmpresa, province: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-[14px]" /></div>
                            </div>
                            <button disabled={savingEmpresa} onClick={handleSaveEmpresa} className="mt-2 h-12 rounded-full bg-[#0095ff] text-white font-bold text-[14px] disabled:opacity-60">{savingEmpresa ? 'A salvar...' : 'Salvar alterações'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-8 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start text-left">
                        {/* AVATAR COM BOLINHA VERDE E EDIT */}
                        <div className="relative w-[96px] h-[96px] sm:w-[132px] sm:h-[132px] shrink-0 self-start">
                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={companyName} />
                            </div>
                            {/* circulo verde ativo do db */}
                            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#22c55e] border-[3px] border-white shadow" title={empresa?.is_active ? 'Ativo' : 'Inativo'} style={{ background: empresa?.is_active === false ? '#ef4444' : '#22c55e' }}></div>
                            {/* icone editar empresa */}
                            <button onClick={() => setModalEmpresaOpen(true)} className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white border shadow flex items-center justify-center hover:bg-gray-50">
                                <Pencil className="w-4 h-4 text-gray-700" />
                            </button>
                        </div>

                        <div className="flex-1 w-full">
                            <div className="flex flex-row justify-between items-start gap-4 w-full">
                                <div className="flex flex-col items-start text-left">
                                    {/* NOME UPPERCASE */}
                                    <h1 className="text-[22px] sm:text-[24px] font-bold text-[#1a202c] text-left uppercase tracking-wide">{companyName || 'FaturaXpress'}</h1>
                                    <div className="flex gap-1.5 mt-1.5 justify-start">
                                        <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">Empresa</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">Painel Admin</span>
                                        {empresa?.is_active !== false && <span className="text-[9px] px-2 py-[2px] bg-green-50 border border-green-200 text-green-700 rounded">● Ativo</span>}
                                    </div>

                                    {/* INFOS HEADER ATUALIZADAS */}
                                    <div className="mt-3 space-y-1.5 text-left">
                                        <p className="text-[12px] text-[#4a5568]">Bem-vindo de volta, {companyName}</p>
                                        <p className="text-[11px] text-gray-500">Total de faturas emitidas, PP, FT - {totalDocs} docs</p>

                                        {/* TOTAL FATURADO FT PEDIDO */}
                                        <div className="mt-2">
                                            <p className="text-[11px] text-gray-500">Total Faturado FT</p>
                                            <p className="text-[20px] font-extrabold text-[#1a202c] leading-tight">{loadingFaturas ? '...' : `${totalFaturado.toFixed(2)} KZ`}</p>
                                        </div>

                                        {/* INFOS EMPRESA DO DB */}
                                        {empresa && (
                                            <div className="mt-3 grid grid-cols-1 gap-1 text-[11px] text-gray-600 border-t border-gray-100 pt-3">
                                                {empresa.nif && <p><span className="text-gray-400">NIF:</span> {empresa.nif}</p>}
                                                {(empresa.telefone || empresa.phone) && <p><span className="text-gray-400">Tel:</span> {empresa.telefone || empresa.phone}</p>}
                                                {empresa.email && <p><span className="text-gray-400">Email:</span> {empresa.email}</p>}
                                                {(empresa.endereco || empresa.address) && <p><span className="text-gray-400">Endereço:</span> {empresa.endereco || empresa.address} {empresa.cidade || empresa.city ? `• ${empresa.cidade || empresa.city}` : ''} {empresa.provincia || empresa.province ? `• ${empresa.provincia || empresa.province}` : ''}</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="w-11 h-11 rounded-full bg-white border border-red-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#FF3B30] hover:bg-red-50 transition shrink-0">
                                    <Power className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mt-6 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                                <button onClick={() => { setHomeView('faturas'); setFaturaTab('curso') }} className={`flex-1 py-2 ${homeView === 'faturas' && faturaTab === 'curso' ? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{loadingFaturas ? '...' : faturasCurso.length}</p>
                                    <p className="text-[11px] text-gray-500">Proforma PP</p>
                                </button>
                                <button onClick={() => { setHomeView('faturas'); setFaturaTab('emitidas') }} className={`flex-1 py-2 border-l ${homeView === 'faturas' && faturaTab === 'emitidas' ? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{loadingFaturas ? '...' : faturasEmitidas.length}</p>
                                    <p className="text-[11px] text-gray-500">Fatura AGT FT</p>
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
         .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border:1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; will-change: transform; }
         .bubble-1 { width:80px; height:80px; left:10%; top:20%; animation-delay:0s; }.bubble-2 { width:120px; height:120px; left:70%; top:10%; animation-delay:1s; animation-duration:10s; }.bubble-3 { width:60px; height:60px; left:40%; top:60%; animation-delay:2s; }.bubble-4 { width:40px; height:40px; left:85%; top:50%; animation-delay:0.5s; animation-duration:7s; }.bubble-5 { width:100px; height:100px; left:5%; top:70%; animation-delay:1.5s; animation-duration:9s; }.bubble-6 { width:50px; height:50px; left:55%; top:15%; animation-delay:2.5s; }
            @keyframes floatBubble { 0%,100%{transform:translateY(0) translateX(0) scale(1); opacity:0.55;} 25%{transform:translateY(-15px) translateX(10px) scale(1.05); opacity:0.85;} 50%{transform:translateY(-25px) translateX(-5px) scale(0.95); opacity:0.45;} 75%{transform:translateY(-10px) translateX(-10px) scale(1.02); opacity:0.7;} }
                    `}</style>
                </div>

                {openNovo && (
                    <div data-novo-dropdown style={{ top: novoDropdownPos.top, left: novoDropdownPos.left, width: novoDropdownPos.width, maxWidth: '92vw' }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                        <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 tracking-widest">VISUALIZAR</p>
                        <button onClick={() => handleNovoAction('ver_faturas')} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${homeView === 'faturas' ? 'bg-[#E6F0FF] font-semibold text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Receipt className="w-4 h-4 text-[#0095ff]" /> Ver Faturas PP/FT
                        </button>
                        <button onClick={() => handleNovoAction('ver_clientes')} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${homeView === 'gestao' && listView === 'clientes' ? 'bg-[#E6F0FF] font-semibold text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Users className="w-4 h-4 text-gray-500" /> Ver Clientes
                        </button>
                        <button onClick={() => handleNovoAction('ver_produtos')} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${homeView === 'gestao' && listView === 'produtos' ? 'bg-[#E6F0FF] font-semibold text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Package className="w-4 h-4 text-gray-500" /> Ver Produtos
                        </button>
                        <button onClick={() => handleNovoAction('ver_servicos')} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition ${homeView === 'gestao' && listView === 'servicos' ? 'bg-[#E6F0FF] font-semibold text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}>
                            <Wrench className="w-4 h-4 text-gray-500" /> Ver Serviços
                        </button>

                        <div className="h-[1px] bg-gray-100 my-2 mx-2" />

                        <p className="px-4 pt-1 pb-1 text-[10px] font-bold text-gray-400 tracking-widest">CRIAR / EXPORTAR</p>
                        <button onClick={() => handleNovoAction('emitir')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-50 text-gray-700">
                            <Receipt className="w-4 h-4 text-gray-500" /> Emitir Fatura (Avulso)
                        </button>
                        <button onClick={() => handleNovoAction('cliente')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-50 text-gray-700">
                            <Users className="w-4 h-4 text-gray-500" /> Adicionar Cliente
                        </button>
                        <button onClick={() => handleNovoAction('produto')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-50 text-gray-700">
                            <Package className="w-4 h-4 text-gray-500" /> Adicionar Produto
                        </button>
                        <button onClick={() => handleNovoAction('saft')} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-50 text-gray-700">
                            <FileDown className="w-4 h-4 text-gray-500" /> Exportar SAFT-AO AGT
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
                        <>
                            <div className="flex gap-4 overflow-x-auto pb-3 mb-4 items-center">
                                <div ref={listWrapperRef} className="relative min-w-[200px] max-w-[320px] flex-shrink-0 z-40">
                                    <button ref={listBtnRef} onClick={() => setOpenListSelect(!openListSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                                        <span className="text-gray-900 capitalize">{listView === 'servicos' ? 'Serviços' : LIST_OPTIONS.find(o => o.value === listView)?.label || listView}</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openListSelect ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                                <button onClick={() => { setHomeView('faturas'); setFaturaTab('curso') }} className="h-[46px] px-6 rounded-full bg-gray-900 text-white text-[13px] font-bold shrink-0">← Voltar para Faturas</button>
                            </div>

                            {openListSelect && (
                                <div data-list-dropdown style={{ top: listDropdownPos.top, left: listDropdownPos.left, width: listDropdownPos.width, maxWidth: '92vw' }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                                    <button onClick={() => { setListView('clientes'); setOpenListSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${listView === 'clientes' ? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        Clientes {listView === 'clientes' && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                    <button onClick={() => { setListView('produtos'); setOpenListSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${listView === 'produtos' ? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        Produtos {listView === 'produtos' && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                    <button onClick={() => { setListView('servicos'); setOpenListSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${listView === 'servicos' ? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        Serviços {listView === 'servicos' && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                </div>
                            )}

                            <div id="tabela">
                                {listView === 'clientes' ? (
                                    <TabelaClientes clientes={clientes} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditCliente} onDelete={handleRequestDeleteCliente} onEmitirFatura={handleEmitirFatura} />
                                ) : (
                                    <CardsProdutos produtos={produtosFiltrados} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditProduto} onDelete={handleRequestDeleteProduto} />
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
