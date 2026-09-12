import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            console.log('Login:', { email, password })
            setTimeout(() => {
                navigate('/dashboard')
            }, 1000)
        } catch (error) {
            console.error(error)
            alert('Email ou senha inválidos')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            {/* CARD PRINCIPAL COM WIDTH FIXA */}
            <div className="w-[300px] p-6 space-y-5 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">FaturaXpress</h1>
                    <p className="mt-1 text-sm text-gray-600">Entre na sua conta</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {/* INPUT EMAIL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="voce@empresa.com"
                            />
                        </div>
                    </div>

                    {/* INPUT SENHA */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-9 pr-3 py-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                                placeholder="••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                    >
                        {loading? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                {/* LINKS */}
                <div className="text-center space-y-2 pt-2">
                    <p className="text-xs text-gray-500">
                        Esqueceu a senha? <a href="#" className="text-blue-600 hover:underline">Recuperar</a>
                    </p>
                    <p className="text-xs text-gray-600">
                        Não tem conta? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Criar conta</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
