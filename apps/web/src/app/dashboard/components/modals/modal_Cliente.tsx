import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

interface Cliente {
  id: string
  nome: string
  nif: string
  email: string | null
  telefone: string | null
  endereco: string | null
  cidade: string | null
  provincia: string | null
}

interface Props {
    open: boolean
    cliente: Cliente | null // <- RECEBE CLIENTE
    onClose: () => void
    onSuccess: () => void
}

export default function ClienteModal({ open, cliente, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        nome: '',
        nif: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        provincia: ''
    })

    const isEditMode = !!cliente // <- SE TEM CLIENTE É EDIÇÃO

    useEffect(() => {
        if (cliente) {
            setForm({
                nome: cliente.nome || '',
                nif: cliente.nif || '',
                email: cliente.email || '',
                telefone: cliente.telefone || '',
                endereco: cliente.endereco || '',
                cidade: cliente.cidade || '',
                provincia: cliente.provincia || ''
            })
        } else {
            setForm({ nome: '', nif: '', email: '', telefone: '', endereco: '', cidade: '', provincia: '' })
        }
    }, [cliente, open])

    if (!open) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (isEditMode && cliente) {
                await api.put(`/api/clientes/${cliente.id}`, form) // <- PUT
                toast.success('Cliente atualizado com sucesso', { position: 'top-center' })
            } else {
                await api.post('/api/clientes/', form) // <- POST
                toast.success('Cliente criado com sucesso', { position: 'top-center' })
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao salvar cliente', { position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Editar Cliente' : 'Novo Cliente'} {/* <- TÍTULO DINAMICO */}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                            <input name="nome" value={form.nome} onChange={handleChange} required
                                className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">NIF *</label>
                            <input name="nif" value={form.nif} onChange={handleChange} required
                                className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input name="email" type="email" value={form.email} onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                            <input name="telefone" value={form.telefone} onChange={handleChange}
                                className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                            <input name="cidade" value={form.cidade} onChange={handleChange}
                                className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                        <input name="endereco" value={form.endereco} onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Província</label>
                        <input name="provincia" value={form.provincia} onChange={handleChange}
                            className="w-full border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose}
                            className="px-4 py-2 rounded-lg border-gray-300 text-gray-700 hover:bg-gray-50">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                            {loading? 'Salvando...' : isEditMode ? 'Atualizar' : 'Salvar'} {/* <- BTN DINAMICO */}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
