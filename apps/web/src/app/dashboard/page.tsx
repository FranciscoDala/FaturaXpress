import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, Plus, Package, ChevronDown, Users, FileDown, Check } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'
import ProdutoModal from './components/modals/modal_Produto'
import ModalConfirmDelete from './components/modals/modal_ConfirmDelete'
import ModalSaftAO from './components/modals/modal_SaftAO'
import TabelaClientes from './components/tables/tabela_Cliente'
import CardsProdutos from './components/cards/cards_Produto'
import DashboardCards from './components/cards/cards_Dashboard'
import { api } from '../../lib/api'

interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
interface Produto { id: string; nome: string; codigo: string; categoria: string | null; preco_venda: number | string; stock_atual: number; unidade: string; imagem_url: string | null; ativo: boolean; descricao?: string | null; tipo?: 'produto' | 'servico' | 'kit'; controlar_stock?: boolean; iva?: number }
type TabView = 'clientes' | 'produtos'

const VIEW_OPTIONS = [
  { value: 'clientes', label: 'Clientes' },
  { value: 'produtos', label: 'Produtos / Serviços' },
]

export default function DashboardPage() {
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('')
    const [modalClienteOpen, setModalClienteOpen] = useState(false)
    const [modalProdutoOpen, setModalProdutoOpen] = useState(false)
    const [modalSaftOpen, setModalSaftOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
    const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
    const [menuNovoOpen, setMenuNovoOpen] = useState(false)
    const [view, setView] = useState<TabView>('clientes')
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const limit = 20

    const [deleteTarget, setDeleteTarget] = useState<{type:'cliente'|'produto', id:string, nome:string} | null>(null)
    const [deleting, setDeleting] = useState(false)

    const [openSelect, setOpenSelect] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 320 })

    const fetchClientes = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/clientes', { params: { skip, limit, search } }); setClientes(res.data.items); setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar clientes') } finally { setLoading(false) }
    }
    const fetchProdutos = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/produtos', { params: { skip, limit, search } }); setProdutos(res.data.items); setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar produtos') } finally { setLoading(false) }
    }

    useEffect(() => { const name = localStorage.getItem("company_name"); if (name) setCompanyName(name) }, [])
    useEffect(() => { setPage(1) }, [view])
    useEffect(() => { if (view === 'clientes') fetchClientes(); else fetchProdutos() }, [page, view, search])

    const updatePosition = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width })
        }
    }
    useEffect(() => { if (openSelect) updatePosition() }, [openSelect])
    useEffect(() => {
        if (!openSelect) return
        const handle = () => updatePosition()
        window.addEventListener('scroll', handle, true)
        window.addEventListener('resize', handle)
        return () => {
            window.removeEventListener('scroll', handle, true)
            window.removeEventListener('resize', handle)
        }
    }, [openSelect])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapperRef.current &&!wrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-select-dropdown]')) setOpenSelect(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const handleOpenCreateCliente = () => { setClienteSelecionado(null); setModalClienteOpen(true); setMenuNovoOpen(false) }
    const handleOpenEditCliente = (c: Cliente) => { setClienteSelecionado(c); setModalClienteOpen(true) }
    const handleOpenCreateProduto = () => { setProdutoSelecionado(null); setModalProdutoOpen(true); setMenuNovoOpen(false) }
    const handleOpenEditProduto = (p: Produto) => { setProdutoSelecionado(p); setModalProdutoOpen(true) }
    const handleEmitirFatura = (c: Cliente) => navigate(`/faturas/nova?cliente_id=${c.id}`)
    const handleLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); navigate('/login') }

    const handleRequestDeleteCliente = (id: string) => {
        const c = clientes.find(x=>x.id===id)
        setDeleteTarget({type:'cliente', id, nome: c?.nome || 'este cliente'})
    }
    const handleRequestDeleteProduto = (p: Produto) => {
        setDeleteTarget({type:'produto', id: p.id, nome: p.nome})
    }

    const handleConfirmDelete = async () => {
        if(!deleteTarget) return
        setDeleting(true)
        try {
            if(deleteTarget.type==='cliente'){
                await api.delete(`/api/clientes/${deleteTarget.id}`)
                toast.success('Cliente apagado')
                fetchClientes()
            } else {
                await api.delete(`/api/produtos/${deleteTarget.id}`)
                toast.success('Produto apagado')
                fetchProdutos()
            }
            setDeleteTarget(null)
        } catch { toast.error('Erro ao apagar') }
        finally { setDeleting(false) }
    }

    const ProdutoModalAny = ProdutoModal as any

    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            <ClienteModal open={modalClienteOpen} cliente={clienteSelecionado} onClose={() => setModalClienteOpen(false)} onSuccess={() => { toast.success(clienteSelecionado? 'Atualizado' : 'Criado'); fetchClientes() }} />
            <ProdutoModalAny open={modalProdutoOpen} produto={produtoSelecionado} onClose={() => setModalProdutoOpen(false)} onSuccess={() => { toast.success(produtoSelecionado? 'Produto atualizado' : 'Produto criado'); fetchProdutos() }} />
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget?.nome} loading={deleting} onClose={()=>setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
            <ModalSaftAO open={modalSaftOpen} onClose={()=>setModalSaftOpen(false)} />

            <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-[64px]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#0095ff] flex items-center justify-center shadow-sm"><Building2 className="w-5 h-5 text-white" /></div>
                            <div><h1 className="text-[15px] font-bold leading-tight">FaturaXpress</h1><p className="text-[11px] text-gray-500 truncate max-w-[160px]">{companyName}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={()=>setModalSaftOpen(true)} className="hidden sm:flex items-center gap-2 h-[38px] px-4 bg-[#0A2540] text-white text-[12px] font-bold rounded-full hover:bg-black shadow-[0_2px_12px_rgba(0,0,0,0.08)]"><FileDown className="w-4 h-4" /> SAFT-AO AGT</button>
                            <button onClick={handleOpenCreateProduto} className="hidden sm:flex items-center gap-2 h-[38px] px-4 bg-orange-500 text-white text-[12px] font-bold rounded-full hover:bg-orange-600 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"><Package className="w-4 h-4" />Novo Produto</button>
                            <button onClick={handleOpenCreateCliente} className="hidden sm:flex items-center gap-2 h-[38px] px-5 bg-[#0095ff] text-white text-[12px] font-bold rounded-full hover:bg-[#0080e0] shadow-[0_2px_12px_rgba(0,0,0,0.08)]"><Plus className="w-4 h-4" />Novo Cliente</button>
                            <div className="relative sm:hidden">
                                <button onClick={() => setMenuNovoOpen(!menuNovoOpen)} className="flex items-center gap-2 h-[38px] px-5 bg-[#0095ff] text-white text-[12px] font-bold rounded-full"><Plus className="w-4 h-4" />Novo<ChevronDown className={`w-4 h-4 transition ${menuNovoOpen? 'rotate-180':''}`} /></button>
                                {menuNovoOpen && (
                                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 z-30 overflow-hidden p-1.5">
                                        <button onClick={()=>{ setMenuNovoOpen(false); setModalSaftOpen(true) }} className="w-full text-left px-4 py-3 text-[13px] hover:bg-gray-50 rounded-[12px] flex items-center gap-2 font-semibold"><FileDown className="w-4 h-4" /> Exportar SAFT-AO</button>
                                        <button onClick={handleOpenCreateCliente} className="w-full text-left px-4 py-3 text-[13px] hover:bg-gray-50 rounded-[12px] flex items-center gap-2"><Users className="w-4 h-4" /> Novo Cliente</button>
                                        <button onClick={handleOpenCreateProduto} className="w-full text-left px-4 py-3 text-[13px] hover:bg-gray-50 rounded-[12px] flex items-center gap-2"><Package className="w-4 h-4" /> Novo Produto</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleLogout} className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-red-600 hover:border-red-200"><LogOut className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
                  <div><h2 className="text-[22px] font-bold text-gray-900">Painel</h2><p className="text-[13px] text-gray-500 mt-1">Bem-vindo de volta, {companyName}</p></div>
                  <button onClick={()=>setModalSaftOpen(true)} className="sm:hidden w-full h-[46px] rounded-full bg-[#0A2540] text-white text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.08)]"><FileDown className="w-4 h-4" /> Exportar SAFT-AO para AGT</button>
                </div>

                <DashboardCards onCardClick={(t) => t === 'Clientes'? setView('clientes') : t === 'Produtos'? setView('produtos') : null} />

                <div className="mt-6">
                    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div ref={wrapperRef} className="relative min-w-[200px] md:min-w-[320px] snap-start flex-shrink-0 z-40">
                            <button ref={btnRef} onClick={() => setOpenSelect(!openSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                                <span className="text-gray-900">{VIEW_OPTIONS.find(o => o.value === view)?.label}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSelect? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        <div className="min-w-[140px] h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[12px] font-bold text-gray-500 snap-start flex-shrink-0">
                            Total: {total} • Pág {page}
                        </div>
                    </div>

                    {openSelect && (
                        <div data-select-dropdown style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                            {VIEW_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => { setView(opt.value as TabView); setOpenSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${view === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                    {opt.label}
                                    {view === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div id="tabela" className="mt-2">
                    {view === 'clientes'? (
                        <TabelaClientes clientes={clientes} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditCliente} onDelete={handleRequestDeleteCliente} onEmitirFatura={handleEmitirFatura} />
                    ) : (
                        <CardsProdutos produtos={produtos} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditProduto} onDelete={handleRequestDeleteProduto} />
                    )}
                </div>

                <div className="mt-6 bg-white rounded-[22px] p-6 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                    <h3 className="font-bold text-[14px] mb-4">Resumo do mês</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#F7F8FA] rounded-[16px] p-4 border border-gray-100"><p className="text-[11px] text-gray-500">Total Faturado</p><p className="text-[18px] font-bold mt-1">0.00 KZ</p></div>
                        <div className="bg-[#F7F8FA] rounded-[16px] p-4 border border-gray-100"><p className="text-[11px] text-gray-500">Faturas Emitidas</p><p className="text-[18px] font-bold mt-1">0</p></div>
                        <div className="bg-[#F7F8FA] rounded-[16px] p-4 border border-gray-100"><p className="text-[11px] text-gray-500">Clientes Ativos</p><p className="text-[18px] font-bold mt-1">{total}</p></div>
                    </div>
                    <div className="mt-6 p-4 bg-[#FFF7ED] border border-orange-200 rounded-[16px] flex items-center justify-between gap-3">
                      <div><p className="text-[13px] font-bold text-gray-900">Obrigação AGT</p><p className="text-[11px] text-gray-600">Exporta o SAFT-AO até dia 15 de cada mês</p></div>
                      <button onClick={()=>setModalSaftOpen(true)} className="h-9 px-5 rounded-full bg-[#0A2540] text-white text-[12px] font-bold shadow-sm">Gerar SAFT</button>
                    </div>
                </div>
            </main>
        </div>
    )
}
