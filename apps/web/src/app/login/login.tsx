import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock } from 'lucide-react' // <- importa os ícones

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">FaturaXpress</h1>
                    <p className="mt-2 text-gray-600">Entre na sua conta</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 flex-col items-center">
                    {/* INPUT EMAIL */}
                    <div className="w-[250px]">
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <div className="relative mt-1"> {/* <- wrapper relative */}
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> {/* <- ícone */}
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-[250px] pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" // <- pl-9 pra dar espaço pro ícone
                                placeholder="voce@empresa.com"
                            />
                        </div>
                    </div>

                    {/* INPUT SENHA */}
                    <div className="w-[250px]">
                        <label className="block text-sm font-medium text-gray-700">Senha</label>
                        <div className="relative mt-1">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /> {/* <- ícone */}
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-[250px] pl-9 pr-3 py-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" // <- pl-9
                                placeholder="••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-[250px] py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-500">
                    Esqueceu a senha? <a href="#" className="text-blue-600 hover:underline">Recuperar</a>
                </p>
            </div>
        </div>
    )
}
