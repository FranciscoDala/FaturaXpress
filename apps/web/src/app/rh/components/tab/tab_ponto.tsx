import { useEffect, useState, useMemo, useRef } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings, Search, Loader2, Calendar, ChevronDown, AlertTriangle, Info, User, Clock, X, FileText, Check, Ban, Trash2, FileCheck, Upload, Eye, Shield } from 'lucide-react'
import { createPortal } from 'react-dom'
import ModalConfigPonto from '../modals/modal_configurar_atraso'
import ModalMarcarFalta from '../modals/modal_marcar_falta'
import ModalCalendarioPonto from '../modals/modal_calendario_ponto'
import RelatorioAuditoriaPonto from '../pdf/pdf_relatorioPonto'

type Func = { id: string; nome: string; area?: string; funcao?: string; cargo?: string; area_principal?: any; funcao_principal?: any }
type BaseAudit = {
  id: string; funcionario_id: string; is_retroativo?: boolean; lancado_por_id?: string | null; lancado_por_nome?: string | null;
  motivo_retroativo?: string | null; lancado_em?: string | null;
  justificativa_tipo?: string | null; justificativa_obs?: string | null; justificativa_anexo_url?: string | null;
  justificado_em?: string | null; justificado_por_id?: string | null; justificado_por_nome?: string | null;
  aprovado_por_id?: string | null; aprovado_por_nome?: string | null; aprovado_em?: string | null;
  abonada?: boolean;
}
type Ponto = BaseAudit & { tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Falta = BaseAudit & { motivo: string; status: string; tipo: string }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }
type AuditPonto = Ponto & { _kind: 'ponto' }
type AuditFalta = Falta & { _kind: 'falta' }
type AuditData = AuditPonto | AuditFalta

