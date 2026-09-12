import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2 } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => navigate('/dashboard'), 1000)
        setLoading(false)
    }

    const inputClass = "w-full h-10 pl-10 pr-3 border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]"/>

            <div className="relative w-full max-w-[400px] bg-white rounded-2xl p-1.5 shadow-xl border-gray-200"> {/* p-1.5 = 6px */}
                <div className="text-center mb-3 pt-2">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-2 shadow-md">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">FaturaXpress</h1>
                </div>

                <form onSubmit={handleLogin} className="space-y-0.5 px-2 pb-2"> {/* padding 5px */}
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} placeholder="email@empresa.com" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="••••" disabled={loading} />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-60 shadow-sm hover:shadow mt-2">
                        {loading? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600 mt-2 pb-1">
                    Não tem conta? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Criar conta</Link>
                </p>
            </div>
        </div>
    )
}
