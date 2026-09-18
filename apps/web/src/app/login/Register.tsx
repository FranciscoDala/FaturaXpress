import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Phone, MapPin, FileText, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = "https://faturaxpress-backend.onrender.com/api"

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
    const [password, setPassword] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyName, nif, emailCompany, phone, address, city, province, password })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || "Erro ao registrar")
            toast.success(data.message, { position: 'top-center' })
            setCompanyName(''); setNif(''); setEmailCompany(''); setPhone('');
            setAddress(''); setCity(''); setProvince(''); setPassword('');
            setTimeout(() => navigate('/login'), 1500)
        } catch (err: any) {
            toast.error(err.message, { position: 'top-center' })
        } finally {
            setLoading(false)
        }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const inputWithIcon = `${inputClass} pl-10`

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f6f8fb]">
            <div className="relative w-full max-w-[480px] bg-white rounded-[24px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 max-h-[92vh] flex flex-col">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center overflow-hidden">
                        <img src="/android-chrome-192x192.png" alt="FT-Xpress" className="w-7 h-7 object-contain" />
                    </div>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h1 className="text-[18px] font-bold text-gray-900 leading-tight">Registre sua empresa</h1>
                    <p className="text-[13.5px] text-gray-500 mt-1">Comece a emitir faturas hoje</p>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                    <form onSubmit={handleRegister} className="flex flex-col gap-[2px]">
                        <div className="relative"><input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className={inputWithIcon} placeholder="Nome da Empresa Lda *" disabled={loading} /><FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                        <div className="grid grid-cols-2 gap-[2px]">
                            <div className="relative"><input type="text" value={nif} onChange={(e) => setNif(e.target.value)} required className={inputWithIcon} placeholder="NIF *" disabled={loading} /><FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                            <div className="relative"><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputWithIcon} placeholder="Telefone *" disabled={loading} /><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                        </div>
                        <div className="relative"><input type="email" value={emailCompany} onChange={(e) => setEmailCompany(e.target.value)} required className={inputWithIcon} placeholder="email@empresa.com *" disabled={loading} /><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                        <div className="relative"><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className={inputWithIcon} placeholder="Rua, Bairro *" disabled={loading} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                        <div className="grid grid-cols-2 gap-[2px]">
                            <div className="relative"><input type="text" value={city} onChange={(e) => setCity(e.target.value)} required className={inputWithIcon} placeholder="Cidade *" disabled={loading} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                            <div className="relative"><input type="text" value={province} onChange={(e) => setProvince(e.target.value)} required className={inputWithIcon} placeholder="Província *" disabled={loading} /><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>
                        </div>
                        <div className="relative"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputWithIcon} placeholder="Palavra-passe *" disabled={loading} /><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /></div>

                        <div className="mt-3">
                            <button type="submit" disabled={loading} className="w-full h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                                {loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            </button>
                        </div>

                        <p className="text-center text-[13px] text-gray-600 mt-4">
                            Já tem conta? <Link to="/login" className="text-[#0095ff] font-semibold hover:underline">Fazer login</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
