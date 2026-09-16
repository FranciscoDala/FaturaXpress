import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FileText, Lock, Building2, Loader2, X, Check } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

export default function LoginPage() {
    const [nif, setNif] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nif, password })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Credenciais inválidas")
            localStorage.setItem("access_token", data.access_token)
            localStorage.setItem("company_id", data.company_id)
            localStorage.setItem("company_name", data.company_name)
            toast.success("Login realizado com sucesso!", { position: 'top-center' })
            setTimeout(() => navigate('/app/dashboard'), 500)
        } catch (err: any) {
            toast.error(err.message, { position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[400px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[#0095ff]" />
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">FaturaXpress</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">Entre com o NIF da empresa</p>
                </div>

                <form onSubmit={handleLogin} className="px-6 pb-6 flex flex-col gap-[2px]">
                    <div className="relative">
                        <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={`${inputClass} pl-10`} placeholder="NIF da empresa" disabled={loading} />
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <div className="relative">
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={`${inputClass} pl-10`} placeholder="Palavra-passe" disabled={loading} />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>

                    <div className="flex gap-[2px] mt-3">
                        <Link to="/register" className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition">
                            <X className="w-5 h-5 text-gray-600" />
                        </Link>
                        <button type="submit" disabled={loading} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                            {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
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
