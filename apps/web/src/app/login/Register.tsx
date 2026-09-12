import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Building2, Mail, Lock, Phone, MapPin, FileText } from 'lucide-react'

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
    const [password, setPassword] = useState('') // senha da empresa

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => navigate('/login'), 1500)
        setLoading(false)
    }

    const inputClass = "w-full h-11 pl-10 pr-3 border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition bg-white mb-[5px]"

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white"> {/* FUNDO BRANCO */}

            <div className="relative w-full max-w-[440px] bg-white rounded-2xl p-8 border-gray-200 max-h-[90vh] overflow-y-auto hide-scrollbar"> {/* SÓ BORDA, SEM SHADOW E SEM GRADIENTE */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4"> {/* TIREI SHADOW */}
                        <Building2 className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Registre sua empresa</h1>
                    <p className="text-gray-500 text-sm mt-1">Comece a emitir faturas hoje</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-0">

                    <div>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputClass} placeholder="Nome da Empresa Lda" />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={inputClass} placeholder="NIF" />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputClass} placeholder="+244-Telefone" />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputClass} placeholder="email@empresa.com" />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputClass} placeholder="Rua, Bairro" />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputClass} placeholder="Cidade" />
                        </div>
                    </div>

                    <div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" value={province} onChange={(e) => setProvince(e.target.value)} required className={inputClass} placeholder="Província" />
                        </div>
                    </div>

                    {/* SENHA DA EMPRESA */}
                    <div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="Palavra-passe" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-60 mt-3"> {/* TIREI SHADOW */}
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
