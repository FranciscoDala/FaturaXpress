import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Plus, Package, ChevronDown, Users, FileDown, Check, Power, FileText, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import ClienteModal from './components/modals/modal_Cliente'
import ProdutoModal from './components/modals/modal_Produto'
import ModalConfirmDelete from './components/modals/modal_ConfirmDelete'
import ModalSaftAO from './components/modals/modal_SaftAO'
import TabelaClientes from './components/tables/tabela_Cliente'
import CardsProdutos from './components/cards/cards_Produto'
import DashboardCards from './components/cards/cards_Dashboard'
import { api } from '../../lib/api'

interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
interface Produto { id: string; nome: string; codigo: string; categoria: string | null; preco_venda: number | string; stock_atual: number; unidade: string; imagem_url: string | null; ativo: boolean; descricao?: string | null; tipo?: 'produto' | 'servico' | 'kit'; controlar_stock?: boolean; iva?: number }

type TopTab = 'proforma' | 'fatura_agt'
type ListView = 'clientes' | 'produtos'

const NOVO_OPTIONS = [
  { value: 'cliente', label: 'Adicionar Cliente', icon: Users },
  { value: 'produto', label: 'Adicionar Produto', icon: Package },
  { value: 'emitir', label: 'Emitir Fatura (Avulso)', icon: Receipt },
  { value: 'ver_clientes', label: 'Ver Clientes', icon: Users },
  { value: 'ver_produtos', label: 'Ver Produtos / Serviços', icon: Package },
  { value: 'saft', label: 'Exportar SAFT-AO AGT', icon: FileDown },
]

const LIST_OPTIONS = [
  { value: 'clientes', label: 'Clientes' },
  { value: 'produtos', label: 'Produtos / Serviços' },
]

