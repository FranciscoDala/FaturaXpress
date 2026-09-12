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
        setTimeout(() => navigate('/login'), 1500)
        setLoading(false)
    }

    const inputClass = "w-full pl-9 pr-3 py-2 border-2 border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" // <- classe padrão
    const inputClassNoIcon = "w-full px-3 py-2 border-2 border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm" // <- sem ícone

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-[400px] p-6 space-y-5 bg-white rounded-2xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Registar Empresa</h1>
                    <p className="mt-1 text-sm text-gray-600">FaturaXpress</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><Building2 className="h-4 w-4" /> Dados da Empresa</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputClass} placeholder="FaturaXpress Lda" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">NIF</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={inputClass} placeholder="123456789" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email da Empresa</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputClass} placeholder="contacto@empresa.co.ao" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClass} placeholder="+244 923 456 789" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputClass} placeholder="Rua, Bairro" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputClassNoIcon} placeholder="Luanda" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Província</label>
                            <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} required className={inputClassNoIcon} placeholder="Luanda" />
                        </div>
                    </div>

                    <hr />

                    <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><User className="h-4 w-4" /> Dados do Administrador</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} required className={inputClass} placeholder="Seu nome" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email de Acesso</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className={inputClass} placeholder="voce@empresa.co.ao" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="Mínimo 6 caracteres" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                        {loading? 'Registando...' : 'Criar Empresa'}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600">
                    Já tem conta? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Entrar</Link>
                </p>
            </div>
        </div>
    )
}
