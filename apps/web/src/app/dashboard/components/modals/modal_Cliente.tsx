import { useEffect, useState, useRef } from 'react'
import { X, Check, User, MapPin, ChevronDown, FileText, Loader2, AlertTriangle, CheckCircle, ShieldCheck, ArrowRight } from 'lucide-react'
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
    const [validatingNif, setValidatingNif] = useState(false)
    const [nifValidated, setNifValidated] = useState(false)
    const [nifExists, setNifExists] = useState(false)
    const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)

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
            setNifValidated(true)
            setNifExists(true)
            setClienteExistente(null)
        } else {
            setForm({ nome: '', nif: '', email: '', telefone: '', endereco: '', cidade: '', provincia: '' })
            setNifValidated(false)
            setNifExists(false)
            setClienteExistente(null)
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

    const handleValidarNif = async () => {
        const nifClean = form.nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (!nifClean || nifClean.length < 9) {
            toast.error("Digite NIF ex: 5002063956 ou 999999999", { position: 'top-center' })
            return
        }
        setValidatingNif(true)
        try {
            const res = await api.post('/api/clientes/validar-nif', { nif: nifClean })
            const data = res.data
            if (data.exists && data.cliente) {
                setNifExists(true)
                setNifValidated(true)
                setClienteExistente(data.cliente)
                setForm({
                    nome: data.cliente.nome || '',
                    nif: data.cliente.nif || nifClean,
                    email: data.cliente.email || '',
                    telefone: data.cliente.telefone || '',
                    endereco: data.cliente.endereco || '',
                    cidade: data.cliente.cidade || '',
                    provincia: data.cliente.provincia || ''
                })
                toast.success(`Cliente já existe: ${data.cliente.nome}`, { position: 'top-center' })
            } else {
                setNifExists(false)
                setNifValidated(true)
                setClienteExistente(null)
                setForm(prev => ({...prev, nif: data.nif || nifClean }))
                toast.success("NIF novo, preencha os dados", { position: 'top-center' })
            }
        } catch (err: any) {
            toast.error(err.response?.data?.detail || "Erro ao consultar NIF", { position: 'top-center' })
            setNifValidated(false)
        } finally {
            setValidatingNif(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nifValidated &&!isEditMode) {
            toast.error("Consulte o NIF primeiro", { position: 'top-center' })
            return
        }
        setLoading(true)
        try {
            if (isEditMode && cliente) {
                const payload = {
                    email: form.email,
                    telefone: form.telefone,
                    endereco: form.endereco,
                    cidade: form.cidade,
                    provincia: form.provincia
                }
                await api.put(`/api/clientes/${cliente.id}`, payload)
                toast.success('Cliente atualizado com sucesso', { description: `${cliente.nome} atualizado.`, position: 'top-center' })
            } else if (nifExists && clienteExistente) {
                const payload = {
                    email: form.email,
                    telefone: form.telefone,
                    endereco: form.endereco,
                    cidade: form.cidade,
                    provincia: form.provincia
                }
                await api.put(`/api/clientes/${clienteExistente.id}`, payload)
                toast.success('Cliente atualizado com sucesso', { description: `${clienteExistente.nome} atualizado.`, position: 'top-center' })
            } else {
                await api.post('/api/clientes/', form)
                toast.success('Cliente criado com sucesso', { description: `${form.nome} criado.`, position: 'top-center' })
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Erro ao salvar cliente', { position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputDisabledClass = "w-full h-[44px] bg-gray-100 border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-gray-500 placeholder:text-black/60 focus:outline-none cursor-not-allowed opacity-80"
    const inputWithIcon = `${inputClass} pl-10`

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
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border shadow-sm ${nifValidated? 'text-green-700 bg-green-50 border-green-300' : 'text-[#0095ff] bg-white border-gray-200'}`}>
                        {nifValidated? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {nifValidated? `NIF: ${form.nif.toUpperCase()}` : "Validação NIF"}
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isEditMode? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1 leading-relaxed">
                        {isEditMode? 'Nome e NIF não podem ser alterados.' : nifValidated? (nifExists? `Cliente já cadastrado: ${clienteExistente?.nome}` : 'Preencha os dados para criar novo cliente') : 'Adiciona o NIF do cliente para prosseguir'}
                    </p>
                    {nifValidated && (
                        <div className={`mt-[8px] flex items-center gap-1.5 px-3 py-1.5 rounded-full border w-fit ${nifExists? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            {nifExists? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                            <span className={`text-[11px] font-semibold ${nifExists? 'text-amber-700' : 'text-green-700'}`}>
                                {nifExists? 'Cliente já existe - pode atualizar' : `NIF validado: ${form.nif.toUpperCase()}`}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto no-scrollbar px-6 py-4">
                    <div className="flex flex-col gap-[5px]">
                        {!nifValidated &&!isEditMode? (
                            <div className="flex flex-col gap-[5px]">
                                <div className="relative">
                                    <input type="text" name="nif" value={form.nif} onChange={handleChange} required className={inputWithIcon} placeholder="NIF nº: 5002063956 ou 999999999" />
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        ) : (
                            <>
                                {nifValidated && (
                                    <div className="bg-green-50 border border-green-200 rounded-[12px] p-3.5 text-[12.5px] leading-[1.6] mb-2">
                                        <div><span className="text-green-800/70 font-medium">Nome:</span> <span className="font-bold text-green-900 uppercase">{form.nome || clienteExistente?.nome}</span></div>
                                        <div><span className="text-green-800/70 font-medium">NIF:</span> <span className="font-semibold text-green-800">{form.nif}</span></div>
                                        <div><span className="text-green-800/70 font-medium">Estado:</span> <span className="font-bold text-green-700">{nifExists? 'Já cadastrado' : 'Novo'}</span></div>
                                    </div>
                                )}
                                <form id="form-cliente" onSubmit={handleSubmit} className="flex flex-col gap-[5px]">
                                    <input type="hidden" value={form.nif} readOnly />
                                    <input type="hidden" value={form.nome} readOnly />

                                    {!nifExists &&!isEditMode && (
                                        <div className="relative">
                                            <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome do cliente *" className={inputWithIcon} />
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        </div>
                                    )}

                                    <div className="relative">
                                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className={inputWithIcon} />
                                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-[5px]">
                                        <div className="relative">
                                            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone" className={`${inputClass} pl-10`} />
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        </div>
                                        <div className="relative">
                                            <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Endereço" className={`${inputClass} pl-10`} />
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-[5px]">
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
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <div className="shrink-0 bg-white border-t border-gray-100 p-4 px-6">
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center shrink-0">
                            <X className="w-5 h-5" />
                        </button>
                        {!nifValidated &&!isEditMode? (
                            <button type="button" onClick={handleValidarNif} disabled={validatingNif ||!form.nif} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-60 transition">
                                {validatingNif? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Consultar NIF</span> <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        ) : (
                            <button form="form-cliente" type="submit" disabled={loading} onClick={handleSubmit} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 transition">
                                {loading? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>{isEditMode || nifExists? 'Atualizar Cliente' : 'Criar Cliente'}</span> <Check className="w-5 h-5" /></>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
