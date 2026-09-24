import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FileText, Lock, ArrowRight, Eye, EyeOff, ShieldAlert, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

export default function LoginPage() {
    const [identificador, setIdentificador] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [agtBlock, setAgtBlock] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setAgtBlock(null)

        const idLimpo = identificador.trim().toUpperCase()
        const idAlfaNum = idLimpo.replace(/[^A-Z0-9]/g, '')

        try {
            // 1ª tentativa: EMPRESA (NIF)
            try {
                const resEmpresa = await fetch(`${API_URL}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nif: idAlfaNum, password })
                })
                const dataEmpresa = await resEmpresa.json()

                if (resEmpresa.ok) {
                    localStorage.setItem("access_token", dataEmpresa.access_token)
                    localStorage.setItem("company_id", dataEmpresa.company_id)
                    localStorage.setItem("company_name", dataEmpresa.company_name)
                    localStorage.setItem("login_tipo", "company")
                    localStorage.removeItem("funcionario")

                    // NOVO: Bem-vindo NOME DA EMPRESA
                    const nomeEmpresa = dataEmpresa.company_name || dataEmpresa.nome_fantasia || "Empresa"
                    toast.success(`Bem-vindo, ${nomeEmpresa}!`)
                    setTimeout(() => navigate('/app/dashboard'), 400)
                    return
                } else {
                    if (resEmpresa.status === 403) {
                        setAgtBlock(dataEmpresa.detail || "NIF Inactivo na AGT")
                        throw new Error(dataEmpresa.detail || "NIF Inactivo na AGT")
                    }
                    // se não for 403, não lança ainda, tenta como funcionário
                    if (resEmpresa.status !== 401 && resEmpresa.status !== 404) {
                        throw new Error(dataEmpresa.detail || "Credenciais inválidas")
                    }
                }
            } catch (err: any) {
                // Se foi bloqueio AGT, para aqui
                if (err.message?.toLowerCase().includes('agt') || agtBlock) throw err
                // senão continua pra tentar como funcionário
            }

            // 2ª tentativa: FUNCIONÁRIO (BI)
            const resFunc = await fetch(`${API_URL}/auth/login-funcionario`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ numero_bi: idLimpo, senha: password })
            })
            const dataFunc = await resFunc.json()

            if (!resFunc.ok) {
                throw new Error(dataFunc.detail || "NIF/BI ou senha inválidos")
            }

            // Login funcionário OK - não substitui empresa, só adiciona cargo
            localStorage.setItem("access_token", dataFunc.access_token)
            localStorage.setItem("company_id", dataFunc.company_id)
            localStorage.setItem("company_name", dataFunc.company_name)
            localStorage.setItem("login_tipo", "funcionario")
            localStorage.setItem("funcionario", JSON.stringify(dataFunc.funcionario))

            // Toast com nome do funcionário + empresa
            toast.success(`Bem-vindo, ${dataFunc.funcionario.nome}!`)
            setTimeout(() => navigate('/app/dashboard'), 400)

        } catch (err: any) {
            const msg = err.message || "Erro ao fazer login"
            if (!agtBlock) {
                toast.error(msg, { position: 'top-center' })
            } else {
                toast.error(agtBlock, { position: 'top-center' })
            }
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[400px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF]">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="h-7 px-3 rounded-full bg-white border border-blue-200 shadow-sm flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#0095ff] animate-pulse" />
                        <span className="text-[11px] font-semibold text-[#0095ff] tracking-wide">Login</span>
                    </div>
                </div>

                <div className="px-6 pt-4">
                    <h1 className="text-[18px] font-bold text-gray-900">FT-Xpress</h1>
                    <p className="text-[13px] text-gray-500 mt-1">Use NIF da empresa ou BI do funcionário</p>
                </div>

                {agtBlock && (
                    <div className="mx-6 mt-3 p-3 rounded-[12px] bg-red-50 border border-red-200 flex gap-2.5 items-start">
                        <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-[13px] font-semibold text-red-800">Acesso bloqueado pela AGT</p>
                            <p className="text-[12px] text-red-700 mt-1">{agtBlock}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleLogin} className="px-6 pb-6 pt-4 flex flex-col gap-[8px]">
                    <div className="relative">
                        <input
                            type="text"
                            value={identificador}
                            onChange={(e) => setIdentificador(e.target.value.toUpperCase())}
                            required
                            className={`${inputClass} pl-10`}
                            placeholder="NIF ou BI nº"
                            disabled={loading}
                        />
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>

                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={`${inputClass} pl-10 pr-10`}
                            placeholder="Senha"
                            disabled={loading}
                        />
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100">
                            {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                        </button>
                    </div>

                    <div className="mt-2">
                        <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50">
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                        </button>
                    </div>

                    <p className="text-center text-[13px] text-gray-600 mt-3">
                        Não tem conta? <Link to="/register" className="text-[#0095ff] font-semibold">Registra-se</Link>
                    </p>

                    <p className="text-center text-[11px] text-gray-400 mt-2">
                        Empresa usa NIF • Funcionário usa BI
                    </p>
                </form>
            </div>
        </div>
    )
}
