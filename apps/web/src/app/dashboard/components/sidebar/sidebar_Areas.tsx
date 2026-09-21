import { Leaf, ChevronLeft, Home, Users, Package, Settings2, Receipt, FileText, PlusCircle, Factory, Lock, UserCheck, Plane, Clock, FileHeart, ClipboardList } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["dashboard", "faturas", "emitidas", "proformas", "emitir", "clientes", "produtos", "servicos"],
    recepcao: ["dashboard", "proformas", "clientes", "emitir"],
    rh: ["rh", "rh_presente", "rh_ferias", "rh_ponto", "rh_pedidos", "rh_recibos"]
}

function temAcesso(cargo: string, area: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(area) || perms.includes("*")
}

const MENU_DASH = [
    { id: '1', label: 'Painel', Icon: Home, area: 'dashboard', view: 'faturas' as const, ftab: 'curso' as const },
    { id: '2', label: 'Recursos Humanos', Icon: Factory, area: 'rh', to: '/app/rh' },
    { id: '3', label: 'Faturas AGT FT', Icon: Receipt, area: 'emitidas', view: 'faturas' as const, ftab: 'emitidas' as const },
    { id: '4', label: 'Proformas PP', Icon: FileText, area: 'proformas', view: 'faturas' as const, ftab: 'curso' as const },
    { id: '5', label: 'Emitir Fatura', Icon: PlusCircle, area: 'emitir', view: 'faturas' as const, ftab: 'emitir' as const },
    { id: '6', label: 'Clientes', Icon: Users, area: 'clientes', view: 'gestao' as const, list: 'clientes' as const },
    { id: '7', label: 'Produtos', Icon: Package, area: 'produtos', view: 'gestao' as const, list: 'produtos' as const },
    { id: '8', label: 'Serviços', Icon: Settings2, area: 'servicos', view: 'gestao' as const, list: 'servicos' as const },
]

const MENU_RH = [
    { id: 'rh1', label: 'Voltar Painel', Icon: Home, area: 'dashboard', to: '/app/dashboard' },
    { id: 'rh2', label: 'Presentes', Icon: UserCheck, area: 'rh_presente', rtab: 'presente' as const },
    { id: 'rh3', label: 'Férias', Icon: Plane, area: 'rh_ferias', rtab: 'ferias' as const },
    { id: 'rh4', label: 'Ponto Hoje', Icon: Clock, area: 'rh_ponto', rtab: 'ponto' as const },
    { id: 'rh5', label: 'Pedidos RH', Icon: ClipboardList, area: 'rh_pedidos', rtab: 'pedidos' as const },
    { id: 'rh6', label: 'Recibos', Icon: FileHeart, area: 'rh_recibos', rtab: 'recibos' as const },
]

