import { Eye, Pencil, CalendarOff, Lock } from 'lucide-react'
import { useMemo } from 'react'

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
    search: string
    onView?: (f: Funcionario) => void
    onEdit?: (f: Funcionario) => void
    onFerias?: (f: Funcionario) => void
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

export default function TabPresente({ funcionarios, search, onView, onEdit, onFerias }: Props) {
    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_presentes') || temPermissao(cargoAtual, 'ver_funcionarios') || cargoAtual === 'admin' : true
    const podeEditar = funcionarioLogado? temPermissao(cargoAtual, 'editar_funcionarios') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true
    const podeFerias = funcionarioLogado? temPermissao(cargoAtual, 'colocar_ferias') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true

    if (!podeVer) {
        return (
            <div className="text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-black/60 text-[13px]">Seu cargo <b>{cargoAtual}</b> não pode ver presentes</p>
            </div>
        )
    }

    if (funcionarios.length === 0) {
        return <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhum funcionário presente {search? `para "${search}"` : ''}!</p>
    }

    return (
        <div className="w-full">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {funcionarios.map((f) => (
                    <FuncionarioCard key={f.id} func={f} onView={onView} onEdit={onEdit} onFerias={onFerias} podeEditar={podeEditar} podeFerias={podeFerias} cargoAtual={cargoAtual} />
                ))}
            </div>
        </div>
    )
}

function FuncionarioCard({
    func,
    onView,
    onEdit,
    onFerias,
    podeEditar,
    podeFerias,
    cargoAtual
}: {
    func: Funcionario
    onView?: Props['onView']
    onEdit?: Props['onEdit']
    onFerias?: Props['onFerias']
    podeEditar: boolean
    podeFerias: boolean
    cargoAtual: string
}) {
    const initials = func.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    return (
        <div className="min-w-full md:min-w-[320px] md:max-w-[320px] max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF] shrink-0">
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border max-w-[55%] truncate bg-white border-gray-200 text-gray-700">
                    {func.area}
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white shrink-0">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700 overflow-hidden">
                        {initials}
                    </div>
                </div>
                {!podeEditar && (
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-[9px] font-bold">{cargoAtual?.toUpperCase()} - SOMENTE LEITURA</div>
                )}
            </div>

            <div className="pt-14 px-5 pb-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5? 'bg-green-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate" title={func.nome}>
                    {func.nome}
                </h3>

                <div className="mt-2 flex flex-col gap-0.5 min-w-0">
                    <p className="text-[12.5px] text-gray-500 truncate">Cargo: {func.cargo}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Área: {func.area}</p>
                    <p className="text-[12.5px] text-gray-500 truncate" title={func.email || ''}>E-mail: {func.email || '---'}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Tel: {func.telefone || '---'}</p>
                </div>

                <div className="mt-3 min-w-0">
                    <span className="inline-flex items-center max-w-full truncate px-2.5 py-[3px] rounded-full border border-green-200 bg-green-50 text-[10px] font-medium text-green-700 leading-tight">
                        Presente • Ativo
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                <button onClick={() => onView?.(func)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Ver">
                    <Eye className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>

                <button
                    onClick={() => podeEditar && onEdit?.(func)}
                    disabled={!podeEditar}
                    className={`py-3.5 flex justify-center border-x border-gray-100 transition group ${podeEditar? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}
                    title={podeEditar? "Editar" : "Só admin/RH"}>
                    <Pencil className={`w-4 h-4 ${podeEditar? 'text-gray-600 group-hover:text-blue-600' : 'text-gray-400'}`} />
                </button>

                <button
                    onClick={() => podeFerias && onFerias?.(func)}
                    disabled={!podeFerias}
                    className={`py-3.5 flex justify-center transition group ${podeFerias? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}
                    title={podeFerias? "Colocar de férias" : "Só admin/RH"}>
                    <CalendarOff className={`w-4 h-4 ${podeFerias? 'text-gray-600 group-hover:text-yellow-600' : 'text-gray-400'}`} />
                </button>
            </div>
        </div>
    )
}
