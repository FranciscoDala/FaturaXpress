import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'

interface Cliente {
  id: string
  nome: string
  nif: string
  endereco: string | null
  cidade: string | null
  provincia: string | null
}

interface ProdutoAPI {
  id: string
  nome: string
  preco_venda: number | string
  iva: number
}

interface Produto {
  id: string
  nome: string
  preco: number
  iva: number
}

interface ItemFatura {
  produto_id: string
  nome: string
  quantidade: number
  preco_unit: number
  iva: number
  subtotal: number
}

export default function EmitirFaturaPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clienteId = searchParams.get('cliente_id')

    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [itens, setItens] = useState<ItemFatura[]>([])
    const [loadingCliente, setLoadingCliente] = useState(true)
    const [loadingEmitir, setLoadingEmitir] = useState(false)
    const [buscaProduto, setBuscaProduto] = useState('')

    useEffect(() => {
        if (!clienteId) {
            toast.error('Cliente não selecionado')
            navigate('/')
            return
        }
        const fetchCliente = async () => {
            try {
                setLoadingCliente(true)
                const res = await api.get(`/api/clientes/${clienteId}`)
                setCliente(res.data)
            } catch {
                toast.error('Cliente não encontrado')
                navigate('/app/dashboard')
            } finally {
                setLoadingCliente(false)
            }
        }
        fetchCliente()
    }, [clienteId, navigate])

    useEffect(() => {
        const fetchProdutos = async () => {
            try {
                const res = await api.get('/api/produtos', { params: { search: buscaProduto, limit: 50 } })
                const raw: ProdutoAPI[] = res.data.items || res.data || []
                // NORMALIZA preco_venda -> preco
                const normalizados: Produto[] = raw.map((p:any) => ({
                  id: p.id,
                  nome: p.nome,
                  preco: typeof p.preco_venda === 'string'? parseFloat(p.preco_venda) : (p.preco_venda?? p.preco?? 0),
                  iva: p.iva?? 14
                }))
                setProdutos(normalizados)
            } catch {
                toast.error('Erro ao carregar produtos')
            }
        }
        fetchProdutos()
    }, [buscaProduto])

    const handleAddItem = (produto: Produto) => {
        setItens(prev => {
          const existente = prev.find(i => i.produto_id === produto.id)
          if (existente) {
            return prev.map(i =>
              i.produto_id === produto.id
              ? {...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_unit }
                : i
            )
          }
          return [...prev, {
              produto_id: produto.id,
              nome: produto.nome,
              quantidade: 1,
              preco_unit: produto.preco,
              iva: produto.iva,
              subtotal: produto.preco
          }]
        })
        toast.success(`${produto.nome} adicionado`)
    }

    const handleRemoveItem = (produto_id: string) => setItens(prev => prev.filter(i => i.produto_id!== produto_id))
    const handleQtdChange = (produto_id: string, qtd: number) => {
        if (qtd < 1) return
        setItens(prev => prev.map(i => i.produto_id === produto_id? {...i, quantidade: qtd, subtotal: qtd * i.preco_unit } : i))
    }

    const subtotal = itens.reduce((acc, item) => acc + item.subtotal, 0)
    const totalIva = itens.reduce((acc, item) => acc + (item.subtotal * item.iva / 100), 0)
    const total = subtotal + totalIva

    const handleEmitir = async () => {
        if (itens.length === 0) { toast.error('Adicione pelo menos 1 produto'); return }
        try {
            setLoadingEmitir(true)
            await api.post('/api/faturas', {
                cliente_id: clienteId,
                itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco_unit: i.preco_unit }))
            })
            toast.success('Fatura emitida com sucesso!')
            navigate('/app/dashboard')
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao emitir fatura')
        } finally {
            setLoadingEmitir(false)
        }
    }

    if (loadingCliente) return <p className="p-8 text-center">Carregando...</p>

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/app/dashboard')} className="p-2 rounded-lg hover:bg-gray-200"><ArrowLeft className="w-5 h-5" /></button>
                    <h1 className="text-2xl font-bold text-gray-900">Emitir Fatura</h1>
                </div>

                <div className="bg-white rounded-xl p-6 border mb-6">
                    <h2 className="font-semibold text-gray-900 mb-3">Dados do Cliente</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p><span className="text-gray-500">Nome:</span> {cliente?.nome}</p>
                        <p><span className="text-gray-500">NIF:</span> {cliente?.nif}</p>
                        <p><span className="text-gray-500">Endereço:</span> {cliente?.endereco || '-'}</p>
                        <p><span className="text-gray-500">Cidade:</span> {cliente?.cidade} - {cliente?.provincia}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl p-6 border">
                        <h2 className="font-semibold text-gray-900 mb-3">Adicionar Produtos</h2>
                        <div className="relative mb-4">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input value={buscaProduto} onChange={(e) => setBuscaProduto(e.target.value)} placeholder="Buscar produto..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-600" />
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {produtos.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhum produto encontrado</p>}
                            {produtos.map(prod => (
                                <div key={prod.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium">{prod.nome}</p>
                                        <p className="text-sm text-gray-500">{Number(prod.preco).toFixed(2)} KZ - IVA {prod.iva}%</p>
                                    </div>
                                    <button onClick={() => handleAddItem(prod)} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border">
                        <h2 className="font-semibold text-gray-900 mb-3">Itens da Fatura</h2>
                        {itens.length === 0? (<p className="text-sm text-gray-500 text-center py-8">Nenhum item adicionado</p>) : (
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {itens.map(item => (
                                    <div key={item.produto_id} className="border-b pb-2">
                                        <div className="flex justify-between"><p className="text-sm font-medium">{item.nome}</p><button onClick={() => handleRemoveItem(item.produto_id)}><Trash2 className="w-3 h-3 text-red-500" /></button></div>
                                        <div className="flex justify-between items-center mt-1"><input type="number" value={item.quantidade} onChange={(e) => handleQtdChange(item.produto_id, Number(e.target.value))} className="w-16 border rounded text-sm p-1" min="1" /><p className="text-sm font-bold">{item.subtotal.toFixed(2)} KZ</p></div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="border-t mt-4 pt-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span>Subtotal</span><span>{subtotal.toFixed(2)} KZ</span></div>
                            <div className="flex justify-between"><span>IVA</span><span>{totalIva.toFixed(2)} KZ</span></div>
                            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{total.toFixed(2)} KZ</span></div>
                        </div>
                        <button onClick={handleEmitir} disabled={loadingEmitir || itens.length === 0} className="w-full mt-4 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">{loadingEmitir? 'Emitindo...' : 'Emitir Fatura'}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
