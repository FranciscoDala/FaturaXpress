import { X, FileCheck, AlertCircle, Check, Lock } from 'lucide-react'
import { useMemo } from 'react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    financeira: ["emitir_fatura", "emitir_proforma"],
    recepcao: ["emitir_proforma"],
    rh: []
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

interface Props {
    open: boolean
    tipoDoc: 'proforma'|'fatura'
    total: number
    qtdItens: number
    loading?: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ModalConfirmEmit({ open, tipoDoc, total, qtdItens, loading = false, onClose, onConfirm }: Props) {
    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])
    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const isFatura = tipoDoc === 'fatura'
    const permNecessaria = isFatura? 'emitir_fatura' : 'emitir_proforma'
    const podeEmitir = funcionarioLogado? temPermissao(cargoAtual, permNecessaria) || cargoAtual === 'admin' : true

    if (!open) return null

    if (!podeEmitir) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
                <div className="relative bg-white rounded-[24px] w-full max-w-[380px] p-8 text-center shadow-xl">
                    <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                    <p className="font-bold text-[16px]">Sem permissão</p>
                    <p className="text-[13px] text-gray-500 mt-2">
                        {isFatura? (
                            <>Cargo <b>{cargoAtual.toUpperCase()}</b> não pode emitir FT oficial. Só ADMIN e FINANCEIRA.</>
                        ) : (
                            <>Cargo <b>{cargoAtual.toUpperCase()}</b> não pode emitir proforma.</>
                        )}
                    </p>
                    <button onClick={onClose} className="mt-5 w-full h-11 bg-black text-white rounded-full font-bold text-[13px]">Fechar</button>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white rounded-[24px] w-full max-w-[400px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className={`relative h-[72px] px-5 pt-5 flex justify-between items-start ${isFatura? 'bg-[#E6F0FF]' : 'bg-[#FFF7ED]'}`}>
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">{isFatura? <FileCheck className="w-4 h-4 text-[#0095ff]" /> : <AlertCircle className="w-4 h-4 text-[#ff7a00]" />}</div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-black text-white px-2 py-1 rounded-full font-bold">{cargoAtual.toUpperCase()} • {isFatura? 'FT' : 'PP'}</span>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
                    </div>
                </div>
                <div className="px-6 pt-5 pb-6">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isFatura? 'Emitir FT Oficial?' : 'Emitir Proforma PP?'} <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full ml-1">{cargoAtual.toUpperCase()}</span></h3>
                    <p className="text-[13.5px] text-gray-500 mt-3 leading-relaxed">{isFatura? 'Vai gerar Hash AGT + QR automático e não poderá ser editada. FT conta no limite do plano. Só FINANCEIRA/ADMIN.' : 'Proforma sem valor fiscal. Poderá converter em FT depois. PP é sempre livre. Recepção pode.'}</p>
                    <div className="mt-4 bg-gray-50 border border-gray-100 rounded-[16px] p-3 text-[12px] space-y-1.5">
                        <div className="flex justify-between"><span className="text-gray-500">Itens</span><span className="font-bold text-gray-900">{qtdItens}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-bold text-gray-900">{total.toFixed(2)} KZ</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Tipo</span><span className="font-bold text-gray-900">{isFatura? 'FT - Fatura Oficial (conta no limite) • ADMIN/FINANCEIRA' : 'PP - Proforma (livre) • RECEPÇÃO/FINANCEIRA/ADMIN'}</span></div>
                    </div>
                    <div className="flex gap-3 mt-8">
                        <button onClick={onClose} disabled={loading} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"><X className="w-4 h-4" /></button>
                        <button onClick={onConfirm} disabled={loading ||!podeEmitir} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center gap-2 disabled:opacity-50">{loading? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
