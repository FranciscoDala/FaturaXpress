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

    const inputClass = "w-full h-11 pl-9 pr-3 border-2 border-blue-600 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)", // azul igual teu btn
            }}
        >
            <div className="w-full max-w-[380px] bg-white/95 backdrop-blur-2xl rounded-2xl p-4 border-white/10 shadow-2xl">
                <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">FaturaXpress</h1>
                    <p className="text-gray-500 text-xs mt-1">Entre na sua conta</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-3">
                    {/* EMAIL */}
                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="voce@empresa.com"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* SENHA */}
                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="••••••••"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                        {loading? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600 mt-4">
                    Não tem conta? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Criar conta</Link>
                </p>
            </div>
        </div>
    )
}
