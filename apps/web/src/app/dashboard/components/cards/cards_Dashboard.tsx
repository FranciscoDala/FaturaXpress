import { FileText, Users, Receipt, Settings, Package, Plus } from 'lucide-react'

interface Props {
  onCardClick: (title: string) => void
}

const cards = [
    { title: 'Emitir Fatura', icon: FileText, desc: 'Criar nova fatura para cliente', color: 'bg-blue-600' },
    { title: 'Clientes', icon: Users, desc: 'Gerir base de clientes', color: 'bg-green-600', action: true },
    { title: 'Produtos', icon: Package, desc: 'Cadastrar produtos e serviços', color: 'bg-orange-600' },
    { title: 'Faturas', icon: Receipt, desc: 'Histórico de faturas', color: 'bg-purple-600' },
    { title: 'Definições', icon: Settings, desc: 'Dados da empresa', color: 'bg-gray-600' },
]

export default function DashboardCards({ onCardClick }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.title} onClick={() => onCardClick(card.title)} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition cursor-pointer relative group">
          <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}><card.icon className="w-6 h-6 text-white" /></div>
          <h3 className="font-semibold text-gray-900 mb-1">{card.title}</h3>
          <p className="text-sm text-gray-500">{card.desc}</p>
          {card.action && (<Plus className="w-5 h-5 text-gray-400 absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition" />)}
        </div>
      ))}
    </div>
  )
}
