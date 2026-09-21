import { useEffect, useState, useRef, useMemo } from 'react'
import { Plus, Trash2, Search, Star, ChevronDown, Check, ChevronLeft, ChevronRight, Crown, AlertTriangle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { TabEmitirProdutosSkeleton } from '../../../../components/CardsSkeleton'
import { api } from '../../../../lib/api'
import ModalConfirmEmit from '../../../dashboard/components/modals/modal_ConfirmEmit'

interface Produto { id: string; nome: string; preco: number; iva: number; quantidade: number }

const OPTIONS_TIPO = [
    { value: 'proforma', label: 'PP - Proforma (sem fiscal) - Livre' },
    { value: 'fatura', label: 'FT - Fatura Oficial (conta no limite do plano)' },
]

const OPTIONS_PAG = [
    { value: 'dinheiro', label: 'Dinheiro' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'multicaixa', label: 'Multicaixa' },
    { value: 'credito', label: 'Crédito' },
]

const PLAN_LIMITS: Record<string, { label: string, max: number | null }> = {
    free: { label: 'FREE', max: 5 },
    plus: { label: 'PLUS', max: 100 },
    premium: { label: 'PREMIUM', max: 500 },
    diamond: { label: 'DIAMOND', max: null },
}

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["emitir_fatura", "emitir_proforma", "ver_produtos"],
    rh: [],
    recepcao: ["emitir_proforma", "ver_produtos"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function TabEmitir({ clienteId, onEmitida }: { clienteId?: string; onEmitida: () => void }) {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [loadingProdutos, setLoadingProdutos] = useState(true)
    const [itens, setItens] = useState<any[]>([])
    const [busca, setBusca] = useState('')
    const [tipoDoc, setTipoDoc] = useState<'proforma' | 'fatura'>('proforma')
    const [formaPagamento, setFormaPagamento] = useState('dinheiro')
    const [observacoes, setObservacoes] = useState('')
    const [openTipo, setOpenTipo] = useState(false)
    const [openPag, setOpenPag] = useState(false)
    const [pagina, setPagina] = useState(1)
    const [openConfirm, setOpenConfirm] = useState(false)
    const [loadingEmit, setLoadingEmit] = useState(false)
    const ITENS_POR_PAGINA = 5
    const refTipo = useRef<HTMLDivElement>(null)
    const refPag = useRef<HTMLDivElement>(null)

    const [clienteNome, setClienteNome] = useState('')
    const [clienteNif, setClienteNif] = useState('999999999')
    const [clienteTel, setClienteTel] = useState('')
    const [clienteEmail, setClienteEmail] = useState('')
    const [salvarComoCliente, setSalvarComoCliente] = useState(false)

    const [plano, setPlano] = useState('free')
    const [usoMes, setUsoMes] = useState(0)

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeEmitirFT = funcionarioLogado? temPermissao(cargoAtual, 'emitir_fatura') || cargoAtual === 'admin' : true
    const podeEmitirPP = funcionarioLogado? temPermissao(cargoAtual, 'emitir_proforma') || temPermissao(cargoAtual, 'emitir_fatura') || cargoAtual === 'admin' : true
    const podeEmitir = tipoDoc === 'fatura'? podeEmitirFT : podeEmitirPP

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (refTipo.current &&!refTipo.current.contains(e.target as Node)) setOpenTipo(false)
            if (refPag.current &&!refPag.current.contains(e.target as Node)) setOpenPag(false)
        }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    useEffect(() => {
        const fetchPlano = async () => {
            try {
                const [meRes, faturasRes] = await Promise.all([
                    api.get('/api/auth/me'),
                    api.get('/api/faturas', { params: { limit: 500 } })
                ])
                const comp = meRes.data?.company || meRes.data
                const plan = (comp?.subscription_plan || 'free').toLowerCase()
                setPlano(plan)
                const all = Array.isArray(faturasRes.data)? faturasRes.data : (faturasRes.data.items || [])
                const now = new Date()
                const count = all.filter((f: any) => {
                    const d = new Date(f.created_at || f.data_emissao)
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && f.tipo_documento === 'fatura' && f.status!== 'apagada'
                }).length
                setUsoMes(count)
            } catch { }
        }
        fetchPlano()
    }, [])

    useEffect(() => {
        setLoadingProdutos(true)
        api.get('/api/produtos', { params: { search: busca, limit: 100 } }).then(r => {
            const raw = r.data.items || r.data || []
            setProdutos(raw.map((p: any) => ({
                id: p.id,
                nome: p.nome,
                preco: typeof p.preco_venda === 'string'? parseFloat(p.preco_venda) : p.preco_venda || 0,
                iva: p.iva!== null && p.iva!== undefined? Number(p.iva) : 14,
                quantidade: p.quantidade?? p.quantidade_disponivel?? p.stock?? p.estoque?? p.qtd?? 0
            })))
            setPagina(1)
        }).catch(() => setProdutos([]))
           .finally(() => setLoadingProdutos(false))
    }, [busca])

    const totalPaginas = Math.ceil(produtos.length / ITENS_POR_PAGINA) || 1
    const produtosPaginados = produtos.slice((pagina - 1) * ITENS_POR_PAGINA, pagina * ITENS_POR_PAGINA)

    const planInfo = PLAN_LIMITS[plano] || PLAN_LIMITS.free
    const isAtLimit = planInfo.max? usoMes >= planInfo.max : false
    const usoPercent = planInfo.max? Math.min(100, (usoMes / planInfo.max) * 100) : 0

    const addItem = (p: Produto) => {
        if (!podeEmitir) { toast.error('Sem permissão'); return }
        setItens(prev => {
            const ex = prev.find(i => i.produto_id === p.id)
            if (ex) return prev.map(i => i.produto_id === p.id? {...i, quantidade: i.quantidade + 1, subtotal: (i.quantidade + 1) * i.preco_unit } : i)
            return [...prev, { produto_id: p.id, nome: p.nome, quantidade: 1, preco_unit: p.preco, iva: p.iva, subtotal: p.preco }]
        })
        toast.success(`${p.nome} adicionado`, { description: `Preço: ${p.preco.toFixed(2)} KZ | ${p.iva === 0? 'Isento' : `IVA ${p.iva}%`}`, duration: 1500 })
    }

    const subtotal = itens.reduce((a, b) => a + b.subtotal, 0)
    const totalIva = itens.reduce((a, b) => {
        const ivaItem = Number(b.iva) || 0
        return a + (ivaItem > 0? (b.subtotal * ivaItem / 100) : 0)
    }, 0)

    const emitir = async () => {
        if (!itens.length) return toast.error('Adicione produtos')
        if (!clienteId &&!clienteNome) return toast.error('Informe nome do cliente avulso')
        if (!podeEmitir) { toast.error(`Cargo ${cargoAtual} sem permissão para ${tipoDoc}`); return }

        if (tipoDoc === 'fatura' && isAtLimit) {
            toast.error('Limite do plano atingido', {
                description: `Você já usou ${usoMes}/${planInfo.max} FT este mês no plano ${planInfo.label}. Proforma continua livre.`,
                duration: 6000,
                action: { label: 'Fazer Upgrade', onClick: () => window.location.hash = '#/assinatura' }
            })
            return
        }

        try {
            setLoadingEmit(true)
            const payload: any = {
                cliente_id: clienteId || undefined,
                cliente_nome: clienteId? undefined : clienteNome,
                cliente_nif: clienteId? undefined : (clienteNif || '999999999'),
                cliente_telefone: clienteId? undefined : (clienteTel || undefined),
                cliente_email: clienteId? undefined : (clienteEmail || undefined),
                salvar_como_cliente:!clienteId && salvarComoCliente,
                tipo_documento: tipoDoc,
                forma_pagamento: formaPagamento,
                desconto_percent: 0,
                validade_dias: 15,
                observacoes: observacoes || undefined,
                itens: itens.map(i => ({ produto_id: i.produto_id, quantidade: i.quantidade, preco_unit: i.preco_unit }))
            }
            const { data } = await api.post('/api/faturas', payload)
            if (tipoDoc === 'fatura') {
                const novoUso = usoMes + 1
                toast.success(`FT ${data.numero_fatura} emitida!`, {
                    description: `Hash AGT gerado. Uso: ${novoUso}/${planInfo.max || '∞'} FT este mês no plano ${planInfo.label}.`,
                    duration: 6000
                })
                setUsoMes(novoUso)
            } else {
                toast.success(`PP ${data.numero_proforma} emitida!`, {
                    description: 'Proforma não conta no limite. É sempre livre, pode emitir quantas quiser.',
                    duration: 4000
                })
            }
            setItens([]); setObservacoes(''); setClienteNome(''); setClienteNif('999999999'); setClienteTel(''); setClienteEmail(''); setOpenConfirm(false); onEmitida()
        } catch (e: any) {
            const detail = e.response?.data?.detail || 'Erro ao emitir'
            if (e.response?.status === 403) {
                toast.error('Limite do plano', {
                    description: detail,
                    action: { label: 'Upgrade', onClick: () => window.location.hash = '#/assinatura' }
                })
            } else {
                toast.error('Erro ao emitir', { description: detail })
            }
        } finally { setLoadingEmit(false) }
    }

    const isTudoIsento = itens.length > 0 && itens.every(i => Number(i.iva) === 0)

    const opcoesFiltradas = useMemo(() => {
        if (cargoAtual === 'admin' || cargoAtual === 'financeira') return OPTIONS_TIPO
        if (cargoAtual === 'recepcao') return OPTIONS_TIPO.filter(o => o.value === 'proforma')
        return OPTIONS_TIPO
    }, [cargoAtual])

    if (!podeEmitirPP &&!podeEmitirFT) {
        return (
            <div className="w-full px-4 sm:px-0 text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-[13px] text-gray-500">Cargo <b>{cargoAtual.toUpperCase()}</b> não pode emitir faturas</p>
            </div>
        )
    }

    return (
        <div className="w-full px-4 sm:px-0 lg:px-0 mt-0">
            <div className={`mb-4 w-full rounded-[16px] border px-4 py-3 flex items-center gap-3 ${isAtLimit? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-100'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white border shrink-0 ${isAtLimit? 'text-red-600 border-red-200' : 'text-blue-600 border-blue-100'}`}>
                    <Crown className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-black">Plano {planInfo.label} {planInfo.max? `- ${usoMes}/${planInfo.max} FT este mês` : '- Ilimitado'} • {cargoAtual.toUpperCase()} {podeEmitirFT? '• FT+PP' : podeEmitirPP? '• só PP' : '• sem permissão'}</p>
                    {planInfo.max? (
                        <div className="mt-1.5 h-1.5 w-full bg-white rounded-full overflow-hidden border border-black/5">
                            <div className={`h-full rounded-full ${isAtLimit? 'bg-red-500' : usoPercent >= 80? 'bg-amber-500' : 'bg-[#0095ff]'}`} style={{ width: `${usoPercent}%` }} />
                        </div>
                    ) : <p className="text-[11px] text-black font-medium">Você pode emitir FT ilimitadas</p>}
                    <p className="text-[11px] text-black font-medium mt-1">Proforma PP sempre livre, não conta no limite.</p>
                </div>
                {isAtLimit && <button onClick={() => window.location.hash = '#/assinatura'} className="shrink-0 text-[11px] bg-[#0095ff] text-white px-3 py-1.5 rounded-full font-semibold">Upgrade</button>}
            </div>

            {!podeEmitirFT && podeEmitirPP && (
                <div className="mb-4 p-2.5 rounded-[12px] bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-800"><AlertTriangle className="w-4 h-4"/> Recepção só emite Proforma PP, não FT</div>
            )}

            <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 px-5 py-4 flex flex-wrap gap-3 mb-4 w-full">
                <span className="text-[11px] font-bold text-black uppercase">ITENS:</span>
                {itens.length === 0? <span className="text-[11px] text-black font-medium">0</span> : itens.map(it => (
                    <span key={it.produto_id} className="bg-[#ff7a00] text-white text-[10px] font-bold px-3 py-0.5 rounded-full flex items-center gap-1 shadow-sm">{it.nome.toUpperCase()} x{it.quantidade} {Number(it.iva) === 0? '(Isento)' : `IVA ${it.iva}%`} <Star className="w-3 h-3 fill-white" /></span>
                ))}
            </div>

            {!clienteId && (
                <div className="bg-[#F0F7FF] border border-blue-100 rounded-[22px] p-5 mb-4">
                    <p className="text-[13px] font-bold mb-3 text-black">Cliente Avulso (sem cadastro)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={clienteNome} onChange={e => setClienteNome(e.target.value)} placeholder="Nome * obrigatório" className="h-[44px] border border-gray-200 rounded-full px-4 text-[13px] bg-white text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff]" />
                        <input value={clienteNif} onChange={e => setClienteNif(e.target.value)} placeholder="NIF (999999999 = Consumidor Final)" className="h-[44px] border border-gray-200 rounded-full px-4 text-[13px] bg-white text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff]" />
                        <input value={clienteTel} onChange={e => setClienteTel(e.target.value)} placeholder="Telefone (opcional)" className="h-[44px] border border-gray-200 rounded-full px-4 text-[13px] bg-white text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff]" />
                        <input value={clienteEmail} onChange={e => setClienteEmail(e.target.value)} placeholder="Email (opcional)" className="h-[44px] border border-gray-200 rounded-full px-4 text-[13px] bg-white text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff]" />
                    </div>
                    <label className="flex items-center gap-2 mt-3 text-[12px] cursor-pointer text-black font-medium">
                        <input type="checkbox" checked={salvarComoCliente} onChange={e => setSalvarComoCliente(e.target.checked)} className="rounded" />
                        Salvar este cliente para próximas faturas
                    </label>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-4 w-full">
                <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6">
                    <div className="flex gap-2 mb-4">
                        <div ref={refTipo} className="relative flex-1 z-20">
                            <button disabled={!podeEmitir} onClick={() => podeEmitir && setOpenTipo(!openTipo)} className={`w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[12px] font-semibold text-black ${!podeEmitir? 'opacity-50' : ''}`}>
                                <span className="text-black truncate">{opcoesFiltradas.find(o => o.value === tipoDoc)?.label || OPTIONS_TIPO.find(o => o.value === tipoDoc)?.label}</span>
                                <ChevronDown className={`w-4 h-4 text-black transition-transform shrink-0 ml-2 ${openTipo? 'rotate-180' : ''}`} />
                            </button>
                            {openTipo && podeEmitir && (
                                <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                                    {opcoesFiltradas.map(opt => (
                                        <button key={opt.value} onClick={() => { setTipoDoc(opt.value as any); setOpenTipo(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[12px] flex items-center justify-between transition ${tipoDoc === opt.value? 'bg-[#E6F0FF] text-black font-semibold' : 'hover:bg-gray-50 text-black'}`}>
                                            {opt.label}
                                            {tipoDoc === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {tipoDoc === 'fatura' && isAtLimit && (
                        <div className="mb-4 flex items-center gap-2 text-[11px] text-black font-semibold bg-red-50 border border-red-200 px-3 py-2 rounded-full">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            Limite {planInfo.label} atingido. Emita PP livre ou faça upgrade.
                        </div>
                    )}
                    {!podeEmitir && (
                        <div className="mb-4 flex items-center gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-full">
                            <Lock className="w-4 h-4"/> Sem permissão para emitir {tipoDoc.toUpperCase()}
                        </div>
                    )}
                    <div className="relative mb-4">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produto..." className="w-full pl-11 pr-4 h-[46px] bg-white border border-gray-200 rounded-full text-[14px] text-black placeholder:text-black/60 focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" />
                    </div>
                    <div className="max-h-[380px] overflow-auto pr-1 space-y-2">
                        {loadingProdutos? (
                            <TabEmitirProdutosSkeleton />
                        ) : (
                            <>
                                {produtosPaginados.map(p => (
                                    <div key={p.id} className="flex justify-between items-center py-3.5 px-4 bg-white border border-gray-200 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13.5px] font-medium text-black truncate">{p.nome}</p>
                                            <p className="text-[11.5px] text-black font-medium mt-0.5">
                                                {p.preco.toFixed(2)} KZ - {p.iva === 0? <span className="bg-gray-900 text-white px-2 py-0.5 rounded-full text-[10px]">Isento</span> : `IVA ${p.iva}%`} | Quant - {p.quantidade}
                                            </p>
                                        </div>
                                        <button disabled={!podeEmitir} onClick={() => addItem(p)} className={`w-8 h-8 border border-gray-200 rounded-full flex items-center justify-center transition shrink-0 ml-2 text-black ${podeEmitir? 'hover:bg-[#0095ff] hover:text-white hover:border-[#0095ff]' : 'bg-gray-100 opacity-40 cursor-not-allowed'}`}><Plus className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {produtos.length === 0 && <p className="text-[12px] text-black font-medium py-6 text-center">Nenhum produto encontrado</p>}
                            </>
                        )}
                    </div>
                    {!loadingProdutos && produtos.length > ITENS_POR_PAGINA && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                            <button disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))} className="h-8 px-3 rounded-full border border-gray-200 bg-white text-[12px] font-medium flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50 text-black"><ChevronLeft className="w-3.5 h-3.5" /> Ant</button>
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalPaginas }).map((_, i) => {
                                    const num = i + 1
                                    if (totalPaginas > 5 && Math.abs(num - pagina) > 2 && num!== 1 && num!== totalPaginas) {
                                        if (num === 2 || num === totalPaginas - 1) return <span key={num} className="text-[11px] text-black px-1">...</span>
                                        return null
                                    }
                                    return <button key={num} onClick={() => setPagina(num)} className={`w-8 h-8 rounded-full text-[12px] font-bold transition ${pagina === num? 'bg-[#0095ff] text-white' : 'bg-white border border-gray-200 text-black hover:bg-gray-50'}`}>{num}</button>
                                })}
                            </div>
                            <button disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} className="h-8 px-3 rounded-full border border-gray-200 bg-white text-[12px] font-medium flex items-center gap-1 disabled:opacity-40 hover:bg-gray-50 text-black">Prox <ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-[22px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-gray-100 p-6 h-fit">
                    <div ref={refPag} className="relative w-full z-10 mb-3">
                        <button onClick={() => setOpenPag(!openPag)} className="w-full h-[46px] bg-white border border-gray-200 rounded-full px-4 flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] text-[12px] font-medium text-black">
                            <span className="text-black">{OPTIONS_PAG.find(o => o.value === formaPagamento)?.label}</span>
                            <ChevronDown className={`w-4 h-4 text-black transition-transform ${openPag? 'rotate-180' : ''}`} />
                        </button>
                        {openPag && (
                            <div className="absolute top-[54px] left-0 w-full bg-white rounded-[20px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden p-1.5 z-[9999]">
                                {OPTIONS_PAG.map(opt => (
                                    <button key={opt.value} onClick={() => { setFormaPagamento(opt.value); setOpenPag(false) }} className={`w-full text-left px-4 py-3 rounded-[14px] text-[12px] flex items-center justify-between transition ${formaPagamento === opt.value? 'bg-[#E6F0FF] text-black font-semibold' : 'hover:bg-gray-50 text-black'}`}>
                                        {opt.label}
                                        {formaPagamento === opt.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações (opcional - vai na FT)" className="w-full h-[70px] border border-gray-200 rounded-[16px] p-3 text-[12px] text-black placeholder:text-black/60 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    {itens.length === 0? (
                        <p className="text-[12px] text-black font-medium py-4 text-center">Nenhum item adicionado</p>
                    ) : (
                        <div className="space-y-2">
                            {itens.map(it => (
                                <div key={it.produto_id} className="flex gap-2 items-center text-[12px] py-1.5">
                                    <input type="number" min={1} value={it.quantidade} onChange={e => { const q = Number(e.target.value); setItens(prev => prev.map(x => x.produto_id === it.produto_id? {...x, quantidade: q, subtotal: q * x.preco_unit } : x)) }} className="w-12 h-7 border border-gray-200 rounded-full px-2 py-0.5 text-center text-[12px] text-black" />
                                    <span className="flex-1 truncate text-black font-medium">{it.nome} {Number(it.iva) === 0? '(Isento)' : ''}</span>
                                    <span className="font-bold text-black">{it.subtotal.toFixed(2)}</span>
                                    <button onClick={() => { setItens(prev => prev.filter(x => x.produto_id!== it.produto_id)); toast.info('Item removido') }} className="w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center transition"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="border-t border-gray-100 pt-4 mt-4 text-[12.5px] space-y-2">
                        <div className="flex justify-between text-black font-medium"><span>Subtotal</span><span>{subtotal.toFixed(2)} KZ</span></div>
                        <div className="flex justify-between text-black font-medium">
                            <span>IVA {isTudoIsento? '(Isento M04)' : ''}</span>
                            <span>{totalIva.toFixed(2)} KZ</span>
                        </div>
                        <div className="flex justify-between font-bold text-[15px] text-black border-t border-gray-100 pt-3"><span>Total</span><span>{(subtotal + totalIva).toFixed(2)} KZ</span></div>

                        {isTudoIsento && <p className="text-[10px] font-semibold bg-gray-900 text-white rounded-full px-3 py-1 text-center mt-2">Produtos Isentos - IVA não aplicável (M04)</p>}
                        {tipoDoc === 'fatura' &&!isAtLimit &&!isTudoIsento && podeEmitir && <p className="text-[10px] font-semibold bg-green-50 border border-green-200 text-black rounded-full px-3 py-1 text-center mt-2">FT vai gerar Hash AGT + QR • Conta {usoMes + 1}/{planInfo.max || '∞'} neste mês</p>}
                        {tipoDoc === 'fatura' && isAtLimit && <p className="text-[10px] font-semibold bg-red-50 border border-red-200 text-black rounded-full px-3 py-1 text-center mt-2">Limite {planInfo.label} atingido - Faça upgrade ou emita PP livre</p>}
                        {tipoDoc === 'proforma' && <p className="text-[10px] font-semibold bg-orange-50 border border-orange-200 text-black rounded-full px-3 py-1 text-center mt-2">PP sem valor fiscal - sempre livre, não conta no limite</p>}

                        <button
                            disabled={(tipoDoc === 'fatura' && isAtLimit) ||!podeEmitir}
                            onClick={() => { if (!itens.length) return toast.error('Adicione produtos'); if (!clienteId &&!clienteNome) return toast.error('Nome cliente obrigatório'); if (!podeEmitir) return toast.error('Sem permissão'); setOpenConfirm(true) }}
                            className={`w-full mt-4 h-[46px] rounded-full font-semibold text-[13px] shadow-[0_4px_12px_rgba(0,149,255,0.25)] transition ${tipoDoc === 'fatura' && isAtLimit ||!podeEmitir? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-[#0095ff] text-white hover:bg-[#0085e6]'}`}>
                            {!podeEmitir? `Sem permissão ${cargoAtual}` : tipoDoc === 'fatura'? isAtLimit? `Limite ${planInfo.max} FT atingido` : `Emitir FT Oficial (${usoMes + 1}/${planInfo.max || '∞'})` : 'Emitir Proforma PP (Livre)'}
                        </button>
                    </div>
                </div>
            </div>

            {podeEmitir && <ModalConfirmEmit open={openConfirm} tipoDoc={tipoDoc} total={subtotal + totalIva} qtdItens={itens.length} loading={loadingEmit} onClose={() => setOpenConfirm(false)} onConfirm={emitir} />}
        </div>
    )
}
