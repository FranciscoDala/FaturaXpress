import { useEffect, useState, useRef } from 'react'
import { X, Check, User, MapPin, ChevronDown } from 'lucide-react'
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

const PROVINCIAS = [
    "Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cubango", "Cuanza-Norte", "Cuanza-Sul",
    "Cunene", "Huambo", "Huíla", "Icolo e Bengo", "Luanda", "Lunda-Norte", "Lunda-Sul",
    "Malanje", "Moxico", "Moxico Leste", "Namibe", "Uíge", "Zaire"
]

const MUNICIPIOS: Record<string, string[]> = {
    "Bengo": ["Dande", "Ambriz", "Bula Atumba", "Dembos", "Nambuangongo", "Pango Aluquém"],
    "Benguela": ["Benguela", "Lobito", "Baía Farta", "Balombo", "Bocoio", "Caimbambo", "Catumbela", "Chongorói", "Cubal", "Ganda"],
    "Bié": ["Kuito", "Andulo", "Camacupa", "Catabola", "Chinguar", "Chitembo", "Cuemba", "Cunhinga", "Nharea"],
    "Cabinda": ["Cabinda", "Belize", "Buco-Zau", "Cacongo"],
    "Cuando": ["Mavinga", "Cuito Cuanavale", "Dirico", "Rivungo"],
    "Cubango": ["Menongue", "Calai", "Cuangar", "Cuchi", "Cuito Cuanavale", "Mavinga"],
    "Cuanza-Norte": ["Cazengo", "Ambaca", "Banga", "Bolongongo", "Cambambe", "Golungo Alto", "Gonguembo", "Lucala", "Quiculungo", "Samba Caju"],
    "Cuanza-Sul": ["Sumbe", "Amboim", "Cassongue", "Cela", "Conda", "Ebo", "Libolo", "Mussende", "Porto Amboim", "Quibala", "Quilenda", "Seles"],
    "Cunene": ["Ondjiva", "Cahama", "Cuanhama", "Curoca", "Cuvelai", "Namacunde", "Ombadja"],
    "Huambo": ["Huambo", "Bailundo", "Caála", "Catchiungo", "Chicala-Choloanga", "Chinjenje", "Ecunha", "Londuimbali", "Longonjo", "Mungo", "Ucuma"],
    "Huíla": ["Lubango", "Caconda", "Cacula", "Caluquembe", "Chibia", "Chicomba", "Chipindo", "Cuvango", "Humpata", "Jamba", "Matala", "Quilengues", "Quipungo"],
    "Icolo e Bengo": ["Catete", "Bom Jesus", "Cabiri", "Caculo Cahango", "Calomboloca"],
    "Luanda": ["Luanda", "Belas", "Cacuaco", "Cazenga", "Kilamba Kiaxi", "Talatona", "Viana", "Kilamba"],
    "Lunda-Norte": ["Dundo", "Cambulo", "Capenda-Camulemba", "Caungula", "Cuango", "Cuilo", "Lubalo", "Lucapa", "Xá-Muteba"],
    "Lunda-Sul": ["Muangueji", "Cassai-Sul", "Cassengo", "Luma-Cassai", "Saurimo", "Cacolo", "Dala", "Muconda"],
    "Malanje": ["Malanje", "Cacuso", "Cahombo", "Calandula", "Cambundi-Catembo", "Cangandala", "Caombo", "Cuaba Nzoji", "Cunda-Dia-Baze", "Luquembo", "Marimba", "Massango", "Mucari", "Quela", "Quirima"],
    "Moxico": ["Luena", "Alto Zambeze", "Bundas", "Camanongue", "Léua", "Luau", "Luchazes"],
    "Moxico Leste": ["Cazombo", "Lago Dilolo", "Lumbala Nguimbo", "Luau"],
    "Namibe": ["Moçâmedes", "Bibala", "Camucuio", "Tômbwa", "Virei"],
    "Uíge": ["Uíge", "Alto Cauale", "Ambuila", "Bembe", "Buengas", "Bungo", "Damba", "Milunga", "Mucaba", "Negage", "Puri", "Quimbele", "Quitexe", "Sanza Pombo", "Songo", "Zombo"],
    "Zaire": ["Mbanza Kongo", "Cuimba", "Nóqui", "Nzeto", "Soyo", "Tomboco"]
}

