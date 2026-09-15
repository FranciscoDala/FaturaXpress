import { Search, ChevronLeft, ChevronRight, Package, Heart, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

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
    descricao?: string | null
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
    onAdd?: (p: Produto) => void
}

export default function CardsProdutos({ produtos, loading, search, setSearch, page, setPage, total, limit, onEdit, onAdd }: Props) {
    const totalPages = Math.ceil(total / limit)

    const formatPrice = (val: number | string) => {
        const num = typeof val === 'string' ? parseFloat(val) : val
        return isNaN(num) ? '0.00' : num.toFixed(0)
    }

    return (
        <div className="bg-[#FDEEDC] rounded-[24px] p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Produtos Cadastrados</h3>
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Buscar por nome, código..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500 py-16">Carregando...</p>
            ) : produtos.length === 0 ? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px]">Nenhum produto encontrado</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {produtos.map(p => (
                        <ProductCard key={p.id} produto={p} formatPrice={formatPrice} onEdit={onEdit} onAdd={onAdd} />
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 px-2">
                    <p className="text-sm text-gray-600">Página {page} de {totalPages} - {total} produtos</p>
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

function ProductCard({ produto, formatPrice, onEdit, onAdd }: { produto: Produto, formatPrice: any, onEdit?: any, onAdd?: any }) {
    const [fav, setFav] = useState(false)
    const [selectedSize, setSelectedSize] = useState(2) // simula 800ml ativo

    // Pílulas dinâmicas - usa categoria/codigo/unidade pra manter teu dado real
    const pills = [
        produto.codigo ? produto.codigo.slice(0, 7) : '300 ml',
        produto.categoria || '500 ml',
        `${produto.stock_atual} ${produto.unidade}`,
        produto.unidade || '1 Litre'
    ].filter(Boolean).slice(0, 4)

    return (
        <div
            onClick={() => onEdit?.(produto)}
            className="bg-white rounded-[20px] p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] transition-all cursor-pointer border border-white"
        >
            {/* Imagem */}
            <div className="relative bg-[#F3F3F5] rounded-[16px] overflow-hidden aspect-[1/1] flex items-center justify-center">
                {produto.imagem_url ? (
                    <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-contain p-4" />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Package className="w-12 h-12 text-gray-300" />
                    </div>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); setFav(!fav) }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 hover:scale-105 transition"
                >
                    <Heart className={`w-4 h-4 ${fav ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
            </div>

            {/* Conteúdo */}
            <div className="pt-4 px-1 pb-1">
                <h3 className="font-semibold text-[15px] leading-tight text-gray-900 line-clamp-1">{produto.nome}</h3>

                {/* Pílulas */}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {pills.map((pill, idx) => (
                        <span
                            key={idx}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition
                ${idx === selectedSize
                                    ? 'bg-[#FFF0E0] border-[#FF9A2E] text-[#B65A00] font-medium'
                                    : 'bg-white border-gray-200 text-gray-500'
                                }`}
                            onClick={(e) => { e.stopPropagation(); setSelectedSize(idx) }}
                        >
                            {pill}
                        </span>
                    ))}
                </div>

                <p className="text-[12.5px] leading-[16px] text-gray-500 mt-2.5 line-clamp-3 min-h-[48px]">
                    {produto.descricao || `Código ${produto.codigo} • Stock ${produto.stock_atual} ${produto.unidade} • ${produto.ativo ? 'Disponível' : 'Inativo'} para venda.`}
                </p>

                {/* Preço + Botão */}
                <div className="flex items-center justify-between mt-4">
                    <p className="text-[18px] font-bold text-gray-900">${formatPrice(produto.preco_venda)}</p>
                    <button
                        onClick={(e) => { e.stopPropagation(); onAdd?.(produto) }}
                        className="flex items-center gap-2 bg-[#FF8A1A] hover:bg-[#FF7A00] text-black text-[13px] font-medium px-4 py-2.5 rounded-full transition"
                    >
                        <ShoppingCart className="w-4 h-4" />
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    )
}
