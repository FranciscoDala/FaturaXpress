import { X, Users, Briefcase, Calculator, Settings, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Area {
    id: string
    nome: string
    codigo?: string
    icon: any
    count?: number
    path?: string
    label?: string
}

const AREAS_MOCK: Area[] = [
    { id: '1', nome: 'Recursos Humanos', codigo: 'RH', icon: Users, count: 12, path: '/app/rh', label: 'Home' },
    { id: '2', nome: 'Financeiro', codigo: 'FIN', icon: Calculator, count: 8, label: 'Measure' },
    { id: '3', nome: 'Comercial', codigo: 'COM', icon: Briefcase, count: 24, label: 'Analyze' },
    { id: '4', nome: 'Operações', codigo: 'OPS', icon: Settings, count: 5, label: 'Reduce' },
    { id: '5', nome: 'Auditoria', codigo: 'AUD', icon: Shield, count: 3, label: 'Report' },
]

export default function SidebarAreas({ open, onClose, activeId = '4' }: { open: boolean, onClose: () => void, activeId?: string }) {
    const navigate = useNavigate()

    const handleClick = (area: Area) => {
        if (area.path) {
            onClose()
            setTimeout(() => navigate(area.path!), 150)
        }
    }

    return (
        <>
            {/* Fundo glaciano - igual seu original */}
            <div className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998] transition-opacity duration-300 ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />

            {/* Sidebar */}
            <div className={`fixed top-3 right-3 bottom-3 w-[88vw] sm:w-[320px] z-[9999] flex flex-col transition-transform duration-300 ease-out ${open? 'translate-x-0' : 'translate-x-[110%]'}`}>
                <div className="flex-1 rounded-[28px] bg-gradient-to-b from-[#0e8c5a] via-[#0a5c3a] to-[#021a11] p-2 shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-white/10 flex flex-col relative overflow-hidden">

                    <div className="flex items-center justify-between px-3 pt-3 pb-5 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                            <span className="text-white">🍃</span>
                        </div>
                        <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                            <X className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>

                    <div className="flex-1 space-y-1 relative">
                        {AREAS_MOCK.map((area) => {
                            const Icon = area.icon
                            const isActive = area.id === activeId
                            return (
                                <div key={area.id} className="relative h-[52px] px-1">
                                    <button
                                        onClick={() => handleClick(area)}
                                        className={`relative z-10 w-full h-full flex items-center gap-3 px-4 rounded-[20px] text-left transition-all
                                            ${isActive? 'bg-white text-[#021a11] font-semibold shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'}
                                        `}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isActive? 'bg-[#021a11]/10' : 'bg-white/10'}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <span className="text-[14px] tracking-wide flex-1">{area.label || area.nome}</span>
                                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${isActive? 'bg-[#021a11]/10 text-[#021a11]' : 'bg-white/15 text-white/70'}`}>
                                            {area.count}
                                        </span>
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    <div className="px-4 pb-4 pt-6 shrink-0">
                        <div className="h-px bg-white/10 mb-4"></div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest px-2">FATURAXPRESS • ÁREAS</p>
                    </div>
                </div>
            </div>
        </>
    )
}
