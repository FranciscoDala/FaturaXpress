import { Search, Package, Heart, Pencil } from 'lucide-react'
import { useState } from 'react'

interface Produto {
    id: string
    nome: string
    codigo: string
    categoria: string | null
    preco_venda: number | string
    preco_custo?: number | string
    stock_atual: number
    stock_minimo?: number
    unidade: string
    imagem_url: string | null
    ativo: boolean
    descricao?: string | null
    tipo?: 'produto' | 'servico' | 'kit'
    controlar_stock?: boolean
    iva?: number
    tem_iva?: boolean
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
}

export default function CardsProdutos({ produtos, loading, search, setSearch, page, setPage, total, limit, onEdit }: Props) {
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
                    <input
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                        placeholder="Buscar por nome, código..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                </div>
            </div>

            {loading? (
                <p className="text-center text-gray-500 py-16">Carregando...</p>
            ) : produtos.length === 0? (
                <p className="text-center text-gray-500 py-16 bg-white rounded-[20px]">Nenhum produto encontrado</p>
            ) : (
                <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {produtos.map((p) => (
                        <ProductCard key={p.id} produto={p} formatPrice={formatPrice} onEdit={onEdit} />
                    ))}
                </div>
            )}
        </div>
    )
}

function ProductCard({ produto, formatPrice, onEdit }: { produto: Produto; formatPrice: any; onEdit?: any }) {
    const [fav, setFav] = useState(false)
    const tipo = (produto.tipo || 'produto').toLowerCase() as 'produto' | 'servico' | 'kit'
    const controla = produto.controlar_stock?? true

    return (
        <div
            onClick={() => onEdit?.(produto)}
            className="min-w-[100%] md:min-w-[300px] md:max-w-[300px] snap-start flex-shrink-0 bg-white rounded-[20px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-white cursor-pointer flex flex-col"
        >
            <div className="relative bg-white w-full aspect-[1/1] overflow-hidden">
                {produto.imagem_url? (
                    <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-[#F3F3F5] flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-300" />
                    </div>
                )}
                <button
                    onClick={(e) => { e.stopPropagation(); setFav(!fav) }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100"
                >
                    <Heart className={`w-4 h-4 ${fav? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
            </div>

            <div className="pt-3 px-3 pb-3 flex flex-col flex-1">
                <h3 className="font-semibold text-[15px] leading-tight text-gray-900 truncate">{produto.nome}</h3>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="text-[11px] px-2.5 py-1 rounded-full border bg-[#FFF0E0] border-[#FF9A2E] text-[#B65A00] font-bold uppercase">
                        {tipo}
                    </span>
                    <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${produto.ativo? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-200 text-red-600'}`}>
                        {produto.ativo? 'Disponível' : 'Inativo'}
                    </span>
                    <span className="text-[11px] px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500">
                        {produto.unidade}
                    </span>
                </div>

                <div className="mt-2.5 space-y-0.5 min-h-[52px]">
                    {tipo === 'servico'? (
                        <>
                            <p className="text-[12.5px] text-gray-500 truncate">Código {produto.codigo}</p>
                            <p className="text-[12.5px] text-gray-500 truncate">IVA {produto.iva?? 14}% • {produto.categoria || 'Serviço'}</p>
                        </>
                    ) : tipo === 'kit'? (
                        <>
                            <p className="text-[12.5px] text-gray-500 truncate">Kit • {produto.categoria || 'Vários itens'}</p>
                            {controla && <p className="text-[12.5px] text-gray-500 truncate">Stock {produto.stock_atual} {produto.unidade}</p>}
                            <p className="text-[12.5px] text-gray-500 truncate">IVA {produto.iva?? 14}%</p>
                        </>
                    ) : (
                        <>
                            <p className="text-[12.5px] text-gray-500 truncate">{produto.categoria || 'Produto'} • {produto.unidade}</p>
                            {controla? (
                                <p className="text-[12.5px] text-gray-500 truncate">Stock {produto.stock_atual} {produto.unidade} {produto.stock_minimo? `• Min ${produto.stock_minimo}` : ''}</p>
                            ) : (
                                <p className="text-[12.5px] text-gray-500 truncate">IVA {produto.iva?? 14}% • Sem controlo de stock</p>
                            )}
                        </>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3">
                    <p className="text-[18px] font-bold text-gray-900">Kz {formatPrice(produto.preco_venda)}</p>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit?.(produto) }}
                        className="flex items-center gap-1.5 bg-[#FF8A1A] hover:bg-[#FF7A00] text-black text-[13px] font-medium px-4 py-2.5 rounded-full transition"
                    >
                        <Pencil className="w-3.5 h-3.5" /> Atualizar
                    </button>
                </div>
            </div>
        </div>
    )
}
