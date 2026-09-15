import { Search, Package, Heart, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

interface Produto { id: string; nome: string; codigo: string; categoria: string | null; preco_venda: number | string; stock_atual: number; unidade: string; imagem_url: string | null; ativo: boolean; descricao?: string | null }
interface Props { produtos: Produto[]; loading: boolean; search: string; setSearch: (v: string) => void; page: number; setPage: (v: number) => void; total: number; limit: number; onEdit?: (p: Produto) => void; onAdd?: (p: Produto) => void }

export default function CardsProdutos({ produtos, loading, search, setSearch, page, setPage, total, onEdit, onAdd }: Props) {
    const formatPrice = (val: any) => { const n = typeof val === 'string'? parseFloat(val) : val; return isNaN(n)? '0' : n.toFixed(0) }
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
             (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {produtos.map(p => <ProductCard key={p.id} produto={p} formatPrice={formatPrice} onEdit={onEdit} onAdd={onAdd} />)}
                </div>
             )
            }
            <p className="text-[11px] text-gray-500 mt-3 px-1">← Arraste para o lado • {total} produtos</p>
        </div>
    )
}

function ProductCard({ produto, formatPrice, onEdit, onAdd }: any) {
    const [fav, setFav] = useState(false)
    return (
        <div onClick={() => onEdit?.(produto)} className="min-w-[100%] md:min-w-[calc(25%-12px)] snap-start flex-shrink-0 bg-white rounded-[20px] p-3 shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white cursor-pointer">
            <div className="relative bg-[#F3F3F5] rounded-[16px] overflow-hidden aspect-[1/1] flex items-center justify-center">
                {produto.imagem_url? <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-contain p-4" /> : <Package className="w-12 h-12 text-gray-300" />}
                <button onClick={(e) => { e.stopPropagation(); setFav(!fav) }} className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border"><Heart className={`w-4 h-4 ${fav? 'fill-red-500 text-red-500' : 'text-gray-600'}`} /></button>
            </div>
            <div className="pt-4 px-1 pb-1">
                <h3 className="font-semibold text-[15px] truncate">{produto.nome}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[11px] px-2.5 py-1 rounded-full border bg-[#FFF0E0] border-[#FF9A2E] text-[#B65A00] font-medium">{produto.codigo.slice(0, 6)}</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500">{produto.categoria || '500 ml'}</span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500">{produto.stock_atual} {produto.unidade}</span>
                </div>
                <p className="text-[12.5px] text-gray-500 mt-2.5 line-clamp-2 min-h-[32px]">{produto.descricao || `Stock ${produto.stock_atual} • ${produto.ativo? 'Disponível' : 'Inativo'}`}</p>
                <div className="flex items-center justify-between mt-4">
                    <p className="text-[18px] font-bold">${formatPrice(produto.preco_venda)}</p>
                    <button onClick={(e) => { e.stopPropagation(); onAdd?.(produto) }} className="flex items-center gap-2 bg-[#FF8A1A] text-black text-[13px] font-medium px-4 py-2.5 rounded-full"><ShoppingCart className="w-4 h-4" /> Add to Cart</button>
                </div>
            </div>
        </div>
    )
}