export default function DashboardPage() {
    const navigate = useNavigate()
    const [companyName, setCompanyName] = useState('')
    const [modalClienteOpen, setModalClienteOpen] = useState(false)
    const [modalProdutoOpen, setModalProdutoOpen] = useState(false)
    const [modalSaftOpen, setModalSaftOpen] = useState(false)
    const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null)
    const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

    const [topTab, setTopTab] = useState<TopTab>('proforma')
    const [listView, setListView] = useState<ListView>('clientes')

    const [clientes, setClientes] = useState<Cliente[]>([])
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [proformas, setProformas] = useState<any[]>([])
    const [faturasAgt, setFaturasAgt] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const limit = 20

    const [deleteTarget, setDeleteTarget] = useState<{type:'cliente'|'produto', id:string, nome:string} | null>(null)
    const [deleting, setDeleting] = useState(false)

    const [openListSelect, setOpenListSelect] = useState(false)
    const [openNovo, setOpenNovo] = useState(false)
    const listWrapperRef = useRef<HTMLDivElement>(null)
    const listBtnRef = useRef<HTMLButtonElement>(null)
    const novoWrapperRef = useRef<HTMLDivElement>(null)
    const novoBtnRef = useRef<HTMLButtonElement>(null)
    const [listDropdownPos, setListDropdownPos] = useState({ top: 0, left: 0, width: 320 })
    const [novoDropdownPos, setNovoDropdownPos] = useState({ top: 0, left: 0, width: 320 })

    const fetchClientes = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/clientes', { params: { skip, limit, search } }); setClientes(res.data.items); if(listView==='clientes') setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar clientes') } finally { setLoading(false) }
    }
    const fetchProdutos = async () => {
        try { setLoading(true); const skip = (page - 1) * limit; const res = await api.get('/api/produtos', { params: { skip, limit, search } }); setProdutos(res.data.items); if(listView==='produtos') setTotal(res.data.total) }
        catch { toast.error('Erro ao carregar produtos') } finally { setLoading(false) }
    }
    const fetchFaturasCounts = async () => {
        try {
            const res = await api.get('/api/faturas', { params: { limit: 200 } })
            const all = Array.isArray(res.data)? res.data : (res.data.items || [])
            setProformas(all.filter((f:any)=> f.tipo_documento === 'proforma'))
            setFaturasAgt(all.filter((f:any)=> f.tipo_documento === 'fatura' || f.tipo_documento === 'nota_credito' ||!!f.hash_agt))
        } catch {}
    }

    useEffect(() => { const name = localStorage.getItem("company_name"); if (name) setCompanyName(name); fetchFaturasCounts() }, [])
    useEffect(() => { setPage(1) }, [listView])
    useEffect(() => { if (listView === 'clientes') fetchClientes(); else fetchProdutos() }, [page, listView, search])

    const updateListPos = () => { if (listBtnRef.current) { const r = listBtnRef.current.getBoundingClientRect(); setListDropdownPos({ top: r.bottom + 8, left: r.left, width: r.width }) } }
    const updateNovoPos = () => { if (novoBtnRef.current) { const r = novoBtnRef.current.getBoundingClientRect(); setNovoDropdownPos({ top: r.bottom + 8, left: r.left, width: 280 }) } }

    useEffect(() => { if (openListSelect) updateListPos() }, [openListSelect])
    useEffect(() => { if (openNovo) updateNovoPos() }, [openNovo])
    useEffect(() => {
        if (!openListSelect &&!openNovo) return
        const h = () => { if(openListSelect) updateListPos(); if(openNovo) updateNovoPos() }
        window.addEventListener('scroll', h, true); window.addEventListener('resize', h)
        return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h) }
    }, [openListSelect, openNovo])
    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (listWrapperRef.current &&!listWrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-list-dropdown]')) setOpenListSelect(false)
            if (novoWrapperRef.current &&!novoWrapperRef.current.contains(e.target as Node) &&!(e.target as HTMLElement).closest('[data-novo-dropdown]')) setOpenNovo(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const handleOpenCreateCliente = () => { setClienteSelecionado(null); setModalClienteOpen(true); setOpenNovo(false) }
    const handleOpenEditCliente = (c: Cliente) => { setClienteSelecionado(c); setModalClienteOpen(true) }
    const handleOpenCreateProduto = () => { setProdutoSelecionado(null); setModalProdutoOpen(true); setOpenNovo(false) }
    const handleOpenEditProduto = (p: Produto) => { setProdutoSelecionado(p); setModalProdutoOpen(true) }
    const handleEmitirFatura = (c: Cliente) => navigate(`/faturas/nova?cliente_id=${c.id}`)
    const handleLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); navigate('/login') }

    const handleNovoAction = (v: string) => {
        setOpenNovo(false)
        if (v==='cliente') handleOpenCreateCliente()
        if (v==='produto') handleOpenCreateProduto()
        if (v==='emitir') navigate(`/faturas/nova`)
        if (v==='ver_clientes') setListView('clientes')
        if (v==='ver_produtos') setListView('produtos')
        if (v==='saft') setModalSaftOpen(true)
    }

    const handleRequestDeleteCliente = (id: string) => { const c = clientes.find(x=>x.id===id); setDeleteTarget({type:'cliente', id, nome: c?.nome || 'este cliente'}) }
    const handleRequestDeleteProduto = (p: Produto) => setDeleteTarget({type:'produto', id: p.id, nome: p.nome})
    const handleConfirmDelete = async () => {
        if(!deleteTarget) return
        setDeleting(true)
        try {
            if(deleteTarget.type==='cliente'){ await api.delete(`/api/clientes/${deleteTarget.id}`); toast.success('Cliente apagado'); fetchClientes(); fetchFaturasCounts() }
            else { await api.delete(`/api/produtos/${deleteTarget.id}`); toast.success('Produto apagado'); fetchProdutos() }
            setDeleteTarget(null)
        } catch { toast.error('Erro ao apagar') }
        finally { setDeleting(false) }
    }

    const ProdutoModalAny = ProdutoModal as any

    return (
        <div className="min-h-screen bg-white">
            <ClienteModal open={modalClienteOpen} cliente={clienteSelecionado} onClose={() => setModalClienteOpen(false)} onSuccess={() => { toast.success(clienteSelecionado? 'Atualizado' : 'Criado'); fetchClientes() }} />
            <ProdutoModalAny open={modalProdutoOpen} produto={produtoSelecionado} onClose={() => setModalProdutoOpen(false)} onSuccess={() => { toast.success(produtoSelecionado? 'Produto atualizado' : 'Produto criado'); fetchProdutos() }} />
            <ModalConfirmDelete open={!!deleteTarget} itemName={deleteTarget?.nome} loading={deleting} onClose={()=>setDeleteTarget(null)} onConfirm={handleConfirmDelete} />
            <ModalSaftAO open={modalSaftOpen} onClose={()=>setModalSaftOpen(false)} />

            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-8 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start text-left">
                        <div className="w-[96px] h-[96px] sm:w-[132px] sm:h-[132px] rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm shrink-0 self-start">
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132`} className="w-full h-full object-cover" alt={companyName} />
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex flex-row justify-between items-start gap-4 w-full">
                                <div className="flex flex-col items-start text-left">
                                    <h1 className="text-[22px] sm:text-[24px] font-bold text-[#1a202c] text-left">{companyName || 'FaturaXpress'}</h1>
                                    <div className="flex gap-1.5 mt-1.5 justify-start">
                                        <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">Empresa</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">Painel Admin</span>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[13px] text-[#4a5568] text-left">
                                        <p>Bem-vindo de volta, {companyName}</p>
                                        <p className="text-[11px] text-gray-500">Gestão AGT - PP + FT - Avulso OK</p>
                                    </div>
                                </div>
                                <button onClick={handleLogout} className="w-11 h-11 rounded-full bg-white border border-red-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#FF3B30] hover:bg-red-50 transition shrink-0">
                                    <Power className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mt-6 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                                <button onClick={() => setTopTab('proforma')} className={`flex-1 py-2 ${topTab === 'proforma'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{proformas.length}</p>
                                    <p className="text-[11px] text-gray-500">Proforma PP</p>
                                </button>
                                <button onClick={() => setTopTab('fatura_agt')} className={`flex-1 py-2 border-l ${topTab === 'fatura_agt'? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{faturasAgt.length}</p>
                                    <p className="text-[11px] text-gray-500">Fatura AGT FT</p>
                                </button>
                                <div ref={novoWrapperRef} className="flex-[1.2] border-l relative">
                                    <button ref={novoBtnRef} onClick={() => setOpenNovo(!openNovo)} className={`w-full h-full text-[13px] font-semibold flex items-center justify-center gap-1 ${openNovo? 'bg-[#0095ff] text-white' : 'bg-[#8ecfff] text-white hover:bg-[#7ac4ff]'}`}>
                                        + Novo <ChevronDown className={`w-4 h-4 transition ${openNovo? 'rotate-180':''}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <style>{`
              .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border:1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; will-change: transform; }
              .bubble-1 { width:80px; height:80px; left:10%; top:20%; animation-delay:0s; }.bubble-2 { width:120px; height:120px; left:70%; top:10%; animation-delay:1s; animation-duration:10s; }.bubble-3 { width:60px; height:60px; left:40%; top:60%; animation-delay:2s; }.bubble-4 { width:40px; height:40px; left:85%; top:50%; animation-delay:0.5s; animation-duration:7s; }.bubble-5 { width:100px; height:100px; left:5%; top:70%; animation-delay:1.5s; animation-duration:9s; }.bubble-6 { width:50px; height:50px; left:55%; top:15%; animation-delay:2.5s; }
                @keyframes floatBubble { 0%,100%{transform:translateY(0) translateX(0) scale(1); opacity:0.55;} 25%{transform:translateY(-15px) translateX(10px) scale(1.05); opacity:0.85;} 50%{transform:translateY(-25px) translateX(-5px) scale(0.95); opacity:0.45;} 75%{transform:translateY(-10px) translateX(-10px) scale(1.02); opacity:0.7;} }
                    `}</style>
                </div>

                {openNovo && (
                    <div data-novo-dropdown style={{ top: novoDropdownPos.top, left: novoDropdownPos.left, width: novoDropdownPos.width }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                        {NOVO_OPTIONS.map(opt => {
                            const Icon = opt.icon
                            return (
                                <button key={opt.value} onClick={() => handleNovoAction(opt.value)} className="w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center gap-3 transition hover:bg-gray-50 text-gray-700">
                                    <Icon className="w-4 h-4 text-gray-500" /> {opt.label}
                                </button>
                            )
                        })}
                    </div>
                )}

                <div className="w-full px-4 sm:px-8 lg:px-12 py-6">
                    <DashboardCards onCardClick={(t) => t === 'Clientes'? setListView('clientes') : t === 'Produtos'? setListView('produtos') : null} />

                    <div className="mt-6 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <div ref={listWrapperRef} className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-40">
                            <button ref={listBtnRef} onClick={() => setOpenListSelect(!openListSelect)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[14px] font-medium">
                                <span className="text-gray-900">{LIST_OPTIONS.find(o => o.value === listView)?.label} • {topTab === 'proforma'? `${proformas.length} PP` : `${faturasAgt.length} FT`}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openListSelect? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        <div className="relative min-w-full md:min-w-[320px] md:max-w-[320px] snap-center flex-shrink-0 z-0">
                            <button onClick={()=>setModalSaftOpen(true)} className="w-full h-[46px] bg-[#0A2540] text-white rounded-full text-[13px] font-bold flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"><FileDown className="w-4 h-4" /> Exportar SAFT-AO</button>
                        </div>
                    </div>

                    {openListSelect && (
                        <div data-list-dropdown style={{ top: listDropdownPos.top, left: listDropdownPos.left, width: listDropdownPos.width }} className="fixed bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                            {LIST_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => { setListView(opt.value as ListView); setOpenListSelect(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[13.5px] flex items-center justify-between transition ${listView === opt.value? 'bg-[#E6F0FF] text-gray-900 font-semibold' : 'hover:bg-gray-50 text-gray-600'}`}>
                                    {opt.label}
                                    {listView === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                </button>
                            ))}
                        </div>
                    )}

                    {topTab === 'proforma' && (
                        <div className="mb-6 bg-[#FFF7CC]/60 border border-[#FFE9A0] rounded-[22px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-[#8A6D00]" /><p className="text-[13px] font-bold text-[#8A6D00]">Proformas PP - {proformas.length} emitidas</p></div>
                            <div className="flex gap-3 overflow-x-auto snap-x pb-2 [&::-webkit-scrollbar]:hidden">
                                {proformas.length===0? <p className="text-[12px] text-gray-500">Nenhuma proforma ainda</p> : proformas.slice(0,6).map((f:any)=> (
                                    <div key={f.id} className="min-w-[220px] snap-center bg-white rounded-[16px] border border-gray-100 p-3 shadow-sm">
                                        <p className="text-[11px] font-bold truncate">{f.numero_proforma || f.numero || f.id.slice(0,8)} - {f.cliente_nome || ''}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{Number(f.total_geral||f.total||0).toFixed(2)} KZ • {f.status}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {topTab === 'fatura_agt' && (
                        <div className="mb-6 bg-[#E6F0FF]/70 border border-blue-200 rounded-[22px] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center gap-2 mb-2"><Receipt className="w-4 h-4 text-[#0095ff]" /><p className="text-[13px] font-bold text-[#0095ff]">Faturas AGT FT - {faturasAgt.length} emitidas</p></div>
                            <div className="flex gap-3 overflow-x-auto snap-x pb-2 [&::-webkit-scrollbar]:hidden">
                                {faturasAgt.length===0? <p className="text-[12px] text-gray-500">Nenhuma FT ainda</p> : faturasAgt.slice(0,6).map((f:any)=> (
                                    <div key={f.id} className="min-w-[220px] snap-center bg-white rounded-[16px] border border-gray-100 p-3 shadow-sm">
                                        <p className="text-[11px] font-bold truncate">{f.numero_fatura || f.numero || f.id.slice(0,8)} - {f.cliente_nome || ''}</p>
                                        <p className="text-[11px] text-gray-500 truncate">{Number(f.total_geral||f.total||0).toFixed(2)} KZ • {f.status} • {f.hash_agt? 'AGT OK':''}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div id="tabela">
                        {listView === 'clientes'? (
                            <TabelaClientes clientes={clientes} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditCliente} onDelete={handleRequestDeleteCliente} onEmitirFatura={handleEmitirFatura} />
                        ) : (
                            <CardsProdutos produtos={produtos} loading={loading} search={search} setSearch={setSearch} page={page} setPage={setPage} total={total} limit={limit} onEdit={handleOpenEditProduto} onDelete={handleRequestDeleteProduto} />
                        )}
                    </div>

                    <div className="mt-6 bg-white rounded-[22px] p-6 border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
                        <h3 className="font-bold text-[14px] mb-4">Resumo do mês</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-[#F7F8FA] rounded-[16px] p-4 border border-gray-100"><p className="text-[11px] text-gray-500">Total Faturado FT</p><p className="text-[18px] font-bold mt-1">{faturasAgt.reduce((s:any,f:any)=> s+Number(f.total_geral||f.total||0),0).toFixed(2)} KZ</p></div>
                            <div className="bg-[#F7F8FA] rounded-[16px] p-4 border border-gray-100"><p className="text-[11px] text-gray-500">Faturas Emitidas</p><p className="text-[18px] font-bold mt-1">{faturasAgt.length}</p></div>
                            <div className="bg-[#F7F8FA] rounded-[16px] p-4 border border-gray-100"><p className="text-[11px] text-gray-500">Clientes Ativos</p><p className="text-[18px] font-bold mt-1">{clientes.length}</p></div>
                        </div>
                        <div className="mt-6 p-4 bg-[#FFF7ED] border border-orange-200 rounded-[16px] flex items-center justify-between gap-3">
                          <div><p className="text-[13px] font-bold text-gray-900">Obrigação AGT</p><p className="text-[11px] text-gray-600">Exporta o SAFT-AO até dia 15 de cada mês</p></div>
                          <button onClick={()=>setModalSaftOpen(true)} className="h-9 px-5 rounded-full bg-[#0A2540] text-white text-[12px] font-bold shadow-sm">Gerar SAFT</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
