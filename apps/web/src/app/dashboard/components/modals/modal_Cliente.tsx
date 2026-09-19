import { useEffect, useState, useRef } from 'react'
import { X, Check, User, MapPin, ChevronDown, FileText, Loader2, AlertTriangle, CheckCircle, ShieldCheck, ArrowRight, Phone, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

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

async function validarDiretoNoNavegador(nif: string): Promise<{ nome_agt: string, tipo?: string, estado?: string, inadimplente?: string, regime_iva?: string, residente_fiscal?: string }> {
    const clean = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    const URL = 'https://portaldocontribuinte.minfin.gov.ao/consultar-nif-do-contribuinte'
    const getRes = await fetch(URL, { method: 'GET', credentials: 'include' })
    const getText = await getRes.text()
    const vsMatch = getText.match(/name="javax\.faces\.ViewState"[^>]*value="([^"]+)"/)
    const viewState = vsMatch? vsMatch[1] : ''
    const form = new URLSearchParams()
    form.append('javax.faces.partial.ajax', 'true')
    form.append('javax.faces.source', 'j_id_2x:j_id_34')
    form.append('javax.faces.partial.execute', 'j_id_2x')
    form.append('javax.faces.partial.render', 'showpanelNIF')
    form.append('j_id_2x:j_id_34', 'j_id_2x:j_id_34')
    form.append('j_id_2x', 'j_id_2x')
    form.append('j_id_2x:txtNIFNumber', clean)
    form.append('j_id_2x_SUBMIT', '1')
    form.append('javax.faces.ViewState', viewState)
    const postRes = await fetch(URL, { method: 'POST', body: form, headers: { 'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest' } })
    const postText = await postRes.text()
    const cdataMatch = postText.match(/<update id="showpanelNIF"><!\[CDATA\[(.*?)\]\]><\/update>/s)
    const html = cdataMatch? cdataMatch[1] : postText
    if (!html.includes('taxPayerNidId') &&!html.includes('taxpayer')) throw new Error('NIF não encontrado na AGT')
    const extract = (label: string) => {
        const m = html.match(new RegExp(`${label}:\\s*<\\/label>\\s*<div[^>]*>\\s*<label[^>]*>([^<]+)<\\/label>`, 'i'))
        return m? m[1].trim() : undefined
    }
    const nome = extract('Nome')
    if (!nome) throw new Error('NIF não encontrado na AGT')
    return {
        nome_agt: nome.toUpperCase(),
        tipo: extract('Tipo'),
        estado: extract('Estado'),
        inadimplente: extract('Inadimplente'),
        regime_iva: extract('Regime de IVA'),
        residente_fiscal: html.toLowerCase().includes('residente fiscal')? 'Sim' : undefined
    }
}