function formatAtraso(min: number): string { if (!min || min <= 0) return ''; if (min < 60) return `${min}min de atraso`; const h = Math.floor(min / 60); const m = min % 60; if (m === 0) return `${h}h de atraso`; return `${h}h:${String(m).padStart(2,'0')}min de atraso` }
function capitalizarFalta(txt: string): string { const lower = txt.toLowerCase(); if (lower.includes('nao_apareceu') || lower.includes('não apareceu')) return 'Não apareceu'; if (lower.includes('doente')) { const resto = txt.split('|')[1]?.trim() || ''; return resto? resto.charAt(0).toUpperCase() + resto.slice(1).toLowerCase() : 'Doente' } if (lower.includes('falta - rh') || lower.includes('falta -')) return 'Falta - rh'; if (lower.startsWith('outros')) { const resto = txt.split('|')[1]?.trim() || txt.replace(/outros\s*\|?/i, '').trim(); return resto? `Outros - ${resto}` : 'Outros' } return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase() }
function prettyFalta(motivo: string): string { if (!motivo) return "Não apareceu"; if (motivo.includes('|')) { const parte = motivo.split('|')[1]?.trim() || motivo.split('|')[0]?.trim(); return capitalizarFalta(parte) } return capitalizarFalta(motivo) }
function isoToday(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatDisplay(iso: string): string { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}` }
function addDays(iso: string, days: number): string { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

const TIPOS_COMPROVANTE = [
  { value: 'atestado', label: 'Atestado Médico' },
  { value: 'declaracao', label: 'Declaração' },
  { value: 'licenca', label: 'Licença' },
  { value: 'outros', label: 'Outros' },
]

function ModalFaltaMae({ data, open, onClose, onSaved, dataSelecionada, usuario }: { data: AuditData | null, open: boolean, onClose: ()=>void, onSaved: ()=>void, dataSelecionada: string, usuario?: any }) {
    const [tab, setTab] = useState<'detalhes' | 'justificar' | 'gestao'>('detalhes')
    const [tipo, setTipo] = useState<string>('atestado')
    const [obs, setObs] = useState<string>('')
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const fileRef = useRef<HTMLInputElement>(null)

    useEffect(()=>{
        if(open){
            document.body.style.overflow='hidden'
            document.documentElement.style.overflow='hidden'
            if(data?._kind === 'falta'){
              const f = data as AuditFalta
              setTipo(f.justificativa_tipo || 'atestado')
              setObs(f.justificativa_obs || '')
              setPreviewUrl(f.justificativa_anexo_url || null)
              setFile(null)
              if(f.justificativa_tipo) setTab('gestao')
              else setTab('detalhes')
            } else {
              setTab('detalhes')
            }
            return()=>{ document.body.style.overflow=''; document.documentElement.style.overflow='' }
        }
    },[open, data])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const f = e.target.files?.[0]
        if(!f) return
        if(f.size > 5*1024*1024){ toast.error('Arquivo máx 5MB'); return }
        if(!['application/pdf','image/jpeg','image/png','image/jpg'].includes(f.type)){ toast.error('Só PDF ou IMG'); return }
        setFile(f)
        if(f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f))
        else setPreviewUrl(null)
    }

    if(!open ||!data) return null
    const isFalta = data._kind === 'falta'
    const falta = data as AuditFalta
    const isAdmin = usuario?.cargo === 'admin' || usuario?.cargo === 'rh'
    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    const uploadAndJustificar = async (): Promise<void> => {
      if(!obs.trim()){ toast.error('Informe a observação'); return }
      if(!file &&!previewUrl){ toast.error('Selecione o comprovante'); return }
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado')
        const logado = stored? JSON.parse(stored): null
        let anexoUrl: string | null = previewUrl
        if(file){
          const fd = new FormData()
          fd.append('file', file)
          try {
            const up = await api.post('/api/upload/falta', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            anexoUrl = (up.data as any).url || (up.data as any).file_url
          } catch {
            anexoUrl = await new Promise<string>((res)=>{
              const r = new FileReader()
              r.onload = () => res(r.result as string)
              r.readAsDataURL(file)
            })
          }
        }
        await api.post(`/api/rh/falta/${falta.id}/justificar`, {
          tipo, observacao: obs, anexo_url: anexoUrl, justificado_por_id: logado?.id || usuario?.id
        })
        toast.success('Justificativa enviada')
        onSaved(); onClose()
      } catch(e: any){ toast.error(e?.response?.data?.detail || 'Erro ao justificar') }
      finally{ setLoading(false) }
    }

    const handleAprovar = async (): Promise<void> => {
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado')
        const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/aprovar`, { aprovado_por_id: logado?.id || usuario?.id })
        toast.success('Falta abonada')
        onSaved(); onClose()
      } catch{ toast.error('Erro ao aprovar') } finally{ setLoading(false) }
    }
    const handleRejeitar = async (): Promise<void> => {
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado')
        const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/rejeitar`, { aprovado_por_id: logado?.id || usuario?.id })
        toast.success('Rejeitada')
        onSaved(); onClose()
      } catch{ toast.error('Erro') } finally{ setLoading(false) }
    }
    const handleRemover = async (): Promise<void> => {
      if(!confirm('Remover falta abonada?')) return
      setLoading(true)
      try { await api.delete(`/api/rh/falta/${falta.id}`); toast.success('Falta removida'); onSaved(); onClose() }
      catch(e: any){ toast.error(e?.response?.data?.detail || 'Erro') } finally{ setLoading(false) }
    }

    const TabButton = ({ id, label, icon: Icon }: { id: 'detalhes' | 'justificar' | 'gestao', label: string, icon: any }) => (
      <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full transition border shrink-0 ${tab === id? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Icon className="w-4 h-4"/>{label}</button>
    )

    const modalContent = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-[24px] w-full max-w-[460px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
          <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
            <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><FileText className="w-4 h-4 text-[#0095ff]"/></div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
            <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{isFalta? 'Gestão de Falta' : 'Ponto Retroativo'}</h3>
            <p className="text-[13.5px] text-gray-500 mt-1">{isFalta? `${formatDisplay(dataSelecionada)} • ${prettyFalta(falta.motivo)} • ${falta.abonada? 'abonada' : falta.status}` : `${formatDisplay(dataSelecionada)}`}</p>
            {isFalta && (
              <div className="flex gap-[2px] mt-4 overflow-x-auto no-scrollbar">
                <TabButton id="detalhes" label="Detalhes" icon={Info} />
                <TabButton id="justificar" label="Justificar" icon={FileCheck} />
                <TabButton id="gestao" label="Gestão" icon={Shield} />
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 overscroll-contain" style={{ scrollbarWidth:'none', msOverflowStyle:'none' as any }}>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            {tab === 'detalhes' && (
              <div className="flex flex-col gap-[8px]">
                <div className="flex items-center gap-2 p-3 rounded-[12px] bg-gray-50 border"><Clock className="w-4 h-4 text-black/60 shrink-0"/><div><p className="text-black/60 text-[11px]">{isFalta? 'Falta referente a' : 'Batido em'}</p><p className="font-bold text-black text-[13px]">{isFalta? `${formatDisplay(dataSelecionada)} • ${prettyFalta((data as AuditFalta).motivo)}` : `${new Date((data as AuditPonto).timestamp).toLocaleString('pt-AO')} • ${(data as AuditPonto).tipo}`}</p></div></div>
                <div className="flex items-center gap-2 p-3 rounded-[12px] bg-gray-50 border"><User className="w-4 h-4 text-black/60 shrink-0"/><div><p className="text-black/60 text-[11px]">Lançado por</p><p className="font-bold text-black text-[13px]">{data.lancado_por_nome || 'RH / Sistema'}</p></div></div>
                {data.lancado_em && <div className="flex items-center gap-2 p-3 rounded-[12px] bg-gray-50 border"><Calendar className="w-4 h-4 text-black/60 shrink-0"/><div><p className="text-black/60 text-[11px]">Registro</p><p className="font-bold text-black text-[13px]">{new Date(data.lancado_em).toLocaleString('pt-AO')}</p></div></div>}
                <div className="p-3 rounded-[12px] bg-amber-50 border border-amber-200"><p className="text-[11px] text-amber-800/70 font-bold mb-1">Motivo registrado</p><p className="text-[13px] text-amber-900">{data.motivo_retroativo || (isFalta? (data as AuditFalta).motivo : 'Sem motivo')}</p></div>
                {isFalta && falta.justificativa_tipo && (
                  <div className="p-3 rounded-[12px] bg-blue-50 border border-blue-200">
                    <p className="text-[11px] font-bold text-blue-800">Justificativa enviada</p>
                    <p className="text-[13px] text-blue-900 mt-1"><b>{falta.justificativa_tipo}</b> • {falta.justificativa_obs}</p>
                    {falta.justificativa_anexo_url && (
                      <div className="mt-2">
                        {(falta.justificativa_anexo_url.includes('image') || falta.justificativa_anexo_url.startsWith('data:image'))?
                          <img src={falta.justificativa_anexo_url} alt="comprovante" className="w-full max-h-[180px] object-contain rounded-[12px] border bg-white"/> :
                          <a href={falta.justificativa_anexo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] text-blue-700 underline"><Eye className="w-3 h-3"/> Ver comprovante PDF</a>
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {tab === 'justificar' && isFalta && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-black mb-2">TIPO DE COMPROVANTE</p>
                  <select value={tipo} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>{setTipo(e.target.value); setFile(null);}} className={inputClass}>
                    {TIPOS_COMPROVANTE.map((t: {value:string,label:string})=><option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                {tipo && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] font-bold tracking-widest text-black">COMPROVANTE - {tipo.toUpperCase()} *</p>
                    <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden"/>
                    <button type="button" onClick={()=>fileRef.current?.click()} className="w-full h-[88px] border-2 border-dashed border-gray-300 rounded-[12px] flex flex-col items-center justify-center gap-1 hover:border-[#0095ff] hover:bg-[#E6F0FF]/30 transition bg-white">
                      <Upload className="w-5 h-5 text-black/60"/>
                      <span className="text-[12px] text-black font-medium">{file? file.name : 'Clique para carregar PDF ou imagem'}</span>
                      <span className="text-[10px] text-black/50">PDF, JPG, PNG - máx 5MB</span>
                    </button>
                    {file && file.type.startsWith('image/') && previewUrl && (
                      <img src={previewUrl} alt="preview" className="w-full max-h-[160px] object-contain rounded-[12px] border bg-white p-2"/>
                    )}
                    {!file && previewUrl &&!previewUrl.startsWith('data:image') && previewUrl.startsWith('data:application') && (
                      <div className="p-3 rounded-[12px] bg-gray-50 border flex items-center justify-between">
                        <span className="text-[12px] text-black truncate flex items-center gap-2"><FileText className="w-4 h-4"/> comprovante.pdf</span>
                        <a href={previewUrl} target="_blank" rel="noreferrer" className="text-[11px] text-[#0095ff] font-bold flex items-center gap-1"><Eye className="w-3 h-3"/> Ver</a>
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-bold tracking-widest text-black mb-2">OBSERVAÇÃO</p>
                  <textarea value={obs} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>)=>setObs(e.target.value)} placeholder="Ex: Consulta médica no dia..." className="w-full min-h-[80px] bg-white border border-gray-200 rounded-[12px] p-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] resize-none" />
                </div>
              </div>
            )}
            {tab === 'gestao' && isFalta && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-[12px] bg-gray-50 border">
                  <p className="text-[11px] font-bold text-black mb-2">STATUS ATUAL</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`px-3 py-1 rounded-full text-[11px] border font-medium ${falta.status==='pendente'? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white text-black/40'}`}>Pendente</span>
                    <span className={`px-3 py-1 rounded-full text-[11px] border font-medium ${falta.status==='pendente_justificacao'? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-black/40'}`}>Em análise</span>
                    <span className={`px-3 py-1 rounded-full text-[11px] border font-medium ${falta.status==='justificado'? 'bg-green-50 border-green-200 text-green-700' : 'bg-white text-black/40'}`}>Abonada</span>
                  </div>
                </div>
                {falta.justificativa_anexo_url && (
                  <div className="p-3 rounded-[12px] bg-white border">
                    <p className="text-[11px] font-bold text-black mb-2">COMPROVANTE PARA ANÁLISE RH</p>
                    {(falta.justificativa_anexo_url.includes('pdf') || falta.justificativa_anexo_url.startsWith('data:application'))? (
                      <a href={falta.justificativa_anexo_url} target="_blank" rel="noreferrer" className="w-full h-[44px] bg-black text-white rounded-[12px] flex items-center justify-center gap-2 text-[12px] font-bold"><Eye className="w-4 h-4"/> Abrir PDF</a>
                    ) : (
                      <img src={falta.justificativa_anexo_url} alt="comprovante" className="w-full max-h-[240px] object-contain rounded-[12px] border bg-gray-50"/>
                    )}
                    <p className="text-[11px] text-black/60 mt-2">{falta.justificativa_tipo} • {falta.justificativa_obs}</p>
                  </div>
                )}
                {!isAdmin && <p className="text-[12px] text-gray-500 bg-gray-50 p-3 rounded-[12px] border text-center">Aguardando RH analisar o comprovante</p>}
              </div>
            )}
          </div>
          <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[8px]">
            {tab === 'justificar'? (
              <>
                <button type="button" onClick={()=>setTab('detalhes')} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-gray-600" /></button>
                <button type="button" disabled={loading} onClick={uploadAndJustificar} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] flex items-center justify-center disabled:opacity-50">
                  {loading? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}
                </button>
              </>
            ) : tab === 'gestao' && isAdmin? (
              <>
                <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-gray-600" /></button>
                {falta.status === 'pendente_justificacao' && (
                  <>
                    <button type="button" disabled={loading} onClick={handleRejeitar} className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center hover:bg-red-100"><Ban className="w-5 h-5 text-red-600"/></button>
                    <button type="button" disabled={loading} onClick={handleAprovar} className="flex-1 h-11 rounded-full bg-[#00c950] text-white flex items-center justify-center hover:bg-[#00b347]"><Check className="w-5 h-5"/></button>
                  </>
                )}
                {falta.abonada && (
                  <button type="button" disabled={loading} onClick={handleRemover} className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80"><Trash2 className="w-5 h-5"/></button>
                )}
                {falta.status === 'pendente' && (
                  <button type="button" onClick={()=>setTab('justificar')} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white flex items-center justify-center"><Upload className="w-5 h-5"/></button>
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-gray-600" /></button>
                {isFalta && <button type="button" onClick={()=>setTab('justificar')} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white flex items-center justify-center"><Upload className="w-5 h-5"/></button>}
              </>
            )}
          </div>
        </div>
      </div>
    )
    return typeof document!== 'undefined'? createPortal(modalContent, document.body) : null
}

