import { Search, FileText, Pencil, Trash2 } from 'lucide-react'

interface Cliente {
    id: string; nome: string; nif: string; email: string | null
    telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null
}
interface Props {
    clientes: Cliente[]; loading: boolean; search: string; setSearch: (v: string) => void
    page: number; setPage: (v: number) => void; total: number; limit: number
    onEdit: (c: Cliente) => void; onDelete: (id: string) => void; onEmitirFatura: (c: Cliente) => void
}

export default function TabelaClientes({ clientes, loading, search, setSearch, page, setPage, total }: Props) {
    return (
        <div className="bg-[#F5F5F7] rounded-[24px] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Clientes</h3>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Buscar por nome ou NIF"
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>

            {loading? <p className="text-center text-gray-500 py-16">Carregando...</p> :
             clientes.length === 0? <p className="text-center text-gray-500 py-16 bg-white rounded-[20px]">Nenhum cliente cadastrado</p> :
             (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth
                    [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {clientes.map(cli => (
                        <ClientCard key={cli.id} cliente={cli} {...{onEdit: (arguments[0] as any).onEdit, onDelete: (arguments[0] as any).onDelete, onEmitirFatura: (arguments[0] as any).onEmitirFatura} as any} />
                    ))}
                </div>
            )}
            <p className="text-[11px] text-gray-400 mt-3 px-1">← Arraste para o lado para ver mais • {total} clientes</p>
        </div>
    )
}

// FIX pra props dentro do map
function ClientCard({ cliente, onEdit, onDelete, onEmitirFatura }: { cliente: Cliente, onEdit: Props['onEdit'], onDelete: Props['onDelete'], onEmitirFatura: Props['onEmitirFatura'] }) {
    const initials = cliente.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    return (
        <div className="min-w-[100%] md:min-w-[calc(25%-12px)] snap-start flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white flex flex-col">
            <div className="relative h-[88px] bg-gradient-to-br from-[#D6E8FF] to-[#EAF2FF]">
                <img src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=400" alt="" className="w-full h-full object-cover opacity-60" />
                <button onClick={() => onEdit(cliente)} className="absolute top-3 right-3 bg-white rounded-full px-4 py-1.5 text-[13px] font-medium shadow-sm border border-gray-100 hover:scale-105 transition">Detalhes</button>
                <div className="absolute -bottom-8 left-4 w-[64px] h-[64px] rounded-full bg-white p-1 shadow-sm">
                    <div className="w-full h-full rounded-full bg-[#E8E8E8] flex items-center justify-center text-[18px] font-bold text-gray-700">{initials}</div>
                </div>
                <div className="absolute -bottom-5 left-[84px] flex items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">exp.</span>
                    <div className="flex gap-[2px]">{Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`w-[3px] h-[8px] rounded-full ${i < 7? 'bg-gradient-to-b from-purple-500 via-pink-500 to-yellow-400' : 'bg-gray-200'}`} />
                    ))}</div>
                </div>
            </div>

            <div className="pt-10 px-5 pb-3">
                <h3 className="font-bold text-[16px] text-gray-900 leading-tight truncate">{cliente.nome}</h3>
                <p className="text-[12.5px] text-gray-500 mt-1 line-clamp-2 min-h-[36px]">{cliente.cidade || 'Saurimo'} {cliente.provincia? `· ${cliente.provincia}` : ''} • {cliente.email || 'sem email'} • NIF {cliente.nif}</p>
            </div>

            {/* 3 CAMPOS AUMENTADOS EMBAIXO */}
            <div className="grid grid-cols-3 border-y border-gray-100 mt-1 bg-gray-50/60">
                <div className="py-4 text-center">
                    <p className="font-extrabold text-[16px] text-gray-900 tracking-tight">{cliente.nif.slice(0, 6)}</p>
                    <p className="text-[11px] text-gray-400 font-semibold tracking-widest mt-1">NIF</p>
                </div>
                <div className="py-4 text-center border-x border-gray-100">
                    <p className="font-extrabold text-[16px] text-gray-900 tracking-tight">{cliente.telefone?.slice(-4) || '----'}</p>
                    <p className="text-[11px] text-gray-400 font-semibold tracking-widest mt-1">Tel</p>
                </div>
                <div className="py-4 text-center">
                    <p className="font-extrabold text-[16px] text-gray-900 tracking-tight truncate px-1">{cliente.cidade || 'Saurim'}</p>
                    <p className="text-[11px] text-gray-400 font-semibold tracking-widest mt-1">Cidade</p>
                </div>
            </div>

            <div className="grid grid-cols-3">
                <button onClick={() => onEmitirFatura(cliente)} className="py-3.5 flex justify-center hover:bg-gray-50"><FileText className="w-4 h-4 text-gray-600" /></button>
                <button onClick={() => onEdit(cliente)} className="py-3.5 flex justify-center border-x border-gray-100 hover:bg-gray-50"><Pencil className="w-4 h-4 text-gray-600" /></button>
                <button onClick={() => onDelete(cliente.id)} className="py-3.5 flex justify-center hover:bg-gray-50"><Trash2 className="w-4 h-4 text-gray-600" /></button>
            </div>
        </div>
    )
}
