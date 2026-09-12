import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Mail, Lock, User, Phone, MapPin, FileText } from 'lucide-react'

export default function Register() {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const [companyName, setCompanyName] = useState('')
    const [nif, setNif] = useState('')
    const [emailCompany, setEmailCompany] = useState('')
    const [phone, setPhone] = useState('')
    const [address, setAddress] = useState('')
    const [city, setCity] = useState('')
    const [province, setProvince] = useState('')
    const [adminName, setAdminName] = useState('')
    const [adminEmail, setAdminEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        console.log('Register:', { companyName, nif, emailCompany, phone, address, city, province, adminName, adminEmail, password })
        setTimeout(() => navigate('/login'), 1500)
        setLoading(false)
    }

    const inputClass = "w-full h-11 pl-9 pr-3 border-2 border-blue-600 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
    const inputClassNoIcon = "w-full h-11 px-3 border-2 border-blue-600 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
            }}
        >
            <div className="w-full max-w-[380px] bg-white/95 backdrop-blur-2xl rounded-2xl p-4 border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
                <div className="text-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mx-auto mb-3">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Registar Empresa</h1>
                    <p className="text-gray-500 text-xs mt-1">FaturaXpress</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3">
                    <h2 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</h2>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Nome da Empresa</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputClass} placeholder="FaturaXpress Lda" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">NIF</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={inputClass} placeholder="123456789" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Email da Empresa</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputClass} placeholder="contacto@empresa.co.ao" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Telefone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClass} placeholder="+244 923 456 789" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Endereço</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputClass} placeholder="Rua, Bairro" disabled={loading} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-700 mb-1.5 font-medium">Cidade</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputClassNoIcon} placeholder="Luanda" disabled={loading} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-700 mb-1.5 font-medium">Província</label>
                            <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} required className={inputClassNoIcon} placeholder="Luanda" disabled={loading} />
                        </div>
                    </div>

                    <hr className="border-gray-200" />

                    <h2 className="text-xs font-semibold text-gray-800 flex items-center gap-2"><User className="h-4 w-4" /> Dados do Administrador</h2>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} required className={inputClass} placeholder="Seu nome" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Email de Acesso</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className={inputClass} placeholder="voce@empresa.co.ao" disabled={loading} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-700 mb-1.5 font-medium">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="Mínimo 6 caracteres" disabled={loading} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-blue-600 text-white font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
                    >
                        {loading? 'Registando...' : 'Criar Empresa'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600 mt-4">
                    Já tem conta? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
                </p>

                <style>{`
                   .hide-scrollbar {
                        -ms-overflow-style: none; /* IE e Edge */
                        scrollbar-width: none; /* Firefox */
                    }
                   .hide-scrollbar::-webkit-scrollbar {
                        display: none; /* Chrome, Safari */
                    }
                `}</style>
            </div>
        </div>
    )
}