export default function ClienteModal({ open, cliente, onClose, onSuccess }: Props) {
    const [loading, setLoading] = useState(false)
    const [validatingNif, setValidatingNif] = useState(false)
    const [nifValidated, setNifValidated] = useState(false)
    const [nifExists, setNifExists] = useState(false)
    const [clienteExistente, setClienteExistente] = useState<Cliente | null>(null)
    const [agtData, setAgtData] = useState<{ nome: string, tipo?: string, estado?: string, inadimplente?: string, regime_iva?: string } | null>(null)
    const [agtOffline, setAgtOffline] = useState(false)
    const [retryCount, setRetryCount] = useState(0)

    const [form, setForm] = useState({
        nome: '', nif: '', email: '', telefone: '', endereco: '', cidade: '', provincia: ''
    })

    const isEditMode =!!cliente
    const municipiosDisponiveis = form.provincia? (MUNICIPIOS[form.provincia] || []) : []
    const isNaoActivo = agtData?.estado &&!agtData.estado.toLowerCase().includes('activ')

    useEffect(() => {
        if (cliente) {
            setForm({
                nome: cliente.nome || '', nif: cliente.nif || '', email: cliente.email || '',
                telefone: cliente.telefone || '', endereco: cliente.endereco || '',
                cidade: cliente.cidade || '', provincia: cliente.provincia || ''
            })
            setNifValidated(true)
            setNifExists(true)
            setAgtData({ nome: cliente.nome, estado: 'Activo' })
            setAgtOffline(false)
        } else {
            setForm({ nome: '', nif: '', email: '', telefone: '', endereco: '', cidade: '', provincia: '' })
            setNifValidated(false)
            setNifExists(false)
            setClienteExistente(null)
            setAgtData(null)
            setAgtOffline(false)
            setRetryCount(0)
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
        setAgtOffline(false)
        try {
            const res = await fetch(`${API_URL}/auth/validar-nif`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nif: nifClean })
            })
            const data = await res.json()
            let agtResult: { nome_agt: string, tipo?: string, estado?: string, inadimplente?: string } | null = null

            if (res.ok && data.valid && data.nome_agt) {
                agtResult = data
            } else if (data.estado === "AGT_Offline") {
                toast.loading("AGT offline no servidor, tentando validar no seu navegador...", { position: 'top-center' })
                try {
                    const direto = await validarDiretoNoNavegador(nifClean)
                    agtResult = direto
                    toast.dismiss()
                    toast.success(`NIF validado: ${direto.nome_agt}`, { position: 'top-center' })
                } catch (e: any) {
                    toast.dismiss()
                    throw e
                }
            } else if (!res.ok) {
                throw new Error(data.detail || "NIF inválido ou não encontrado na AGT")
            }

            if (!agtResult) throw new Error("NIF não encontrado na AGT")

            setAgtData({ nome: agtResult.nome_agt, tipo: agtResult.tipo, estado: agtResult.estado, inadimplente: agtResult.inadimplente })
            setAgtOffline(false)
            setRetryCount(0)

            try {
                const localRes = await api.post('/api/clientes/validar-nif', { nif: nifClean })
                const localData = localRes.data
                if (localData.exists && localData.cliente) {
                    setNifExists(true)
                    setClienteExistente(localData.cliente)
                    setForm({
                        nome: localData.cliente.nome || agtResult.nome_agt,
                        nif: localData.cliente.nif || nifClean,
                        email: localData.cliente.email || '',
                        telefone: localData.cliente.telefone || '',
                        endereco: localData.cliente.endereco || '',
                        cidade: localData.cliente.cidade || '',
                        provincia: localData.cliente.provincia || ''
                    })
                    toast.success(`Cliente já existe: ${localData.cliente.nome}`, { position: 'top-center' })
                } else {
                    setNifExists(false)
                    setClienteExistente(null)
                    setForm(prev => ({...prev, nome: agtResult!.nome_agt, nif: nifClean }))
                    toast.success(`NIF validado: ${agtResult.nome_agt}`, { position: 'top-center' })
                }
            } catch {
                setNifExists(false)
                setForm(prev => ({...prev, nome: agtResult!.nome_agt, nif: nifClean }))
                toast.success(`NIF validado: ${agtResult.nome_agt}`, { position: 'top-center' })
            }

            setNifValidated(true)

        } catch (err: any) {
            const msg = err?.message || ''
            const isAgtOffline =
                msg.includes('Load failed') ||
                msg.includes('Failed to fetch') ||
                msg.includes('Service Unavailable') ||
                msg.includes('503') ||
                msg.includes('500') ||
                msg.toLowerCase().includes('network') ||
                msg.toLowerCase().includes('agt') ||
                err?.name === 'TypeError'

            if (isAgtOffline) {
                setAgtOffline(true)
                setRetryCount(prev => prev + 1)
                toast.error("Serviço da AGT indisponível", { position: 'top-center' })
            } else {
                setAgtOffline(false)
                toast.error(msg || "NIF não encontrado na AGT", { position: 'top-center' })
                setNifValidated(false)
                setAgtData(null)
            }
        } finally { setValidatingNif(false) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nifValidated &&!isEditMode) {
            toast.error("Valide o NIF na AGT primeiro", { position: 'top-center' })
            return
        }

        // VALIDACAO DOS INPUTS ABAIXO - igual register
        if (!form.email.trim()) {
            toast.error("Preencha o email do cliente", { position: 'top-center' })
            return
        }
        if (!form.telefone.trim()) {
            toast.error("Preencha o telefone do cliente", { position: 'top-center' })
            return
        }
        if (!form.endereco.trim()) {
            toast.error("Preencha o endereço do cliente", { position: 'top-center' })
            return
        }
        if (!form.provincia.trim()) {
            toast.error("Selecione a província", { position: 'top-center' })
            return
        }
        if (!form.cidade.trim()) {
            toast.error("Selecione o município", { position: 'top-center' })
            return
        }

        setLoading(true)
        try {
            if (isEditMode && cliente) {
                const payload = { email: form.email.trim(), telefone: form.telefone.trim(), endereco: form.endereco.trim(), cidade: form.cidade.trim(), provincia: form.provincia.trim() }
                await api.put(`/api/clientes/${cliente.id}`, payload)
                toast.success('Cliente atualizado', { position: 'top-center' })
            } else if (nifExists && clienteExistente) {
                const payload = { email: form.email.trim(), telefone: form.telefone.trim(), endereco: form.endereco.trim(), cidade: form.cidade.trim(), provincia: form.provincia.trim() }
                await api.put(`/api/clientes/${clienteExistente.id}`, payload)
                toast.success('Cliente atualizado', { position: 'top-center' })
            } else {
                const payload = {
                  nome: (agtData?.nome || form.nome).trim(),
                  nif: form.nif.trim(),
                  email: form.email.trim(),
                  telefone: form.telefone.trim(),
                  endereco: form.endereco.trim(),
                  cidade: form.cidade.trim(),
                  provincia: form.provincia.trim()
                }
                await api.post('/api/clientes/', payload)
                toast.success('Cliente criado com sucesso', { position: 'top-center' })
            }
            onSuccess()
            onClose()
        } catch (err: any) {
            // FIX TELA PRETA - nunca renderiza objeto
            const detail = err.response?.data?.detail
            let msg = 'Erro ao salvar cliente'
            if (Array.isArray(detail)) {
                msg = detail.map((d: any) => `${d.loc?.[1] || 'campo'}: ${d.msg}`).join(', ')
            } else if (typeof detail === 'string') {
                msg = detail
            } else if (detail?.msg) {
                msg = detail.msg
            }
            console.log('ERRO CLIENTE:', err.response?.data)
            toast.error(msg, { position: 'top-center' })
        } finally { setLoading(false) }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputWithIcon = `${inputClass} pl-10`

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            <div className="relative bg-white rounded-[24px] w-full max-w-[520px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><User className="w-4 h-4 text-[#0095ff]" /></div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border shadow-sm ${nifValidated? 'text-green-700 bg-green-50 border-green-300' : 'text-[#0095ff] bg-white border-gray-200'}`}>
                        {nifValidated? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {nifValidated? `NIF: ${form.nif.toUpperCase()}` : "Validação AGT"}
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isEditMode? 'Editar Cliente' : 'Novo Cliente'}</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1 leading-relaxed">
                        {isEditMode? 'Nome e NIF não podem ser alterados.' : nifValidated? (isNaoActivo? 'Cliente não activo - será fatura avulso' : nifExists? `Cliente já cadastrado: ${clienteExistente?.nome}` : 'Preencha os dados para criar') : 'Adiciona o NIF do cliente para ser validado no Contribuinte da Administração Geral Tributária!'}
                    </p>
                    {nifValidated && (
                        <div className={`mt-[8px] flex items-center gap-1.5 px-3 py-1.5 rounded-full border w-fit ${isNaoActivo? 'bg-red-50 border-red-200' : nifExists? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            {isNaoActivo? <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> : nifExists? <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                            <span className={`text-[11px] font-semibold ${isNaoActivo? 'text-red-700' : nifExists? 'text-amber-700' : 'text-green-700'}`}>
                                {isNaoActivo? 'Cliente não activo - fatura avulso' : nifExists? 'Cliente já existe' : `NIF validado pela AGT`}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto no-scrollbar px-6 py-4">
                    <div className="flex flex-col gap-[5px]">
                        {!nifValidated &&!isEditMode? (
                            <div className="flex flex-col gap-[5px]">
                                {agtOffline && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-3.5 text-[12.5px] leading-[1.6]">
                                        <div className="flex items-center gap-2 font-bold text-amber-800 mb-1">
                                            <AlertTriangle className="w-4 h-4" />
                                            Serviço da AGT indisponível
                                        </div>
                                        <p className="text-amber-700 text-[12px]">O portal da AGT está temporariamente em manutenção. Isso é normal e costuma voltar em alguns minutos. Por favor, tente novamente mais tarde.</p>
                                        {retryCount > 0 && <p className="text-[11px] text-amber-600 mt-2">Tentativa {retryCount} - NIF guardado: {form.nif.toUpperCase()}</p>}
                                    </div>
                                )}
                                <div className="relative">
                                    <input type="text" name="nif" value={form.nif} onChange={(e) => { handleChange(e); setAgtOffline(false) }} required className={inputWithIcon} placeholder="NIF nº:000000000" />
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        ) : (
                            <>
                                {agtData && (
                                    <div className={`${isNaoActivo? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} border rounded-[12px] p-3.5 text-[12.5px] leading-[1.6]`}>
                                        <div><span className={`${isNaoActivo? 'text-red-800/70' : 'text-green-800/70'} font-medium`}>Nome:</span> <span className={`font-bold uppercase ${isNaoActivo? 'text-red-900' : 'text-green-900'}`}>{agtData.nome}</span></div>
                                        <div><span className={`${isNaoActivo? 'text-red-800/70' : 'text-green-800/70'} font-medium`}>Tipo:</span> <span className={`font-semibold ${isNaoActivo? 'text-red-800' : 'text-green-800'}`}>{agtData.tipo || "SINGULAR"}</span></div>
                                        <div><span className={`${isNaoActivo? 'text-red-800/70' : 'text-green-800/70'} font-medium`}>Estado:</span> <span className={`font-bold ${isNaoActivo? 'text-red-700' : 'text-green-700'}`}>{agtData.estado || "Activo"}</span></div>
                                        {isNaoActivo && <div className="mt-2 text-[11px] font-semibold text-red-700">⚠️ Este cliente não está activo - fatura será avulso no SAFT</div>}
                                    </div>
                                )}
                                <form id="form-cliente" onSubmit={handleSubmit} className="flex flex-col gap-[5px] mt-[5px]">
                                    <input type="hidden" value={form.nif} readOnly />
                                    <input type="hidden" value={form.nome} readOnly />
                                    <div className="relative">
                                        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email *" className={inputWithIcon} />
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-[5px]">
                                        <div className="relative">
                                            <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone *" className={`${inputClass} pl-10`} />
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        </div>
                                        <div className="relative">
                                            <input name="endereco" value={form.endereco} onChange={handleChange} placeholder="Endereço *" className={`${inputClass} pl-10`} />
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-[5px]">
                                        <CustomSelect value={form.provincia} onChange={handleProvinceChange} placeholder="Província *" options={PROVINCIAS.map(p => ({ value: p, label: p }))} />
                                        <CustomSelect value={form.cidade} onChange={handleCityChange} placeholder={form.provincia? "Município *" : "Município *"} options={municipiosDisponiveis.map(m => ({ value: m, label: m }))} disabled={!form.provincia} />
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>

                {/* FOOTER COM MESMO BOTAO - 2 FUNCOES */}
                <div className="shrink-0 bg-white border-t border-gray-100 p-4 px-6 flex gap-3">
                    <button type="button" onClick={onClose} className="w-11 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={nifValidated? (e) => handleSubmit(e as any) : handleValidarNif}
                        disabled={validatingNif || loading || (!nifValidated &&!form.nif)}
                        className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-60 transition"
                    >
                        {validatingNif || loading? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : nifValidated? (
                            <Check className="w-5 h-5" />
                        ) : (
                            <>
                                <span>{agtOffline? "Tentar novamente" : "Consultar NIF"}</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
