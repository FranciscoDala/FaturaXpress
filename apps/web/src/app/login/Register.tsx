import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Phone, MapPin, FileText, ArrowRight, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

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
    const postRes = await fetch(URL, {
        method: 'POST',
        body: form,
        headers: { 'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest' }
    })
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
                    if (e.message?.includes('Failed to fetch') || e.message?.includes('CORS')) {
                        toast.error("AGT bloqueada por CORS no navegador. Tente novamente ou use rede angolana.", { position: 'top-center' })
                        throw e
                    }
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
        if (!nifValidated ||!agtData) {
            toast.error("Valide o NIF na AGT primeiro", { position: 'top-center' })
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName: agtData.nome, nif, emailCompany, phone, address, city, province, password, nome_agt_validado: agtData.nome })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Erro ao registrar")
            toast.success(data.message, { position: 'top-center' })
            setTimeout(() => navigate('/login'), 1200)
        } catch (err: any) { toast.error(err.message, { position: 'top-center' }) }
        finally { setLoading(false) }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputWithIcon = `${inputClass} pl-10`

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[400px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border shadow-sm ${nifValidated? 'text-green-700 bg-green-50 border-green-200' : 'text-[#0095ff] bg-white'}`}>
                        <ShieldCheck className="w-3.5 h-3.5" /> {nifValidated? `NIF: ${nif.toUpperCase()}` : "Validação AGT"}
                    </div>
                </div>
                <div className="px-6 pt-5 pb-3 shrink-0">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">Registre sua empresa</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">{nifValidated? "Complete os dados de contacto" : "Passo 1 - Valide o NIF na AGT"}</p>
                </div>
                <div className="px-6 pb-6 flex flex-col gap-[5px]">
                    {!nifValidated? (
                        <div className="flex flex-col gap-[5px]">
                            <div className="relative">
                                <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={inputWithIcon} placeholder="NIF 5002063956 *" />
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            </div>
                            <button type="button" onClick={handleValidarNif} disabled={validatingNif ||!nif} className="w-full h-[44px] rounded-[12px] bg-[#0095ff] text-white font-semibold text-[13.5px] hover:bg-[#0085e6] flex items-center justify-center disabled:opacity-60 transition">
                                {validatingNif? <Loader2 className="w-5 h-5 animate-spin" /> : "Consultar NIF"}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-green-50 border border-green-300 rounded-[12px] px-4 py-3 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4 text-white" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[13px] font-bold text-green-800 leading-tight">Nif validado.Activo</span>
                                    <span className="text-[11px] text-green-700">NIF verificado na AGT com sucesso</span>
                                </div>
                            </div>
                            {agtData && (
                                <div className="bg-[#f0f7ff] border border-blue-200 rounded-[12px] p-4 text-[12.5px] leading-relaxed text-gray-800">
                                    <div className="flex items-center gap-1.5 mb-2"><ShieldCheck className="w-4 h-4 text-[#0095ff]" /><span className="font-semibold text-gray-900">Dados da AGT</span></div>
                                    <div><span className="text-gray-500">NIF:</span> <b>{nif.toUpperCase()}</b></div>
                                    <div><span className="text-gray-500">Nome:</span> <b>{agtData.nome}</b></div>
                                    <div><span className="text-gray-500">Tipo:</span> {agtData.tipo || "COLECTIVO - Empresa"}</div>
                                    <div><span className="text-gray-500">Estado:</span> <span className="text-green-700 font-semibold">{agtData.estado || "Activo"}</span></div>
                                    <div><span className="text-gray-500">Inadimplente:</span> {agtData.inadimplente || "Não"}</div>
                                    <div><span className="text-gray-500">Regime de IVA:</span> {agtData.regime_iva || "Regime Geral (Factura IVA)"}</div>
                                    <div><span className="text-gray-500">Residente Fiscal:</span> {agtData.residente_fiscal || "Sim"}</div>
                                </div>
                            )}
                            <form id="form-register" onSubmit={handleRegister} className="flex flex-col gap-[5px]">
                                <div className="relative"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputWithIcon} placeholder="Telefone *" /><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="relative"><input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputWithIcon} placeholder="email@empresa.com *" /><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="relative"><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputWithIcon} placeholder="Rua, Bairro *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="grid grid-cols-2 gap-[5px]">
                                    <div className="relative"><input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputWithIcon} placeholder="Cidade *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                    <div className="relative"><input type="text" value={province} onChange={(e) => setProvince(e.target.value)} required className={inputWithIcon} placeholder="Província *" /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                </div>
                                <div className="relative group">
                                    <input type={showPassword? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className={`${inputWithIcon} pr-10`} placeholder="Crie uma palavra-passe forte *" />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-[11px] text-gray-500">{showPassword? "Ocultar" : "Ver"}</button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
                <div className="bg-white border-t border-gray-100 p-4 px-6">
                    {nifValidated? (
                        <button form="form-register" type="submit" disabled={loading} onClick={handleRegister} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 transition">
                            {loading? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Registrar Empresa</span> <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    ) : null}
                    <p className="text-center text-[13px] text-gray-600 mt-[5px]">Já tem conta? <Link to="/login" className="text-[#0095ff] font-semibold hover:underline">Fazer login</Link></p>
                </div>
            </div>
        </div>
    )
}
