import { Eye, Pencil, CalendarOff, Lock, Search, ChevronDown, Check, Loader2, Settings, FileText, Clock, Wallet, Folder, Star, Power, ChevronRight } from 'lucide-react'
import { useMemo, useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { api, apiRoot } from '../../../../../lib/api'

interface Funcionario {
    id: string
    nome: string
    cargo: string
    area: string
    status: 'ativo' | 'ferias'
    email?: string
    telefone?: string
}

interface Props {
    funcionarios: Funcionario[]
    presentesIds?: Set<string>
    search?: string
    loading?: boolean
    onView?: (f: Funcionario) => void
    onEdit?: (f: Funcionario) => void
    onFerias?: (f: Funcionario) => void
    onAction?: (action: string, f: Funcionario) => void
}

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    rh: ["gerir_funcionarios", "ver_funcionarios", "ver_presentes", "editar_funcionarios", "colocar_ferias"],
    financeira: ["ver_faturas"],
    recepcao: ["ver_faturas"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

const MENU_RH = [
    { id: 'vinculo', label: 'Vínculo', icon: FileText, items: [
        { id: 'ver_contrato', label: 'Ver contrato' },
        { id: 'editar_contrato', label: 'Editar contrato' },
        { id: 'alterar_cargo', label: 'Alterar cargo' },
        { id: 'definir_horario', label: 'Definir horário e turno' },
    ]},
    { id: 'ponto', label: 'Ponto & Presença', icon: Clock, items: [
        { id: 'historico_ponto', label: 'Histórico de ponto' },
        { id: 'justificar_falta', label: 'Justificar falta' },
        { id: 'marcar_ferias', label: 'Marcar férias ou folga' },
        { id: 'licenca', label: 'Licença ou Atestado' },
    ]},
    { id: 'financeiro', label: 'Financeiro RH', icon: Wallet, items: [
        { id: 'salario', label: 'Salário e Subsídios' },
        { id: 'descontos', label: 'Descontos ou Adiantamento' },
        { id: 'recibos', label: 'Recibos' },
    ]},
    { id: 'documentos', label: 'Documentos', icon: Folder, items: [
        { id: 'docs_pessoais', label: 'BI, NIF, Comprovativos' },
        { id: 'contrato_assinado', label: 'Contrato assinado' },
        { id: 'anexos', label: 'Outros anexos' },
    ]},
    { id: 'desempenho', label: 'Desempenho', icon: Star, items: [
        { id: 'formacoes', label: 'Formações' },
        { id: 'avaliacao', label: 'Avaliação de desempenho' },
        { id: 'advertencia', label: 'Advertência Disciplinar' },
    ]},
    { id: 'estado', label: 'Estado', icon: Power, items: [
        { id: 'suspender', label: 'Suspender ou Desativar' },
        { id: 'demitir', label: 'Demitir funcionário' },
    ]},
]

export default function TabPresente({ funcionarios, presentesIds, search: searchProp, loading = false, onView, onEdit, onFerias, onAction }: Props) {
    const [searchInternal, setSearchInternal] = useState(searchProp || '')
    const [areaFiltro, setAreaFiltro] = useState('todos')
    const [openSelect, setOpenSelect] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 320 })

    useEffect(() => { if (searchProp!== undefined) setSearchInternal(searchProp) }, [searchProp])

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_presentes') || temPermissao(cargoAtual, 'ver_funcionarios') || cargoAtual === 'admin' : true
    const podeEditar = funcionarioLogado? temPermissao(cargoAtual, 'editar_funcionarios') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true
    const podeFerias = funcionarioLogado? temPermissao(cargoAtual, 'colocar_ferias') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true

    const areasEmpresa = useMemo(() => {
        const s = new Set<string>()
        funcionarios.forEach(f => { if (f.area) s.add(String(f.area)) })
        return Array.from(s).sort()
    }, [funcionarios])

    const OPTIONS = useMemo(() => [{ value: 'todos', label: 'Todas as áreas' },...areasEmpresa.map(a => ({ value: a, label: a }))], [areasEmpresa])

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
        return () => { window.removeEventListener('scroll', handle, true); window.removeEventListener('resize', handle) }
    }, [openSelect])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (wrapperRef.current &&!wrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-select-dropdown]')) setOpenSelect(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const funcionariosFiltrados = useMemo(() => {
        let list = funcionarios
        const q = searchInternal.toLowerCase().trim()
        if (q) list = list.filter(f => f.nome?.toLowerCase().includes(q) || f.cargo?.toLowerCase().includes(q) || String(f.area).toLowerCase().includes(q))
        if (areaFiltro!== 'todos') list = list.filter(f => String(f.area) === areaFiltro)
        return list
    }, [funcionarios, searchInternal, areaFiltro])

    if (loading) {
        return (
            <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                <div className="bg-white rounded-[22px] border h-[300px] flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                    <Loader2 className="w-6 h-6 animate-spin text-black/40" />
                </div>
            </div>
        )
    }

    if (!podeVer) {
        return (
            <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
                <div className="text-center py-16 bg-white rounded-[22px] border shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-black/60 text-[13px]">Seu cargo <b>{cargoAtual}</b> não pode ver funcionários</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-3 mb-4 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div ref={wrapperRef} className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-40">
                    <button ref={btnRef} onClick={() => setOpenSelect(!openSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-bold text-black">
                        <span className="text-black truncate">{OPTIONS.find(o => o.value === areaFiltro)?.label} • {funcionariosFiltrados.length}</span>
                        <ChevronDown className={`w-4 h-4 text-black transition-transform ${openSelect? 'rotate-180' : ''}`} />
                    </button>
                </div>
                <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-0">
                    <Search className="w-4 h-4 text-black absolute left-4 top-1/2 -translate-y-1/2" />
                    <input value={searchInternal} onChange={e => setSearchInternal(e.target.value)} placeholder="Buscar funcionário..." className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] font-bold text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                </div>
            </div>

            {openSelect && (
                <div data-select-dropdown style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                    {OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => { setAreaFiltro(opt.value); setOpenSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${areaFiltro === opt.value? 'bg-[#E6F0FF] text-black font-bold' : 'hover:bg-gray-50 text-black'}`}>
                            {opt.label}
                            {areaFiltro === opt.value && <Check className="w-4 h-4 text-black" />}
                        </button>
                    ))}
                </div>
            )}

            {funcionariosFiltrados.length === 0? (
                <div className="text-center text-black py-16 bg-white rounded-[22px] border shadow-[0_4px_24px_rgba(0,0,0,0.06)]">Nenhum funcionário!</div>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {funcionariosFiltrados.map((f) => (
                        <FuncionarioCard key={f.id} func={f} presentesIds={presentesIds} onView={onView} onEdit={onEdit} onFerias={onFerias} onAction={onAction} podeEditar={podeEditar} podeFerias={podeFerias} cargoAtual={cargoAtual} />
                    ))}
                </div>
            )}
        </div>
    )
}

function FuncionarioCard({ func, presentesIds, onView, onEdit, onFerias, onAction, podeEditar, podeFerias, cargoAtual }: { func: Funcionario; presentesIds?: Set<string>; onView?: Props['onView']; onEdit?: Props['onEdit']; onFerias?: Props['onFerias']; onAction?: Props['onAction']; podeEditar: boolean; podeFerias: boolean; cargoAtual: string }) {
    const [openMenu, setOpenMenu] = useState(false)
    const [openSub, setOpenSub] = useState<string | null>('vinculo')
    const menuRef = useRef<HTMLDivElement>(null)
    const initials = func.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const isPresente = presentesIds? presentesIds.has(String(func.id)) : true

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (menuRef.current &&!menuRef.current.contains(e.target as Node)) { setOpenMenu(false) }
        }
        if (openMenu) document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [openMenu])

    const handleVerContrato = async () => {
        try {
            setOpenMenu(false)
            toast.loading('Buscando contrato...')
            const { data } = await api.get(`/api/documentos/funcionario/${func.id}`)
            toast.dismiss()
            if (data && data.length > 0) {
                const doc = data[0]
                window.open(`${apiRoot}/documentos/${doc.id}/preview`, '_blank')
            } else {
                toast.error('Nenhum contrato encontrado para ' + func.nome)
            }
        } catch (err: any) {
            toast.dismiss()
            console.error(err)
            toast.error('Erro ao buscar contrato. Verifica se backend já fez deploy do CORS fix')
        }
    }

    return (
        <div className="w-full min-w-full md:min-w-[320px] md:max-w-[320px] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col relative">
            <div className="relative h-[90px] bg-[#E6F0FF] shrink-0">
                <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[12px] font-bold shadow-sm border truncate bg-white border-gray-200 text-black max-w-[90px]">{func.area}</span>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setOpenMenu(!openMenu)} className="w-8 h-8 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 text-black">
                            <Settings className="w-4 h-4" />
                        </button>
                        {openMenu && (
                            <div className="absolute right-0 top-[40px] w-[260px] bg-white rounded-[16px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 z-[100] p-1.5 max-h-[340px] overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {MENU_RH.map(group => {
                                    const isOpen = openSub === group.id
                                    return (
                                        <div key={group.id} className="mb-1 last:mb-0">
                                            <button onClick={() => setOpenSub(isOpen? null : group.id)} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13px] font-bold text-black hover:bg-gray-50 transition ${isOpen? 'bg-[#E6F0FF]' : ''}`}>
                                                <span className="flex items-center gap-2"><group.icon className="w-4 h-4" />{group.label}</span>
                                                <ChevronRight className={`w-3.5 h-3.5 transition ${isOpen? 'rotate-90' : ''}`} />
                                            </button>
                                            {isOpen && (
                                                <div className="relative ml-3 mt-2 mb-2 pl-4 border-l-[2px] border-black space-y-1">
                                                    {group.items.map(it => (
                                                        <button key={it.id} onClick={() => {
                                                            if (it.id === 'ver_contrato') {
                                                                handleVerContrato()
                                                                return
                                                            }
                                                            onAction?.(it.id, func);
                                                            setOpenMenu(false);
                                                            if(it.id==='marcar_ferias') onFerias?.(func)
                                                        }} className="relative w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] font-medium text-black hover:bg-gray-50 text-wrap leading-tight">
                                                            <span className="absolute -left-[22px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-black border-2 border-white shadow-sm" />
                                                            {it.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white shrink-0">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-black overflow-hidden">{initials}</div>
                </div>
                {!podeEditar && <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-[9px] font-bold">{cargoAtual?.toUpperCase()}</div>}
            </div>

            <div className="pt-14 px-5 pb-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-3"><span className="text-[11px] text-black">exp.</span><div className="flex gap-[2px]">{Array.from({ length: 10 }).map((_, i) => (<div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5? 'bg-green-400' : 'bg-gray-200'}`} />))}</div></div>
                <h3 className="font-bold text-[16px] text-black leading-tight truncate">{func.nome}</h3>
                <div className="mt-2 flex flex-col gap-0.5 min-w-0">
                    <p className="text-[12.5px] text-black truncate">Cargo: {func.cargo}</p>
                    <p className="text-[12.5px] text-black truncate">Área: {func.area}</p>
                    <p className="text-[12.5px] text-black truncate">E-mail: {func.email || '---'}</p>
                    <p className="text-[12.5px] text-black truncate">Tel: {func.telefone || '---'}</p>
                </div>
                <div className="mt-3 min-w-0"><span className={`inline-flex items-center max-w-full truncate px-2.5 py-[3px] rounded-full border text-[10px] font-bold leading-tight ${isPresente? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-black'}`}>{isPresente? 'Presente • Ativo' : 'Ausente • Hoje'}</span></div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                <button onClick={() => onView?.(func)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group"><Eye className="w-4 h-4 text-black group-hover:text-blue-600" /></button>
                <button onClick={() => podeEditar && onEdit?.(func)} disabled={!podeEditar} className={`py-3.5 flex justify-center border-x border-gray-100 transition group ${podeEditar? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}><Pencil className={`w-4 h-4 ${podeEditar? 'text-black group-hover:text-blue-600' : 'text-gray-400'}`} /></button>
                <button onClick={() => podeFerias && onFerias?.(func)} disabled={!podeFerias} className={`py-3.5 flex justify-center transition group ${podeFerias? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}><CalendarOff className={`w-4 h-4 ${podeFerias? 'text-black group-hover:text-yellow-600' : 'text-gray-400'}`} /></button>
            </div>
        </div>
    )
}
