import { Search, FileText, Pencil, Trash2 } from 'lucide-react'

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
}

export default function TabelaClientes({
    clientes,
    loading,
    search,
    setSearch,
    page,
    setPage,
    total,
    limit,
    onEdit,
    onDelete,
    onEmitirFatura
}: Props) {
    return (
        <div className="bg-[#F5F5F7] rounded-[24px] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Clientes</h3>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Buscar por nome ou NIF"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {loading? (
                <p className="text-center text-gray-500 py-16">Carregando...</p>
            ) : clientes.length === 0? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px]">Nenhum cliente cadastrado</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {clientes.map((cli) => (
                        <ClientCard
                            key={cli.id}
                            cliente={cli}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onEmitirFatura={onEmitirFatura}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

function ClientCard({
    cliente,
    onEdit,
    onDelete,
    onEmitirFatura
}: {
    cliente: Cliente
    onEdit: Props['onEdit']
    onDelete: Props['onDelete']
    onEmitirFatura: Props['onEmitirFatura']
}) {
    const initials = cliente.nome
     .split(' ')
     .map((n) => n[0])
     .join('')
     .slice(0, 2)
     .toUpperCase()

    return (
        <div className="min-w-[100%] md:min-w-[300px] md:max-w-[300px] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white flex flex-col">
            {/* CAPA - mesmo padrão do produto */}
            <div className="relative h-[90px] bg-[#E6F0FF]">
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border">
                    Ativo +
                </div>

                {/* IMG CIRCULAR GRANDE BEM VISÍVEL - 88px igual produto */}
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white p-1 shadow-md border-[4px] border-white">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[20px] font-bold text-gray-700">
                        {initials}
                    </div>
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="pt-14 px-5 pb-4">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-[4px] h-[10px] rounded-full ${
                                    i < 5? 'bg-yellow-400' : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate">
                    {cliente.nome}
                </h3>

                <div className="mt-2 flex flex-col gap-0.5">
                    <p className="text-[12.5px] text-gray-500 truncate">
                        {cliente.cidade || 'Saurimo'} · {cliente.provincia || 'Luanda'}
                    </p>
                    <p className="text-[12.5px] text-gray-500 truncate">
                        {cliente.email || 'killerbless12@gmail.com'}
                    </p>
                    <p className="text-[12.5px] text-gray-500 truncate">
                        NIF {cliente.nif}
                    </p>
                    <p className="text-[12.5px] text-gray-500 truncate">
                        Tel {cliente.telefone || '---'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto">
                <button
                    onClick={() => onEmitirFatura(cliente)}
                    className="py-3.5 flex justify-center hover:bg-gray-50 transition group"
                    title="Emitir Fatura"
                >
                    <FileText className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                </button>
                <button
                    onClick={() => onEdit(cliente)}
                    className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group"
                    title="Editar"
                >
                    <Pencil className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>
                <button
                    onClick={() => onDelete(cliente.id)}
                    className="py-3.5 flex justify-center hover:bg-gray-50 transition group"
                    title="Apagar"
                >
                    <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                </button>
            </div>
        </div>
    )
}
