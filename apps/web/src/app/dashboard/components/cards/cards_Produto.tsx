import { FileText, Pencil, Trash2, Lock } from 'lucide-react'
import { useMemo } from 'react'
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

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["ver_produtos", "editar_produtos", "ver_faturas", "emitir_ft", "emitir_pp"],
    recepcao: ["ver_produtos", "ver_faturas", "emitir_ft", "emitir_pp"],
    rh: ["ver_funcionarios"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function CardsProdutos({ produtos, loading, onEdit, onDelete, onView }: Props) {
    const formatPrice = (val: any) => {
        const n = typeof val === 'string'? parseFloat(val) : val
        return isNaN(n)? '0' : n.toFixed(0)
    }

    const funcionarioLogado = useMemo(() => {
        try {
            const raw = localStorage.getItem("funcionario")
            if (!raw) return null
            return JSON.parse(raw)
        } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_produtos') || cargoAtual === 'admin' : true
    const podeEditar = funcionarioLogado? temPermissao(cargoAtual, 'editar_produtos') || cargoAtual === 'admin' : true
    const podeApagar = funcionarioLogado? cargoAtual === 'admin' : true

    if (loading) return <CardsProdutosSkeleton />
    if (!podeVer) {
        return (
            <div className="text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-black/60 text-[13px]">Seu cargo <b>{cargoAtual}</b> não pode ver produtos</p>
            </div>
        )
    }
    if (produtos.length === 0) return <p className="text-center text-black py-16 bg-white rounded-[20px] border font-medium">Nenhum produto/serviço encontrado!</p>

    return (
        <div className="w-full">
            <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory snap-always pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {produtos.map(p => (
                    <ProductCard key={p.id} produto={p} formatPrice={formatPrice} onEdit={onEdit} onDelete={onDelete} onView={onView} podeEditar={podeEditar} podeApagar={podeApagar} cargoAtual={cargoAtual} />
                ))}
            </div>
        </div>
    )
}

function ProductCard({ produto, formatPrice, onEdit, onDelete, onView, podeEditar, podeApagar, cargoAtual }: any) {
    const initials = produto.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    const tipo = (produto.tipo || 'produto').toLowerCase()
    const isServico = tipo === 'servico'

    return (
        <div className="min-w-full max-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 bg-white rounded-[22px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 flex flex-col">
            <div className="relative h-[90px] bg-[#E6F0FF] shrink-0">
                <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-[11px] font-medium shadow-sm border text-black">
                    {produto.ativo? 'Ativo' : 'Inativo'} • {isServico? 'Serviço' : 'Ilimitado'}
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
                {!podeEditar && (
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-full text-[9px] font-bold">{cargoAtual?.toUpperCase()} - SOMENTE LEITURA</div>
                )}
            </div>

            <div className="pt-14 px-5 pb-4">
                <div className="flex items-center gap-2">
                    <p className="text-[11px] text-black font-medium">exp.</p>
                    <div className="flex gap-[2px]">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className={`w-[4px] h-[10px] rounded-full ${i < 5? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                </div>

                <h3 className="font-bold text-[15px] text-black mt-3 truncate">{produto.nome}</h3>

                <p className="text-[12px] text-black font-medium truncate mt-1">
                    {produto.categoria || (isServico? 'Serviço' : 'Produto')} • {produto.unidade} • {tipo}
                </p>

                <div className="flex items-center gap-1.5 mt-2">
                    <p className="text-[12.5px] text-black font-semibold truncate flex-1">
                        {produto.codigo} • Kz {formatPrice(produto.preco_venda)}
                    </p>
                    {!isServico && (
                        <span className="shrink-0 bg-black text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                            Qtd: {produto.stock_atual?? 0}
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 border-t border-gray-100 mt-auto shrink-0">
                <button onClick={() => onView?.(produto)} className="py-3.5 flex items-center justify-center hover:bg-gray-50 border-r border-gray-100 group">
                    <FileText className="w-4 h-4 text-black group-hover:text-blue-600" />
                </button>

                {/* EDITAR - só financeira e admin */}
                <button
                    onClick={() => podeEditar && onEdit?.(produto)}
                    disabled={!podeEditar}
                    className={`py-3.5 flex items-center justify-center border-r border-gray-100 group ${podeEditar? 'hover:bg-gray-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}>
                    <Pencil className={`w-4 h-4 ${podeEditar? 'text-black group-hover:text-orange-600' : 'text-gray-400'}`} />
                </button>

                {/* APAGAR - só admin */}
                <button
                    onClick={() => podeApagar && onDelete?.(produto)}
                    disabled={!podeApagar}
                    className={`py-3.5 flex items-center justify-center group ${podeApagar? 'hover:bg-red-50' : 'bg-gray-50 opacity-40 cursor-not-allowed'}`}>
                    <Trash2 className={`w-4 h-4 ${podeApagar? 'text-black group-hover:text-red-600' : 'text-gray-400'}`} />
                </button>
            </div>
        </div>
    )
}
