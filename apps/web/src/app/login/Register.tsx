import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Phone, MapPin, FileText, ArrowRight, Eye, EyeOff, CheckCircle, ShieldCheck, Loader2, Globe } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

// JEITO 2 - Valida direto do navegador (IP de Angola fura WAF do Render)
async function validarDiretoNoNavegador(nif: string): Promise<{ nome_agt: string }> {
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

    const postRes = await fetch(URL, {
        method: 'POST',
        body: form,
        headers: { 'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest' }
    })
    const postText = await postRes.text()
    const cdataMatch = postText.match(/<update id="showpanelNIF"><!\[CDATA\[(.*?)\]\]><\/update>/s)
    const html = cdataMatch? cdataMatch[1] : postText

    if (!html.includes('taxPayerNidId') &&!html.includes('taxpayer')) {
        throw new Error('NIF não encontrado na AGT')
    }
    const nomeMatch = html.match(/Nome:\s*<\/label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)<\/label>/i)
    const nome = nomeMatch? nomeMatch[1].trim() : null
    if (!nome) throw new Error('NIF não encontrado na AGT')

    return { nome_agt: nome.toUpperCase() }
}

export default function Register() {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()

    const [nifValidated, setNifValidated] = useState(false)
    const [validatingNif, setValidatingNif] = useState(false)
    const [agtName, setAgtName] = useState<string | null>(null)
    const [agtEstado, setAgtEstado] = useState<string | null>(null)
    const [source, setSource] = useState<string | null>(null)

    const [companyName, setCompanyName] = useState('')
    const [nif, setNif] = useState('')
    const [emailCompany, setEmailCompany] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [password, setPassword] = useState('')

    const handleValidarNif = async () => {
        const nifClean = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (!nifClean || nifClean.length < 9) {
            toast.error("Digite NIF ex: 50020633956 ou 003614847LA037", { position: 'top-center' })
            return
        }
        setValidatingNif(true)
        try {
            // JEITO 1 - Backend (Render)
            const res = await fetch(`${API_URL}/auth/validar-nif`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nif: nifClean })
            })
            const data = await res.json()

            if (res.ok) {
                // Backend validou
                if (data.valid && data.nome_agt) {
                    setAgtName(data.nome_agt)
                    setAgtEstado(data.estado)
                    setSource(data.source)
                    setNifValidated(true)
                    setCompanyName(data.nome_agt)
                    toast.success(`Empresa: ${data.nome_agt} (AGT)`, { position: 'top-center' })
                    return
                }
                // Backend offline - tenta JEITO 2
                if (data.estado === "AGT_Offline") {
                    toast.loading("Servidor no exterior bloqueado, tentando validar direto do seu navegador...", { position: 'top-center' })
                    try {
                        const direto = await validarDiretoNoNavegador(nifClean)
                        setAgtName(direto.nome_agt)
                        setAgtEstado("Activo")
                        setSource("browser")
                        setNifValidated(true)
                        setCompanyName(direto.nome_agt)
                        toast.dismiss()
                        toast.success(`Validado no navegador: ${direto.nome_agt}`, { position: 'top-center' })
                        return
                    } catch (e: any) {
                        toast.dismiss()
                        // Se falhar por CORS, permite manual mas com aviso
                        if (e.message?.includes('Failed to fetch') || e.message?.includes('CORS')) {
                            setAgtName(null)
                            setAgtEstado("AGT_Offline")
                            setSource("offline-manual")
                            setNifValidated(true)
                            toast.warning("AGT offline no servidor. NIF com formato válido aceite - nome será verificado depois.", { position: 'top-center', duration: 5000 })
                            return
                        }
                        throw e
                    }
                }
            }

            // Se chegou aqui é erro real
            if (!res.ok) throw new Error(data.detail || "NIF inválido ou não encontrado na AGT")

        } catch (err: any) {
            toast.error(err.message || "NIF não encontrado na AGT", { position: 'top-center' })
            setNifValidated(false)
            setAgtName(null)
            setAgtEstado(null)
        } finally {
            setValidatingNif(false)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!nifValidated) {
            toast.error("Valide o NIF na AGT primeiro", { position: 'top-center' })
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companyName,
                    nif,
                    emailCompany,
                    phone,
                    address,
                    city,
                    province,
                    password,
                    nome_agt_validado: agtName || undefined
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Erro ao registrar")
            toast.success(data.message, { position: 'top-center' })
            setTimeout(() => navigate('/login'), 1200)
        } catch (err: any) {
            toast.error(err.message, { position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputWithIcon = `${inputClass} pl-10`

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[480px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 h-[92vh] flex flex-col">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0095ff] bg-white px-2.5 py-1 rounded-full border shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" /> {nifValidated? "NIF Verificado" : "Validação AGT"}
                    </div>
                </div>

                <div className="px-6 pt-4 pb-3 shrink-0 border-b border-gray-100">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">Registre sua empresa</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">
                        {nifValidated && agtName? `Empresa: ${agtName}` : nifValidated? "NIF validado - complete os dados" : "Passo 1 - Valide o NIF"}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4 pb-28">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                    <form id="form-register" onSubmit={handleRegister} className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={nif}
                                    onChange={(e) => { setNif(e.target.value); setNifValidated(false); setAgtName(null) }}
                                    required
                                    className={`${inputWithIcon} ${nifValidated? 'border-green-300 bg-green-50/50' : ''}`}
                                    placeholder="NIF 50020633956 ou 003614847LA037 *"
                                />
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                {nifValidated && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />}
                            </div>
                            <button
                                type="button"
                                onClick={handleValidarNif}
                                disabled={validatingNif ||!nif}
                                className={`h-[44px] w-full sm:w-auto px-5 rounded-[12px] font-semibold text-[13px] flex items-center justify-center gap-1.5 shrink-0 ${nifValidated? 'bg-green-600 text-white' : 'bg-[#0095ff] text-white hover:bg-[#0085e6]'} disabled:opacity-50`}
                            >
                                {validatingNif? <Loader2 className="w-4 h-4 animate-spin" /> : nifValidated? <CheckCircle className="w-4 h-4" /> : null}
                                {nifValidated? "Validado" : "Validar"}
                            </button>
                        </div>

                        {nifValidated && agtName && (
                            <div className="bg-green-50 border border-green-200 rounded-[12px] p-3 text-[12.5px] text-green-800 flex gap-2">
                                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div><b>{agtName}</b><br/>Estado: {agtEstado} • {nif.toUpperCase()} • via {source}</div>
                            </div>
                        )}

                        {nifValidated &&!agtName && agtEstado === "AGT_Offline" && (
                            <div className="bg-amber-50 border border-amber-200 rounded-[12px] p-3 text-[12.5px] text-amber-800 flex gap-2">
                                <Globe className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>AGT offline no servidor estrangeiro. Formato válido aceite. Digite o nome manualmente - será verificado depois.</div>
                            </div>
                        )}

                        {nifValidated && (
                            <>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        required
                                        className={`${inputWithIcon} ${agtName? 'bg-gray-100 border-green-200 text-gray-700 font-semibold' : ''}`}
                                        placeholder="Nome da Empresa Lda *"
                                        readOnly={!!agtName}
                                        title={agtName? "Nome vindo da AGT - não editável" : ""}
                                    />
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                                <div className="relative"><input type="tel" value={phone} onChange={(e)=>setPhone(e.target.value)} required className={inputWithIcon} placeholder="Telefone *" /><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="relative"><input type="email" value={emailCompany} onChange={(e)=>setEmailCompany(e.target.value)} required className={inputWithIcon} placeholder="email@empresa.com *" /><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="relative"><input type="text" value={address} onChange={(e)=>setAddress(e.target.value)} required className={inputWithIcon} placeholder="Rua, Bairro *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative"><input type="text" value={city} onChange={(e)=>setCity(e.target.value)} required className={inputWithIcon} placeholder="Cidade *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                    <div className="relative"><input type="text" value={province} onChange={(e)=>setProvince(e.target.value)} required className={inputWithIcon} placeholder="Província *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                </div>
                                <div className="relative group">
                                    <input type={showPassword? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} required className={`${inputWithIcon} pr-10`} placeholder="Crie uma palavra-passe forte *" />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"><Eye className={`h-4 w-4 ${showPassword?'hidden':'block'} text-gray-500`} /><EyeOff className={`h-4 w-4 ${showPassword?'block':'hidden'} text-gray-500`} /></button>
                                </div>
                            </>
                        )}
                    </form>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 px-6 shrink-0">
                    {nifValidated? (
                        <button form="form-register" type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 transition">
                            {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Registrar Empresa</span> <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    ) : (
                        <button disabled className="w-full h-11 rounded-full bg-gray-200 text-gray-500 font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                            Valide o NIF primeiro
                        </button>
                    )}
                    <p className="text-center text-[13px] text-gray-600 mt-3">
                        Já tem conta? <Link to="/login" className="text-[#0095ff] font-semibold hover:underline">Fazer login</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
