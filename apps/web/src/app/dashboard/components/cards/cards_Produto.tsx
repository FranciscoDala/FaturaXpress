import { Search, ChevronLeft, ChevronRight, Package, Tag } from 'lucide-react'

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
}

export default function CardsProdutos({ produtos, loading, search, setSearch, page, setPage, total, limit }: Props) {
  const totalPages = Math.ceil(total / limit)

  const formatPrice = (val: number | string) => {
    const num = typeof val === 'string'? parseFloat(val) : val
    return isNaN(num)? '0.00' : num.toFixed(2)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="p-6 border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Produtos Cadastrados</h3>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por nome, código..." className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading? <p className="text-center text-gray-500 py-12">Carregando...</p> :
         produtos.length === 0? <p className="text-center text-gray-500 py-12">Nenhum produto encontrado</p> :
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {produtos.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition">
                {p.imagem_url? <img src={p.imagem_url} alt={p.nome} className="w-full h-32 rounded-lg object-cover mb-3" /> : <div className="w-full h-32 rounded-lg bg-gray-100 flex items-center justify-center mb-3"><Package className="w-10 h-10 text-gray-400" /></div>}

                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{p.nome}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.ativo? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.ativo? 'Ativo' : 'Inativo'}</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs text-gray-500">Cód: {p.codigo}</p>
                  {p.categoria && <span className="flex items-center gap-1 text-xs text-gray-500"><Tag className="w-3 h-3"/> {p.categoria}</span>}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-xl font-bold text-orange-600">{formatPrice(p.preco_venda)} KZ</p>
                  <p className="text-sm text-gray-600">Stock: {p.stock_atual} {p.unidade}</p>
                </div>
              </div>
            ))}
         </div>}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center p-4 border-t">
          <p className="text-sm text-gray-500">Página {page} de {totalPages} - {total} produtos</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(page - 1)} className="p-2 border rounded-lg disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={page === totalPages} onClick={() => setPage(page + 1)} className="p-2 border rounded-lg disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
