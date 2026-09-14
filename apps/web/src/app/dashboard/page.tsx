import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, FileText, Users, Receipt, Settings, Plus, Package, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'
import ProdutoModal from './components/modals/modal_Produto'
import TabelaClientes from './components/tables/tabela_Cliente'
import { api } from '../../lib/api'

interface Cliente {
  id: string
  nome: string
  nif: string
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  provincia: string | null
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('')

    const [modalClienteOpen, setModalClienteOpen] = useState(false)
    const [modalProdutoOpen, setModalProdutoOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
    const [menuNovoOpen, setMenuNovoOpen] = useState(false) // <- NOVO para mobile

    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const limit = 10

    const fetchClientes = async () => {
        try {
            setLoading(true)
            const skip = (page - 1) * limit
            const res = await api.get('/api/clientes', {
                params: { skip, limit, search }
            })
            setClientes(res.data.items)
            setTotal(res.data.total)
        } catch (err) {
            toast.error('Erro ao carregar clientes')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const name = localStorage.getItem("company_name")
        if (name) setCompanyName(name)
    }, [])

    useEffect(() => {
        fetchClientes()
    }, [page, search])

    const handleOpenCreateCliente = () => {
        setClienteSelecionado(null)
        setModalClienteOpen(true)
        setMenuNovoOpen(false)
    }

    const handleOpenEdit = (cliente: Cliente) => {
        setClienteSelecionado(cliente)
        setModalClienteOpen(true)
    }

    const handleOpenCreateProduto = () => {
        setModalProdutoOpen(true)
        setMenuNovoOpen(false)
    }

    const handleEmitirFatura = (cliente: Cliente) => {
        navigate(`/faturas/nova?cliente_id=${cliente.id}`)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este cliente?')) return
        try {
            await api.delete(`/api/clientes/${id}`)
            toast.success('Cliente apagado')
            if (clientes.length === 1 && page > 1) setPage(p => p - 1)
            else fetchClientes()
        } catch {
            toast.error('Erro ao apagar cliente')
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("company_id")
        localStorage.removeItem("company_name")
        toast.success("Sessão encerrada", { position: 'top-center' })
        navigate('/login')
    }

    const handleCardClick = (title: string) => {
        if (title === 'Clientes') {
            document.getElementById('tabela-clientes')?.scrollIntoView({ behavior: 'smooth' })
        } else if (title === 'Produtos') {
            handleOpenCreateProduto() // <- AGORA ABRE A MODAL
        } else if (title === 'Emitir Fatura') {
            toast.info('Selecione um cliente na tabela abaixo para emitir fatura', { position: 'top-center' })
        } else {
            toast.info('Em breve', { position: 'top-center' })
        }
    }

    const cards = [
        { title: 'Emitir Fatura', icon: FileText, desc: 'Criar nova fatura para cliente', color: 'bg-blue-600' },
        { title: 'Clientes', icon: Users, desc: 'Gerir base de clientes', color: 'bg-green-600', action: true },
        { title: 'Produtos', icon: Package, desc: 'Cadastrar produtos e serviços', color: 'bg-orange-600' }, // <- CLICÁVEL AGORA
        { title: 'Faturas', icon: Receipt, desc: 'Histórico de faturas', color: 'bg-purple-600' },
        { title: 'Definições', icon: Settings, desc: 'Dados da empresa', color: 'bg-gray-600' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            <ClienteModal
                open={modalClienteOpen}
                cliente={clienteSelecionado}
                onClose={() => setModalClienteOpen(false)}
                onSuccess={() => {
                    toast.success(clienteSelecionado? 'Cliente atualizado' : 'Cliente criado');
                    setPage(1);
                    fetchClientes()
                }}
            />

            <ProdutoModal
                open={modalProdutoOpen}
                onClose={() => setModalProdutoOpen(false)}
                onSuccess={() => {
                    toast.success('Produto criado');
                }}
            />

            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">FaturaXpress</h1>
                                <p className="text-xs text-gray-500">{companyName}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* DESKTOP: 2 botões separados */}
                            <button
                                onClick={handleOpenCreateProduto}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition"
                            >
                                <Package className="w-4 h-4" />
                                Novo Produto
                            </button>
                            <button
                                onClick={handleOpenCreateCliente}
                                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Novo Cliente
                            </button>

                            {/* MOBILE: 1 botão com menu */}
                            <div className="relative sm:hidden">
                                <button
                                    onClick={() => setMenuNovoOpen(!menuNovoOpen)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                                >
                                    <Plus className="w-4 h-4" />
                                    Novo
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                {menuNovoOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-30">
                                        <button onClick={handleOpenCreateCliente} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                            <Users className="w-4 h-4" /> Novo Cliente
                                        </button>
                                        <button onClick={handleOpenCreateProduto} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2">
                                            <Package className="w-4 h-4" /> Novo Produto
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Sair</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* CONTENT */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Painel</h2>
                    <p className="text-gray-500 mt-1">Bem-vindo de volta, {companyName}</p>
                </div>

                {/* CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {cards.map((card) => (
                        <div
                            key={card.title}
                            onClick={() => handleCardClick(card.title)}
                            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition cursor-pointer relative group"
                        >
                            <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
                                <card.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
                            <p className="text-sm text-gray-500">{card.desc}</p>
                            {card.action && (
                                <Plus className="w-5 h-5 text-gray-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition" />
                            )}
                        </div>
                    ))}
                </div>

                {/* TABELA SEPARADA */}
                <div id="tabela-clientes">
                    <TabelaClientes
                        clientes={clientes}
                        loading={loading}
                        search={search}
                        setSearch={setSearch}
                        page={page}
                        setPage={setPage}
                        total={total}
                        limit={limit}
                        onEdit={handleOpenEdit}
                        onDelete={handleDelete}
                        onEmitirFatura={handleEmitirFatura}
                    />
                </div>

                {/* RESUMO */}
                <div className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">Resumo do mês</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Total Faturado</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">0.00 KZ</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Faturas Emitidas</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Clientes Ativos</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
