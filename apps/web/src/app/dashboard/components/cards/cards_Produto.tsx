import { FileText, Pencil, Trash2 } from 'lucide-react'
import { CardsProdutosSkeleton } from '../../../../components/CardsSkeleton'

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

export default function CardsProdutos({ produtos, loading, onEdit, onDelete, onView }: Props) {
    const formatPrice = (val: any) => {
        const n = typeof val === 'string'? parseFloat(val) : val
        return isNaN(n)? '0' : n.toFixed(0)
    }

    if (loading) return <CardsProdutosSkeleton />
    if (produtos.length === 0) return <p className="text-center text-black py-16 bg-white rounded-[20px] border font-medium">Nenhum produto/serviço encontrado!</p>

    return (
        <div className="w-full overflow-hidden">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-1">
                {produtos.map(p => (
                    <ProductCard key={p.id} produto={p} formatPrice={formatPrice} onEdit={onEdit} onDelete={onDelete} onView={onView} />
                ))}
            </div>
        </div>
    )
}

function ProductCard({ produto, formatPrice, onEdit, onDelete, onView }: any) {
    const initials = produto.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    const tipo = (produto.tipo || 'produto').toLowerCase()

    return (
        <div className="w-[92vw] max-w-[92vw] md:w-[320px] md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF] shrink-0">
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[11px] font-medium shadow-sm border text-black">
                    {produto.ativo? 'Ativo' : 'Inativo'} • Ilimitado
                </div>
                <div className="absolute -bottom-10 left-4 w-[88px] h-[88px] rounded-full bg-white border-[4px] border-white flex items-center justify-center shadow-md overflow-hidden">
                    {produto.imagem_url? (
                        <img src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[#F3F4F6] flex items-center justify-center text-[20px] font-bold text-black">
                            {initials}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-14 px-5 pb-4 w-full overflow-hidden">
                <div className="flex items-center gap-2">
                    <p className="text-[11px] text-black font-medium">exp.</p>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                {/* FIX MOBILE - truncate com w-full */}
                <h3 className="font-bold text-[15px] text-black mt-3 w-full truncate block">{produto.nome}</h3>

                <p className="text-[12px] text-black font-medium w-full truncate block mt-1">
                    {produto.categoria || 'Produto'} • {produto.unidade} • {tipo} • Livre
                </p>

                {/* ADICIONADO QUANTIDADE */}
                <div className="flex items-center gap-1.5 mt-2 w-full overflow-hidden">
                    <p className="text-[12.5px] text-black font-semibold truncate flex-1">
                        {produto.codigo} • Kz {formatPrice(produto.preco_venda)}
                    </p>
                    <span className="shrink-0 bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        Qtd: {produto.stock_atual?? 0}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                <button onClick={() => onView?.(produto)} className="py-3.5 flex items-center justify-center hover:bg-gray-50 border-r border-gray-100 group">
                    <FileText className="w-4 h-4 text-black group-hover:text-blue-600" />
                </button>
                <button onClick={() => onEdit?.(produto)} className="py-3.5 flex items-center justify-center hover:bg-gray-50 border-r border-gray-100 group">
                    <Pencil className="w-4 h-4 text-black group-hover:text-orange-600" />
                </button>
                <button onClick={() => onDelete?.(produto)} className="py-3.5 flex items-center justify-center hover:bg-red-50 group">
                    <Trash2 className="w-4 h-4 text-black group-hover:text-red-600" />
                </button>
            </div>
        </div>
    )
}