function CustomSelect({ value, options, onChange, placeholder, disabled }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string, disabled?: boolean }) {
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
            <button type="button" disabled={disabled} onClick={() =>!disabled && setOpen(!open)} className={`w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition ${disabled? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''}`}>
                <span className={`flex items-center gap-2 ${selected? 'text-black' : 'text-black/60'}`}>
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selected? selected.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
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

export default function ClienteModal({ open, cliente, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        nome: '', nif: '', email: '', telefone: '', endereco: '', cidade: '', provincia: ''
    })

    const isEditMode =!!cliente
    const municipiosDisponiveis = form.provincia? (MUNICIPIOS[form.provincia] || []) : []

    useEffect(() => {
        if (cliente) {
            setForm({
                nome: cliente.nome || '', nif: cliente.nif || '', email: cliente.email || '',
                telefone: cliente.telefone || '', endereco: cliente.endereco || '',
                cidade: cliente.cidade || '', provincia: cliente.provincia || ''
            })
        } else {
            setForm({ nome: '', nif: '', email: '', telefone: '', endereco: '', cidade: '', provincia: '' })
        }
    }, [cliente, open])

    if (!open) return null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({...form, [e.target.name]: e.target.value })
    }

    const handleProvinceChange = (prov: string) => {
        setForm(prev => ({...prev, provincia: prov, cidade: '' }))
    }

    const handleCityChange = (cidade: string) => {
        setForm(prev => ({...prev, cidade }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (isEditMode && cliente) {
                // NAO ENVIA NOME E NIF SE ESTA TRAVADO
                const payload = {
                    email: form.email,
                    telefone: form.telefone,
                    endereco: form.endereco,
                    cidade: form.cidade,
                    provincia: form.provincia
                }
                await api.put(`/api/clientes/${cliente.id}`, payload)
                toast.success('Cliente atualizado com sucesso', { description: `${cliente.nome} atualizado.`, position: 'top-center' })
            } else {
                await api.post('/api/clientes/', form)
                toast.success('Cliente criado com sucesso', { description: `${form.nome} criado. Clientes não contam no limite de plano.`, position: 'top-center' })
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao salvar cliente', { description: 'Verifique NIF duplicado.', position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputDisabledClass = "w-full h-[44px] bg-gray-100 border border-gray-200 rounded-[12px] px-2 text-[13.5px] text-gray-500 placeholder:text-black/60 focus:outline-none cursor-not-allowed opacity-80"

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="relative bg-white rounded-[24px] w-full max-w-[520px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><User className="w-4 h-4 text-[#0095ff]" /></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
                </div>
                <div className="px-6 pt-5 pb-2 shrink-0">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isEditMode? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1 leading-relaxed">
                        {isEditMode? 'Nome e NIF não podem ser alterados após criação.' : 'Preencha os dados para criar novo cliente. Clientes são ilimitados.'}
                    </p>
                </div>
                <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3 overflow-auto flex-1 no-scrollbar">
                    <div className="flex flex-col gap-[2px]">
                        <div className="grid grid-cols-2 gap-[2px]">
                            <input
                                name="nome"
                                value={form.nome}
                                onChange={handleChange}
                                required
                                placeholder="Nome *"
                                disabled={isEditMode}
                                className={isEditMode? inputDisabledClass : inputClass}
                            />
                            <input
                                name="nif"
                                value={form.nif}
                                onChange={handleChange}
                                required
                                placeholder="NIF *"
                                disabled={isEditMode}
                                className={isEditMode? inputDisabledClass : inputClass}
                            />
                        </div>
                        {isEditMode && (
                            <p className="text-[11px] text-gray-400 px-1 mt-1">🔒 Nome e NIF travados para proteger o SAFT e faturas já emitidas</p>
                        )}
                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className={inputClass} />
                        <div className="grid grid-cols-2 gap-[2px]">
                            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone" className={inputClass} />
                            <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Endereço" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-[2px]">
                            <CustomSelect
                                value={form.provincia}
                                onChange={handleProvinceChange}
                                placeholder="Província"
                                options={PROVINCIAS.map(p => ({ value: p, label: p }))}
                            />
                            <CustomSelect
                                value={form.cidade}
                                onChange={handleCityChange}
                                placeholder={form.provincia? "Município" : "Município"}
                                options={municipiosDisponiveis.map(m => ({ value: m, label: m }))}
                                disabled={!form.provincia}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"><X className="w-4 h-4" /></button>
                        <button type="submit" disabled={loading} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">{loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