export default function SidebarAreas({ open, onClose }: { open: boolean, onClose: () => void }) {
    const navigate = useNavigate()
    const location = useLocation()
    const isRH = location.pathname.includes('/app/rh')

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const BASE = isRH? MENU_RH : MENU_DASH

    const MENU = BASE.map(m => ({...m, disabled:!temAcesso(cargoAtual, (m as any).area) }))

    const handleNav = (item: any) => {
        onClose()
        if (item.to) { navigate(item.to); return }
        if (item.view) localStorage.setItem('dashboard_homeView', item.view)
        if (item.ftab) localStorage.setItem('dashboard_faturaTab', item.ftab)
        if (item.list) localStorage.setItem('dashboard_listView', item.list)
        if (item.rtab) {
            localStorage.setItem('rh_tab', item.rtab)
            const params = new URLSearchParams(location.search)
            params.set('rtab', item.rtab)
            navigate(`/app/rh?${params.toString()}`, { replace: true })
            window.dispatchEvent(new CustomEvent('rh-nav', { detail: { rtab: item.rtab } }))
            return
        }
        window.dispatchEvent(new CustomEvent('sidebar-nav', { detail: { view: item.view, ftab: item.ftab, list: item.list } }))
        if (location.pathname.includes('/app/dashboard')) {
            const params = new URLSearchParams(location.search)
            if (item.view) params.set('view', item.view)
            if (item.ftab) params.set('ftab', item.ftab)
            if (item.list) params.set('list', item.list)
            navigate(`/app/dashboard?${params.toString()}`, { replace: true })
        } else {
            const params = new URLSearchParams()
            if (item.view) params.set('view', item.view)
            if (item.ftab) params.set('ftab', item.ftab)
            if (item.list) params.set('list', item.list)
            navigate(`/app/dashboard?${params.toString()}`)
        }
    }

    return (
        <>
            <div className={`fixed inset-0 bg-black/20 backdrop-blur-[3px] z-[9998] transition-opacity ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <div className={`fixed top-2 right-2 bottom-2 w-[300px] z-[9999] transition-transform duration-300 ${open? 'translate-x-0' : 'translate-x-[110%]'}`}>
                <div className="relative h-full w-full rounded-[24px] bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white border border-[#d6e8ff] p-2.5 flex flex-col shadow-[0_8px_40px_rgba(0,149,255,0.15)] overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div>
                    </div>
                    <div className="relative z-10 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between px-1 pt-1 pb-4 shrink-0">
                            <div className="w-9 h-9 rounded-full bg-white border border-[#d6e8ff] shadow-sm flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-[#0095ff] fill-[#E8F2FF]" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{cargoAtual.toUpperCase()}</span>
                                <button onClick={onClose} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                                    <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
                                </button>
                            </div>
                        </div>

                        <div className="px-1 pb-2 text-[10px] font-bold tracking-widest text-[#0095ff]/60">{isRH? 'RH • ABAS' : 'ÁREAS'}</div>

                        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-[5px] pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {MENU.map((m: any) => {
                                if (m.disabled) {
                                    return (
                                        <div key={m.id} className="h-[40px] shrink-0 rounded-full bg-gray-100 border border-gray-200 flex items-center gap-2.5 px-4 text-gray-400 text-[13.5px] font-medium cursor-not-allowed">
                                            <Lock className="w-[16px] h-[16px]" />{m.label}<span className="ml-auto text-[9px] bg-gray-200 px-1.5 py-0.5 rounded-full">BLOQ</span>
                                        </div>
                                    )
                                }
                                const active = isRH && m.rtab? (localStorage.getItem('rh_tab') || 'presente') === m.rtab :!isRH && m.area === 'rh' && location.pathname.includes('/app/rh')
                                if (active) {
                                    return (
                                        <div key={m.id} className="relative h-[40px] shrink-0 -mr-2.5">
                                            <div className="absolute inset-0 bg-white rounded-l-full border border-[#e6f0ff] shadow-[0_2px_10px_rgba(0,149,255,0.10)]" />
                                            <button onClick={() => handleNav(m)} className="relative z-10 w-full h-full flex items-center gap-2.5 px-4 text-[#0095ff] font-semibold text-[13.5px]">
                                                <m.Icon className="w-[16px] h-[16px]" />{m.label}
                                            </button>
                                        </div>
                                    )
                                }
                                return (
                                    <button key={m.id} onClick={() => handleNav(m)} className="h-[40px] shrink-0 rounded-full bg-white/70 backdrop-blur border border-[#e6f0ff] flex items-center gap-2.5 px-4 text-gray-700 text-[13.5px] font-medium hover:bg-white text-left">
                                        <m.Icon className="w-[16px] h-[16px] text-[#0095ff]/70" />{m.label}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-auto pt-3 px-2 text-[11px] text-gray-500 shrink-0">
                            {isRH? 'RH → tab_func_presente / ferias / ponto' : 'Fatura → tab_faturaEmitida<br/>Clientes → tabela_Cliente'}
                        </div>
                    </div>
                    <style>{`.bubble{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(0,149,255,0.18),rgba(0,149,255,0.04) 65%);border:1px solid rgba(0,149,255,0.12);animation:floatBubble 8s infinite ease-in-out}.bubble-1{width:70px;height:70px;left:8%;top:18%}.bubble-2{width:100px;height:100px;left:60%;top:8%}.bubble-3{width:50px;height:50px;left:30%;top:65%}.bubble-4{width:36px;height:36px;left:75%;top:50%}@keyframes floatBubble{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
                </div>
            </div>
        </>
    )
}
