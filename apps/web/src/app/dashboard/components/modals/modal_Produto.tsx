import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { X, Package, Settings, Info, Upload } from 'lucide-react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

interface Props {
    open: boolean
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

export default function ProdutoModal({ open, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<Tab>('obrigatorio')
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    useEffect(() => {
        return () => {
            if (form.imagem_preview) URL.revokeObjectURL(form.imagem_preview)
        }
    }, [form.imagem_preview])

    const handleImagemChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (form.imagem_preview) URL.revokeObjectURL(form.imagem_preview)
        setForm({ ...form, imagem_file: file, imagem_preview: URL.createObjectURL(file) })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
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

            if (form.useIva) {
                formData.append('iva', form.iva || '0')
                formData.append('tem_iva', 'true')
            } else {
                formData.append('iva', '0')
                formData.append('tem_iva', 'false')
            }

            if (form.useImagem && form.imagem_file) {
                formData.append('imagem', form.imagem_file)
            }

            // <- CORREÇÃO PRINCIPAL: Forçar o header
            await api.post('/api/produtos', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })

            toast.success('Produto criado com sucesso!')
            onSuccess()
            onClose()
            resetForm()
        } catch (err: any) {
            const detail = err.response?.data?.detail
            let message = 'Erro ao criar produto'
            if (Array.isArray(detail)) {
                message = detail.map((e: any) => `${e.loc?.[1] || ''}: ${e.msg}`).join(', ')
            } else if (typeof detail === 'string') {
                message = detail
            }
            toast.error(message)
            console.error('Erro completo:', err.response?.data) // <- Adicionei pra debugar
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        if (form.imagem_preview) URL.revokeObjectURL(form.imagem_preview)
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
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${tab === id ? 'bg-orange-100 text-orange-600' : 'text-gray-600 hover:bg-gray-100'}`}>
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
                    <h3 className="text-lg font-semibold">Novo Produto</h3>
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
                                <div><label className="text-sm font-medium text-gray-700">Nome *</label><input required value={form.nome} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, nome: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <div><label className="text-sm font-medium text-gray-700">Código *</label><input required value={form.codigo} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, codigo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <div><label className="text-sm font-medium text-gray-700">Preço Venda *</label><input type="number" step="0.01" required value={form.preco_venda} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, preco_venda: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <div><label className="text-sm font-medium text-gray-700">Tipo</label><select value={form.tipo} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, tipo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full">{TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                                <div><label className="text-sm font-medium text-gray-700">Unidade</label><select value={form.unidade} onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({ ...form, unidade: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full">{UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                                <div className="flex items-center gap-2 mt-6"><input type="checkbox" checked={form.ativo} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, ativo: e.target.checked })} className="w-4 h-4 accent-orange-600" /><label className="text-sm font-medium text-gray-700">Produto Ativo</label></div>
                            </div>
                            <ToggleField label="Adicionar Imagem do Produto" checked={form.useImagem} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, useImagem: e.target.checked })}>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                                    <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImagemChange} className="hidden" />
                                    {form.imagem_preview ? (<div className="flex items-center gap-4"><img src={form.imagem_preview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" /><div><p className="text-sm font-medium">{form.imagem_file?.name}</p><button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-orange-600">Trocar imagem</button></div></div>) : (<button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-2 text-gray-500 hover:text-orange-600"><Upload className="w-8 h-8" /><span className="text-sm">Clique para selecionar imagem</span></button>)}
                                </div>
                            </ToggleField>
                        </div>
                    )}
                    {tab === 'opcional' && (
                        <div className="space-y-4">
                            <ToggleField label="Código de Barras" checked={form.useCodigoBarras} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, useCodigoBarras: e.target.checked })}><input value={form.codigo_barras} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, codigo_barras: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Código QR" checked={form.useCodigoQR} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, useCodigoQR: e.target.checked })}><input value={form.codigo_qr} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, codigo_qr: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Descrição" checked={form.useDescricao} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, useDescricao: e.target.checked })}><textarea value={form.descricao} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setForm({ ...form, descricao: e.target.value })} rows={3} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Categoria" checked={form.useCategoria} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, useCategoria: e.target.checked })}><input value={form.categoria} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Bebidas, Eletrônicos" className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <ToggleField label="Peso" checked={form.usePeso} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, usePeso: e.target.checked })}><input type="number" step="0.01" value={form.peso} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, peso: e.target.value })} placeholder="Em KG" className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div><label className="text-sm font-medium text-gray-700">Preço Custo</label><input type="number" step="0.01" value={form.preco_custo} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, preco_custo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /></div>
                                <ToggleField label="Aplicar IVA" checked={form.useIva} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, useIva: e.target.checked })}><input type="number" step="0.1" value={form.iva} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, iva: e.target.value })} className="border rounded-lg px-3 py-2 w-full" /></ToggleField>
                            </div>
                        </div>
                    )}
                    {tab === 'estoque' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2"><input type="checkbox" checked={form.controlar_stock} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, controlar_stock: e.target.checked })} className="w-4 h-4 accent-orange-600" /><label className="text-sm font-medium text-gray-700">Controlar Estoque</label></div>
                            {form.controlar_stock && (<div><label className="text-sm font-medium text-gray-700">Estoque Mínimo</label><input type="number" step="0.01" value={form.stock_minimo} onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, stock_minimo: e.target.value })} className="mt-1 border rounded-lg px-3 py-2 w-full" /><p className="text-xs text-gray-500 mt-1">O estoque atual começa em 0. Será atualizado pelas vendas/compras.</p></div>)}
                            {!form.controlar_stock && (<p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">Para serviços ou produtos sem controle de estoque. O campo stock será ignorado.</p>)}
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-4 border-t">
                        <div className="flex gap-2">{tab !== 'obrigatorio' && <button type="button" onClick={() => setTab(tab === 'estoque' ? 'opcional' : 'obrigatorio')} className="px-4 py-2 border rounded-lg">Voltar</button>}{tab !== 'estoque' && <button type="button" onClick={() => setTab(tab === 'obrigatorio' ? 'opcional' : 'estoque')} className="px-4 py-2 border rounded-lg">Avançar</button>}</div>
                        <div className="flex gap-2"><button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancelar</button><button type="submit" disabled={loading} className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar Produto'}</button></div>
                    </div>
                </form>
            </div>
        </div>
    )
}
