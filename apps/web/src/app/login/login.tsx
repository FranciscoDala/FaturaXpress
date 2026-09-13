import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, AlertCircle } from 'lucide-react'

const API_URL = "https://faturaxpress-backend.onrender.com/api" // IMPORTANTE: /api pq o backend usa prefix

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.detail || "Credenciais inválidas")

            // Salva o token e dados da empresa
            localStorage.setItem("access_token", data.access_token)
            localStorage.setItem("company", JSON.stringify(data.company))

            navigate('/dashboard')

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-11 pl-10 pr-3 border border-gray-300 rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white mb-[5px]"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">
            <div className="relative w-full max-w-[400px] bg-white rounded-2xl p-8 border-gray-200">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">FaturaXpress</h1>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-0">
                    <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="email@empresa.com ou NIF" disabled={loading} /></div>
                    <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="••••" disabled={loading} /></div>

                    <button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-60 mt-3">
                        {loading? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                    Não tem conta? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Registra-se</Link>
                </p>
            </div>
        </div>
    )
}
