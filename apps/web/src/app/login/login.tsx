import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Building2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const navigate = useNavigate()

    const playErrorSound = () => {
        const audio = new Audio('https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3')
        audio.volume = 0.25
        audio.play().catch(() => {})
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!email.trim()) newErrors.email = 'Informe o NIF ou email'
        if (!password.trim()) newErrors.password = 'Informe a palavra-passe'

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            playErrorSound()
            return false
        }
        return true
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return // para se tiver erro

        setLoading(true)
        setTimeout(() => navigate('/dashboard'), 1000)
        setLoading(false)
    }

    const inputClass = (hasError: boolean) =>
        `w-full h-11 pl-10 pr-3 border rounded-lg text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition bg-white mb-[2px] ${
            hasError
         ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-blue-600 focus:border-blue-600'
        }`

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white">

            <div className="relative w-full max-w-[400px] bg-white rounded-2xl p-8 border-gray-200">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">FaturaXpress</h1>
                </div>

                <form onSubmit={handleLogin} className="space-y-0" noValidate> {/* noValidate tira o tooltip padrão */}
                    {/* EMAIL COM BORDA */}
                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {setEmail(e.target.value); setErrors({...errors, email: ''})}}
                                className={inputClass(!!errors.email)}
                                placeholder="email@empresa.com"
                                disabled={loading}
                            />
                        </div>
                        {errors.email && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.email}</p>}
                    </div>

                    {/* SENHA COM BORDA */}
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => {setPassword(e.target.value); setErrors({...errors, password: ''})}}
                                className={inputClass(!!errors.password)}
                                placeholder="••••"
                                disabled={loading}
                            />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.password}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-60 mt-3"
                    >
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
