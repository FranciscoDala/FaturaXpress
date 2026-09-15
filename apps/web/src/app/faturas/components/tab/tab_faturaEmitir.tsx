import { useEffect, useState } from 'react'
import { Plus, Trash2, Search, Star } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

interface Produto { id: string; nome: string; preco: number; iva: number }

export default function TabEmitir({ clienteId, onEmitida }: { clienteId: string; onEmitida: () => void }) {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [itens, setItens] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [tipoDoc, setTipoDoc] = useState<'proforma'|'fatura'>('proforma')
    const [formaPagamento, setFormaPagamento] = useState('dinheiro')
    const [observacoes, setObservacoes] = useState('')

    useEffect(() => {
        api.get('/api/produtos', { params: { search: busca, limit: 40 } }).then(r => {
            const raw = r.data.items || r.data || []
            setProdutos(raw.map((p: any) => ({ id: p.id, nome: p.nome, preco: typeof p.preco_venda === 'string'? parseFloat(p.preco_venda) : p.preco_venda || 0, iva: p.iva?? 14 })))
        })
    }, [busca])

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
                <span className="text-[11px] font-bold text-gray-900">Itens:</span>
                {itens.length === 0? <span className="text-[11px] text-gray-400">Nenhum</span> : itens.map(it => (
                    <span key={it.produto_id} className="bg-[#ff7a00] text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm">{it.nome.toUpperCase()} x{it.quantidade} <Star className="w-3 h-3 fill-white" /></span>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 w-full">
                <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
                    <div className="flex gap-2 mb-4">
                        <select value={tipoDoc} onChange={e=>setTipoDoc(e.target.value as any)} className="flex-1 h-[40px] border border-gray-200 rounded-full px-3 text-[12px] font-semibold">
                            <option value="proforma">PP - Proforma (sem fiscal)</option>
                            <option value="fatura">FT - Fatura Oficial (com hash AGT)</option>
                        </select>
                    </div>
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full pl-11 pr-4 h-[46px] bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                    </div>
                    <div className="max-h-[360px] overflow-auto divide-y divide-gray-100 pr-1">
                        {produtos.map(p => (
                            <div key={p.id} className="flex justify-between items-center py-3.5">
                                <div><p className="text-[13.5px] font-medium text-gray-900">{p.nome}</p><p className="text-[11.5px] text-gray-500 mt-0.5">{p.preco.toFixed(2)} KZ - IVA {p.iva}%</p></div>
                                <button onClick={() => addItem(p)} className="w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center hover:bg-[#0095ff] hover:text-white hover:border-[#0095ff] transition"><Plus className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6 h-fit">
                    <h3 className="text-[13px] font-bold text-gray-900 mb-4">Resumo AGT</h3>
                    <select value={formaPagamento} onChange={e=>setFormaPagamento(e.target.value)} className="w-full h-[40px] border border-gray-200 rounded-full px-3 text-[12px] mb-3">
                        <option value="dinheiro">Dinheiro</option><option value="transferencia">Transferência</option><option value="multicaixa">Multicaixa</option><option value="credito">Crédito</option>
                    </select>
                    <textarea value={observacoes} onChange={e=>setObservacoes(e.target.value)} placeholder="Observações (opcional - vai na FT)" className="w-full h-[70px] border border-gray-200 rounded-[16px] p-3 text-[12px] mb-3" />
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
