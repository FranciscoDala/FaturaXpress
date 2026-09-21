import { Leaf, ChevronLeft, Home, Users, Package, Settings2, Receipt, FileText, PlusCircle, Factory, Lock } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["dashboard", "faturas", "emitidas", "proformas", "emitir", "clientes", "produtos", "servicos"],
    recepcao: ["dashboard", "proformas", "clientes", "emitir"],
    rh: ["rh"]
}

function temAcesso(cargo: string, area: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(area) || perms.includes("*")
}

// LINK DIRETO PARA AS ABAS QUE JÁ EXISTEM NA PAGE
const MENU_BASE = [
    { id: '1', label: 'Painel', Icon: Home, area: 'dashboard', view: 'faturas' as const, ftab: 'curso' as const, desc: 'tab_faturaEmcurso.tsx' },
    { id: '2', label: 'Recursos Humanos', Icon: Factory, area: 'rh', to: '/app/rh', desc: 'page própria' },
    { id: '3', label: 'Faturas AGT FT', Icon: Receipt, area: 'emitidas', view: 'faturas' as const, ftab: 'emitidas' as const, desc: 'tab_faturaEmitida.tsx' },
    { id: '4', label: 'Proformas PP', Icon: FileText, area: 'proformas', view: 'faturas' as const, ftab: 'curso' as const, desc: 'tab_faturaEmcurso.tsx' },
    { id: '5', label: 'Emitir Fatura', Icon: PlusCircle, area: 'emitir', view: 'faturas' as const, ftab: 'emitir' as const, desc: 'tab_faturaEmitir.tsx' },
    { id: '6', label: 'Clientes', Icon: Users, area: 'clientes', view: 'gestao' as const, list: 'clientes' as const, desc: 'tabela_Cliente.tsx' },
    { id: '7', label: 'Produtos', Icon: Package, area: 'produtos', view: 'gestao' as const, list: 'produtos' as const, desc: 'cards_Produto.tsx filtrado' },
    { id: '8', label: 'Serviços', Icon: Settings2, area: 'servicos', view: 'gestao' as const, list: 'servicos' as const, desc: 'cards_Produto.tsx filtrado servico' },
]

export default function SidebarAreas({ open, onClose }: { open: boolean, onClose: () => void }) {
    const navigate = useNavigate()
    const location = useLocation()

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'

    const MENU = MENU_BASE.map(m => ({
      ...m,
        disabled:!temAcesso(cargoAtual, m.area),
    }))

    const handleNav = (item: typeof MENU_BASE[number]) => {
        onClose()
        // RH tem page própria
        if ((item as any).to) {
            navigate((item as any).to)
            return
        }

        // Salva no LS que seu DashboardPage lê no getInitialFromStorage
        if ((item as any).view) localStorage.setItem('dashboard_homeView', (item as any).view)
        if ((item as any).ftab) localStorage.setItem('dashboard_faturaTab', (item as any).ftab)
        if ((item as any).list) localStorage.setItem('dashboard_listView', (item as any).list)

        // Monta URL: /app/dashboard?view=gestao&list=clientes ou?view=faturas&ftab=emitidas
        const params = new URLSearchParams()
        if ((item as any).view) params.set('view', (item as any).view)
        if ((item as any).ftab) params.set('ftab', (item as any).ftab)
        if ((item as any).list) params.set('list', (item as any).list)

        // Se já está no dashboard, só troca searchParams sem reload
        if (location.pathname.includes('/app/dashboard')) {
            navigate(`/app/dashboard?${params.toString()}`, { replace: true })
            // força seu useEffect de leitura a reagir
            window.dispatchEvent(new Event('storage'))
            // reload suave: dispara custom event que Dashboard pode ouvir
            setTimeout(() => {
                const ev = new CustomEvent('sidebar-nav', { detail: { view: (item as any).view, ftab: (item as any).ftab, list: (item as any).list } })
                window.dispatchEvent(ev)
                // fallback: recarrega
                window.location.search = params.toString()
            }, 50)
        } else {
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

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between px-1 pt-1 pb-4">
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

                        <div className="flex flex-col gap-[5px] overflow-y-auto no-scrollbar">
                            {MENU.map((m) => {
                                if (m.disabled) {
                                    return (
                                        <div key={m.id} className="h-[40px] rounded-full bg-gray-100 border border-gray-200 flex items-center gap-2.5 px-4 text-gray-400 text-[13.5px] font-medium cursor-not-allowed">
                                            <Lock className="w-[16px] h-[16px]" />{m.label}<span className="ml-auto text-[9px] bg-gray-200 px-1.5 py-0.5 rounded-full">BLOQ</span>
                                        </div>
                                    )
                                }
                                const isActive = m.area === 'rh'
                                if (isActive) {
                                    return (
                                        <div key={m.id} className="relative h-[40px] -mr-2.5">
                                            <div className="absolute inset-0 bg-white rounded-l-full rounded-r-[6px] border border-[#e6f0ff] shadow-[0_2px_10px_rgba(0,149,255,0.10)]" />
                                            <button onClick={() => handleNav(m)} className="relative z-10 w-full h-full flex items-center gap-2.5 px-4 text-[#0095ff] font-semibold text-[13.5px]">
                                                <m.Icon className="w-[16px] h-[16px]" />{m.label}
                                            </button>
                                        </div>
                                    )
                                }
                                return (
                                    <button key={m.id} onClick={() => handleNav(m)} className="h-[40px] rounded-full bg-white/70 backdrop-blur border border-[#e6f0ff] flex items-center gap-2.5 px-4 text-gray-700 text-[13.5px] font-medium hover:bg-white text-left">
                                        <m.Icon className="w-[16px] h-[16px] text-[#0095ff]/70" />{m.label}
                                        <span className="ml-auto text-[9px] text-gray-400">{(m as any).desc}</span>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-auto px-2 py-3 text-[11px] text-gray-500">
                            Fatura → tab_faturaEmitida.tsx<br/>
                            Clientes → tabela_Cliente<br/>
                            Produtos/Serviços → cards_Produto
                        </div>
                    </div>
                    <style>{`.bubble{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%,rgba(0,149,255,0.18),rgba(0,149,255,0.04) 65%);border:1px solid rgba(0,149,255,0.12);animation:floatBubble 8s infinite ease-in-out}.bubble-1{width:70px;height:70px;left:8%;top:18%}.bubble-2{width:100px;height:100px;left:60%;top:8%}.bubble-3{width:50px;height:50px;left:30%;top:65%}.bubble-4{width:36px;height:36px;left:75%;top:50%}@keyframes floatBubble{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}`}</style>
                </div>
            </div>
        </>
    )
}
