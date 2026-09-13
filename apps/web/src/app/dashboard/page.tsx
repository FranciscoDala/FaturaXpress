import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, FileText, Users, Receipt, Settings, Plus, Search, Trash2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'
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
    const [modalOpen, setModalOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
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

    const handleOpenCreate = () => {
        setClienteSelecionado(null)
        setModalOpen(true)
    }

    const handleOpenEdit = (cliente: Cliente) => {
        setClienteSelecionado(cliente)
        setModalOpen(true)
    }

    const handleEmitirFatura = (cliente: Cliente) => {
        // Manda pra tela de emitir fatura com o id do cliente na URL
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
        } else if (title === 'Emitir Fatura') {
            toast.info('Selecione um cliente na tabela abaixo para emitir fatura', { position: 'top-center' })
        } else {
            toast.info('Em breve', { position: 'top-center' })
        }
    }

    const totalPages = Math.ceil(total / limit)

    const cards = [
        { title: 'Emitir Fatura', icon: FileText, desc: 'Criar nova fatura para cliente', color: 'bg-blue-600' },
        { title: 'Clientes', icon: Users, desc: 'Gerir base de clientes', color: 'bg-green-600', action: true },
        { title: 'Faturas', icon: Receipt, desc: 'Histórico de faturas', color: 'bg-purple-600' },
        { title: 'Definições', icon: Settings, desc: 'Dados da empresa', color: 'bg-gray-600' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            <ClienteModal
                open={modalOpen}
                cliente={clienteSelecionado}
                onClose={() => setModalOpen(false)}
                onSuccess={() => {
                    toast.success(clienteSelecionado? 'Cliente atualizado' : 'Cliente criado');
                    setPage(1);
                    fetchClientes()
                }}
            />

            {/* HEADER */}
            <header className="bg-white border-b border-gray-200">
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

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleOpenCreate}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Novo Cliente
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 transition"
                            >
                                <LogOut className="w-4 h-4" />
                                Sair
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cards.map((card) => (
                        <div
                            key={card.title}
                            onClick={() => handleCardClick(card.title)}
                            className="bg-white rounded-xl p-6 border-gray-200 hover:shadow-md transition cursor-pointer relative group"
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

                {/* TABELA DE CLIENTES */}
                <div id="tabela-clientes" className="mt-8 bg-white rounded-xl p-6 border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <h3 className="font-semibold text-gray-900">Clientes</h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                                placeholder="Buscar por nome ou NIF"
                                className="pl-9 pr-4 py-2 border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                            />
                        </div>
                    </div>

                    {loading? (
                        <p className="text-center text-gray-500 py-8">Carregando...</p>
                    ) : clientes.length === 0? (
                        <p className="text-center text-gray-500 py-8">Nenhum cliente cadastrado</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-gray-500 border-b">
                                        <tr>
                                            <th className="pb-3 font-medium">Nome</th>
                                            <th className="pb-3 font-medium">NIF</th>
                                            <th className="pb-3 font-medium">Email</th>
                                            <th className="pb-3 font-medium">Telefone</th>
                                            <th className="pb-3 font-medium">Cidade</th>
                                            <th className="pb-3 font-medium w-28 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clientes.map(cli => (
                                            <tr key={cli.id} className="border-b last:border-0 hover:bg-gray-50">
                                                <td className="py-3 font-medium text-gray-900">{cli.nome}</td>
                                                <td className="py-3 text-gray-600">{cli.nif}</td>
                                                <td className="py-3 text-gray-600">{cli.email || '-'}</td>
                                                <td className="py-3 text-gray-600">{cli.telefone || '-'}</td>
                                                <td className="py-3 text-gray-600">{cli.cidade || '-'}</td>
                                                <td className="py-3">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleEmitirFatura(cli)}
                                                            className="text-green-600 hover:text-green-800" // <- NOVO BTN
                                                            title="Emitir Fatura"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleOpenEdit(cli)} className="text-blue-600 hover:text-blue-800" title="Editar">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete(cli.id)} className="text-red-600 hover:text-red-800" title="Apagar">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINAÇÃO */}
                            {totalPages > 1 && (
                                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                                    <p className="text-sm text-gray-500">
                                        Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={page === 1}
                                            onClick={() => setPage(p => p - 1)}
                                            className="p-2 border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span className="px-3 py-2 text-sm">Página {page} de {totalPages}</span>
                                        <button
                                            disabled={page === totalPages}
                                            onClick={() => setPage(p => p + 1)}
                                            className="p-2 border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* RESUMO */}
                <div className="mt-8 bg-white rounded-xl p-6 border-gray-200">
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
