import { X, Mail, Shield, Building2, User } from 'lucide-react'

interface ModalUsuarioProps {
    open: boolean
    usuario: any
    empresa: any
    onClose: () => void
}

export default function ModalUsuario({ open, usuario, empresa, onClose }: ModalUsuarioProps) {
    if (!open) return null

    const nome = usuario?.nome || usuario?.name || empresa?.nome || 'Usuário'
    const email = usuario?.email || empresa?.email || 'sem email'
    const role = usuario?.role || usuario?.cargo || 'Administrador'
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=E8F2FF&color=0095ff&size=128`

    return (
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[3px]" onClick={onClose} />

            <div className="relative bg-white w-full sm:max-w-[360px] rounded-t-[24px] sm:rounded-[24px] shadow-[0_16px_48px_rgba(0,0,0,0.18)] border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-2">
                {/* Header azul igual dashboard */}
                <div className="relative bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white p-5 border-b border-[#e6f0ff]">
                    <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white border flex items-center justify-center hover:bg-gray-50">
                        <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-[64px] h-[64px] rounded-full overflow-hidden border-[4px] border-white shadow-sm bg-white">
                            <img src={usuario?.avatar_url || avatar} alt={nome} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h3 className="text-[16px] font-bold text-[#1a202c] leading-tight">{nome}</h3>
                            <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1"><Shield className="w-3 h-3" /> {role}</p>
                            <span className="inline-flex mt-2 text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100 font-medium">Online</span>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-[12px] bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Mail className="w-4 h-4 text-gray-600" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-500">Email</p>
                            <p className="text-[13px] font-medium truncate">{email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-[12px] bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><Building2 className="w-4 h-4 text-gray-600" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-500">Empresa</p>
                            <p className="text-[13px] font-medium truncate">{empresa?.nome || empresa?.companyName || '---'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-[12px] bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><User className="w-4 h-4 text-gray-600" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-500">NIF</p>
                            <p className="text-[13px] font-medium">{empresa?.nif || '---'}</p>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button onClick={onClose} className="w-full h-[42px] rounded-full bg-[#0095ff] text-white text-[13px] font-semibold hover:bg-[#0084e6] transition">Fechar</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
