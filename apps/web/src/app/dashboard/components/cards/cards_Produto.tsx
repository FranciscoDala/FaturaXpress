import { Search, Package, FileText, Pencil, Trash2 } from 'lucide-react'

interface Produto {
    id: string
    nome: string
    codigo: string
    categoria: string | null
    preco_venda: number | string
    stock_atual: number
    unidade: string
    imagem_url: string | null
    ativo: boolean
    tipo?: 'produto' | 'servico' | 'kit'
    controlar_stock?: boolean
    iva?: number
}

interface Props {
    produtos: Produto[]
    loading: boolean
    search: string
    setSearch: (v: string) => void
    page: number
    setPage: (v: number) => void
    total: number
    limit: number
    onEdit?: (p: Produto) => void
    onDelete?: (p: Produto) => void
    onView?: (p: Produto) => void
}

export default function CardsProdutos({ produtos, loading, search, setSearch, page, setPage, onEdit, onDelete, onView }: Props) {
    const formatPrice = (val: any) => {
        const n = typeof val === 'string'? parseFloat(val) : val
        return isNaN(n)? '0' : n.toFixed(0)
    }

    return (
        <div className="bg-[#FDEEDC] rounded-[24px] p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Produtos Cadastrados</h3>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por nome, código..." className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
            </div>

            {loading? <p className="text-center text-gray-500 py-16">Carregando...</p> :
             produtos.length === 0? <p className="text-center text-gray-500 py-16 bg-white rounded-[20px]">Nenhum produto encontrado</p> :
             <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {produtos.map(p => <ProductCard key={p.id} produto={p} formatPrice={formatPrice} onEdit={onEdit} onDelete={onDelete} onView={onView} />)}
             </div>
            }
        </div>
    )
}

function ProductCard({ produto, formatPrice, onEdit, onDelete, onView }: any) {
    const initials = produto.nome.split(' ').map((n:string)=>n[0]).slice(0,2).join('').toUpperCase()
    const tipo = (produto.tipo || 'produto').toLowerCase()
    const stockPercent = Math.min(100, Math.max(10, (produto.stock_atual / Math.max(1, produto.stock_minimo || 10)) * 100))

    return (
        <div className="min-w-[100%] md:min-w-[300px] md:max-w-[300px] snap-start flex-shrink-0 bg-white rounded-[24px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            {/* TOP igual cliente - azul claro */}
            <div className="relative h-[78px] bg-[#E6F0FF] bg-gradient-to-b from-[#DCEBFF] to-[#F0F6FF]">
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[12px] font-medium shadow-sm border">
                    {produto.ativo? 'Ativo' : 'Inativo'} +
                </div>
                {/* AVATAR circular sobreposto */}
                <div className="absolute -bottom-7 left-4 w-[56px] h-[56px] rounded-full bg-[#E5E7EB] border-[4px] border-white flex items-center justify-center text-[16px] font-bold text-gray-600 shadow-sm overflow-hidden">
                    {produto.imagem_url? <img src={produto.imagem_url} className="w-full h-full object-cover" /> : initials}
                </div>
            </div>

            {/* CONTEUDO */}
            <div className="pt-10 px-4 pb-0">
                <div className="flex items-center gap-2">
                    <p className="text-[11px] text-gray-400">exp.</p>
                    <div className="flex gap-[2px]">
                        {Array.from({length:12}).map((_,i)=>(
                            <div key={i} className={`w-[3px] h-[8px] rounded-full ${i < stockPercent/10? 'bg-orange-400' : i<8? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[15px] text-gray-900 mt-2 truncate">{produto.nome}</h3>
                <p className="text-[12px] text-gray-500 truncate mt-0.5">
                    {produto.categoria || 'Produto'} • {produto.unidade} • {tipo}
                </p>
                <p className="text-[12px] text-gray-500 truncate">
                    {produto.codigo} • Kz {formatPrice(produto.preco_venda)}
                </p>
            </div>

            {/* 3 COLUNAS igual NIF | Tel | Cidade */}
            <div className="grid grid-cols-3 border-t border-gray-100 mt-4">
                <div className="py-3 px-2 text-center border-r border-gray-100">
                    <p className="font-bold text-[13px] text-gray-900 truncate">{produto.codigo.slice(0,6)}</p>
                    <p className="text-[11px] text-gray-400">Cód</p>
                </div>
                <div className="py-3 px-2 text-center border-r border-gray-100">
                    <p className="font-bold text-[13px] text-gray-900 truncate">{produto.stock_atual}</p>
                    <p className="text-[11px] text-gray-400">Stock</p>
                </div>
                <div className="py-3 px-2 text-center">
                    <p className="font-bold text-[13px] text-gray-900 truncate">{produto.unidade}</p>
                    <p className="text-[11px] text-gray-400">Unid</p>
                </div>
            </div>

            {/* 3 ICONS igual cliente */}
            <div className="grid grid-cols-3 border-t border-gray-100">
                <button onClick={()=>onView?.(produto)} className="py-3 flex items-center justify-center hover:bg-gray-50 border-r border-gray-100">
                    <FileText className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={()=>onEdit?.(produto)} className="py-3 flex items-center justify-center hover:bg-gray-50 border-r border-gray-100">
                    <Pencil className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={()=>onDelete?.(produto)} className="py-3 flex items-center justify-center hover:bg-red-50">
                    <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
            </div>
        </div>
    )
}
