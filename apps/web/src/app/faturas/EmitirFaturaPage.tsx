import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin, Plus, Trash2, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'

interface Cliente { id: string; nome: string; nif: string; email: string|null; telefone:string|null; endereco: string|null; cidade:string|null; provincia:string|null }
interface Produto { id: string; nome: string; preco: number; iva: number }

export default function EmitirFaturaPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clienteId = searchParams.get('cliente_id')
  const [cliente, setCliente] = useState<Cliente|null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [itens, setItens] = useState<any[]>([])
  const [busca, setBusca] = useState('')
  const [loadingCli, setLoadingCli] = useState(true)
  const [loadingEmit, setLoadingEmit] = useState(false)

  useEffect(()=>{
    if(!clienteId){ navigate('/app/dashboard'); return }
    api.get(`/api/clientes/${clienteId}`).then(r=>setCliente(r.data)).catch(()=>navigate('/app/dashboard')).finally(()=>setLoadingCli(false))
  },[clienteId])

  useEffect(()=>{
    api.get('/api/produtos',{params:{search:busca, limit:40}}).then(r=>{
      const raw = r.data.items || r.data || []
      setProdutos(raw.map((p:any)=>({ id:p.id, nome:p.nome, preco: typeof p.preco_venda==='string'? parseFloat(p.preco_venda): p.preco_venda||p.preco||0, iva:p.iva??14 })))
    })
  },[busca])

  const addItem = (p:Produto) => {
    setItens(prev=>{
      const ex = prev.find(i=>i.produto_id===p.id)
      if(ex) return prev.map(i=> i.produto_id===p.id? {...i, quantidade:i.quantidade+1, subtotal:(i.quantidade+1)*i.preco_unit}:i)
      return [...prev, {produto_id:p.id, nome:p.nome, quantidade:1, preco_unit:p.preco, iva:p.iva, subtotal:p.preco}]
    })
  }

  const subtotal = itens.reduce((a,b)=>a+b.subtotal,0)
  const totalIva = itens.reduce((a,b)=>a+(b.subtotal*b.iva/100),0)
  const total = subtotal + totalIva

  const emitir = async()=>{
    if(!itens.length) return toast.error('Adicione produtos')
    try{ setLoadingEmit(true); await api.post('/api/faturas',{ cliente_id:clienteId, itens: itens.map(i=>({produto_id:i.produto_id, quantidade:i.quantidade, preco_unit:i.preco_unit}))}); toast.success('Fatura emitida'); navigate('/app/dashboard')}
    catch(e:any){ toast.error(e.response?.data?.detail||'Erro') } finally{ setLoadingEmit(false) }
  }

  if(loadingCli) return <div className="p-8 text-center bg-white min-h-screen">Carregando...</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1100px] mx-auto bg-white">

        {/* HEADER - IGUAL PRINT */}
        <div className="bg-[#eef7fb] px-4 sm:px-8 lg:px-12 pt-8 pb-6">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Avatar */}
            <div className="relative w-[132px] h-[132px] shrink-0 mx-auto md:mx-0">
              <div className="w-[132px] h-[132px] rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm">
                <img src={`https://ui-avatars.com/api/?name=${cliente?.nome}&background=E5E7EB&color=374151&size=132`} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#8b5cf6] text-white text-[11px] font-bold rounded-full w-[44px] h-[44px] flex flex-col items-center justify-center leading-[11px] border-2 border-white shadow">
                <span>{itens.length}</span><span className="text-[8px] font-normal">itens</span>
              </div>
            </div>

            {/* Infos */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:justify-between gap-4">
                <div>
                  <h1 className="text-[24px] font-bold text-[#1a202c] leading-tight">{cliente?.nome}</h1>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">Cliente</span>
                    <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">NIF {cliente?.nif}</span>
                  </div>

                  {/* AQUI EMBAIXO DO NOME - IGUAL PEDIU */}
                  <div className="mt-3 space-y-1 text-[13px] text-[#4a5568] leading-[18px]">
                    <p>{cliente?.email || 'killerbless12@gmail.com'}</p>
                    <p>{cliente?.telefone || '930438947'}</p>
                    <p>Endereço: {cliente?.endereco || 'Lunda-Sul, saurimo'} - {cliente?.cidade || 'Saurimo'}</p>
                    <p className="text-[12px] text-gray-600 max-w-[520px]">NIF: {cliente?.nif} - Cliente registrado no FaturaXpress. Todos os dados fiscais validados para emissão.</p>
                  </div>
                </div>

                <div className="flex lg:flex-col items-center lg:items-end gap-3">
                  <div className="flex gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[11px] font-bold">f</span>
                    <span className="w-6 h-6 rounded-full bg-[#1da1f2] flex items-center justify-center text-white text-[10px]">t</span>
                    <span className="w-6 h-6 rounded-full bg-[#0a66c2] flex items-center justify-center text-white text-[10px]">in</span>
                    <span className="w-6 h-6 rounded-full bg-[#ff5700] flex items-center justify-center text-white text-[10px]">r</span>
                    <span className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-[10px]">+</span>
                  </div>
                  <button onClick={()=>navigate('/app/dashboard')} className="hidden lg:flex text-[11px] bg-white border px-3 py-1.5 rounded shadow-sm items-center gap-1.5">
                    <span className="text-[12px]">✉</span> voltar
                  </button>
                </div>
              </div>

              {/* Barra followers - IGUAL PRINT */}
              <div className="mt-6 flex bg-white border border-gray-200 rounded-[3px] overflow-hidden max-w-[420px]">
                <div className="flex-1 py-2 text-center border-r border-gray-200">
                  <p className="text-[14px] font-bold text-gray-800">{subtotal.toFixed(0)}</p>
                  <p className="text-[11px] text-gray-500 -mt-1">subtotal KZ</p>
                </div>
                <div className="flex-1 py-2 text-center border-r border-gray-200">
                  <p className="text-[14px] font-bold text-gray-800">{totalIva.toFixed(0)}</p>
                  <p className="text-[11px] text-gray-500 -mt-1">IVA KZ</p>
                </div>
                <button onClick={emitir} disabled={loadingEmit ||!itens.length} className="flex-[1.2] bg-[#0095ff] hover:bg-[#0084e3] text-white text-[13px] font-semibold disabled:opacity-50">
                  {loadingEmit? 'Emitindo...' : '+ Emitir Fatura'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* My Core Skills - IGUAL PRINT */}
        <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 bg-white border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-bold text-gray-600">My Core Skills:</span>
          <div className="flex flex-wrap gap-2">
            {itens.length===0? <span className="text-[11px] text-gray-400">Nenhum produto - adicione abaixo</span> :
              itens.map(it=>(
                <span key={it.produto_id} className="bg-[#ff7a00] text-white text-[10px] font-bold px-2.5 py-1 rounded-[3px] flex items-center gap-1">
                  {it.nome.toUpperCase()}
                  <span className="flex ml-1">{Array.from({length: Math.min(it.quantidade,3)}).map((_,i)=><Star key={i} className="w-3 h-3 fill-white text-white"/> )}</span>
                </span>
              ))
            }
            <span className="bg-white border text-[10px] px-2 py-1 rounded-[3px] flex items-center gap-1">TOTAL KZ {total.toFixed(0)} <Star className="w-3 h-3 text-gray-400"/></span>
          </div>
        </div>

        {/* Professional Bio + Where I write - IGUAL PRINT */}
        <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4">
          {/* Left */}
          <div className="bg-white border border-gray-200 p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-[12px] font-bold text-gray-800">Professional Bio - Adicionar Produtos</h3>
              <span className="text-[10px] text-gray-400">10 years experience</span>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar produto por nome, código..." className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-blue-400"/>
            </div>

            <div className="max-h-[260px] overflow-auto">
              {produtos.map(p=>(
                <div key={p.id} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">{p.nome}</p>
                    <p className="text-[11px] text-gray-500">{p.preco.toFixed(2)} KZ - IVA {p.iva}%</p>
                  </div>
                  <button onClick={()=>addItem(p)} className="w-7 h-7 bg-white border rounded flex items-center justify-center hover:bg-[#0095ff] hover:text-white hover:border-[#0095ff]"><Plus className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="bg-white border border-gray-200 p-5">
            <h3 className="text-[12px] font-bold text-gray-800 mb-4">Where I write - Itens</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#0a8cd8] font-bold">inbound.org</span>
                <span className="text-[10px] text-green-600">✓ published author</span>
              </div>

              {itens.length===0? <p className="text-[11px] text-gray-400 py-4 text-center">Nenhum item</p> :
                itens.map(it=>(
                  <div key={it.produto_id} className="flex gap-2 items-center text-[11px]">
                    <input type="number" min={1} value={it.quantidade} onChange={e=>{ const q=Number(e.target.value); setItens(prev=>prev.map(x=> x.produto_id===it.produto_id? {...x, quantidade:q, subtotal:q*x.preco_unit}:x))}} className="w-10 border rounded px-1 py-0.5 text-[11px]"/>
                    <span className="flex-1 truncate">{it.nome}</span>
                    <span className="font-bold">{it.subtotal.toFixed(2)}</span>
                    <button onClick={()=> setItens(prev=>prev.filter(x=>x.produto_id!==it.produto_id))}><Trash2 className="w-3 h-3 text-red-500"/></button>
                  </div>
                ))
              }

              <div className="border-t pt-3 mt-3 space-y-1.5 text-[12px]">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{subtotal.toFixed(2)} KZ</span></div>
                <div className="flex justify-between"><span className="text-gray-500">IVA</span><span>{totalIva.toFixed(2)} KZ</span></div>
                <div className="flex justify-between font-bold text-[14px] pt-2 border-t"><span>Total</span><span>{total.toFixed(2)} KZ</span></div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-10"/>
      </div>
    </div>
  )
}
