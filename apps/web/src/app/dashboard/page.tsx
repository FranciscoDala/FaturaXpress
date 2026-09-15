import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, Plus, Package, ChevronDown, Users } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'
import ProdutoModal from './components/modals/modal_Produto'
import ModalConfirmDelete from './components/modals/modal_ConfirmDelete'
import TabelaClientes from './components/tables/tabela_Cliente'
import CardsProdutos from './components/cards/cards_Produto'
import DashboardCards from './components/cards/cards_Dashboard'
import { api } from '../../lib/api'

interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
interface Produto { id: string; nome: string; codigo: string; categoria: string | null; preco_venda: number | string; stock_atual: number; unidade: string; imagem_url: string | null; ativo: boolean; descricao?: string | null; tipo?: 'produto' | 'servico' | 'kit'; controlar_stock?: boolean; iva?: number }
type TabView = 'clientes' | 'produtos'

export default function DashboardPage() {
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('')
    const [modalClienteOpen, setModalClienteOpen] = useState(false)
    const [modalProdutoOpen, setModalProdutoOpen] = useState(false)
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

    // MODAL DELETE SAAS
    const [deleteTarget, setDeleteTarget] = useState<{type:'cliente'|'produto', id:string, nome:string} | null>(null)
    const [deleting, setDeleting] = useState(false)

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

    const handleOpenCreateCliente = () => { setClienteSelecionado(null); setModalClienteOpen(true); setMenuNovoOpen(false) }
    const handleOpenEditCliente = (c: Cliente) => { setClienteSelecionado(c); setModalClienteOpen(true) }
    const handleOpenCreateProduto = () => { setProdutoSelecionado(null); setModalProdutoOpen(true); setMenuNovoOpen(false) }
    const handleOpenEditProduto = (p: Produto) => { setProdutoSelecionado(p); setModalProdutoOpen(true) }
    const handleEmitirFatura = (c: Cliente) => navigate(`/faturas/nova?cliente_id=${c.id}`)
    const handleLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); navigate('/login') }

    // ABRE MODAL EM VEZ DE CONFIRM NATIVO
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
        <div className="min-h-screen bg-gray-50">
            <ClienteModal open={modalClienteOpen} cliente={clienteSelecionado} onClose={() => setModalClienteOpen(false)} onSuccess={() => { toast.success(clienteSelecionado? 'Atualizado' : 'Criado'); fetchClientes() }} />
            <ProdutoModalAny open={modalProdutoOpen} produto={produtoSelecionado} onClose={() => setModalProdutoOpen(false)} onSuccess={() => { toast.success(produtoSelecionado? 'Produto atualizado' : 'Produto criado'); fetchProdutos() }} />

            {/* MODAL CONFIRM DELETE SAAS */}
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget?.nome} loading={deleting} onClose={()=>setDeleteTarget(null)} onConfirm={handleConfirmDelete} />

            <header className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center"><Building2 className="w-5 h-5 text-white" /></div>
                            <div><h1 className="text-lg font-bold">FaturaXpress</h1><p className="text-xs text-gray-500">{companyName}</p></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleOpenCreateProduto} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700"><Package className="w-4 h-4" />Novo Produto</button>
                            <button onClick={handleOpenCreateCliente} className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" />Novo Cliente</button>
                            <div className="relative sm:hidden">
                                <button onClick={() => setMenuNovoOpen(!menuNovoOpen)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"><Plus className="w-4 h-4" />Novo<ChevronDown className="w-4 h-4" /></button>
                                {menuNovoOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-30">
                                        <button onClick={handleOpenCreateCliente} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"><Users className="w-4 h-4" /> Novo Cliente</button>
                                        <button onClick={handleOpenCreateProduto} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"><Package className="w-4 h-4" /> Novo Produto</button>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600"><LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sair</span></button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8"><h2 className="text-2xl font-bold">Painel</h2><p className="text-gray-500 mt-1">Bem-vindo de volta, {companyName}</p></div>
                <DashboardCards onCardClick={(t) => t === 'Clientes'? setView('clientes') : t === 'Produtos'? setView('produtos') : null} />
                <div className="bg-white rounded-xl border p-4 mb-4 flex items-center justify-between mt-6">
                    <h3 className="font-semibold">Listagem</h3>
                    <select value={view} onChange={(e) => setView(e.target.value as TabView)} className="border rounded-lg px-3 py-2 text-sm">
                        <option value="clientes">Clientes</option><option value="produtos">Produtos</option>
                    </select>
                </div>
                <div id="tabela">
                    {view === 'clientes'? (
                        <TabelaClientes clientes={clientes} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditCliente} onDelete={handleRequestDeleteCliente} onEmitirFatura={handleEmitirFatura} />
                    ) : (
                        <CardsProdutos produtos={produtos} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditProduto} onDelete={handleRequestDeleteProduto} />
                    )}
                </div>
                <div className="mt-8 bg-white rounded-xl p-6 border">
                    <h3 className="font-semibold mb-4">Resumo do mês</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><p className="text-sm text-gray-500">Total Faturado</p><p className="text-2xl font-bold mt-1">0.00 KZ</p></div>
                        <div><p className="text-sm text-gray-500">Faturas Emitidas</p><p className="text-2xl font-bold mt-1">0</p></div>
                        <div><p className="text-sm text-gray-500">Clientes Ativos</p><p className="text-2xl font-bold mt-1">{total}</p></div>
                    </div>
                </div>
            </main>
        </div>
    )
}
