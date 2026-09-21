import { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react'
import { X, Check, Package, Settings, Info, Upload, ChevronDown, Lock } from 'lucide-react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["gerir_produtos", "criar_produto", "editar_produto"],
    recepcao: [],
    rh: []
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

interface Produto {
    id?: string
    nome: string
    codigo: string
    codigo_barras?: string | null
    codigo_qr?: string | null
    descricao?: string | null
    categoria?: string | null
    imagem_url?: string | null
    preco_custo?: number | string | null
    preco_venda: number | string
    iva?: number
    tem_iva?: boolean
    tipo?: string
    stock_atual?: number
    stock_minimo?: number
    controlar_stock?: boolean
    unidade?: string
    peso?: number | null
    ativo?: boolean
}

interface Props {
    open: boolean
    produto?: Produto | null
    onClose: () => void
    onSuccess: () => void
}

const UNIDADES = ['UN', 'KG', 'L', 'M', 'CX', 'PCT', 'PAR', 'DZ']
const TIPOS = [
    { value: 'produto', label: 'Produto' },
    { value: 'servico', label: 'Serviço' },
    { value: 'kit', label: 'Kit' }
]

type Tab = 'obrigatorio' | 'opcional' | 'estoque'

function generateBarCode() {
    const base = `560${Date.now().toString().slice(-7)}${Math.floor(Math.random()*90+10)}`
    return base.slice(0,13)
}
function generateQRCode(codigo: string) {
    return `QR-${codigo || Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`
}

function parseAO(value: any): number {
    if (value === null || value === undefined || value === '') return 0
    const str = String(value).trim()
    if (!str) return 0
    const cleaned = str.replace(/\./g, '').replace(',', '.')
    const n = parseFloat(cleaned)
    return isNaN(n)? 0 : n
}

function CustomSelect({ value, options, onChange, placeholder }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current &&!ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    const selected = options.find(o => o.value === value)
    return (
        <div ref={ref} className="relative w-full">
            <button type="button" onClick={() => setOpen(!open)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff]">
                <span className={selected? 'text-black' : 'text-black/60'}>{selected? selected.label : placeholder}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5">
                    {options.map(o => (
                        <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${value === o.value? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-gray-700'}`}>
                            {o.label} {value === o.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ProdutoModal({ open, produto, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<Tab>('obrigatorio')
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isEditing =!!produto?.id

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeGerir = funcionarioLogado? temPermissao(cargoAtual, 'gerir_produtos') || temPermissao(cargoAtual, 'criar_produto') || cargoAtual === 'admin' : true

    const [form, setForm] = useState({
        nome: '', codigo: '', preco_venda: '', tipo: 'produto',
        useImagem: false, imagem_file: null as File | null, imagem_preview: '',
        codigo_barras: '', codigo_qr: '',
        useDescricao: false, descricao: '',
        useCategoria: false, categoria: '',
        usePeso: false, peso: '',
        preco_custo: '0', iva: '14', useIva: true, unidade: 'UN', ativo: true,
        controlar_stock: true, stock_atual: '0', stock_minimo: '0'
    })

    const handleTipoChange = (novoTipo: string) => {
        if (novoTipo === 'servico' || novoTipo === 'kit') {
            setForm(prev => ({
              ...prev,
                tipo: novoTipo,
                useIva: false,
                iva: '0',
                controlar_stock: false,
                stock_atual: '0'
            }))
        } else {
            setForm(prev => ({
              ...prev,
                tipo: novoTipo,
                useIva: true,
                iva: prev.iva === '0'? '14' : prev.iva,
                controlar_stock: true
            }))
        }
    }

    useEffect(() => {
        if (!open) return
        if (produto) {
            if (form.imagem_preview && form.imagem_file) URL.revokeObjectURL(form.imagem_preview)
            const isServicoOuKit = produto.tipo === 'servico' || produto.tipo === 'kit'
            setForm({
                nome: produto.nome || '',
                codigo: produto.codigo || '',
                preco_venda: String(produto.preco_venda?? ''),
                tipo: produto.tipo || 'produto',
                useImagem:!!produto.imagem_url,
                imagem_file: null,
                imagem_preview: produto.imagem_url || '',
                codigo_barras: produto.codigo_barras || generateBarCode(),
                codigo_qr: produto.codigo_qr || generateQRCode(produto.codigo),
                useDescricao:!!produto.descricao,
                descricao: produto.descricao || '',
                useCategoria:!!produto.categoria,
                categoria: produto.categoria || '',
                usePeso:!!produto.peso,
                peso: String(produto.peso?? ''),
                preco_custo: String(produto.preco_custo?? '0'),
                iva: String(produto.iva?? (isServicoOuKit? '0' : '14')),
                useIva: isServicoOuKit? false : (produto.tem_iva?? true),
                unidade: produto.unidade || 'UN',
                ativo: produto.ativo?? true,
                controlar_stock: isServicoOuKit? false : (produto.controlar_stock?? true),
                stock_atual: String(produto.stock_atual?? '0'),
                stock_minimo: String(produto.stock_minimo?? '0')
            })
            setTab('obrigatorio')
        } else {
            resetForm()
        }
    }, [produto, open])

    useEffect(() => {
        return () => {
            if (form.imagem_preview && form.imagem_file) URL.revokeObjectURL(form.imagem_preview)
        }
    }, [])

    const handleImagemChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (form.imagem_preview && form.imagem_file) URL.revokeObjectURL(form.imagem_preview)
        setForm({...form, imagem_file: file, imagem_preview: URL.createObjectURL(file), useImagem: true })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!podeGerir) { toast.error(`Cargo ${cargoAtual} sem permissão`); return }
        setLoading(true)
        try {
            const finalBarCode = form.codigo_barras || generateBarCode()
            const finalQR = form.codigo_qr || generateQRCode(form.codigo)
            const isServicoOuKit = form.tipo === 'servico' || form.tipo === 'kit'

            if (isEditing) {
                const fd = new FormData()
                fd.append('nome', form.nome)
                fd.append('codigo', form.codigo)
                fd.append('preco_venda', String(parseAO(form.preco_venda)))
                fd.append('tipo', form.tipo)
                fd.append('unidade', form.unidade)
                fd.append('ativo', String(form.ativo))
                fd.append('controlar_stock', String(isServicoOuKit? false : form.controlar_stock))
                fd.append('stock_atual', String(isServicoOuKit? 0 : parseAO(form.stock_atual)))
                fd.append('stock_minimo', String(parseAO(form.stock_minimo)))
                fd.append('preco_custo', String(parseAO(form.preco_custo)))
                fd.append('iva', isServicoOuKit? '0' : (form.useIva? String(parseAO(form.iva)) : '0'))
                fd.append('tem_iva', String(isServicoOuKit? false : form.useIva))
                fd.append('codigo_barras', finalBarCode)
                fd.append('codigo_qr', finalQR)
                if (form.useCategoria && form.categoria) fd.append('categoria', form.categoria)
                if (form.useDescricao && form.descricao) fd.append('descricao', form.descricao)
                if (form.usePeso && form.peso) fd.append('peso', String(parseAO(form.peso)))
                if (form.imagem_file) fd.append('imagem', form.imagem_file)

                await api.put(`/api/produtos/${produto!.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                toast.success('Produto atualizado!')
            } else {
                const formData = new FormData()
                formData.append('nome', form.nome);
                formData.append('codigo', form.codigo)
                formData.append('preco_venda', String(parseAO(form.preco_venda) || 0));
                formData.append('tipo', form.tipo)
                formData.append('unidade', form.unidade);
                formData.append('ativo', String(form.ativo))
                formData.append('controlar_stock', String(isServicoOuKit? false : form.controlar_stock));
                formData.append('stock_atual', String(isServicoOuKit? 0 : (parseAO(form.stock_atual) || 0)))
                formData.append('stock_minimo', String(parseAO(form.stock_minimo) || 0));
                formData.append('preco_custo', String(parseAO(form.preco_custo) || 0))
                formData.append('codigo_barras', finalBarCode);
                formData.append('codigo_qr', finalQR)
                if (form.useDescricao && form.descricao) formData.append('descricao', form.descricao)
                if (form.useCategoria && form.categoria) formData.append('categoria', form.categoria)
                if (form.usePeso && form.peso) formData.append('peso', String(parseAO(form.peso)))
                formData.append('iva', isServicoOuKit? '0' : (form.useIva? String(parseAO(form.iva) || 0) : '0'));
                formData.append('tem_iva', String(isServicoOuKit? false : form.useIva))
                if (form.useImagem && form.imagem_file) formData.append('imagem', form.imagem_file)
                await api.post('/api/produtos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                toast.success('Produto criado com sucesso!')
            }
            onSuccess(); onClose(); if (!isEditing) resetForm()
        } catch (err: any) {
            const detail = err.response?.data?.detail
            let message = 'Erro ao salvar produto'
            if (Array.isArray(detail)) message = detail.map((e: any) => `${e.loc?.[1] || ''}: ${e.msg}`).join(', ')
            else if (typeof detail === 'string') message = detail
            toast.error(message)
        } finally { setLoading(false) }
    }

    const resetForm = () => {
        if (form.imagem_preview && form.imagem_file) URL.revokeObjectURL(form.imagem_preview)
        setForm({
            nome: '', codigo: '', preco_venda: '', tipo: 'produto', useImagem: false, imagem_file: null, imagem_preview: '',
            codigo_barras: generateBarCode(), codigo_qr: generateQRCode(''),
            useDescricao: false, descricao: '', useCategoria: false, categoria: '',
            usePeso: false, peso: '', preco_custo: '0', iva: '14', useIva: true, unidade: 'UN', ativo: true, controlar_stock: true, stock_atual: '0', stock_minimo: '0'
        })
        setTab('obrigatorio')
    }

    if (!open) return null

    if (!podeGerir) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60" onClick={onClose}/>
                <div className="relative bg-white rounded-[24px] p-8 text-center max-w-[360px] w-full">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold">Sem permissão</p>
                    <p className="text-[13px] text-gray-500 mt-1">Cargo <b>{cargoAtual.toUpperCase()}</b> não pode gerir produtos. Só ADMIN e FINANCEIRA.</p>
                    <button onClick={onClose} className="mt-4 w-full h-11 bg-black text-white rounded-full">Fechar</button>
                </div>
            </div>
        )
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition outline-none"
    const checkBoxCard = "flex items-center gap-2 h-[44px] px-2 border border-gray-200 rounded-[12px] cursor-pointer bg-white hover:bg-gray-50 transition shrink-0 w-full"

    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full transition border shrink-0 ${tab === id? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    )

    const isServicoOuKit = form.tipo === 'servico' || form.tipo === 'kit'

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[560px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#FFF7ED] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <Package className="w-4 h-4 text-[#ff7a00]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{cargoAtual.toUpperCase()} • {podeGerir? 'EDITAR' : 'SEM ACESSO'}</span>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isEditing? 'Atualizar Produto' : 'Novo Produto'}</h3>
                    <div className="flex gap-[2px] mt-4 overflow-x-auto no-scrollbar">
                        <TabButton id="obrigatorio" label="Obrigatórios" icon={Info} />
                        <TabButton id="opcional" label="Opcionais" icon={Settings} />
                        <TabButton id="estoque" label="Estoque" icon={Package} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                    <style>{`
                   .no-scrollbar::-webkit-scrollbar { display: none; }
                   .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>

                    {tab === 'obrigatorio' && (
                        <div className="flex flex-col gap-[2px]">
                            <div className="grid grid-cols-2 gap-[2px]">
                                <input required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value })} placeholder="Nome *" className={inputClass} />
                                <input required value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value })} placeholder="Código *" className={inputClass} />
                                <input type="text" inputMode="decimal" required value={form.preco_venda} onChange={(e) => setForm({...form, preco_venda: e.target.value })} placeholder="Preço Venda *" className={inputClass} />
                                <CustomSelect value={form.tipo} onChange={handleTipoChange} placeholder="Tipo" options={TIPOS} />
                                <CustomSelect value={form.unidade} onChange={(v) => setForm({...form, unidade: v })} placeholder="Unidade" options={UNIDADES.map(u => ({ value: u, label: u }))} />
                                <label className={checkBoxCard}>
                                    <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                    <span className="text-[12px] text-black font-medium">Ativo</span>
                                </label>
                            </div>

                            <label className={checkBoxCard}>
                                <input type="checkbox" checked={form.useImagem} onChange={(e) => setForm({...form, useImagem: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">Adicionar Imagem</span>
                            </label>
                            {form.useImagem && (
                                <div className="border border-gray-200 rounded-[12px] p-3 bg-white mt-[2px]">
                                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImagemChange} className="hidden" />
                                    {form.imagem_preview? (
                                        <div className="flex items-center gap-3">
                                            <img src={form.imagem_preview} alt="Preview" className="w-16 h-16 object-cover rounded-[12px] border" />
                                            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[12px] text-[#0095ff] font-medium">Trocar imagem</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-2 text-gray-500 hover:text-[#0095ff] py-2">
                                            <Upload className="w-6 h-6" /><span className="text-[12px] text-black">Selecionar imagem</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'opcional' && (
                        <div className="flex flex-col gap-[2px]">
                            <label className={checkBoxCard}>
                                <input type="checkbox" checked={form.useDescricao} onChange={(e) => setForm({...form, useDescricao: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">Descrição</span>
                            </label>
                            {form.useDescricao && <textarea value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value })} rows={3} placeholder="Descrição" className="w-full bg-white border border-gray-200 rounded-[12px] px-2 py-2 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff]" />}

                            <label className={checkBoxCard}>
                                <input type="checkbox" checked={form.useCategoria} onChange={(e) => setForm({...form, useCategoria: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">Categoria</span>
                            </label>
                            {form.useCategoria && <input value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value })} placeholder="Categoria - Ex: Bebidas" className={inputClass} />}

                            <label className={checkBoxCard}>
                                <input type="checkbox" checked={form.usePeso} onChange={(e) => setForm({...form, usePeso: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">Peso</span>
                            </label>
                            {form.usePeso && <input type="text" inputMode="decimal" value={form.peso} onChange={(e) => setForm({...form, peso: e.target.value })} placeholder="Peso em KG" className={inputClass} />}

                            <div className="grid grid-cols-2 gap-[2px]">
                                <input type="text" inputMode="decimal" value={form.preco_custo} onChange={(e) => setForm({...form, preco_custo: e.target.value })} placeholder="Preço Custo" className={inputClass} />
                                <label className={`${checkBoxCard} ${isServicoOuKit? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
                                    <input type="checkbox" checked={isServicoOuKit? false : form.useIva} disabled={isServicoOuKit} onChange={(e) => setForm({...form, useIva: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                    <span className="text-[12px] text-black font-medium">{isServicoOuKit? 'Sem IVA (Serviço/Kit)' : 'Aplicar IVA'}</span>
                                </label>
                            </div>
                            {form.useIva &&!isServicoOuKit && <input type="text" inputMode="decimal" value={form.iva} onChange={(e) => setForm({...form, iva: e.target.value })} placeholder="IVA %" className={inputClass} />}
                            {isServicoOuKit && <p className="text-[11px] text-gray-500 bg-yellow-50 p-2.5 rounded-[10px] border border-yellow-200">Serviços e Kits não cobram IVA automaticamente.</p>}
                        </div>
                    )}

                    {tab === 'estoque' && (
                        <div className="flex flex-col gap-[2px]">
                            <label className={`${checkBoxCard} ${isServicoOuKit? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
                                <input type="checkbox" checked={isServicoOuKit? false : form.controlar_stock} disabled={isServicoOuKit} onChange={(e) => setForm({...form, controlar_stock: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">{isServicoOuKit? 'Sem controle (Serviço/Kit)' : 'Controlar Estoque'}</span>
                            </label>
                            {form.controlar_stock &&!isServicoOuKit? (
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <input type="text" inputMode="decimal" value={form.stock_atual} onChange={(e) => setForm({...form, stock_atual: e.target.value })} placeholder="Qtd em Stock (atual)" className={inputClass} />
                                    <input type="text" inputMode="decimal" value={form.stock_minimo} onChange={(e) => setForm({...form, stock_minimo: e.target.value })} placeholder="Estoque Mínimo" className={inputClass} />
                                </div>
                            ) : (
                                <p className="text-[12px] text-gray-500 bg-gray-50 p-3 rounded-[12px] border border-gray-200">
                                    {isServicoOuKit? 'Serviços e Kits são sempre ilimitados, sem baixa de estoque.' : 'Produto sem controle de estoque = Ilimitado.'}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                    <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                    <button type="submit" disabled={loading ||!podeGerir} onClick={handleSubmit as any} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                        {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
