import { Search, ChevronLeft, ChevronRight, FileText, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

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
    clientes, loading, search, setSearch, page, setPage, total, limit,
    onEdit, onDelete, onEmitirFatura
}: Props) {
    const totalPages = Math.ceil(total / limit)

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {clientes.map(cli => (
                        <ClientCard key={cli.id} cliente={cli} onEdit={onEdit} onDelete={onDelete} onEmitirFatura={onEmitirFatura} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 px-2">
                    <p className="text-sm text-gray-500">Página {page} de {totalPages} - {total} clientes</p>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="w-9 h-9 bg-white border rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-50">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="w-9 h-9 bg-white border rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-gray-50">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function ClientCard({ cliente, onEdit, onDelete, onEmitirFatura }: { cliente: Cliente, onEdit: any, onDelete: any, onEmitirFatura: any }) {
    const [follow, setFollow] = useState(false)
    const initials = cliente.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    const expLevel = (cliente.nome.length % 10) + 4 // barra fake tipo exp.

    return (
        <div className="bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all border border-white flex flex-col">
            {/* CAPA */}
            <div className="relative h-[88px] bg-gradient-to-br from-[#D6E8FF] to-[#EAF2FF]">
                <img src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=400" alt="" className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                <button
                    onClick={() => setFollow(!follow)}
                    className="absolute top-3 right-3 bg-white rounded-full px-3.5 py-1.5 text-[13px] font-medium shadow-sm border border-gray-100 flex items-center gap-1 hover:scale-105 transition"
                >
                    {follow? 'Following' : 'Follow'} <span className="text-[16px] leading-none">{follow? '✓' : '+'}</span>
                </button>

                {/* AVATAR FLUTUANTE */}
                <div className="absolute -bottom-8 left-4 w-[64px] h-[64px] rounded-full bg-white p-1 shadow-sm">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[18px] font-bold text-gray-700">
                        {initials}
                    </div>
                </div>

                {/* EXP BAR */}
                <div className="absolute -bottom-5 left-[84px] flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className={`w-[3px] h-[8px] rounded-full ${i < expLevel? 'bg-gradient-to-b from-purple-500 via-pink-500 to-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="pt-10 px-5 pb-3">
                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate">{cliente.nome}</h3>
                <p className="text-[12.5px] text-gray-500 mt-1 line-clamp-2 min-h-[36px]">
                    {cliente.cidade || cliente.provincia? `${cliente.cidade || ''} ${cliente.provincia || ''} • ` : ''}{cliente.email || 'Cliente sem email'} • NIF {cliente.nif}
                </p>
            </div>

            {/* STATS - 3 COLUNAS IGUAL PRINT */}
            <div className="grid grid-cols-3 border-y border-gray-100 mt-1">
                <div className="py-3 text-center">
                    <p className="font-bold text-[15px] text-gray-900 truncate">{cliente.nif.slice(-6)}</p>
                    <p className="text-[11px] text-gray-400">NIF</p>
                </div>
                <div className="py-3 text-center border-x border-gray-100">
                    <p className="font-bold text-[15px] text-gray-900 truncate">{cliente.telefone? cliente.telefone.slice(-4) : '---'}</p>
                    <p className="text-[11px] text-gray-400">Tel</p>
                </div>
                <div className="py-3 text-center">
                    <p className="font-bold text-[15px] text-gray-900 truncate">{cliente.cidade? cliente.cidade.slice(0, 6) : 'AO'}</p>
                    <p className="text-[11px] text-gray-400">Cidade</p>
                </div>
            </div>

            {/* FOOTER AÇÕES - 3 ÍCONES IGUAL PRINT */}
            <div className="grid grid-cols-3">
                <button onClick={() => onEmitirFatura(cliente)} className="py-3 flex justify-center hover:bg-gray-50 transition group" title="Emitir Fatura">
                    <FileText className="w-4 h-4 text-gray-600 group-hover:text-green-600" />
                </button>
                <button onClick={() => onEdit(cliente)} className="py-3 flex justify-center border-x border-gray-100 hover:bg-gray-50 transition group" title="Editar">
                    <Pencil className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                </button>
                <button onClick={() => onDelete(cliente.id)} className="py-3 flex justify-center hover:bg-gray-50 transition group" title="Apagar">
                    <Trash2 className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                </button>
            </div>
        </div>
    )
}