export default function TabPonto({ empresa, usuario }: { empresa?: any, usuario?: any }) {
    const [funcs, setFuncs] = useState<Func[]>([])
    const [pontos, setPontos] = useState<Ponto[]>([])
    const [faltas, setFaltas] = useState<Falta[]>([])
    const [faltasPeriodo, setFaltasPeriodo] = useState<Record<string, number>>({})
    const [config, setConfig] = useState<Config | null>(null)
    const [loading, setLoading] = useState<boolean>(true)
    const [batendo, setBatendo] = useState<string | null>(null)
    const [page, setPage] = useState<number>(1)
    const [openCfg, setOpenCfg] = useState<boolean>(false)
    const [openFalta, setOpenFalta] = useState<{ open: boolean, func: Func | null }>({ open: false, func: null })
    const [openCal, setOpenCal] = useState<boolean>(false)
    const [openRelatorio, setOpenRelatorio] = useState<boolean>(false)
    const [search, setSearch] = useState<string>('')
    const [dataSelecionada, setDataSelecionada] = useState<string>(() => isoToday())
    const [auditData, setAuditData] = useState<AuditData | null>(null)
    const perPage = 10
    const hoje = isoToday()
    const minDate = addDays(hoje, -6)

    const load = async (): Promise<void> => {
        setLoading(true)
        try {
            const [fRes, pRes, cRes, faltaRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get(`/api/rh/ponto?data=${dataSelecionada}`),
                api.get('/api/rh/ponto/config').catch(() => ({ data: null } as any)),
                api.get(`/api/rh/faltas?data=${dataSelecionada}`).catch(() => ({ data: [] } as any))
            ])
            setFuncs((fRes.data as any[]).map((f: any) => ({...f, area: f.area_principal?.nome || f.area || 'Geral', funcao: f.funcao_principal?.nome || f.funcao || f.cargo || f.area_principal?.nome || 'Geral'})))
            setPontos(pRes.data as Ponto[])
            setFaltas(faltaRes.data as Falta[])
            if ((cRes.data as any)) setConfig(cRes.data as Config)
            try {
                const periodo = (cRes.data as any)?.periodo_regra || 'semana'
                const { data: pontosPeriodo } = await api.get(`/api/rh/ponto/${periodo}`)
                const contagem: Record<string, number> = {}
                ;(pontosPeriodo as any[]).forEach((p: any) => { if (p.tipo === 'entrada' && p.atraso_min > 0) { contagem[p.funcionario_id] = (contagem[p.funcionario_id] || 0) + 1 } })
                setFaltasPeriodo(contagem)
            } catch {}
        } catch { toast.error('Erro ao carregar ponto') } finally { setLoading(false) }
    }

    useEffect(() => { load() }, [dataSelecionada])
    useEffect(() => { setPage(1) }, [search])

    const pontosPorFunc = useMemo(() => {
      const map = new Map<string, Ponto[]>()
      pontos.forEach((p: Ponto) => {
        if (!map.has(p.funcionario_id)) map.set(p.funcionario_id, [])
        map.get(p.funcionario_id)!.push(p)
      })
      return map
    }, [pontos])

    const faltasPorFunc = useMemo(() => {
      const map = new Map<string, Falta>()
      faltas.forEach((f: Falta) => { if(!map.has(f.funcionario_id)) map.set(f.funcionario_id, f) })
      return map
    }, [faltas])

    const filtered = useMemo(() => {
      if (!search.trim()) return funcs
      const s = search.toLowerCase()
      return funcs.filter((f: Func) => f.nome.toLowerCase().includes(s) || (f.area || '').toLowerCase().includes(s) || (f.funcao || '').toLowerCase().includes(s))
    }, [funcs, search])

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginatedFuncs = useMemo(() => {
      const start = (page - 1) * perPage
      return filtered.slice(start, start + perPage)
    }, [filtered, page])

    const bater = async (funcId: string, tipo: string): Promise<void> => {
        setBatendo(funcId)
        try {
            const stored = localStorage.getItem('funcionario_logado')
            const logado = stored? JSON.parse(stored): null
            const payload: any = { funcionario_id: funcId, tipo, data: dataSelecionada, lancado_por_id: logado?.id }
            if (dataSelecionada!== hoje) payload.motivo_retroativo = `Lançamento retroativo ${formatDisplay(dataSelecionada)} - Correção RH`
            const { data } = await api.post('/api/rh/ponto/bater', payload)
            const atraso = (data as any).atraso_min?? (data as any).ponto?.atraso_min?? 0
            if (atraso > 0) toast.warning(`Entrada com ${formatAtraso(atraso)}`); else toast.success(`${tipo} batido em ${formatDisplay(dataSelecionada)}`)
            if ((data as any).falta_gerada) toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} atrasos`)
            await load()
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro ao bater ponto') } finally { setBatendo(null) }
    }

    if (loading) return (<div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/40" /></div>)

    return (
        <>
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 w-full">
                        <div className="w-full md:w-auto flex items-center gap-2">
                            <button type="button" onClick={() => setOpenCal(true)} className="flex-1 md:flex-none md:w-auto min-w-0 h-[40px] md:h-[36px] px-3 bg-white border rounded-full flex items-center justify-between gap-2 text-[14px] md:text-[13px] font-bold text-black hover:border-black transition shrink">
                                <span className="flex items-center gap-2 truncate"><Calendar className="w-4 h-4 shrink-0" />{formatDisplay(dataSelecionada)}</span>
                                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            {dataSelecionada!== hoje && <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-[11px] text-amber-800 font-bold whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Retroativo</span>}
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-none md:w-[300px]">
                                <Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Buscar funcionário..." className="w-full h-[40px] md:h-[36px] bg-white border border-gray-200 rounded-full pl-8 pr-3 text-[13px] md:text-[12px] text-black placeholder:text-black/40 focus:outline-none focus:border-black" />
                            </div>
                            <button onClick={()=>setOpenRelatorio(true)} className="h-[40px] w-10 md:w-auto md:h-[36px] md:px-4 rounded-full bg-black text-white flex items-center justify-center gap-1.5 hover:bg-black/90 shrink-0">
                                <FileText className="w-4 h-4" /><span className="hidden md:inline text-[11px] font-bold">Relatório</span>
                            </button>
                            <button onClick={() => setOpenCfg(true)} className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm shrink-0">
                                <Settings className="w-4 h-4 text-black" />
                            </button>
                        </div>
                    </div>
                    <p className="text-[11px] text-black/60">Lista de presença de todos funcionarios da empresa</p>
                </div>
                <div className="max-h-[70vh] overflow-y-auto no-scrollbar overscroll-contain">
                    {paginatedFuncs.length === 0 && <p className="text-center py-8 text-[12px] text-black/50">Nenhum funcionário para "{search}"</p>}
                    {paginatedFuncs.map((f: Func) => {
                        const lista = (pontosPorFunc.get(f.id) || []).sort((a: Ponto, b: Ponto) => +new Date(b.timestamp) - +new Date(a.timestamp))
                        const temEntrada = lista.some((p: Ponto) => p.tipo === 'entrada')
                        const temSaida = lista.some((p: Ponto) => p.tipo === 'saida')
                        const falta = faltasPorFunc.get(f.id)
                        const atrasos = faltasPeriodo[f.id] || 0
                        return (
                            <div key={f.id} className="px-3 md:px-4 py-2.5 border-b last:border-b-0 flex justify-between items-center gap-3">
                                <div className="min-w-0 flex-1"><p className="font-bold text-[13px] text-black truncate">{f.nome} <span className="font-normal text-black/60">• {f.funcao}</span></p>
                                    {falta? (
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        <button onClick={() => setAuditData({...falta, _kind: 'falta' } as AuditData)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border font-medium hover:scale-[1.02] transition ${falta.abonada? 'bg-green-50 border-green-200 text-green-700' : falta.status==='pendente_justificacao'? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                          {falta.abonada? <Check className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>} Falta • {prettyFalta(falta.motivo)} • {falta.abonada? 'abonada' : falta.status==='pendente_justificacao'? 'em análise' : 'pendente'}
                                        </button>
                                      </div>
                                    ) : lista.length === 0? (
                                      <div className="mt-1.5 flex flex-wrap gap-1 items-center"><span className="text-[11px] text-black/60">Sem ponto em {formatDisplay(dataSelecionada)}</span>{atrasos > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}</div>
                                    ) : (
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {lista.map((p: Ponto) => {
                                          const isAtraso =!!(p.atraso_min && p.atraso_min > 0);
                                          const baseCls = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition hover:scale-[1.02] active:scale-95 cursor-pointer`;
                                          return <button key={p.id} onClick={() => { if(p.is_retroativo) setAuditData({...p, _kind: 'ponto' } as AuditData) }} className={`${baseCls} ${isAtraso? 'bg-amber-50 border-amber-200 text-amber-800 font-medium' : p.tipo === 'entrada'? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff] font-semibold' : 'bg-gray-50 border-gray-200 text-black/60'} ${p.is_retroativo? 'ring-1 ring-amber-300' : ''}`}>{p.tipo} {new Date(p.timestamp).toLocaleTimeString('pt-AO')}{p.is_retroativo && <><span className="w-px h-3 bg-amber-300 mx-1"/> <Info className="w-3 h-3"/></>}</button>
                                        })}
                                      </div>
                                    )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {falta? <button onClick={() => setAuditData({...falta, _kind: 'falta' } as AuditData)} className={`h-[26px] px-3 flex items-center text-[11px] rounded-full font-medium border ${falta.abonada? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>{falta.abonada? 'Abonada' : 'Gerir'}</button> :!temEntrada? <><button disabled={batendo === f.id} onClick={() => bater(f.id, 'entrada')} className="h-[26px] px-3 bg-[#0095ff] text-white rounded-full text-[11px] font-medium disabled:opacity-50">Entrada</button><button onClick={() => setOpenFalta({ open: true, func: f })} className="h-[26px] px-3 bg-red-50 border border-red-200 text-red-600 rounded-full text-[11px] font-medium">Falta</button></> :!temSaida? <button disabled={batendo === f.id} onClick={() => bater(f.id, 'saida')} className="h-[26px] px-3 border bg-white rounded-full text-[11px] text-black">Saída</button> : <span className="h-[26px] px-3 flex items-center text-[11px] bg-gray-100 text-black rounded-full border">Completo</span>}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {totalPages > 1 && (<div className="flex justify-between items-center p-2.5 border-t bg-gray-50"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-[11px] rounded-full border bg-white text-black disabled:opacity-40">Anterior</button><span className="text-[11px] text-black/60">Página {page} de {totalPages} • {formatDisplay(dataSelecionada)}</span><button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-[11px] rounded-full bg-black text-white disabled:opacity-40">Próxima</button></div>)}
            </div>
            {openRelatorio && <RelatorioAuditoriaPonto dataSelecionada={dataSelecionada} pontos={pontos} faltas={faltas} funcs={funcs} empresa={empresa} minDate={minDate} hoje={hoje} onClose={()=>setOpenRelatorio(false)} />}
            <ModalFaltaMae data={auditData} open={!!auditData} onClose={()=>setAuditData(null)} onSaved={load} dataSelecionada={dataSelecionada} usuario={usuario} />
            <ModalCalendarioPonto open={openCal} value={dataSelecionada} onClose={() => setOpenCal(false)} onSelect={setDataSelecionada} />
            <ModalConfigPonto open={openCfg} onClose={() => { setOpenCfg(false); load() }} />
            <ModalMarcarFalta open={openFalta.open} funcionario={openFalta.func} dataSelecionada={dataSelecionada} onClose={() => setOpenFalta({ open: false, func: null })} onSaved={() => { setOpenFalta({ open: false, func: null }); load() }} />
        </>
    )
}
