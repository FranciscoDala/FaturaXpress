import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, User } from 'lucide-react'

export default function RegisterPage() {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        console.log('Register:', { name, email, password })
        setTimeout(() => navigate('/login'), 1000)
        setLoading(false)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-[300px] p-6 space-y-5 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Criar Conta</h1>
                    <p className="mt-1 text-sm text-gray-600">FaturaXpress</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" placeholder="Seu nome" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-9 pr-3 py-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" placeholder="voce@empresa.com" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" placeholder="••••" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                        {loading? 'Criando...' : 'Criar conta'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600">
                    Já tem conta? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
                </p>
            </div>
        </div>
    )
}
