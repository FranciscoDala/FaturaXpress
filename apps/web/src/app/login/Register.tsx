import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Phone, MapPin, FileText, ArrowRight, ShieldCheck, Loader2, CheckCircle, AlertTriangle, ChevronDown, Check } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

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
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    const selected = options.find(o => o.value === value)
    return (
        <div ref={ref} className="relative w-full">
            <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} className={`w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition ${disabled ? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''}`}>
                <span className={`flex items-center gap-2 ${selected ? 'text-black' : 'text-black/40'}`}>
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {options.map(o => (
                        <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${value === o.value ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-gray-700'}`}>
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
    const viewState = vsMatch ? vsMatch[1] : ''
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
    const html = cdataMatch ? cdataMatch[1] : postText
    if (!html.includes('taxPayerNidId') && !html.includes('taxpayer')) throw new Error('NIF não encontrado na AGT')
    const extract = (label: string) => {
        const m = html.match(new RegExp(`${label}:\\s*<\\/label>\\s*<div[^>]*>\\s*<label[^>]*>([^<]+)<\\/label>`, 'i'))
        return m ? m[1].trim() : undefined
    }
    const nome = extract('Nome')
    if (!nome) throw new Error('NIF não encontrado na AGT')
    return {
        nome_agt: nome.toUpperCase(),
        tipo: extract('Tipo'),
        estado: extract('Estado'),
        inadimplente: extract('Inadimplente'),
        regime_iva: extract('Regime de IVA'),
        residente_fiscal: html.toLowerCase().includes('residente fiscal') ? 'Sim' : undefined
    }
}

export default function Register() {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()
    const [nifValidated, setNifValidated] = useState(false)
    const [validatingNif, setValidatingNif] = useState(false)
    const [agtData, setAgtData] = useState<{ nome: string, tipo?: string, estado?: string, inadimplente?: string, regime_iva?: string, residente_fiscal?: string, source?: string } | null>(null)
    const [nif, setNif] = useState('')
    const [emailCompany, setEmailCompany] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [password, setPassword] = useState('')

    const municipiosDisponiveis = province ? (MUNICIPIOS[province] || []) : []

    const handleProvinceChange = (prov: string) => {
        setProvince(prov)
        setCity('') // reseta cidade ao trocar província
    }

    const handleValidarNif = async () => {
        const nifClean = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (!nifClean || nifClean.length < 9) {
            toast.error("Digite NIF ex: 5002063956", { position: 'top-center' })
            return
        }
        setValidatingNif(true)
        try {
            const res = await fetch(`${API_URL}/auth/validar-nif`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nif: nifClean })
            })
            const data = await res.json()
            if (res.ok && data.valid && data.nome_agt) {
                setAgtData({ nome: data.nome_agt, tipo: data.tipo, estado: data.estado, inadimplente: data.inadimplente, regime_iva: data.regime_iva, residente_fiscal: data.residente_fiscal, source: data.source })
                setNifValidated(true)
                toast.success(`NIF validado: ${data.nome_agt}`, { position: 'top-center' })
                return
            }
            if (data.estado === "AGT_Offline") {
                toast.loading("AGT offline no servidor, tentando validar no seu navegador...", { position: 'top-center' })
                try {
                    const direto = await validarDiretoNoNavegador(nifClean)
                    setAgtData({ nome: direto.nome_agt, tipo: direto.tipo, estado: direto.estado || "Activo", inadimplente: direto.inadimplente, regime_iva: direto.regime_iva, residente_fiscal: direto.residente_fiscal, source: "browser" })
                    setNifValidated(true)
                    toast.dismiss()
                    toast.success(`Nif validado.Activo - ${direto.nome_agt}`, { position: 'top-center' })
                    return
                } catch (e: any) {
                    toast.dismiss()
                    throw e
                }
            }
            if (!res.ok) throw new Error(data.detail || "NIF inválido ou não encontrado na AGT")
        } catch (err: any) {
            toast.error(err.message || "NIF não encontrado na AGT", { position: 'top-center' })
            setNifValidated(false)
            setAgtData(null)
        } finally { setValidatingNif(false) }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nifValidated || !agtData) {
            toast.error("Valide o NIF na AGT primeiro", { position: 'top-center' })
            return
        }
        if (!phone || !emailCompany || !address || !city || !province || !password) {
            toast.error("Preencha todos os campos obrigatórios", { position: 'top-center' })
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName: agtData.nome,
                    nif,
                    emailCompany,
                    phone,
                    address,
                    city,
                    province,
                    password,
                    nome_agt_validado: agtData.nome,
                    tipo_agt: agtData.tipo,
                    estado_agt: agtData.estado,
                    inadimplente: agtData.inadimplente,
                    regime_iva: agtData.regime_iva,
                    residente_fiscal: agtData.residente_fiscal,
                })
            })
            const data = await res.json()
            if (!res.ok) {
                let msg = data.detail || "Erro ao registrar"
                if (Array.isArray(data.detail)) {
                    const first = data.detail[0]
                    if (first.loc?.includes('password') || first.loc?.includes('Password')) {
                        msg = "Senha fraca. Use letras e números (mín. 8 caracteres)"
                    } else {
                        msg = first.msg?.replace('Field required', 'Campo obrigatório') || "Preencha todos os campos"
                    }
                } else if (typeof data.detail === 'string') {
                    if (data.detail.toLowerCase().includes('password') || data.detail.toLowerCase().includes('senha')) {
                        msg = "Senha fraca. Use letras e números (mín. 8 caracteres)"
                    } else if (data.detail.includes('NIF ou Email')) {
                        msg = "Este NIF ou email já está cadastrado"
                    } else {
                        msg = data.detail
                    }
                }
                throw new Error(msg)
            }
            toast.success(data.message, { position: 'top-center' })
            setTimeout(() => navigate('/login'), 1200)
        } catch (err: any) {
            toast.error(err.message || "Erro ao registrar", { position: 'top-center' })
        }
        finally { setLoading(false) }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputWithIcon = `${inputClass} pl-10`

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[400px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border shadow-sm ${nifValidated ? 'text-green-700 bg-green-50 border-green-300' : 'text-[#0095ff] bg-white border-gray-200'}`}>
                        {nifValidated ? <CheckCircle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {nifValidated ? `NIF: ${nif.toUpperCase()}` : "Validação AGT"}
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">Registre sua empresa</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">{nifValidated ? "Preencha todos os campos, para terminar o registro" : "Adiciona o seu NIF para prosseguir com o registro"}</p>
                    {nifValidated && (
                        <div className="mt-[8px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 w-fit">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span className="text-[11px] font-semibold text-amber-700">NIF: validado pela Administração Geral Tributaría (AGT)</span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                    <style>{`
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                    `}</style>

                    <div className="flex flex-col gap-[5px]">
                        {!nifValidated ? (
                            <div className="flex flex-col gap-[5px]">
                                <div className="relative">
                                    <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={inputWithIcon} placeholder="NIF nº:5002063956" />
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                                <button type="button" onClick={handleValidarNif} disabled={validatingNif || !nif} className="w-full h-[44px] rounded-[12px] bg-[#0095ff] text-white font-semibold text-[13.5px] hover:bg-[#0085e6] flex items-center justify-center disabled:opacity-60 transition">
                                    {validatingNif ? <Loader2 className="w-5 h-5 animate-spin" /> : "Consultar NIF"}
                                </button>
                            </div>
                        ) : (
                            <>
                                {agtData && (
                                    <div className="bg-green-50 border border-green-200 rounded-[12px] p-3.5 text-[12.5px] leading-[1.6]">
                                        <div><span className="text-green-800/70 font-medium">Nome:</span> <span className="font-bold text-green-900 uppercase">{agtData.nome}</span></div>
                                        <div><span className="text-green-800/70 font-medium">Tipo:</span> <span className="font-semibold text-green-800">{agtData.tipo || "SINGULAR"}</span></div>
                                        <div><span className="text-green-800/70 font-medium">Estado:</span> <span className="font-bold text-green-700">{agtData.estado || "Activo"}</span></div>
                                    </div>
                                )}
                                <form id="form-register" onSubmit={handleRegister} className="flex flex-col gap-[5px] mt-[5px]">
                                    <input type="hidden" value={agtData?.nome || ''} readOnly />
                                    <input type="hidden" value={agtData?.tipo || ''} readOnly />
                                    <input type="hidden" value={agtData?.estado || ''} readOnly />
                                    <input type="hidden" value={agtData?.inadimplente || ''} readOnly />
                                    <input type="hidden" value={agtData?.regime_iva || ''} readOnly />
                                    <input type="hidden" value={agtData?.residente_fiscal || ''} readOnly />
                                    <input type="hidden" value={nif} readOnly />

                                    <div className="relative"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputWithIcon} placeholder="Telefone *" /><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                    <div className="relative"><input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputWithIcon} placeholder="email@empresa.com *" /><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                    <div className="relative"><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputWithIcon} placeholder="Rua, Bairro *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>

                                    {/* ORDEM TROCAD PROVINCIA PRIMEIRO DEPOIS CIDADE - SELECT CARD */}
                                    <div className="grid grid-cols-2 gap-[5px]">
                                        <CustomSelect
                                            value={province}
                                            onChange={handleProvinceChange}
                                            placeholder="Província"
                                            options={PROVINCIAS.map(p => ({ value: p, label: p }))}
                                        />
                                        <CustomSelect
                                            value={city}
                                            onChange={(v) => setCity(v)}
                                            placeholder={province ? "Município" : "Município"}
                                            options={municipiosDisponiveis.map(m => ({ value: m, label: m }))}
                                            disabled={!province}
                                        />
                                    </div>

                                    <div className="relative group">
                                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className={`${inputWithIcon} pr-10`} placeholder="Crie uma palavra-passe forte *" />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-[11px] text-gray-500">{showPassword ? "Ocultar" : "Ver"}</button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>

                <div className="shrink-0 bg-white border-t border-gray-100 p-4 px-6">
                    {nifValidated ? (
                        <button form="form-register" type="submit" disabled={loading} onClick={handleRegister} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 transition">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Registrar Empresa</span> <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    ) : null}
                    <p className="text-center text-[13px] text-gray-600 mt-4">Já tem conta? <Link to="/login" className="text-[#0095ff] font-semibold hover:underline">Fazer login</Link></p>
                </div>
            </div>
        </div>
    )
}
