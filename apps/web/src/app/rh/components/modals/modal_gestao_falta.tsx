import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { X, Check, Ban, Trash2, FileText, Upload, Eye, Info, Clock, User, Calendar, Loader2 } from 'lucide-react'

type AuditData = any

const TIPOS_COMPROVANTE = [
  { value: 'atestado', label: 'Atestado Médico' },
  { value: 'declaracao', label: 'Declaração' },
  { value: 'licenca', label: 'Licença' },
  { value: 'outros', label: 'Outros' },
]

export default function ModalGestaoFalta({ data, open, onClose, onSaved, dataSelecionada, usuario }: { data: AuditData | null, open: boolean, onClose: ()=>void, onSaved: ()=>void, dataSelecionada: string, usuario?: any }) {
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
              setTipo(data.justificativa_tipo || 'atestado')
              setObs(data.justificativa_obs || '')
              setPreviewUrl(data.justificativa_anexo_url || null)
              setFile(null)
              if(data.justificativa_tipo) setTab('gestao')
              else setTab('detalhes')
            } else {
              setTab('detalhes')
            }
            return()=>{ document.body.style.overflow=''; document.documentElement.style.overflow='' }
        }
    },[open, data])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if(!f) return
        if(f.size > 5*1024*1024){ toast.error('Arquivo máx 5MB'); return }
        if(!['application/pdf','image/jpeg','image/png','image/jpg'].includes(f.type)){ toast.error('Só PDF ou IMG'); return }
        setFile(f)
        if(f.type.startsWith('image/')) setPreviewUrl(URL.createObjectURL(f))
        else setPreviewUrl(null)
    }

    if(!open ||!data) return null
    const falta = data
    const isAdmin = usuario?.cargo === 'admin' || usuario?.cargo === 'rh'
    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    const uploadAndJustificar = async () => {
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
        await api.post(`/api/rh/falta/${falta.id}/justificar`, { tipo, observacao: obs, anexo_url: anexoUrl, justificado_por_id: logado?.id || usuario?.id })
        toast.success('Justificativa enviada')
        onSaved(); onClose()
      } catch(e: any){ toast.error(e?.response?.data?.detail || 'Erro ao justificar') }
      finally{ setLoading(false) }
    }

    const handleAprovar = async () => {
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/aprovar`, { aprovado_por_id: logado?.id || usuario?.id })
        toast.success('Falta abonada'); onSaved(); onClose()
      } catch{ toast.error('Erro') } finally{ setLoading(false) }
    }
    const handleRejeitar = async () => {
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/rejeitar`, { aprovado_por_id: logado?.id || usuario?.id })
        toast.success('Rejeitada'); onSaved(); onClose()
      } catch{ toast.error('Erro') } finally{ setLoading(false) }
    }
    const handleRemover = async () => {
      if(!confirm('Remover falta abonada?')) return
      setLoading(true)
      try { await api.delete(`/api/rh/falta/${falta.id}`); toast.success('Falta removida'); onSaved(); onClose() }
      catch(e: any){ toast.error(e?.response?.data?.detail || 'Erro') } finally{ setLoading(false) }
    }

    const TabButton = ({ id, label, icon: Icon }: { id: any, label: string, icon: any }) => (
      <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full transition border shrink-0 ${tab === id? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Icon className="w-4 h-4"/>{label}</button>
    )

    const content = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-[24px] w-full max-w-[460px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
          <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
            <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><FileText className="w-4 h-4 text-[#0095ff]"/></div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
          </div>
          <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
            <h3 className="text-[18px] font-bold text-gray-900">Gestão de Falta</h3>
            <p className="text-[13.5px] text-gray-500 mt-1">{falta.status} {falta.abonada? '• abonada' : ''}</p>
            <div className="flex gap-[2px] mt-4 overflow-x-auto no-scrollbar">
              <TabButton id="detalhes" label="Detalhes" icon={Info} />
              <TabButton id="justificar" label="Justificar" icon={FileText} />
              <TabButton id="gestao" label="Gestão" icon={Check} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4">
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>
            {tab === 'detalhes' && (
              <div className="flex flex-col gap-2">
                <div className="p-3 rounded-[12px] bg-gray-50 border text-[13px] text-black"><b>Lançado por:</b> {data.lancado_por_nome || 'RH'}</div>
                <div className="p-3 rounded-[12px] bg-amber-50 border border-amber-200 text-[13px] text-amber-900">{data.motivo_retroativo || data.motivo}</div>
                {falta.justificativa_tipo && <div className="p-3 rounded-[12px] bg-blue-50 border border-blue-200 text-[13px]"><b>{falta.justificativa_tipo}</b> • {falta.justificativa_obs}</div>}
              </div>
            )}
            {tab === 'justificar' && (
              <div className="flex flex-col gap-3">
                <select value={tipo} onChange={e=>setTipo(e.target.value)} className={inputClass}>
                  {TIPOS_COMPROVANTE.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div className="flex flex-col gap-2">
                  <input ref={fileRef} type="file" accept="application/pdf,image/*" onChange={handleFileChange} className="hidden"/>
                  <button type="button" onClick={()=>fileRef.current?.click()} className="w-full h-[88px] border-2 border-dashed border-gray-300 rounded-[12px] flex flex-col items-center justify-center gap-1 hover:border-[#0095ff] bg-white">
                    <Upload className="w-5 h-5 text-black/60"/>
                    <span className="text-[12px] text-black font-medium">{file? file.name : 'Carregar PDF ou imagem'}</span>
                    <span className="text-[10px] text-black/50">PDF, JPG, PNG - máx 5MB</span>
                  </button>
                  {file && file.type.startsWith('image/') && previewUrl && <img src={previewUrl} alt="prev" className="w-full max-h-[160px] object-contain rounded-[12px] border"/>}
                </div>
                <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Observação" className="w-full min-h-[80px] bg-white border border-gray-200 rounded-[12px] p-3 text-[13.5px] resize-none" />
              </div>
            )}
            {tab === 'gestao' && (
              <div className="flex flex-col gap-3">
                {falta.justificativa_anexo_url && (
                  <div className="p-3 rounded-[12px] bg-white border">
                    <p className="text-[11px] font-bold mb-2">COMPROVANTE</p>
                    {falta.justificativa_anexo_url.includes('pdf') || falta.justificativa_anexo_url.startsWith('data:application')?
                      <a href={falta.justificativa_anexo_url} target="_blank" rel="noreferrer" className="w-full h-[44px] bg-black text-white rounded-[12px] flex items-center justify-center gap-2 text-[12px] font-bold"><Eye className="w-4 h-4"/> Abrir PDF</a> :
                      <img src={falta.justificativa_anexo_url} alt="doc" className="w-full max-h-[240px] object-contain rounded-[12px] border"/>}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0 px-6 py-4 border-t bg-white flex gap-2">
            {tab === 'justificar'? (
              <>
                <button type="button" onClick={()=>setTab('detalhes')} className="flex-1 h-11 rounded-full border bg-white flex items-center justify-center"><X className="w-5 h-5"/></button>
                <button type="button" disabled={loading} onClick={uploadAndJustificar} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white flex items-center justify-center disabled:opacity-50">{loading? <Loader2 className="w-5 h-5 animate-spin"/> : <Check className="w-5 h-5"/>}</button>
              </>
            ) : tab === 'gestao' && isAdmin? (
              <>
                <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border bg-white flex items-center justify-center"><X className="w-5 h-5"/></button>
                {falta.status === 'pendente_justificacao' && <>
                  <button type="button" onClick={handleRejeitar} className="w-11 h-11 rounded-full bg-red-50 border border-red-200 flex items-center justify-center"><Ban className="w-5 h-5 text-red-600"/></button>
                  <button type="button" onClick={handleAprovar} className="flex-1 h-11 rounded-full bg-[#00c950] text-white flex items-center justify-center"><Check className="w-5 h-5"/></button>
                </>}
                {falta.abonada && <button type="button" onClick={handleRemover} className="w-11 h-11 rounded-full bg-black text-white flex items-center justify-center"><Trash2 className="w-5 h-5"/></button>}
              </>
            ) : (
              <>
                <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border bg-white flex items-center justify-center"><X className="w-5 h-5"/></button>
                <button type="button" onClick={()=>setTab('justificar')} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white flex items-center justify-center"><Upload className="w-5 h-5"/></button>
              </>
            )}
          </div>
        </div>
      </div>
    )
    return typeof document!== 'undefined'? createPortal(content, document.body) : null
}
