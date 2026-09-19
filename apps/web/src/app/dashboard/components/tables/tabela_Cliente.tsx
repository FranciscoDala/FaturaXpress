import { FileText, Pencil, Trash2, Lock } from 'lucide-react'
import { TabelaClientesSkeleton } from '../../../../components/CardsSkeleton'

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

interface Props {
    clientes: Cliente[]
    loading: boolean
    search: string
    setSearch: (v: string) => void
    page: number
    setPage: (v: number) => void
    total: number
    limit: number
    onEdit: (cliente: Cliente) => void
    onDelete: (id: string) => void
    onEmitirFatura: (cliente: Cliente) => void
    clientesComFatura?: Set<string>
}

export default function TabelaClientes({ clientes, loading, onEdit, onDelete, onEmitirFatura, clientesComFatura }: Props) {
    if (loading) {
        return <TabelaClientesSkeleton />
    }

    if (clientes.length === 0) {
        return <p className="text-center text-gray-500 py-16 bg-white rounded-[20px] border">Nenhum cliente cadastrado!</p>
    }

    return (
        <div className="w-full">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {clientes.map((cli) => (
                    <ClientCard
                        key={cli.id}
                        cliente={cli}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onEmitirFatura={onEmitirFatura}
                        bloqueado={clientesComFatura?.has(cli.id) || false}
                    />
                ))}
            </div>
        </div>
    )
}

function ClientCard({
    cliente,
    onEdit,
    onDelete,
    onEmitirFatura,
    bloqueado
}: {
    cliente: Cliente
    onEdit: Props['onEdit']
    onDelete: Props['onDelete']
    onEmitirFatura: Props['onEmitirFatura']
    bloqueado?: boolean
}) {
    const initials = cliente.nome
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

    return (
        <div className="min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF]">
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border ${bloqueado ? 'bg-amber-50 border-amber-200 text-amber-700' : ''}`}>
                    {bloqueado ? 'TEM FT/Emitidas • SAFT' : 'Ativo'}
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700">
                        {initials}
                    </div>
                </div>
            </div>

            <div className="pt-14 px-5 pb-4">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5 ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate">{cliente.nome}</h3>

                <div className="mt-2 flex flex-col gap-0.5">
                    <p className="text-[12.5px] text-gray-500 truncate">NIF: {cliente.nif}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Endereço: {cliente.cidade || 'Saurimo'} · {cliente.provincia || 'Luanda'}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">E-mail: {cliente.email || 'killerbless12@gmail.com'}</p>
                    <p className="text-[12.5px] text-gray-500 truncate">Tel: {cliente.telefone || '---'}</p>
                </div>
                {bloqueado && (
                    <div className="mt-3">
                        <span className="inline-flex items-center px-2.5 py-[3px] rounded-full border border-[#F2C9B8] bg-[#FFF6F1] text-[10px] font-medium text-[#B85A3A] leading-tight tracking-wide">
                            Cliente com SAFT, não pode ser apagado!
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                <button onClick={() => onEmitirFatura(cliente)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Emitir Fatura">
                    <FileText className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                </button>
                <button onClick={() => onEdit(cliente)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group" title="Editar">
                    <Pencil className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>
                {bloqueado ? (
                    <div className="py-3.5 flex justify-center bg-gray-50 opacity-40 cursor-not-allowed" title="Não pode apagar - tem faturas">
                        <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                ) : (
                    <button onClick={() => onDelete(cliente.id)} className="py-3.5 flex justify-center hover:bg-gray-50 transition group" title="Apagar">
                        <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                    </button>
                )}
            </div>
        </div>
    )
}
