import { useEffect, useState } from 'react'
import { X, Check, User, FileText, Mail, Phone, MapPin, Building2 } from 'lucide-react'
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
    cliente: Cliente | null
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

    const isEditMode =!!cliente

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
                await api.put(`/api/clientes/${cliente.id}`, form)
                toast.success('Cliente atualizado com sucesso', { position: 'top-center' })
            } else {
                await api.post('/api/clientes/', form)
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

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-[24px] w-full max-w-[520px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <User className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-2 shrink-0">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isEditMode? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1 leading-relaxed">
                        {isEditMode? 'Atualize os dados do cliente.' : 'Preencha os dados para criar novo cliente.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3 overflow-auto flex-1">
                    <div className="flex flex-col gap-[2px]">
                        <div className="grid grid-cols-2 gap-[2px]">
                            <div className="relative">
                                <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome *"
                                    className={inputClass} />
                            </div>
                            <div className="relative">
                                <input name="nif" value={form.nif} onChange={handleChange} required placeholder="NIF *"
                                    className={inputClass} />
                            </div>
                        </div>

                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email"
                            className={inputClass} />

                        <div className="grid grid-cols-2 gap-[2px]">
                            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone"
                                className={inputClass} />
                            <input name="cidade" value={form.cidade} onChange={handleChange} placeholder="Cidade"
                                className={inputClass} />
                        </div>

                        <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Endereço"
                            className={inputClass} />

                        <input name="provincia" value={form.provincia} onChange={handleChange} placeholder="Província"
                            className={inputClass} />
                    </div>

                    <div className="flex gap-3 mt-8">
                        <button type="button" onClick={onClose}
                            className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                            <X className="w-4 h-4" />
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
