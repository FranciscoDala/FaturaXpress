import { X, FileCheck, Check, Lock } from 'lucide-react'
import { useMemo } from 'react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["converter_pp_ft", "emitir_fatura"],
    recepcao: [],
    rh: []
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

interface Props {
    open: boolean
    numero: string
    total: number
    loading?: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ModalConfirmConverter({ open, numero, total, loading = false, onClose, onConfirm }: Props) {
    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeConverter = funcionarioLogado? temPermissao(cargoAtual, 'converter_pp_ft') || temPermissao(cargoAtual, 'emitir_fatura') || cargoAtual === 'admin' : true

    if (!open) return null

    if (!podeConverter) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
                <div className="relative bg-white rounded-[24px] w-full max-w-[380px] p-8 text-center shadow-xl">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold text-[16px]">Sem permissão</p>
                    <p className="text-[13px] text-gray-500 mt-2">Cargo <b>{cargoAtual.toUpperCase()}</b> não pode converter PP em FT oficial. Só ADMIN e FINANCEIRA.</p>
                    <button onClick={onClose} className="mt-5 w-full h-11 bg-black text-white rounded-full font-bold text-[13px]">Fechar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF]">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <FileCheck className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{cargoAtual.toUpperCase()}</span>
                        <button onClick={onClose} disabled={loading} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-50">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    </div>
                </div>
                <div className="px-6 pt-5 pb-6">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">Converter PP para FT?</h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">
                        PP <b className="text-gray-900">{numero}</b> vai virar FT oficial com hash AGT. Ação não pode ser desfeita. • {cargoAtual.toUpperCase()}
                    </p>
                    <div className="mt-4 bg-gray-50 border border-gray-100 rounded-[16px] p-3 text-[12px] space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Proforma</span><span className="font-bold text-gray-900 truncate">PP {numero}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gray-900">{total.toFixed(2)} KZ</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Ação</span><span className="font-bold text-[#0095ff]">PP → FT Oficial • {cargoAtual.toUpperCase()}</span></div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"><X className="w-4 h-4" /></button>
                        <button onClick={onConfirm} disabled={loading ||!podeConverter} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">{loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
