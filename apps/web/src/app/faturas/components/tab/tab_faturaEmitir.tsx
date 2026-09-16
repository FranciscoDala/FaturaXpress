import { useEffect, useState, useRef } from 'react'
import { Plus, Trash2, Search, Star, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

interface Produto { id: string; nome: string; preco: number; iva: number; quantidade: number }

const OPTIONS_TIPO = [
  { value: 'proforma', label: 'PP - Proforma (sem fiscal)' },
  { value: 'fatura', label: 'FT - Fatura Oficial (com hash AGT)' },
]

const OPTIONS_PAG = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'multicaixa', label: 'Multicaixa' },
  { value: 'credito', label: 'Crédito' },
]

export default function TabEmitir({ clienteId, onEmitida }: { clienteId: string; onEmitida: () => void }) {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [itens, setItens] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [tipoDoc, setTipoDoc] = useState<'proforma'|'fatura'>('proforma')
    const [formaPagamento, setFormaPagamento] = useState('dinheiro')
    const [observacoes, setObservacoes] = useState('')
    const [openTipo, setOpenTipo] = useState(false)
    const [openPag, setOpenPag] = useState(false)
    const [pagina, setPagina] = useState(1)
    const ITENS_POR_PAGINA = 5
    const refTipo = useRef<HTMLDivElement>(null)
    const refPag = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (refTipo.current &&!refTipo.current.contains(e.target as Node)) setOpenTipo(false)
            if (refPag.current &&!refPag.current.contains(e.target as Node)) setOpenPag(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    useEffect(() => {
        api.get('/api/produtos', { params: { search: busca, limit: 100 } }).then(r => {
            const raw = r.data.items || r.data || []
            setProdutos(raw.map((p: any) => ({
              id: p.id,
              nome: p.nome,
              preco: typeof p.preco_venda === 'string'? parseFloat(p.preco_venda) : p.preco_venda || 0,
              iva: p.iva?? 14,
              quantidade: p.quantidade?? p.quantidade_disponivel?? p.stock?? p.estoque?? p.qtd?? 0
            })))
            setPagina(1)
        })
    }, [busca])

    const totalPaginas = Math.ceil(produtos.length / ITENS_POR_PAGINA) || 1
    const produtosPaginados = produtos.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA)

    const addItem = (p: Produto) => {
        setItens(prev => {
            const ex = prev.find(i => i.produto_id === p.id)
            if (ex) return prev.map(i => i.produto_id === p.id? {...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_unit } : i)
            return [...prev, { produto_id: p.id, nome: p.nome, quantidade: 1, preco_unit: p.preco, iva: p.iva, subtotal: p.preco }]
        })
    }

    const subtotal = itens.reduce((a, b) => a + b.subtotal, 0)
    const totalIva = itens.reduce((a, b) => a + (b.subtotal * b.iva / 100), 0)

    const emitir = async () => {
        if (!itens.length) return toast.error('Adicione produtos')
        try {
            const { data } = await api.post('/api/faturas', {
                cliente_id: clienteId,
                tipo_documento: tipoDoc,
                forma_pagamento: formaPagamento,
                desconto_percent: 0,
                validade_dias: 15,
                observacoes: observacoes || undefined,
                itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco_unit: i.preco_unit }))
            })
            toast.success(tipoDoc==='fatura'? `FT ${data.numero_fatura} emitida com Hash AGT!` : `PP ${data.numero_proforma} emitida`)
            setItens([]); setObservacoes(''); onEmitida()
        } catch (e: any) { toast.error(e.response?.data?.detail || 'Erro') }
    }

    return (
        <div className="-full px-4 sm:px-0 lg:px-0 mt-0">
            <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 px-5 py-4 flex flex-wrap gap-3 mb-4 w-full">
                <span className="text-[11px] font-bold text-gray-900 uppercase">ITENS:</span>
                {itens.length === 0? <span className="text-[11px] text-gray-400">0</span> : itens.map(it => (
                    <span key={it.produto_id} className="bg-[#ff7a00] text-white text-[10px] font-bold px-3 py-0 rounded-full flex items-center gap-1 shadow-sm">{it.nome.toUpperCase()} x{it.quantidade} <Star className="w-3 h-3 fill-white" /></span>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 w-full">
                <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
                    <div className="flex gap-2 mb-4">
                        {/* SELECT TIPO DOC - ESTILO CARD */}
                        <div ref={refTipo} className="relative flex-1 z-20">
                            <button onClick={() => setOpenTipo(!openTipo)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[12px] font-semibold">
                                <span className="text-gray-900 truncate">{OPTIONS_TIPO.find(o => o.value === tipoDoc)?.label}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ${openTipo? 'rotate-180' : ''}`} />
                            </button>
                            {openTipo && (
                                <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                                    {OPTIONS_TIPO.map(opt => (
                                        <button key={opt.value} onClick={() => { setTipoDoc(opt.value as any); setOpenTipo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[12px] flex items-center justify-between transition ${tipoDoc === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                            {opt.label}
                                            {tipoDoc === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full pl-11 pr-4 h-[46px] bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                    </div>
                    <div className="max-h-[380px] overflow-auto pr-1 space-y-2">
                        {produtosPaginados.map(p => (
                            <div key={p.id} className="flex justify-between items-center py-3.5 px-4 bg-white border border-gray-200 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                <div><p className="text-[13.5px] font-medium text-gray-900">{p.nome}</p><p className="text-[11.5px] text-gray-500 mt-0.5">{p.preco.toFixed(2)} KZ - IVA {p.iva}% | Quant - {p.quantidade}</p></div>
                                <button onClick={() => addItem(p)} className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center hover:bg-[#0095ff] hover:text-white hover:border-[#0095ff] transition shrink-0 ml-2"><Plus className="w-4 h-4" /></button>
                            </div>
                        ))}
                        {produtos.length === 0 && <p className="text-[12px] text-gray-400 py-6 text-center">Nenhum produto encontrado</p>}
                    </div>
                    {produtos.length > ITENS_POR_PAGINA && (
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                        <button disabled={pagina===1} onClick={()=>setPagina(p=>Math.max(1,p-1))} className="h-8 px-3 rounded-full border border-gray-200 bg-white text-[12px] font-medium flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50"><ChevronLeft className="w-3.5 h-3.5" /> Ant</button>
                        <div className="flex items-center gap-1.5">
                          {Array.from({length: totalPaginas}).map((_,i)=>{
                            const num = i+1
                            if (totalPaginas>5 && Math.abs(num-pagina)>2 && num!==1 && num!==totalPaginas) {
                              if (num===2 || num===totalPaginas-1) return <span key={num} className="text-[11px] text-gray-400 px-1">...</span>
                              return null
                            }
                            return <button key={num} onClick={()=>setPagina(num)} className={`w-8 h-8 rounded-full text-[12px] font-bold transition ${pagina===num? 'bg-[#0095ff] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{num}</button>
                          })}
                        </div>
                        <button disabled={pagina===totalPaginas} onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} className="h-8 px-3 rounded-full border border-gray-200 bg-white text-[12px] font-medium flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50">Prox <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                </div>

                <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6 h-fit">
                    {/* <h3 className="text-[13px] font-bold text-gray-900 mb-4">Resumo AGT</h3> */}

                    {/* SELECT FORMA PAG - ESTILO CARD */}
                    <div ref={refPag} className="relative w-full z-10 mb-3">
                        <button onClick={() => setOpenPag(!openPag)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[12px] font-medium">
                            <span className="text-gray-900">{OPTIONS_PAG.find(o => o.value === formaPagamento)?.label}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openPag? 'rotate-180' : ''}`} />
                        </button>
                        {openPag && (
                            <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                                {OPTIONS_PAG.map(opt => (
                                    <button key={opt.value} onClick={() => { setFormaPagamento(opt.value); setOpenPag(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[12px] flex items-center justify-between transition ${formaPagamento === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                        {opt.label}
                                        {formaPagamento === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Observações (opcional - vai na FT)" className="w-full h-[70px] border border-gray-200 rounded-[16px] p-3 text-[12px] mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    {itens.length === 0? (
                        <p className="text-[12px] text-gray-400 py-4 text-center">Nenhum item adicionado</p>
                    ) : (
                        <div className="space-y-2">
                            {itens.map(it => (
                                <div key={it.produto_id} className="flex gap-2 items-center text-[12px] py-1.5">
                                    <input type="number" min={1} value={it.quantidade} onChange={e => { const q = Number(e.target.value); setItens(prev => prev.map(x => x.produto_id === it.produto_id? {...x, quantidade: q, subtotal: q * x.preco_unit } : x)) }} className="w-12 h-7 border border-gray-200 rounded-full px-2 py-0.5 text-center text-[12px]" />
                                    <span className="flex-1 truncate text-gray-700">{it.nome}</span>
                                    <span className="font-bold text-gray-900">{it.subtotal.toFixed(2)}</span>
                                    <button onClick={() => setItens(prev => prev.filter(x => x.produto_id!== it.produto_id))} className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center transition"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="border-t border-gray-100 pt-4 mt-4 text-[12.5px] space-y-2">
                        <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{subtotal.toFixed(2)} KZ</span></div>
                        <div className="flex justify-between text-gray-600"><span>IVA</span><span>{totalIva.toFixed(2)} KZ</span></div>
                        <div className="flex justify-between font-bold text-[15px] text-gray-900 border-t border-gray-100 pt-3"><span>Total</span><span>{(subtotal + totalIva).toFixed(2)} KZ</span></div>
                        {tipoDoc==='fatura' && <p className="text-[10px] text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1 text-center mt-2">FT vai gerar Hash AGT + QR automático</p>}
                        {tipoDoc==='proforma' && <p className="text-[10px] text-orange-600 bg-orange-50 border border-orange-200 rounded-full px-3 py-1 text-center mt-2">PP sem valor fiscal - pode converter depois</p>}
                        <button onClick={emitir} className="w-full mt-4 bg-[#0095ff] text-white h-[46px] rounded-full font-semibold text-[13px] shadow-[0_4px_12px_rgba(0,149,255,0.25)] hover:bg-[#0085e6] transition">{tipoDoc==='fatura'? 'Emitir FT Oficial' : 'Emitir Proforma PP'}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
