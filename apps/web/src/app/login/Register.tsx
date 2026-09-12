import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, FileText, Lock } from 'lucide-react'

export default function LoginPage() {
    const [nif, setNif] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        // aqui tu vai chamar tua API com nif + password
        setTimeout(() => navigate('/dashboard'), 1000)
        setLoading(false)
    }

    const inputClass = "w-full h-11 pl-10 pr-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white mb-[5px]"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8FAFC]">
            {/* FUNDO CLARO COM GRADIENTE SUTIL */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(37,99,235,0.15),rgba(255,255,255,0))]"/>

            <div className="relative w-full max-w-[400px] bg-white rounded-2xl p-8 shadow-xl border-gray-200">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-md">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">FaturaXpress</h1>
                    <p className="text-gray-500 text-sm mt-1">Acesse com seu NIF</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-0">
                    {/* NIF */}
                    <div>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                value={nif}
                                onChange={(e) => setNif(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="NIF da Empresa"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    {/* SENHA */}
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={inputClass}
                                placeholder="Palavra-passe"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-60 shadow-sm hover:shadow mt-3"
                    >
                        {loading? 'Entrando...' : 'Entrar'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                    Não tem conta? <Link to="/register" className="text-blue-600 font-semibold hover:underline">Criar conta</Link>
                </p>
            </div>
        </div>
    )
}
