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
    const [docNome, setDocNome] = useState<string>('Atestado Médico')
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
                setDocNome(data.justificativa_tipo || 'Atestado Médico')
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
        if (!file &&!previewUrl) { toast.error('Selecione o comprovante (PDF ou imagem)'); return }

        setLoading(true)
        try {
            const stored = localStorage.getItem('funcionario_logado')
            const logado = stored? JSON.parse(stored) : null
            let anexoUrl: string | null = null

            if (file) {
                const fd = new FormData()
                fd.append('file', file)
                try {
                    const up = await api.post('/api/upload/falta', fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    })
                    anexoUrl = (up.data as any).url || (up.data as any).file_url
                    if (!anexoUrl) throw new Error('URL não retornada')
                } catch (upErr: any) {
                    const status = upErr?.response?.status
                    const detail = upErr?.response?.data?.detail
                    if (status === 404) toast.error('Serviço de upload não configurado.')
                    else if (status === 413) toast.error('Arquivo muito grande. Máximo 5MB')
                    else toast.error(detail || 'Falha ao enviar comprovante')
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
            const msg = e?.response?.data?.detail
            toast.error(msg || 'Erro ao justificar')
        } finally { setLoading(false) }
    }

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold rounded-full transition border shrink-0 ${tab === id? 'bg-black text-white border-black' : 'bg-white border-gray-200 text-black hover:bg-gray-50'}`}><Icon className="w-4 h-4" />{label}</button>
    )

    const content = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[20px] w-full max-w-[440px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="relative px-6 pt-6 pb-4 flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-[18px] font-bold text-black tracking-tight">Gestão de Falta</h3>
                        <p className="text-[12px] text-black/60 mt-1 font-medium">{dataSelecionada || data.data_inicio} • {falta.abonada? 'Abonada' : 'Não abonada'}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-50 border flex items-center justify-center hover:bg-gray-100"><X className="w-4 h-4 text-black" /></button>
                </div>

                <div className="px-6 pb-3 shrink-0">
                    <div className="flex gap-2">
                        <TabButton id="detalhes" label="Detalhes" icon={Info} />
                        {podeJustificar && <TabButton id="justificar" label="Justificar" icon={FileText} />}
                    </div>
                    {!podeJustificar && (
                        <div className="mt-3 p-2.5 rounded-[12px] bg-red-50 border border-red-200 flex items-center gap-2 text-[12px] font-bold text-black"><Lock className="w-3.5 h-3.5" /> Sem permissão para justificar</div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
                    {tab === 'detalhes' && (
                        <div className="flex flex-col gap-3">
                            <div className="p-4 rounded-[14px] bg-gray-50 border border-gray-100">
                                <div className="flex flex-col gap-1.5 text-[13px] text-black">
                                    <div className="flex justify-between"><span className="text-black/60 font-medium">Funcionário</span><span className="font-bold text-black truncate max-w-[160px]">{data.funcionario_nome || '—'}</span></div>
                                    <div className="flex justify-between"><span className="text-black/60 font-medium">Data</span><span className="font-bold text-black">{dataSelecionada || data.data_inicio}</span></div>
                                    <div className="flex justify-between"><span className="text-black/60 font-medium">Lançado por</span><span className="font-bold text-black">{data.lancado_por_nome || 'RH'}</span></div>
                                </div>
                            </div>
                            <div className="p-4 rounded-[14px] bg-white border border-gray-200">
                                <p className="text-[11px] font-bold text-black/50 uppercase tracking-wider">Motivo da falta</p>
                                <p className="text-[13px] font-medium text-black mt-1 leading-[18px]">{data.motivo_retroativo || data.motivo || 'Sem descrição'}</p>
                            </div>
                            {falta.justificativa_tipo && (
                                <div className="p-4 rounded-[14px] bg-[#F5F7FF] border border-[#DCE6FF]">
                                    <p className="text-[11px] font-bold text-black/50 uppercase">Documento enviado</p>
                                    <p className="text-[13px] font-bold text-black mt-1">{falta.justificativa_tipo}</p>
                                    {falta.justificativa_obs && <p className="text-[12px] text-black/70 mt-1">{falta.justificativa_obs}</p>}
                                    {falta.justificativa_anexo_url && (
                                        <div className="mt-3">
                                            <a href={falta.justificativa_anexo_url.startsWith('data:')? falta.justificativa_anexo_url : comprovanteEndpoint} target="_blank" rel="noreferrer" className="w-full h-[44px] bg-black text-white rounded-full flex items-center justify-center gap-2 text-[13px] font-bold"><Eye className="w-4 h-4" /> Ver Comprovante</a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'justificar' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[12px] font-bold text-black ml-1">Nome do documento</label>
                                <input
                                    type="text"
                                    value={docNome}
                                    onChange={e => setDocNome(e.target.value)}
                                    placeholder="Ex: Atestado Médico, Declaração..."
                                    disabled={!podeJustificar}
                                    className="w-full h-[48px] bg-white border border-gray-200 rounded-[12px] px-4 text-[13.5px] font-medium text-black placeholder:text-black/40 focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-50"
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[12px] font-bold text-black ml-1">Comprovante</label>
                                <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden" />
                                <button
                                    type="button"
                                    disabled={!podeJustificar}
                                    onClick={() => podeJustificar && fileRef.current?.click()}
                                    className="w-full min-h-[88px] border-2 border-dashed rounded-[14px] flex flex-col items-center justify-center gap-2 bg-gray-50/50 border-gray-300 hover:border-black hover:bg-white transition group px-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center group-hover:scale-105 transition"><Upload className="w-4 h-4 text-black" /></div>
                                    <div className="flex flex-col items-center max-w-full overflow-hidden">
                                        <span className="text-[12.5px] font-bold text-black truncate max-w-[240px] block" title={file?.name}>{file? file.name : 'Carregar PDF ou imagem'}</span>
                                        <span className="text-[11px] text-black/50 font-medium">PDF, JPG, PNG - máx 5MB</span>
                                    </div>
                                </button>
                                {file && file.type.startsWith('image/') && previewUrl && <img src={previewUrl} alt="prev" className="w-full max-h-[180px] object-contain rounded-[12px] border border-gray-200" />}
                                {file &&!file.type.startsWith('image/') && (
                                    <div className="p-3 rounded-[12px] bg-black text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 shrink-0" />
                                        <span className="text-[12px] font-medium truncate flex-1" title={file.name}>{file.name}</span>
                                        <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full">PDF</span>
                                    </div>
                                )}
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={showObs} onChange={e => setShowObs(e.target.checked)} className="w-[18px] h-[18px] rounded-[6px] border-2 border-gray-300 accent-black" />
                                <span className="text-[12.5px] font-bold text-black">Adicionar descrição (opcional)</span>
                            </label>

                            {showObs && (
                                <div className="flex flex-col gap-2 animate-in fade-in">
                                    <textarea
                                        disabled={!podeJustificar}
                                        value={obs}
                                        onChange={e => setObs(e.target.value)}
                                        placeholder="Escreva uma observação curta..."
                                        className="w-full min-h-[90px] bg-white border border-gray-200 rounded-[12px] p-3.5 text-[13px] font-medium text-black placeholder:text-black/40 resize-none focus:outline-none focus:border-black focus:ring-1 focus:ring-black disabled:bg-gray-50"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-2">
                    {tab === 'justificar'? (
                        <>
                            <button type="button" onClick={() => setTab('detalhes')} className="flex-1 h-[48px] rounded-full border border-gray-200 bg-white text-black font-bold text-[13px]">Voltar</button>
                            <button type="button" disabled={loading ||!podeJustificar} onClick={uploadAndJustificar} className="flex-[1.6] h-[48px] rounded-full bg-black text-white font-bold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50">
                                {loading? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enviar justificativa
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={onClose} className="flex-1 h-[48px] rounded-full border border-gray-200 bg-white text-black font-bold text-[13px]">Fechar</button>
                            {podeJustificar && <button type="button" onClick={() => setTab('justificar')} className="flex-1 h-[48px] rounded-full bg-black text-white font-bold text-[13px] flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Justificar falta</button>}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
    return typeof document!== 'undefined'? createPortal(content, document.body) : null
}
