import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Phone, MapPin, FileText, ArrowRight, Eye, EyeOff, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

export default function Register() {
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const navigate = useNavigate()

    // NOVO - CONTROLE DE VALIDACAO
    const [nifValidated, setNifValidated] = useState(false)
    const [validatingNif, setValidatingNif] = useState(false)
    const [agtName, setAgtName] = useState<string | null>(null)
    const [agtEstado, setAgtEstado] = useState<string | null>(null)

    const [companyName, setCompanyName] = useState('')
    const [nif, setNif] = useState('')
    const [emailCompany, setEmailCompany] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [password, setPassword] = useState('')

    const handleValidarNif = async () => {
        if (!nif || nif.replace(/\D/g, '').length < 9) {
            toast.error("Digite um NIF válido com 9 ou 10 dígitos", { position: 'top-center' })
            return
        }
        setValidatingNif(true)
        try {
            const res = await fetch(`${API_URL}/auth/validar-nif`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nif })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "NIF inválido")

            setAgtName(data.nome_agt)
            setAgtEstado(data.estado)
            setNifValidated(true)

            // Se veio nome da AGT, usa ele e trava
            if (data.nome_agt) {
                setCompanyName(data.nome_agt)
            }

            if (data.estado === "AGT_Offline") {
                toast.warning("AGT offline, vamos verificar depois. Pode continuar.", { position: 'top-center' })
            } else {
                toast.success(`NIF Activo: ${data.nome_agt || 'Empresa verificada'}`, { position: 'top-center' })
            }

        } catch (err: any) {
            toast.error(err.message, { position: 'top-center' })
            setNifValidated(false)
            setAgtName(null)
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
                body: JSON.stringify({ companyName, nif, emailCompany, phone, address, city, province, password })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Erro ao registrar")
            toast.success(data.message, { position: 'top-center' })
            setCompanyName(''); setNif(''); setEmailCompany(''); setPhone('');
            setAddress(''); setCity(''); setProvince(''); setPassword('');
            setNifValidated(false); setAgtName(null)
            setTimeout(() => navigate('/login'), 1500)
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
            <div className="relative w-full max-w-[480px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 max-h-[92vh] flex flex-col">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#0095ff] bg-white px-2.5 py-1 rounded-full border shadow-sm">
                        <ShieldCheck className="w-3.5 h-3.5" /> {nifValidated? "NIF Verificado" : "Validação AGT"}
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">Registre sua empresa</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">
                        {nifValidated? `Empresa encontrada: ${agtName || companyName}` : "Passo 1 - Valide o NIF da empresa"}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                    <form onSubmit={handleRegister} className="flex flex-col gap-3">
                        {/* ETAPA 1 - NIF */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={nif}
                                    onChange={(e) => { setNif(e.target.value); setNifValidated(false); setAgtName(null) }}
                                    required
                                    className={`${inputWithIcon} ${nifValidated? 'border-green-300 bg-green-50/50' : ''}`}
                                    placeholder="NIF da empresa *"
                                    disabled={loading || validatingNif}
                                />
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                {nifValidated && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />}
                            </div>
                            <button
                                type="button"
                                onClick={handleValidarNif}
                                disabled={validatingNif ||!nif}
                                className={`h-[44px] px-4 rounded-[12px] font-semibold text-[13px] transition flex items-center gap-1.5 shrink-0 ${nifValidated? 'bg-green-600 text-white' : 'bg-[#0095ff] text-white hover:bg-[#0085e6]'} disabled:opacity-50`}
                            >
                                {validatingNif? <Loader2 className="w-4 h-4 animate-spin" /> : nifValidated? <CheckCircle className="w-4 h-4" /> : null}
                                {nifValidated? "Validado" : "Validar"}
                            </button>
                        </div>

                        {nifValidated && agtName && (
                            <div className="bg-green-50 border border-green-200 rounded-[12px] p-3 text-[12.5px] text-green-800 flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <div>
                                    <b className="block">{agtName}</b>
                                    <span>Estado: {agtEstado} na AGT • NIF: {nif}</span>
                                </div>
                            </div>
                        )}

                        {/* ETAPA 2 - SÓ LIBERA DEPOIS DE VALIDAR */}
                        {nifValidated && (
                            <>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        required
                                        className={`${inputWithIcon} ${agtName? 'bg-gray-50' : ''}`}
                                        placeholder="Nome da Empresa Lda *"
                                        disabled={loading ||!!agtName}
                                    />
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                </div>
                                <div className="relative"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputWithIcon} placeholder="Telefone *" disabled={loading} /><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="relative"><input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputWithIcon} placeholder="email@empresa.com *" disabled={loading} /><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="relative"><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputWithIcon} placeholder="Rua, Bairro *" disabled={loading} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative"><input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputWithIcon} placeholder="Cidade *" disabled={loading} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                    <div className="relative"><input type="text" value={province} onChange={(e) => setProvince(e.target.value)} required className={inputWithIcon} placeholder="Província *" disabled={loading} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                                </div>

                                <div className="relative group">
                                    <input
                                        type={showPassword? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className={`${inputWithIcon} pr-10`}
                                        placeholder="Crie uma palavra-passe forte *"
                                        disabled={loading}
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0095ff] transition" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition" tabIndex={-1}>
                                        {showPassword? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                                    </button>
                                </div>

                                <div className="mt-1">
                                    <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                                        {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                                    </button>
                                </div>
                            </>
                        )}

                        <p className="text-center text-[13px] text-gray-600 mt-1">
                            Já tem conta? <Link to="/login" className="text-[#0095ff] font-semibold hover:underline">Fazer login</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
