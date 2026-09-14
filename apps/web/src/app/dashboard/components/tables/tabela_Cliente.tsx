import { FileText, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from 'lucide-react'

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
    const totalPages = Math.ceil(total / limit)

    return (
        <div id="tabela-clientes" className="mt-8 bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <h3 className="font-semibold text-gray-900">Clientes</h3>
                <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Buscar por nome ou NIF"
                        className="pl-9 pr-4 py-2 border-gray-300 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500 py-8">Carregando...</p>
            ) : clientes.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum cliente cadastrado</p>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-500 border-b">
                                <tr>
                                    <th className="pb-3 font-medium">Nome</th>
                                    <th className="pb-3 font-medium">NIF</th>
                                    <th className="pb-3 font-medium">Email</th>
                                    <th className="pb-3 font-medium">Telefone</th>
                                    <th className="pb-3 font-medium">Cidade</th>
                                    <th className="pb-3 font-medium w-28 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientes.map(cli => (
                                    <tr key={cli.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-3 font-medium text-gray-900">{cli.nome}</td>
                                        <td className="py-3 text-gray-600">{cli.nif}</td>
                                        <td className="py-3 text-gray-600">{cli.email || '-'}</td>
                                        <td className="py-3 text-gray-600">{cli.telefone || '-'}</td>
                                        <td className="py-3 text-gray-600">{cli.cidade || '-'}</td>
                                        <td className="py-3">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => onEmitirFatura(cli)}
                                                    className="text-green-600 hover:text-green-800"
                                                    title="Emitir Fatura"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onEdit(cli)} className="text-blue-600 hover:text-blue-800" title="Editar">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => onDelete(cli.id)} className="text-red-600 hover:text-red-800" title="Apagar">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINAÇÃO CORRIGIDA */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                            <p className="text-sm text-gray-500">
                                Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(page - 1)} // <- CORRIGIDO
                                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-2 text-sm">Página {page} de {totalPages}</span>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(page + 1)} // <- CORRIGIDO
                                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
