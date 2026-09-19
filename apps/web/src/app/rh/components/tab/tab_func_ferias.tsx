import { Eye, Pencil, CalendarCheck } from 'lucide-react'

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
    onReativar?: (f: Funcionario) => void
}

export default function TabFerias({ funcionarios, search, onView, onEdit, onReativar }: Props) {
    if (funcionarios.length === 0) {
        return <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhum funcionário de férias {search ? `para "${search}"` : ''}!</p>
    }

    return (
        <div className="w-full">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {funcionarios.map((f) => (
                    <FuncionarioCard key={f.id} func={f} onView={onView} onEdit={onEdit} onReativar={onReativar} />
                ))}
            </div>
        </div>
    )
}

function FuncionarioCard({
    func,
    onView,
    onEdit,
    onReativar
}: {
    func: Funcionario
    onView?: Props['onView']
    onEdit?: Props['onEdit']
    onReativar?: Props['onReativar']
}) {
    const initials = func.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

    return (
        <div className="min-w-full md:min-w-[320px] md:max-w-[320px] max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#FFF8E1] shrink-0">
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border max-w-[55%] truncate bg-amber-50 border-amber-200 text-amber-700">
                    FÉRIAS • {func.area}
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white shrink-0">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700 overflow-hidden">
                        {initials}
                    </div>
                </div>
            </div>

            <div className="pt-14 px-5 pb-4 min-w-0 overflow-hidden">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate block w-full max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={func.nome}>
                    {func.nome}
                </h3>

                <div className="mt-2 flex flex-col gap-0.5 min-w-0">
                    <p className="text-[12.5px] text-gray-500 truncate">Cargo: {func.cargo}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Área: {func.area}</p>
                    <p className="text-[12.5px] text-gray-500 truncate" title={func.email || ''}>E-mail: {func.email || '---'}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Tel: {func.telefone || '---'}</p>
                </div>

                <div className="mt-3 min-w-0">
                    <span className="inline-flex items-center max-w-full truncate px-2.5 py-[3px] rounded-full border border-[#F2C9B8] bg-[#FFF6F1] text-[10px] font-medium text-[#B85A3A] leading-tight tracking-wide overflow-hidden">
                        Em férias - ausente este mês
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                <button onClick={() => onView?.(func)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Ver">
                    <Eye className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>
                <button onClick={() => onEdit?.(func)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group" title="Editar">
                    <Pencil className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>
                <button onClick={() => onReativar?.(func)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Reativar">
                    <CalendarCheck className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                </button>
            </div>
        </div>
    )
}
