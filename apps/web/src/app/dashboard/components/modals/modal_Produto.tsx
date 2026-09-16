import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { X, Check, Package, Settings, Info, Upload, ChevronDown } from 'lucide-react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

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
    // EAN13 fake mas valido para salvar
    const base = `560${Date.now().toString().slice(-7)}${Math.floor(Math.random()*90+10)}`
    return base.slice(0,13)
}
function generateQRCode(codigo: string) {
    return `QR-${codigo || Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`
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

    const [form, setForm] = useState({
        nome: '', codigo: '', preco_venda: '', tipo: 'produto',
        useImagem: false, imagem_file: null as File | null, imagem_preview: '',
        codigo_barras: '', codigo_qr: '',
        useDescricao: false, descricao: '',
        useCategoria: false, categoria: '',
        usePeso: false, peso: '',
        preco_custo: '0', iva: '14', useIva: true, unidade: 'UN', ativo: true,
        controlar_stock: true, stock_minimo: '0'
    })

    useEffect(() => {
        if (!open) return
        if (produto) {
            if (form.imagem_preview && form.imagem_file) URL.revokeObjectURL(form.imagem_preview)
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
                iva: String(produto.iva?? '14'),
                useIva: produto.tem_iva?? true,
                unidade: produto.unidade || 'UN',
                ativo: produto.ativo?? true,
                controlar_stock: produto.controlar_stock?? true,
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
        setLoading(true)
        try {
            // garante geração automática se vazio
            const finalBarCode = form.codigo_barras || generateBarCode()
            const finalQR = form.codigo_qr || generateQRCode(form.codigo)

            if (isEditing) {
                const payload: any = {
                    nome: form.nome, codigo: form.codigo, preco_venda: parseFloat(form.preco_venda || '0'),
                    tipo: form.tipo, unidade: form.unidade, ativo: form.ativo, controlar_stock: form.controlar_stock,
                    stock_minimo: parseFloat(form.stock_minimo || '0'), preco_custo: parseFloat(form.preco_custo || '0'),
                    iva: form.useIva? parseFloat(form.iva || '0') : 0, tem_iva: form.useIva,
                    categoria: form.useCategoria? form.categoria : null, descricao: form.useDescricao? form.descricao : null,
                    codigo_barras: finalBarCode, codigo_qr: finalQR,
                    peso: form.usePeso? parseFloat(form.peso || '0') : null,
                }
                if (form.imagem_file) {
                    const fd = new FormData()
                    Object.entries(payload).forEach(([k,v]) => fd.append(k, v==null?'':String(v)))
                    fd.append('imagem', form.imagem_file)
                    await api.put(`/api/produtos/${produto!.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                } else {
                    await api.put(`/api/produtos/${produto!.id}`, payload)
                }
                toast.success('Produto atualizado!')
            } else {
                const formData = new FormData()
                formData.append('nome', form.nome); formData.append('codigo', form.codigo)
                formData.append('preco_venda', form.preco_venda || '0'); formData.append('tipo', form.tipo)
                formData.append('unidade', form.unidade); formData.append('ativo', String(form.ativo))
                formData.append('controlar_stock', String(form.controlar_stock)); formData.append('stock_atual', '0')
                formData.append('stock_minimo', form.stock_minimo || '0'); formData.append('preco_custo', form.preco_custo || '0')
                formData.append('codigo_barras', finalBarCode); formData.append('codigo_qr', finalQR)
                if (form.useDescricao && form.descricao) formData.append('descricao', form.descricao)
                if (form.useCategoria && form.categoria) formData.append('categoria', form.categoria)
                if (form.usePeso && form.peso) formData.append('peso', form.peso)
                formData.append('iva', form.useIva? form.iva || '0' : '0'); formData.append('tem_iva', String(form.useIva))
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
            usePeso: false, peso: '', preco_custo: '0', iva: '14', useIva: true, unidade: 'UN', ativo: true, controlar_stock: true, stock_minimo: '0'
        })
        setTab('obrigatorio')
    }

    if (!open) return null

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition outline-none"
    const checkBoxCard = "flex items-center gap-2 h-[44px] px-2 border border-gray-200 rounded-[12px] cursor-pointer bg-white hover:bg-gray-50 transition shrink-0 w-full"

    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full transition border shrink-0 ${tab === id? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[560px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* HEADER FIXO */}
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#FFF7ED] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <Package className="w-4 h-4 text-[#ff7a00]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isEditing? 'Atualizar Produto' : 'Novo Produto'}</h3>
                    <div className="flex gap-[2px] mt-4 overflow-x-auto no-scrollbar">
                        <TabButton id="obrigatorio" label="Obrigatórios" icon={Info} />
                        <TabButton id="opcional" label="Opcionais" icon={Settings} />
                        <TabButton id="estoque" label="Estoque" icon={Package} />
                    </div>
                </div>

                {/* CONTEUDO COM SCROLL INVISIVEL */}
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
                                <input type="number" step="0.01" required value={form.preco_venda} onChange={(e) => setForm({...form, preco_venda: e.target.value })} placeholder="Preço Venda *" className={inputClass} />
                                <CustomSelect value={form.tipo} onChange={(v) => setForm({...form, tipo: v })} placeholder="Tipo" options={TIPOS} />
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
                            {form.usePeso && <input type="number" step="0.01" value={form.peso} onChange={(e) => setForm({...form, peso: e.target.value })} placeholder="Peso em KG" className={inputClass} />}

                            <div className="grid grid-cols-2 gap-[2px]">
                                <input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({...form, preco_custo: e.target.value })} placeholder="Preço Custo" className={inputClass} />
                                <label className={checkBoxCard}>
                                    <input type="checkbox" checked={form.useIva} onChange={(e) => setForm({...form, useIva: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                    <span className="text-[12px] text-black font-medium">Aplicar IVA</span>
                                </label>
                            </div>
                            {form.useIva && <input type="number" step="0.1" value={form.iva} onChange={(e) => setForm({...form, iva: e.target.value })} placeholder="IVA %" className={inputClass} />}
                        </div>
                    )}

                    {tab === 'estoque' && (
                        <div className="flex flex-col gap-[2px]">
                            <label className={checkBoxCard}>
                                <input type="checkbox" checked={form.controlar_stock} onChange={(e) => setForm({...form, controlar_stock: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">Controlar Estoque</span>
                            </label>
                            {form.controlar_stock? (
                                <input type="number" step="0.01" value={form.stock_minimo} onChange={(e) => setForm({...form, stock_minimo: e.target.value })} placeholder="Estoque Mínimo" className={inputClass} />
                            ) : (
                                <p className="text-[12px] text-gray-500 bg-gray-50 p-3 rounded-[12px] border border-gray-200">Para serviços ou produtos sem controle de estoque.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER FIXO */}
                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                    <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                    <button type="submit" disabled={loading} onClick={handleSubmit as any} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                        {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
