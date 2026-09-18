import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FileText, Lock, ArrowRight, Eye, EyeOff, AlertTriangle, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

export default function LoginPage() {
    const [nif, setNif] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [agtBlock, setAgtBlock] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setAgtBlock(null)
        try {
            const nifLimpo = nif.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nif: nifLimpo, password })
            })
            const data = await res.json()

            if (!res.ok) {
                if (res.status === 403) {
                    setAgtBlock(data.detail || "NIF Inactivo na AGT")
                    throw new Error(data.detail)
                }
                if (res.status === 429) {
                    throw new Error(data.detail || "Muitas tentativas, aguarde")
                }
                throw new Error(data.detail || "Credenciais inválidas")
            }

            localStorage.setItem("access_token", data.access_token)
            localStorage.setItem("company_id", data.company_id)
            localStorage.setItem("company_name", data.company_name)
            toast.success("Login realizado com sucesso!", { position: 'top-center' })
            setTimeout(() => navigate('/app/dashboard'), 500)
        } catch (err: any) {
            if (!agtBlock) {
                toast.error(err.message, { position: 'top-center' })
            } else {
                toast.error(err.message, { position: 'top-center' })
            }
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[400px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100">

                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="h-7 px-3 rounded-full bg-white border border-blue-200 shadow-sm flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-[#0095ff] animate-pulse" />
                        <span className="text-[11px] font-semibold text-[#0095ff] tracking-wide">Login</span>
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">FT-Xpress</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">Insere seus dados, para iniciar sessão</p>
                </div>

                {agtBlock && (
                    <div className="mx-6 mb-[5px] p-3 rounded-[12px] bg-red-50 border border-red-200 flex gap-2.5 items-start">
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-[13px] font-semibold text-red-800 leading-tight">Acesso bloqueado pela AGT</p>
                            <p className="text-[12px] text-red-700 mt-1 leading-snug">{agtBlock}</p>
                            <p className="text-[11px] text-red-600/80 mt-2">Regularize seu NIF no portal da AGT e contacte suporte.</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleLogin} className="px-6 pb-6 flex flex-col gap-[5px]">
                    <div className="relative">
                        <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={`${inputClass} pl-10`} placeholder="NIF" disabled={loading} />
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>

                    <div className="relative group">
                        <input
                            type={showPassword? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={`${inputClass} pl-10 pr-10`}
                            placeholder="Senha"
                            disabled={loading}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#0095ff] transition" />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition"
                            tabIndex={-1}
                        >
                            {showPassword? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 px-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[11px] text-gray-500 leading-tight">O acesso é validado pelo estado do NIF na AGT. NIFs inactivos não podem aceder.</p>
                    </div>

                    <div className="mt-[5px]">
                        <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                            {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>

                    <p className="text-center text-[13px] text-gray-600 mt-4">
                        Não tem conta? <Link to="/register" className="text-[#0095ff] font-semibold hover:underline">Registra-se</Link>
                    </p>
                </form>
            </div>
        </div>
    )
}
