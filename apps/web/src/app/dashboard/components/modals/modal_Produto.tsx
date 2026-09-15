import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { X, Package, Settings, Info, Upload } from 'lucide-react'
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

export default function ProdutoModal({ open, produto, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<Tab>('obrigatorio')
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const isEditing =!!produto?.id

    const [form, setForm] = useState({
        nome: '', codigo: '', preco_venda: '', tipo: 'produto',
        useImagem: false, imagem_file: null as File | null, imagem_preview: '',
        useCodigoBarras: false, codigo_barras: '',
        useCodigoQR: false, codigo_qr: '',
        useDescricao: false, descricao: '',
        useCategoria: false, categoria: '',
        usePeso: false, peso: '',
        preco_custo: '0', iva: '14', useIva: true, unidade: 'UN', ativo: true,
        controlar_stock: true, stock_minimo: '0'
    })

    // CARREGA DADOS QUANDO É EDIÇÃO
    useEffect(() => {
        if (!open) return
        if (produto) {
            if (form.imagem_preview) URL.revokeObjectURL(form.imagem_preview)
            setForm({
                nome: produto.nome || '',
                codigo: produto.codigo || '',
                preco_venda: String(produto.preco_venda?? ''),
                tipo: produto.tipo || 'produto',
                useImagem:!!produto.imagem_url,
                imagem_file: null,
                imagem_preview: produto.imagem_url || '',
                useCodigoBarras:!!produto.codigo_barras,
                codigo_barras: produto.codigo_barras || '',
                useCodigoQR:!!produto.codigo_qr,
                codigo_qr: produto.codigo_qr || '',
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
            if (isEditing) {
                // EDIÇÃO -> JSON (seu router PUT espera JSON)
                const payload: any = {
                    nome: form.nome,
                    codigo: form.codigo,
                    preco_venda: parseFloat(form.preco_venda || '0'),
                    tipo: form.tipo,
                    unidade: form.unidade,
                    ativo: form.ativo,
                    controlar_stock: form.controlar_stock,
                    stock_minimo: parseFloat(form.stock_minimo || '0'),
                    preco_custo: parseFloat(form.preco_custo || '0'),
                    iva: form.useIva? parseFloat(form.iva || '0') : 0,
                    tem_iva: form.useIva,
                    categoria: form.useCategoria? form.categoria : null,
                    descricao: form.useDescricao? form.descricao : null,
                    codigo_barras: form.useCodigoBarras? form.codigo_barras : null,
                    codigo_qr: form.useCodigoQR? form.codigo_qr : null,
                    peso: form.usePeso? parseFloat(form.peso || '0') : null,
                }
                // Se trocou imagem, faz upload separado via FormData no POST de imagem?
                // Por enquanto mantem url antiga, ou envia arquivo se backend aceitar.
                // Se seu backend PUT aceitar multipart, troca por FormData aqui.
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
                // CRIAÇÃO -> FormData
                const formData = new FormData()
                formData.append('nome', form.nome)
                formData.append('codigo', form.codigo)
                formData.append('preco_venda', form.preco_venda || '0')
                formData.append('tipo', form.tipo)
                formData.append('unidade', form.unidade)
                formData.append('ativo', String(form.ativo))
                formData.append('controlar_stock', String(form.controlar_stock))
                formData.append('stock_atual', '0')
                formData.append('stock_minimo', form.stock_minimo || '0')
                formData.append('preco_custo', form.preco_custo || '0')
                if (form.useCodigoBarras && form.codigo_barras) formData.append('codigo_barras', form.codigo_barras)
                if (form.useCodigoQR && form.codigo_qr) formData.append('codigo_qr', form.codigo_qr)
                if (form.useDescricao && form.descricao) formData.append('descricao', form.descricao)
                if (form.useCategoria && form.categoria) formData.append('categoria', form.categoria)
                if (form.usePeso && form.peso) formData.append('peso', form.peso)
                formData.append('iva', form.useIva? form.iva || '0' : '0')
                formData.append('tem_iva', String(form.useIva))
                if (form.useImagem && form.imagem_file) formData.append('imagem', form.imagem_file)

                await api.post('/api/produtos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                toast.success('Produto criado com sucesso!')
            }
            onSuccess()
            onClose()
            if (!isEditing) resetForm()
        } catch (err: any) {
            const detail = err.response?.data?.detail
            let message = 'Erro ao salvar produto'
            if (Array.isArray(detail)) message = detail.map((e: any) => `${e.loc?.[1] || ''}: ${e.msg}`).join(', ')
            else if (typeof detail === 'string') message = detail
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        if (form.imagem_preview && form.imagem_file) URL.revokeObjectURL(form.imagem_preview)
        setForm({
            nome: '', codigo: '', preco_venda: '', tipo: 'produto',
            useImagem: false, imagem_file: null, imagem_preview: '',
            useCodigoBarras: false, codigo_barras: '',
            useCodigoQR: false, codigo_qr: '',
            useDescricao: false, descricao: '',
            useCategoria: false, categoria: '',
            usePeso: false, peso: '',
            preco_custo: '0', iva: '14', useIva: true, unidade: 'UN', ativo: true,
            controlar_stock: true, stock_minimo: '0'
        })
        setTab('obrigatorio')
    }

    if (!open) return null

    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${tab === id? 'bg-orange-100 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    )

    const ToggleField = ({ label, checked, onChange, children }: { label: string, checked: boolean, onChange: (e: ChangeEvent<HTMLInputElement>) => void, children: React.ReactNode }) => (
        <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 accent-orange-600" />
                <span className="text-sm font-medium text-gray-700">{label}</span>
            </label>
            {checked && <div className="pl-6">{children}</div>}
        </div>
    )

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold">{isEditing? 'Atualizar Produto' : 'Novo Produto'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-2 px-6 pt-4 border-b">
                    <TabButton id="obrigatorio" label="Obrigatórios" icon={Info} />
                    <TabButton id="opcional" label="Opcionais" icon={Settings} />
                    <TabButton id="estoque" label="Estoque" icon={Package} />
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {tab === 'obrigatorio' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-sm font-medium text-gray-700">Nome *</label><input required value={form.nome} onChange={(e) => setForm({...form, nome: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <div><label className="text-sm font-medium text-gray-700">Código *</label><input required value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <div><label className="text-sm font-medium text-gray-700">Preço Venda *</label><input type="number" step="0.01" required value={form.preco_venda} onChange={(e) => setForm({...form, preco_venda: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <div><label className="text-sm font-medium text-gray-700">Tipo</label><select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full">{TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                                <div><label className="text-sm font-medium text-gray-700">Unidade</label><select value={form.unidade} onChange={(e) => setForm({...form, unidade: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full">{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                                <div className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({...form, ativo: e.target.checked })} className="w-4 h-4 accent-orange-600" /><label className="text-sm font-medium text-gray-700">Produto Ativo</label></div>
                            </div>
                            <ToggleField label="Adicionar Imagem do Produto" checked={form.useImagem} onChange={(e) => setForm({...form, useImagem: e.target.checked })}>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImagemChange} className="hidden" />
                                    {form.imagem_preview? (
                                        <div className="flex items-center gap-4">
                                            <img src={form.imagem_preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                                            <div><p className="text-sm font-medium truncate max-w-[200px]">{form.imagem_file?.name || 'Imagem atual'}</p><button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-orange-600">Trocar imagem</button></div>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-2 text-gray-500 hover:text-orange-600"><Upload className="w-8 h-8" /><span className="text-sm">Clique para selecionar imagem</span></button>
                                    )}
                                </div>
                            </ToggleField>
                        </div>
                    )}
                    {tab === 'opcional' && (
                        <div className="space-y-4">
                            <ToggleField label="Código de Barras" checked={form.useCodigoBarras} onChange={(e) => setForm({...form, useCodigoBarras: e.target.checked })}><input value={form.codigo_barras} onChange={(e) => setForm({...form, codigo_barras: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Código QR" checked={form.useCodigoQR} onChange={(e) => setForm({...form, useCodigoQR: e.target.checked })}><input value={form.codigo_qr} onChange={(e) => setForm({...form, codigo_qr: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Descrição" checked={form.useDescricao} onChange={(e) => setForm({...form, useDescricao: e.target.checked })}><textarea value={form.descricao} onChange={(e) => setForm({...form, descricao: e.target.value })} rows={3} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Categoria" checked={form.useCategoria} onChange={(e) => setForm({...form, useCategoria: e.target.checked })}><input value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value })} placeholder="Ex: Bebidas, Eletrônicos" className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Peso" checked={form.usePeso} onChange={(e) => setForm({...form, usePeso: e.target.checked })}><input type="number" step="0.01" value={form.peso} onChange={(e) => setForm({...form, peso: e.target.value })} placeholder="Em KG" className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div><label className="text-sm font-medium text-gray-700">Preço Custo</label><input type="number" step="0.01" value={form.preco_custo} onChange={(e) => setForm({...form, preco_custo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <ToggleField label="Aplicar IVA" checked={form.useIva} onChange={(e) => setForm({...form, useIva: e.target.checked })}><input type="number" step="0.1" value={form.iva} onChange={(e) => setForm({...form, iva: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            </div>
                        </div>
                    )}
                    {tab === 'estoque' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2"><input type="checkbox" checked={form.controlar_stock} onChange={(e) => setForm({...form, controlar_stock: e.target.checked })} className="w-4 h-4 accent-orange-600" /><label className="text-sm font-medium text-gray-700">Controlar Estoque</label></div>
                            {form.controlar_stock && (<div><label className="text-sm font-medium text-gray-700">Estoque Mínimo</label><input type="number" step="0.01" value={form.stock_minimo} onChange={(e) => setForm({...form, stock_minimo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>)}
                            {!form.controlar_stock && (<p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">Para serviços ou produtos sem controle de estoque.</p>)}
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <div className="flex gap-2">{tab!== 'obrigatorio' && <button type="button" onClick={() => setTab(tab === 'estoque'? 'opcional' : 'obrigatorio')} className="px-4 py-2 border rounded-lg">Voltar</button>}{tab!== 'estoque' && <button type="button" onClick={() => setTab(tab === 'obrigatorio'? 'opcional' : 'estoque')} className="px-4 py-2 border rounded-lg">Avançar</button>}</div>
                        <div className="flex gap-2"><button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancelar</button><button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50">{loading? 'Salvando...' : isEditing? 'Atualizar' : 'Salvar Produto'}</button></div>
                    </div>
                </form>
            </div>
        </div>
    )
}
