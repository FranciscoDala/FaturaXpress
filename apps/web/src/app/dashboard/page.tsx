import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, LogOut, FileText, Users, Receipt, Settings, Plus } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'

export default function DashboardPage() {
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('')
    const [modalOpen, setModalOpen] = useState(false)

    useEffect(() => {
        const name = localStorage.getItem("company_name")
        if (name) setCompanyName(name)
    }, [])

    const handleLogout = () => {
        localStorage.removeItem("access_token")
        localStorage.removeItem("company_id")
        localStorage.removeItem("company_name")
        toast.success("Sessão encerrada", { position: 'top-center' })
        navigate('/login')
    }

    const handleCardClick = (title: string) => {
        if (title === 'Clientes') {
            setModalOpen(true)
        } else {
            toast.info('Em breve', { position: 'top-center' })
        }
    }

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
                onClose={() => setModalOpen(false)}
                onSuccess={() => toast.success('Lista atualizada')}
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
                                onClick={() => setModalOpen(true)}
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
                            className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition cursor-pointer relative group" // <- CORRIGIDO border
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
                            <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
