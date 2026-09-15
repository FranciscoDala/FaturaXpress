import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Mail, Phone, Plus, Trash2, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'

interface Cliente { id: string; nome: string; nif: string; email: string|null; telefone:string|null; endereco: string | null; cidade: string | null; provincia: string | null }
interface ProdutoAPI { id: string; nome: string; preco_venda: number | string; iva: number; categoria?: string|null }
interface Produto { id: string; nome: string; preco: number; iva: number; categoria?: string|null }
interface ItemFatura { produto_id: string; nome: string; quantidade: number; preco_unit: number; iva: number; subtotal: number }

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
    if (!clienteId) { toast.error('Cliente não selecionado'); navigate('/app/dashboard'); return }
    const fetchCliente = async () => {
      try { setLoadingCliente(true); const res = await api.get(`/api/clientes/${clienteId}`); setCliente(res.data) }
      catch { toast.error('Cliente não encontrado'); navigate('/app/dashboard') }
      finally { setLoadingCliente(false) }
    }
    fetchCliente()
  }, [clienteId, navigate])

  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const res = await api.get('/api/produtos', { params: { search: buscaProduto, limit: 50 } })
        const raw: ProdutoAPI[] = res.data.items || res.data || []
        setProdutos(raw.map((p:any)=>({ id:p.id, nome:p.nome, preco: typeof p.preco_venda==='string'? parseFloat(p.preco_venda): p.preco_venda||0, iva:p.iva??14, categoria:p.categoria })))
      } catch {}
    }
    fetchProdutos()
  }, [buscaProduto])

  const handleAddItem = (produto: Produto) => {
    setItens(prev => {
      const ex = prev.find(i=>i.produto_id===produto.id)
      if(ex) return prev.map(i=> i.produto_id===produto.id? {...i, quantidade:i.quantidade+1, subtotal:(i.quantidade+1)*i.preco_unit}:i)
      return [...prev, { produto_id:produto.id, nome:produto.nome, quantidade:1, preco_unit:produto.preco, iva:produto.iva, subtotal:produto.preco }]
    })
  }
  const handleRemoveItem = (id:string) => setItens(prev=>prev.filter(i=>i.produto_id!==id))
  const handleQtdChange = (id:string,qtd:number) => { if(qtd<1) return; setItens(prev=>prev.map(i=> i.produto_id===id? {...i, quantidade:qtd, subtotal:qtd*i.preco_unit}:i)) }

  const subtotal = itens.reduce((a,b)=>a+b.subtotal,0)
  const totalIva = itens.reduce((a,b)=>a+(b.subtotal*b.iva/100),0)
  const total = subtotal + totalIva

  const handleEmitir = async () => {
    if(itens.length===0){ toast.error('Adicione produtos'); return }
    try{ setLoadingEmitir(true); await api.post('/api/faturas',{ cliente_id:clienteId, itens: itens.map(i=>({produto_id:i.produto_id, quantidade:i.quantidade, preco_unit:i.preco_unit}))}); toast.success('Fatura emitida!'); navigate('/app/dashboard') }
    catch(err:any){ toast.error(err.response?.data?.detail||'Erro ao emitir') } finally{ setLoadingEmitir(false) }
  }

  if(loadingCliente) return <p className="p-8 text-center">Carregando...</p>
  const initials = cliente?.nome.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase() || 'CL'

  return (
    <div className="min-h-screen bg-[#2D3748] p-0 sm:p-6 flex justify-center">
      <div className="w-full max-w-[980px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]">

        {/* HEADER IGUAL PRINT - azul claro #EAF6FB */}
        <div className="bg-[#EAF6FB] px-6 sm:px-8 py-8 relative">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* AVATAR + BADGE ROXO */}
            <div className="relative w-fit">
              <div className="w-[120px] h-[120px] rounded-full bg-[#E2E8F0] border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-gray-600">
                {initials}
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white rounded-full w-[48px] h-[48px] flex flex-col items-center justify-center text-[12px] font-bold leading-none border-2 border-white">
                <span>{itens.length}</span><span className="text-[8px] font-normal">itens</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-[22px] font-bold text-gray-800">{cliente?.nome}</h1>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] px-2 py-0.5 bg-[#FEE2C5] border border-[#FFD9B0] rounded">Cliente</span>
                    <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded">NIF {cliente?.nif}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 mt-2 font-medium">Cliente faturação • FaturaXpress</p>
                  <p className="text-[12px] text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {cliente?.cidade || 'Luanda'}, {cliente?.provincia || 'Angola'}</p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-2">
                  <div className="flex gap-1">
                    <div className="w-5 h-5 rounded-full bg-[#3B82F6] text-white text-[10px] flex items-center justify-center">f</div>
                    <div className="w-5 h-5 rounded-full bg-[#60A5FA] text-white text-[10px] flex items-center justify-center">t</div>
                    <div className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[10px] flex items-center justify-center">in</div>
                  </div>
                  <button onClick={()=>navigate('/app/dashboard')} className="text-[11px] bg-white border px-3 py-1 rounded flex items-center gap-1 shadow-sm"><Mail className="w-3 h-3"/> voltar</button>
                </div>
              </div>

              {/* BARRA FOLLOWERS / FOLLOWING */}
              <div className="flex mt-6 border bg-white rounded-[4px] overflow-hidden max-w-[480px]">
                <div className="flex-1 py-2 px-4 text-center border-r"><p className="text-[14px] font-bold">{subtotal.toFixed(0)}</p><p className="text-[10px] text-gray-500">subtotal KZ</p></div>
                <div className="flex-1 py-2 px-4 text-center border-r"><p className="text-[14px] font-bold">{totalIva.toFixed(0)}</p><p className="text-[10px] text-gray-500">IVA KZ</p></div>
                <button onClick={handleEmitir} disabled={loadingEmitir || itens.length===0} className="flex-[1.4] bg-[#0A9AFF] hover:bg-blue-600 text-white text-[13px] font-semibold disabled:opacity-50">
                  {loadingEmitir? 'Emitindo...' : `+ Emitir ${total.toFixed(0)} KZ`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MY CORE SKILLS -> ITENS DA FATURA */}
        <div className="px-6 sm:px-8 py-4 border-b bg-white">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-gray-700 mr-2">Itens na fatura:</span>
            {itens.length===0 && <span className="text-[12px] text-gray-400">Nenhum produto adicionado</span>}
            {itens.map(item=>(
              <span key={item.produto_id} className="inline-flex items-center gap-2 bg-[#FF6B00] text-white text-[11px] font-medium px-3 py-1 rounded">
                {item.nome} x{item.quantidade}
                <span className="flex">{Array.from({length: Math.min(item.quantidade,3)}).map((_,i)=><Star key={i} className="w-3 h-3 fill-white text-white"/> )}</span>
                <button onClick={()=>handleRemoveItem(item.produto_id)} className="ml-1 bg-white/20 rounded-full p-0.5"><Trash2 className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        </div>

        {/* PROFESSIONAL BIO + WHERE I WRITE */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 px-6 sm:px-8 py-6 bg-[#FAFAFA]">
          <div className="bg-white border rounded p-4">
            <div className="flex justify-between mb-3"><h3 className="text-[12px] font-bold">Professional Bio - Dados do Cliente</h3><span className="text-[10px] text-gray-400">{cliente?.provincia}</span></div>
            <div className="text-[11.5px] text-gray-600 leading-relaxed space-y-2">
              <p className="flex gap-2"><Mail className="w-3 h-3 mt-0.5"/> {cliente?.email || 'Sem email'}</p>
              <p className="flex gap-2"><Phone className="w-3 h-3 mt-0.5"/> {cliente?.telefone || 'Sem telefone'}</p>
              <p>Endereço: {cliente?.endereco || '-'} - {cliente?.cidade}</p>
              <p>NIF: {cliente?.nif} - Cliente registrado no FaturaXpress. Todos os dados fiscais validados para emissão.</p>

              <div className="mt-4">
                <p className="text-[12px] font-semibold mb-2">Adicionar Produtos</p>
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input value={buscaProduto} onChange={e=>setBuscaProduto(e.target.value)} placeholder="Buscar produto..." className="w-full pl-7 pr-2 py-1.5 border text-[12px] rounded focus:outline-none focus:ring-1 focus:ring-blue-400"/>
                </div>
                <div className="mt-2 max-h-[160px] overflow-auto divide-y">
                  {produtos.map(p=>(
                    <div key={p.id} className="flex justify-between items-center py-1.5">
                      <div><p className="text-[12px] font-medium">{p.nome}</p><p className="text-[10px] text-gray-500">{p.preco.toFixed(2)} KZ • IVA {p.iva}%</p></div>
                      <button onClick={()=>handleAddItem(p)} className="w-6 h-6 bg-gray-100 border rounded flex items-center justify-center hover:bg-blue-600 hover:text-white"><Plus className="w-3 h-3"/></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border rounded p-4">
              <h3 className="text-[12px] font-bold mb-3">Where I write - Resumo</h3>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between"><span className="text-[#0A9AFF] font-semibold">inbound.org</span><span className="text-green-600 text-[10px]">✓ {itens.length} itens</span></div>
                <div className="flex justify-between border-t pt-1"><span>Subtotal</span><span>{subtotal.toFixed(2)} KZ</span></div>
                <div className="flex justify-between"><span>IVA</span><span>{totalIva.toFixed(2)} KZ</span></div>
                <div className="flex justify-between font-bold text-[13px] border-t pt-2"><span>Total</span><span>{total.toFixed(2)} KZ</span></div>
              </div>

              <div className="mt-4 space-y-2">
                {itens.map(item=>(
                  <div key={item.produto_id} className="flex gap-2 items-center">
                    <input type="number" value={item.quantidade} onChange={e=>handleQtdChange(item.produto_id, Number(e.target.value))} className="w-12 border rounded text-[11px] px-1 py-1"/>
                    <span className="text-[11px] flex-1 truncate">{item.nome}</span>
                    <span className="text-[11px] font-bold">{item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
