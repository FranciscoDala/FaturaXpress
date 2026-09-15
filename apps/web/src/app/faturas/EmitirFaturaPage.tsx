import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Search, Star, XCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/api'
import ModalConfirmDelete from '../dashboard/components/modals/modal_ConfirmDelete'

interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
interface Produto { id: string; nome: string; preco: number; iva: number }

type Tab = 'emitir' | 'curso' | 'emitidas'

export default function EmitirFaturaPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clienteId = searchParams.get('cliente_id')
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [itens, setItens] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [activeTab, setActiveTab] = useState<Tab>('emitir')

    const [faturasCurso, setFaturasCurso] = useState<any[]>([])
    const [faturasEmitidas, setFaturasEmitidas] = useState<any[]>([])
    const [filtroStatus, setFiltroStatus] = useState('todos')
    const [deleteTarget, setDeleteTarget] = useState<any>(null)

    useEffect(() => {
        if (!clienteId) { navigate('/app/dashboard'); return }
        api.get(`/api/clientes/${clienteId}`).then(r => setCliente(r.data)).catch(() => navigate('/app/dashboard'))
    }, [clienteId])

    useEffect(() => {
        api.get('/api/produtos', { params: { search: busca, limit: 40 } }).then(r => {
            const raw = r.data.items || r.data || []
            setProdutos(raw.map((p: any) => ({ id: p.id, nome: p.nome, preco: typeof p.preco_venda === 'string' ? parseFloat(p.preco_venda) : p.preco_venda || p.preco || 0, iva: p.iva ?? 14 })))
        })
    }, [busca])

    const fetchFaturas = async () => {
        if (!clienteId) return
        try {
            // ROTA CORRETA DO BACKEND
            const res = await api.get('/api/faturas', { params: { cliente_id: clienteId } })
            const all = Array.isArray(res.data) ? res.data : res.data.items || []
            // No backend: rascunho é em curso, emitida/concluida é oficial
            setFaturasCurso(all.filter((f: any) => ['rascunho', 'em_curso'].includes(f.status)))
            setFaturasEmitidas(all)
        } catch (e) { console.log(e) }
    }
    useEffect(() => { if (activeTab !== 'emitir') fetchFaturas() }, [activeTab])

    const addItem = (p: Produto) => {
        setItens(prev => {
            const ex = prev.find(i => i.produto_id === p.id)
            if (ex) return prev.map(i => i.produto_id === p.id ? { ...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_unit } : i)
            return [...prev, { produto_id: p.id, nome: p.nome, quantidade: 1, preco_unit: p.preco, iva: p.iva, subtotal: p.preco }]
        })
    }

    const subtotal = itens.reduce((a, b) => a + b.subtotal, 0)
    const totalIva = itens.reduce((a, b) => a + (b.subtotal * b.iva / 100), 0)
    const total = subtotal + totalIva

    const emitir = async () => {
        if (!itens.length) return toast.error('Adicione produtos')
        try {
            // PAYLOAD CORRETO QUE O BACKEND ESPERA
            await api.post('/api/faturas', {
                cliente_id: clienteId,
                tipo_documento: 'proforma', // começa sempre como proforma
                forma_pagamento: 'dinheiro',
                desconto_percent: 0,
                validade_dias: 15,
                itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco_unit: i.preco_unit }))
            })
            toast.success('Proforma emitida'); setItens([]); setActiveTab('curso'); fetchFaturas()
        }
        catch (e: any) { toast.error(e.response?.data?.detail || 'Erro') }
    }

    const handleCancelar = async (id: string) => {
        try { await api.post(`/api/faturas/${id}/cancelar`); toast.success('Fatura cancelada'); fetchFaturas() } catch { toast.error('Erro ao cancelar') }
    }
    const handleApagar = async () => {
        try { await api.delete(`/api/faturas/${deleteTarget.id}`); toast.success('Apagada'); setDeleteTarget(null); fetchFaturas() } catch (e: any) { toast.error(e.response?.data?.detail || 'Erro ao apagar') }
    }

    const faturasFiltradas = filtroStatus === 'todos' ? faturasEmitidas : faturasEmitidas.filter(f => f.status === filtroStatus)

    const getNumero = (f: any) => f.numero_fatura || f.numero_proforma || f.id.slice(0, 8).toUpperCase()

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1100px] mx-auto">
                <div className="bg-[#eef7fb] px-4 sm:px-8 lg:px-12 pt-8 pb-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-[132px] h-[132px] rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm shrink-0 mx-auto md:mx-0">
                            <img src={`https://ui-avatars.com/api/?name=${cliente?.nome}&background=E5E7EB&color=374151&size=132`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <h1 className="text-[24px] font-bold text-[#1a202c]">{cliente?.nome}</h1>
                                    <div className="flex gap-1.5 mt-1.5">
                                        <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">Cliente</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">NIF {cliente?.nif}</span>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[13px] text-[#4a5568]">
                                        <p>{cliente?.email}</p>
                                        <p>{cliente?.telefone}</p>
                                        <p>Endereço: {cliente?.endereco || '-'} - {cliente?.cidade || ''}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/app/dashboard')} className="bg-[#FF3B30] hover:bg-red-600 text-white text-[12px] font-semibold px-4 py-1.5 rounded-full shadow">Voltar</button>
                            </div>
                            <div className="mt-6 flex bg-white border border-gray-200 rounded-[3px] overflow-hidden max-w-[520px]">
                                <button onClick={() => setActiveTab('curso')} className={`flex-1 py-2 text-center border-r border-gray-200 ${activeTab === 'curso' ? 'bg-gray-50' : ''}`}>
                                    <p className={`text-[13px] font-bold ${activeTab === 'curso' ? 'text-[#0095ff]' : 'text-gray-800'}`}>{faturasCurso.length}</p>
                                    <p className="text-[11px] text-gray-500 -mt-0.5">Em Curso</p>
                                </button>
                                <button onClick={() => setActiveTab('emitidas')} className={`flex-1 py-2 text-center border-r border-gray-200 ${activeTab === 'emitidas' ? 'bg-gray-50' : ''}`}>
                                    <p className={`text-[13px] font-bold ${activeTab === 'emitidas' ? 'text-[#0095ff]' : 'text-gray-800'}`}>{faturasEmitidas.length}</p>
                                    <p className="text-[11px] text-gray-500 -mt-0.5">Emitidas</p>
                                </button>
                                <button onClick={() => setActiveTab('emitir')} className={`flex-[1.2] text-[13px] font-semibold ${activeTab === 'emitir' ? 'bg-[#0095ff] text-white' : 'bg-[#8ecfff] text-white hover:bg-[#6cc0ff]'}`}>+ Emitir Fatura</button>
                            </div>
                        </div>
                    </div>
                </div>

                {activeTab === 'emitir' && (
                    <div className="mx-4 sm:mx-8 lg:mx-12 mt-4">
                        <div className="bg-white border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3 mb-4">
                            <span className="text-[11px] font-bold text-gray-600">Itens na fatura:</span>
                            {itens.length === 0 ? <span className="text-[11px] text-gray-400">Nenhum produto</span> :
                                itens.map(it => (<span key={it.produto_id} className="bg-[#ff7a00] text-white text-[10px] font-bold px-2.5 py-1 rounded-[3px] flex items-center gap-1">{it.nome.toUpperCase()} x{it.quantidade} <Star className="w-3 h-3 fill-white" /></span>))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4">
                            <div className="bg-white border border-gray-200 p-5">
                                <div className="flex justify-between items-center mb-3"><h3 className="text-[12px] font-bold">Adicionar Produtos</h3><span className="text-[10px] text-gray-400">{produtos.length} produtos</span></div>
                                <div className="relative mb-3"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full pl-9 pr-3 py-2 border rounded text-[13px]" /></div>
                                <div className="max-h-[320px] overflow-auto divide-y">{produtos.map(p => (<div key={p.id} className="flex justify-between items-center py-2.5"><div><p className="text-[13px] font-medium">{p.nome}</p><p className="text-[11px] text-gray-500">{p.preco.toFixed(2)} KZ - IVA {p.iva}%</p></div><button onClick={() => addItem(p)} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-[#0095ff] hover:text-white"><Plus className="w-4 h-4" /></button></div>))}</div>
                            </div>
                            <div className="bg-white border border-gray-200 p-5">
                                <h3 className="text-[12px] font-bold mb-4">Resumo</h3>
                                <div className="space-y-2">
                                    {itens.map(it => (<div key={it.produto_id} className="flex gap-2 items-center text-[11px]"><input type="number" min={1} value={it.quantidade} onChange={e => { const q = Number(e.target.value); setItens(prev => prev.map(x => x.produto_id === it.produto_id ? { ...x, quantidade: q, subtotal: q * x.preco_unit } : x)) }} className="w-10 border rounded px-1 py-0.5" /><span className="flex-1 truncate">{it.nome}</span><span className="font-bold">{it.subtotal.toFixed(2)}</span><button onClick={() => setItens(prev => prev.filter(x => x.produto_id !== it.produto_id))}><Trash2 className="w-3 h-3 text-red-500" /></button></div>))}
                                    <div className="border-t pt-3 mt-3 space-y-1.5 text-[12px]">
                                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{subtotal.toFixed(2)} KZ</span></div>
                                        <div className="flex justify-between"><span className="text-gray-500">IVA</span><span>{totalIva.toFixed(2)} KZ</span></div>
                                        <div className="flex justify-between font-bold text-[14px] pt-2 border-t"><span>Total</span><span>{total.toFixed(2)} KZ</span></div>
                                        <button onClick={emitir} className="w-full mt-4 bg-[#0095ff] text-white py-2.5 rounded font-semibold text-[13px]">Emitir Agora</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'curso' && (
                    <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 bg-white border border-gray-200 p-5">
                        <h3 className="text-[12px] font-bold mb-4">Proformas em Curso - podem ser editadas</h3>
                        <div className="space-y-2">
                            {faturasCurso.length === 0 ? <p className="text-[12px] text-gray-400 text-center py-8">Nenhuma fatura em curso</p> :
                                faturasCurso.map(f => (
                                    <div key={f.id} className="flex justify-between items-center border rounded px-3 py-2.5">
                                        <div><p className="text-[13px] font-medium">{getNumero(f)} - {Number(f.total_geral || 0).toFixed(2)} KZ</p><p className="text-[11px] text-gray-500">{f.tipo_documento} • {f.status} • {new Date(f.created_at).toLocaleDateString()}</p></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => api.post(`/api/faturas/${f.id}/converter`).then(() => { toast.success('Convertida em Fatura'); fetchFaturas() })} className="text-[11px] px-3 py-1 bg-[#0095ff] text-white rounded">Converter</button>
                                            <button onClick={() => handleCancelar(f.id)} className="text-[11px] px-3 py-1 border rounded flex items-center gap-1 hover:bg-gray-50"><XCircle className="w-3 h-3" /> Cancelar</button>
                                            <button onClick={() => setDeleteTarget(f)} className="text-[11px] px-3 py-1 bg-[#FF3B30] text-white rounded flex items-center gap-1"><Trash2 className="w-3 h-3" /> Apagar</button>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {activeTab === 'emitidas' && (
                    <div className="mx-4 sm:mx-8 lg:mx-12 mt-4 bg-white border border-gray-200 p-5">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[12px] font-bold">Todas as Faturas</h3>
                            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="text-[11px] border rounded px-2 py-1">
                                <option value="todos">Todos</option>
                                <option value="rascunho">Rascunho</option>
                                <option value="emitida">Emitida</option>
                                <option value="cancelada">Canceladas</option>
                                <option value="apagada">Apagadas</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            {faturasFiltradas.length === 0 ? <p className="text-[12px] text-gray-400 text-center py-8">Nenhuma fatura</p> :
                                faturasFiltradas.map(f => (
                                    <div key={f.id} className="flex justify-between items-center border rounded px-3 py-2.5">
                                        <div className="flex gap-2 items-center"><FileText className="w-4 h-4 text-gray-400" /><div><p className="text-[13px] font-medium">{getNumero(f)} - {Number(f.total_geral || 0).toFixed(2)} KZ</p><p className="text-[11px] text-gray-500 capitalize">{f.tipo_documento} • {f.status}</p></div></div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded ${f.status === 'cancelada' ? 'bg-red-100 text-red-600' : f.status === 'emitida' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>{f.status}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                <ModalConfirmDelete open={!!deleteTarget} itemName={getNumero(deleteTarget || {})} onClose={() => setDeleteTarget(null)} onConfirm={handleApagar} title="Apagar fatura?" description="Essa fatura será removida permanentemente." />
            </div>
        </div>
    )
}
