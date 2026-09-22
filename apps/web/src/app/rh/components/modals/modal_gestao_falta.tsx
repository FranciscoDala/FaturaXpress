import { useEffect, useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { api, apiRoot } from '../../../../lib/api'
import { toast } from 'sonner'
import { X, Check, FileText, Upload, Eye, Info, Loader2, Lock } from 'lucide-react'

type AuditData = any

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    rh: ["gerir_funcionarios", "justificar_falta"],
    financeira: ["justificar_falta_propria"],
    recepcao: ["justificar_falta_propria"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function ModalGestaoFalta({ data, open, onClose, onSaved, dataSelecionada, usuario }: { data: AuditData | null, open: boolean, onClose: () => void, onSaved: () => void, dataSelecionada: string, usuario?: any }) {
    const [tab, setTab] = useState<'detalhes' | 'justificar'>('detalhes')
    const [docNome, setDocNome] = useState<string>('')
    const [obs, setObs] = useState<string>('')
    const [showObs, setShowObs] = useState<boolean>(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const fileRef = useRef<HTMLInputElement>(null)

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || usuario?.cargo?.toLowerCase() || 'admin'
    const podeJustificar = funcionarioLogado? temPermissao(cargoAtual, 'justificar_falta') || temPermissao(cargoAtual, 'justificar_falta_propria') || cargoAtual === 'admin' : true

    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
            if (data?._kind === 'falta') {
                setDocNome(data.justificativa_tipo || '')
                setObs(data.justificativa_obs || '')
                setShowObs(!!data.justificativa_obs)
                setPreviewUrl(data.justificativa_anexo_url || null)
                setFile(null)
                setTab(data.justificativa_tipo? 'justificar' : 'detalhes')
            } else {
                setTab('detalhes')
            }
            return () => { document.body.style.overflow = ''; document.documentElement.style.overflow = '' }
        }
    }, [open, data])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (!f) return
        if (f.size > 5 * 1024 * 1024) { toast.error('Arquivo máx 5MB'); return }
        if (!['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(f.type)) { toast.error('Só PDF ou IMG'); return }
        setFile(f)
        if (f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f))
        else setPreviewUrl(null)
    }

    if (!open ||!data) return null
    const falta = data
    const token = localStorage.getItem('token') || localStorage.getItem('access_token') || ''
    const comprovanteEndpoint = `${apiRoot}/rh/falta/${falta.id}/anexo?token=${encodeURIComponent(token)}`

    const uploadAndJustificar = async () => {
        if (!podeJustificar) { toast.error('Sem permissão para justificar'); return }
        if (!docNome.trim()) { toast.error('Informe o nome do documento'); return }
        if (!file &&!previewUrl) { toast.error('Selecione o comprovante'); return }

        setLoading(true)
        try {
            const stored = localStorage.getItem('funcionario_logado')
            const logado = stored? JSON.parse(stored) : null
            let anexoUrl: string | null = null

            if (file) {
                const fd = new FormData()
                fd.append('file', file)
                try {
                    const up = await api.post('/api/upload/falta', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                    anexoUrl = (up.data as any).url || (up.data as any).file_url
                    if (!anexoUrl) throw new Error('URL não retornada')
                } catch (upErr: any) {
                    toast.error(upErr?.response?.data?.detail || 'Falha ao enviar comprovante')
                    setLoading(false)
                    return
                }
            } else {
                anexoUrl = previewUrl
            }

            await api.post(`/api/rh/falta/${falta.id}/justificar`, {
                tipo: docNome.trim(),
                observacao: showObs? obs : '',
                anexo_url: anexoUrl,
                justificado_por_id: logado?.id || usuario?.id
            })

            toast.success('Justificativa enviada!')
            window.dispatchEvent(new CustomEvent('notificacoes-refresh'))
            onSaved(); onClose()
        } catch (e: any) {
            toast.error(e?.response?.data?.detail || 'Erro ao justificar')
        } finally { setLoading(false) }
    }

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition outline-none"
    const checkBoxCard = "flex items-center gap-2 h-[44px] px-3 border border-gray-200 rounded-[12px] cursor-pointer bg-white hover:bg-gray-50 transition w-full"

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full transition border shrink-0 ${tab === id? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]' : 'bg-white border-gray-200 text-black hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" /> {label}
        </button>
    )

    const content = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[24px] w-full max-w-[460px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* HEADER PADRAO MODAIS */}
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-black" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-black leading-tight">Gestão de Falta</h3>
                    <p className="text-[13px] text-black mt-1 font-medium">{dataSelecionada || falta.data_inicio} • Justificar Falta</p>
                    <div className="flex gap-[2px] mt-4 overflow-x-auto no-scrollbar">
                        <TabButton id="detalhes" label="Detalhes" icon={Info} />
                        {podeJustificar && <TabButton id="justificar" label="Justificar" icon={FileText} />}
                    </div>
                    {!podeJustificar && (
                        <div className="mt-3 p-2.5 rounded-[12px] bg-red-50 border border-red-200 flex items-center gap-2 text-[12px] font-bold text-black"><Lock className="w-3.5 h-3.5" /> Sem permissão</div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                    {tab === 'detalhes' && (
                        <div className="flex flex-col gap-[2px]">
                            <div className="p-3 rounded-[12px] bg-gray-50 border border-gray-200 flex flex-col gap-1.5">
                                <div className="flex justify-between text-[13px]"><span className="text-black/60">Funcionário</span><span className="font-bold text-black truncate max-w-[160px]">{data.funcionario_nome || '—'}</span></div>
                                <div className="flex justify-between text-[13px]"><span className="text-black/60">Data</span><span className="font-bold text-black">{dataSelecionada || data.data_inicio}</span></div>
                                <div className="flex justify-between text-[13px]"><span className="text-black/60">Lançado por</span><span className="font-bold text-black">{data.lancado_por_nome || 'RH'}</span></div>
                            </div>
                            <div className="p-3 rounded-[12px] bg-white border border-gray-200">
                                <p className="text-[13px] text-black font-medium leading-[18px]">{data.motivo_retroativo || data.motivo || 'Sem descrição'}</p>
                            </div>
                            {falta.justificativa_tipo && (
                                <div className="p-3 rounded-[12px] bg-[#F0F7FF] border border-[#C2D8FF]">
                                    <p className="text-[13px] font-bold text-black">{falta.justificativa_tipo}</p>
                                    {falta.justificativa_obs && <p className="text-[12px] text-black mt-1">{falta.justificativa_obs}</p>}
                                    {falta.justificativa_anexo_url && (
                                        <a href={falta.justificativa_anexo_url.startsWith('data:')? falta.justificativa_anexo_url : comprovanteEndpoint} target="_blank" rel="noreferrer" className="mt-3 w-full h-[44px] bg-black text-white rounded-full flex items-center justify-center gap-2 text-[13px] font-bold"><Eye className="w-4 h-4" /> Ver Comprovante</a>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'justificar' && (
                        <div className="flex flex-col gap-[2px]">
                            <div className="flex flex-col gap-1.5">
                                <input
                                    type="text"
                                    value={docNome}
                                    onChange={e => setDocNome(e.target.value)}
                                    placeholder="Atestado Médico"
                                    disabled={!podeJustificar}
                                    className={inputClass}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5 mt-[2px]">
                                <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
                                <button
                                    type="button"
                                    disabled={!podeJustificar}
                                    onClick={() => podeJustificar && fileRef.current?.click()}
                                    className="w-full min-h-[88px] border-2 border-dashed rounded-[12px] flex flex-col items-center justify-center gap-1.5 bg-white border-gray-300 hover:border-[#0095ff] transition px-2 py-3"
                                >
                                    <Upload className="w-5 h-5 text-black" />
                                    <span className="text-[12.5px] font-bold text-black text-center w-full truncate max-w-[300px] px-2 block" title={file?.name}>{file? file.name : 'Carregar PDF ou imagem'}</span>
                                    <span className="text-[11px] text-black/60">PDF, JPG, PNG - máx 5MB</span>
                                </button>
                                {file?.type.startsWith('image/') && previewUrl && <img src={previewUrl} alt="prev" className="w-full max-h-[160px] object-contain rounded-[12px] border border-gray-200 mt-[2px]" />}
                                {file &&!file.type.startsWith('image/') && (
                                    <div className="p-2.5 rounded-[12px] bg-gray-50 border border-gray-200 flex items-center gap-2 mt-[2px]">
                                        <FileText className="w-4 h-4 shrink-0 text-black" />
                                        <span className="text-[12px] font-bold text-black truncate flex-1" title={file.name}>{file.name}</span>
                                    </div>
                                )}
                            </div>

                            <label className={`${checkBoxCard} mt-[2px]`}>
                                <input type="checkbox" checked={showObs} onChange={e => setShowObs(e.target.checked)} className="w-4 h-4 accent-[#0095ff] rounded" />
                                <span className="text-[12px] text-black font-medium">Adicionar descrição (opcional)</span>
                            </label>

                            {showObs && (
                                <textarea
                                    disabled={!podeJustificar}
                                    value={obs}
                                    onChange={e => setObs(e.target.value)}
                                    placeholder="Observação opcional..."
                                    className="w-full min-h-[80px] bg-white border border-gray-200 rounded-[12px] px-3 py-2.5 text-[13.5px] text-black placeholder:text-black/60 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 resize-none mt-[2px]"
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                    {tab === 'justificar'? (
                        <>
                            <button type="button" onClick={() => setTab('detalhes')} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition">
                                <X className="w-5 h-5 text-black" />
                            </button>
                            <button type="button" disabled={loading ||!podeJustificar} onClick={uploadAndJustificar} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50 transition">
                                {loading? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-5 h-5" />}
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white text-[13px] font-medium text-black hover:bg-gray-50">Fechar</button>
                            {podeJustificar && <button type="button" onClick={() => setTab('justificar')} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white text-[13px] font-semibold hover:bg-[#0085e6]">Justificar</button>}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
    return typeof document!== 'undefined'? createPortal(content, document.body) : null
}
