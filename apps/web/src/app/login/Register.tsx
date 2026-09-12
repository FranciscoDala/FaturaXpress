import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Mail, Lock, Phone, MapPin, FileText, AlertCircle } from 'lucide-react'

export default function Register() {
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const navigate = useNavigate()

    const [companyName, setCompanyName] = useState('')
    const [nif, setNif] = useState('')
    const [emailCompany, setEmailCompany] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [password, setPassword] = useState('') // senha da empresa

    const playErrorSound = () => {
        const audio = new Audio('https://cdn.freesound.org/previews/270/270404_5123851-lq.mp3')
        audio.volume = 0.25
        audio.play().catch(() => {})
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}
        if (!companyName.trim()) newErrors.companyName = 'Informe o nome da empresa'
        if (!nif.trim()) newErrors.nif = 'Informe o NIF'
        if (!phone.trim()) newErrors.phone = 'Informe o telefone'
        if (!emailCompany.trim()) newErrors.emailCompany = 'Informe o email'
        if (!address.trim()) newErrors.address = 'Informe o endereço'
        if (!city.trim()) newErrors.city = 'Informe a cidade'
        if (!province.trim()) newErrors.province = 'Informe a província'
        if (!password.trim()) newErrors.password = 'Informe a palavra-passe'

        setErrors(newErrors)

        if (Object.keys(newErrors).length > 0) {
            playErrorSound()
            return false
        }
        return true
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return // para se tiver erro

        setLoading(true)
        setTimeout(() => navigate('/login'), 1500)
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
            <div className="relative w-full max-w-[440px] bg-white rounded-2xl p-8 border-gray-200 max-h-[90vh] overflow-y-auto hide-scrollbar">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Registre sua empresa</h1>
                    <p className="text-gray-500 text-sm mt-1">Comece a emitir faturas hoje</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-0" noValidate> {/* noValidate tira o tooltip padrão */}

                    <div>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={companyName} onChange={(e) => {setCompanyName(e.target.value); setErrors({...errors, companyName: ''})}} className={inputClass(!!errors.companyName)} placeholder="Nome da Empresa Lda" />
                        </div>
                        {errors.companyName && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.companyName}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={nif} onChange={(e) => {setNif(e.target.value); setErrors({...errors, nif: ''})}} className={inputClass(!!errors.nif)} placeholder="NIF" />
                        </div>
                        {errors.nif && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.nif}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="tel" value={phone} onChange={(e) => {setPhone(e.target.value); setErrors({...errors, phone: ''})}} className={inputClass(!!errors.phone)} placeholder="+244-Telefone" />
                        </div>
                        {errors.phone && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.phone}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={emailCompany} onChange={(e) => {setEmailCompany(e.target.value); setErrors({...errors, emailCompany: ''})}} className={inputClass(!!errors.emailCompany)} placeholder="email@empresa.com" />
                        </div>
                        {errors.emailCompany && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.emailCompany}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={address} onChange={(e) => {setAddress(e.target.value); setErrors({...errors, address: ''})}} className={inputClass(!!errors.address)} placeholder="Rua, Bairro" />
                        </div>
                        {errors.address && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.address}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={city} onChange={(e) => {setCity(e.target.value); setErrors({...errors, city: ''})}} className={inputClass(!!errors.city)} placeholder="Cidade" />
                        </div>
                        {errors.city && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.city}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={province} onChange={(e) => {setProvince(e.target.value); setErrors({...errors, province: ''})}} className={inputClass(!!errors.province)} placeholder="Província" />
                        </div>
                        {errors.province && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.province}</p>}
                    </div>

                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="password" value={password} onChange={(e) => {setPassword(e.target.value); setErrors({...errors, password: ''})}} className={inputClass(!!errors.password)} placeholder="Palavra-passe" />
                        </div>
                        {errors.password && <p className="text-red-500 text-xs flex items-center gap-1 mt-1 mb-2"><AlertCircle className="w-3 h-3"/> {errors.password}</p>}
                    </div>

                    <button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-60 mt-3">
                        {loading? 'Registrando...' : 'Registrar Empresa'}
                    </button>
                </form>

                <p className="text-center text-sm text-gray-600 mt-6">
                    Já tem conta? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Fazer login</Link>
                </p>

                <style>{`
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .hide-scrollbar::-webkit-scrollbar { display: none; }
                `}</style>
            </div>
        </div>
    )
}
