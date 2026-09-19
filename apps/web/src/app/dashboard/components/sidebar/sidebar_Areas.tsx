import { X, Users, Briefcase, Calculator, Settings, Shield } from 'lucide-react'

interface Area {
    id: string
    nome: string
    codigo?: string
    icon: any
    count?: number
    color: 'blue' | 'red' | 'green' | 'purple' | 'yellow'
}

const AREAS_MOCK: Area[] = [
    { id: '1', nome: 'Recursos Humanos', codigo: 'RH', icon: Users, count: 12, color: 'blue' },
    { id: '2', nome: 'Financeiro', codigo: 'FIN', icon: Calculator, count: 8, color: 'green' },
    { id: '3', nome: 'Comercial', codigo: 'COM', icon: Briefcase, count: 24, color: 'purple' },
    { id: '4', nome: 'Operações', codigo: 'OPS', icon: Settings, count: 5, color: 'yellow' },
    { id: '5', nome: 'Auditoria', codigo: 'AUD', icon: Shield, count: 3, color: 'red' },
]

const colorMap = {
    blue: 'bg-[#E8F2FF] border-blue-100 text-[#0095ff]',
    red: 'bg-[#FFE8E8] border-red-100 text-[#FF3B30]',
    green: 'bg-[#E6F9E6] border-green-100 text-green-600',
    purple: 'bg-[#F3E8FF] border-purple-100 text-purple-600',
    yellow: 'bg-[#FFF8E1] border-yellow-100 text-yellow-700',
}

export default function SidebarAreas({ open, onClose }: { open: boolean, onClose: () => void }) {
    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998] transition-opacity duration-300 ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Right */}
            <div className={`fixed top-0 right-0 h-[100dvh] w-[92vw] sm:w-[380px] bg-white z-[9999] shadow-[-8px_0_40px_rgba(0,0,0,0.12)] border-l border-gray-100 flex flex-col transition-transform duration-300 ease-out ${open? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-[16px] font-bold text-gray-900">Áreas</h2>
                            <p className="text-[12px] text-gray-500 mt-0.5">Gerir departamentos da empresa</p>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-50 border flex items-center justify-center hover:bg-gray-100">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Lista - scroll-y invisível */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {AREAS_MOCK.map((area) => {
                        const Icon = area.icon
                        const colors = colorMap[area.color]
                        return (
                            <div key={area.id} className={`relative rounded-[18px] border overflow-hidden cursor-pointer hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all ${colors} bg-white`}>
                                {/* Top pastel */}
                                <div className={`h-[56px] ${colors.split(' ')[0]} relative`}>
                                    <div className="absolute top-3 right-3">
                                        <span className="bg-white border shadow-sm text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
                                            {area.codigo} • {area.count}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-6 left-4 w-12 h-12 rounded-full bg-white border-[3px] border-white shadow flex items-center justify-center">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                                {/* Content */}
                                <div className="pt-8 pb-4 px-4 bg-white">
                                    <p className="text-[14px] font-bold text-gray-900 leading-tight truncate">{area.nome}</p>
                                    <p className="text-[11px] text-gray-500 mt-1">{area.count} funcionários • ativo</p>
                                </div>
                            </div>
                        )
                    })}

                    <button className="w-full mt-2 h-[52px] rounded-[16px] border border-dashed border-gray-300 text-[13px] font-medium text-gray-600 hover:bg-gray-50">
                        + Nova Área
                    </button>
                </div>
            </div>
        </>
    )
}
