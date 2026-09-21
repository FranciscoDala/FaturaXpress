import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings, Search, Loader2, Calendar, ChevronDown, AlertTriangle, Info, User, Clock, X, FileText, Check, Ban, Trash2, FileCheck, Upload } from 'lucide-react'
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

function formatAtraso(min: number) { if (!min || min <= 0) return ''; if (min < 60) return `${min}min de atraso`; const h = Math.floor(min / 60); const m = min % 60; if (m === 0) return `${h}h de atraso`; return `${h}h:${String(m).padStart(2,'0')}min de atraso` }
function prettyFalta(motivo: string) { if (!motivo) return "Não apareceu"; if (motivo.includes('|')) { const parte = motivo.split('|')[1]?.trim() || motivo.split('|')[0]?.trim(); return capitalizarFalta(parte) } return capitalizarFalta(motivo) }
function capitalizarFalta(txt: string) { const lower = txt.toLowerCase(); if (lower.includes('nao_apareceu') || lower.includes('não apareceu')) return 'Não apareceu'; if (lower.includes('doente')) { const resto = txt.split('|')[1]?.trim() || ''; return resto? resto.charAt(0).toUpperCase() + resto.slice(1).toLowerCase() : 'Doente' } if (lower.includes('falta - rh') || lower.includes('falta -')) return 'Falta - rh'; if (lower.startsWith('outros')) { const resto = txt.split('|')[1]?.trim() || txt.replace(/outros\s*\|?/i, '').trim(); return resto? `Outros - ${resto}` : 'Outros' } return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase() }
function isoToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatDisplay(iso: string) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}` }
function addDays(iso: string, days: number) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

// MODAL MÃE COM ABAS - SUBSTITUI TUDO
function ModalFaltaMae({ data, open, onClose, onSaved, dataSelecionada, usuario }: { data: AuditData | null, open: boolean, onClose: ()=>void, onSaved: ()=>void, dataSelecionada: string, usuario?: any }) {
    const [tab, setTab] = useState<'detalhes' | 'justificar' | 'gestao'>('detalhes')
    const [tipo, setTipo] = useState('atestado')
    const [obs, setObs] = useState('')
    const [anexo, setAnexo] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(()=>{
        if(open){
            const ob = document.body.style.overflow;
            const oh = document.documentElement.style.overflow;
            document.body.style.overflow='hidden';
            document.documentElement.style.overflow='hidden';
            // reset form
            if(data?._kind === 'falta'){
              setTipo((data as any).justificativa_tipo || 'atestado')
              setObs((data as any).justificativa_obs || '')
              setAnexo((data as any).justificativa_anexo_url || '')
              // se ja tem justificativa, começa em gestão
              if((data as AuditFalta).justificativa_tipo) setTab('gestao')
              else setTab('detalhes')
            } else {
              setTab('detalhes')
            }
            return()=>{ document.body.style.overflow=ob; document.documentElement.style.overflow=oh }
        }
    },[open, data])

    if(!open ||!data) return null
    const isFalta = data._kind === 'falta'
    const falta = data as AuditFalta
    const isAdmin = usuario?.cargo === 'admin' || usuario?.cargo === 'rh'
    const status = isFalta? falta.status : 'ok'

    const handleJustificar = async () => {
      if(!obs.trim()) return toast.error('Informe a observação')
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/justificar`, {
          tipo, observacao: obs, anexo_url: anexo || null, justificado_por_id: logado?.id || usuario?.id
        })
        toast.success('Justificativa enviada para análise')
        onSaved()
        onClose()
      } catch(e:any){ toast.error(e?.response?.data?.detail || 'Erro ao justificar') }
      finally{ setLoading(false) }
    }

    const handleAprovar = async () => {
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/aprovar`, { aprovado_por_id: logado?.id || usuario?.id })
        toast.success('Falta abonada')
        onSaved(); onClose()
      } catch(e:any){ toast.error('Erro ao aprovar') } finally{ setLoading(false) }
    }

    const handleRejeitar = async () => {
      setLoading(true)
      try {
        const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
        await api.post(`/api/rh/falta/${falta.id}/rejeitar`, { aprovado_por_id: logado?.id || usuario?.id, observacao: 'Rejeitado' })
        toast.success('Justificativa rejeitada')
        onSaved(); onClose()
      } catch(e:any){ toast.error('Erro') } finally{ setLoading(false) }
    }

    const handleRemover = async () => {
      if(!confirm('Remover falta abonada? Ela sai da folha.')) return
      setLoading(true)
      try {
        await api.delete(`/api/rh/falta/${falta.id}`)
        toast.success('Falta removida')
        onSaved(); onClose()
      } catch(e:any){ toast.error(e?.response?.data?.detail || 'Só pode remover falta abonada') }
      finally{ setLoading(false) }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-[420px] bg-white rounded-[20px] border shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-2 p-4 border-b shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isFalta? 'bg-red-50 border-red-200' : 'bg-amber-100 border-amber-200'}`}>
                    {isFalta? <AlertTriangle className="w-4 h-4 text-red-700"/> : <Clock className="w-4 h-4 text-amber-700"/>}
                  </div>
                  <div>
                    <h3 className="font-black text-[14px] text-black leading-none">{isFalta? 'Gestão de Falta' : 'Ponto retroativo'}</h3>
                    <p className="text-[11px] text-black/60 mt-0.5">{isFalta? `${status} ${falta.abonada? '• abonada' : ''}` : (data as AuditPonto).tipo}</p>
                  </div>
                  <button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X className="w-4 h-4 text-black"/></button>
                </div>

                {/* Tabs - só mostra abas se for falta */}
                {isFalta? (
                  <div className="flex gap-1 p-2 bg-gray-50 border-b">
                    <button onClick={()=>setTab('detalhes')} className={`flex-1 h-8 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 ${tab==='detalhes'? 'bg-black text-white' : 'bg-white border text-black/70'}`}><Info className="w-3 h-3"/>Detalhes</button>
                    <button onClick={()=>setTab('justificar')} className={`flex-1 h-8 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 ${tab==='justificar'? 'bg-black text-white' : 'bg-white border text-black/70'}`}><FileCheck className="w-3 h-3"/>Justificar</button>
                    <button onClick={()=>setTab('gestao')} className={`flex-1 h-8 rounded-full text-[11px] font-bold flex items-center justify-center gap-1 ${tab==='gestao'? 'bg-black text-white' : 'bg-white border text-black/70'}`}><Settings className="w-3 h-3"/>Gestão</button>
                  </div>
                ) : null}

                {/* Body */}
                <div className="overflow-y-auto no-scrollbar p-4 space-y-3 overscroll-contain flex-1">
                  {tab === 'detalhes' && (
                    <>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border"><Clock className="w-4 h-4 text-black/60 shrink-0"/><div><p className="text-black/60 text-[11px]">{isFalta? 'Falta referente a' : 'Batido em'}</p><p className="font-bold text-black text-[13px]">{isFalta? `${formatDisplay(dataSelecionada)} • ${prettyFalta((data as AuditFalta).motivo)}` : `${new Date((data as AuditPonto).timestamp).toLocaleString('pt-AO')} • ${(data as AuditPonto).tipo}`}</p></div></div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border"><User className="w-4 h-4 text-black/60 shrink-0"/><div><p className="text-black/60 text-[11px]">Lançado por</p><p className="font-bold text-black text-[13px]">{data.lancado_por_nome || 'RH / Sistema'}</p>{data.lancado_por_id && <p className="text-[11px] text-black/60">ID: {data.lancado_por_id.slice(0,8)}</p>}</div></div>
                      {data.lancado_em && (<div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border"><Calendar className="w-4 h-4 text-black/60 shrink-0"/><div><p className="text-black/60 text-[11px]">Registro do lançamento</p><p className="font-bold text-black text-[13px]">{new Date(data.lancado_em).toLocaleString('pt-AO')}</p></div></div>)}
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200"><p className="text-[11px] text-amber-800/70 font-bold mb-1 flex items-center gap-1"><Info className="w-3 h-3"/> Motivo registrado</p><p className="text-[12px] text-amber-900 leading-snug">{data.motivo_retroativo || (isFalta? (data as AuditFalta).motivo : 'Motivo não informado')}</p></div>
                      {isFalta && falta.justificativa_tipo && (
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                          <p className="text-[11px] text-blue-800/70 font-bold mb-1">Justificativa atual</p>
                          <p className="text-[12px] text-blue-900"><b>{falta.justificativa_tipo}</b> • {falta.justificativa_obs}</p>
                          {falta.justificativa_anexo_url && <a href={falta.justificativa_anexo_url} target="_blank" className="text-[11px] underline text-blue-700 flex items-center gap-1 mt-1"><Upload className="w-3 h-3"/> Ver anexo</a>}
                          <p className="text-[10px] text-blue-700/60 mt-1">Por {falta.justificado_por_nome} em {falta.justificado_em? new Date(falta.justificado_em).toLocaleString('pt-AO') : ''}</p>
                        </div>
                      )}
                    </>
                  )}

                  {tab === 'justificar' && isFalta && (
                    <div className="space-y-3">
                      {falta.abonada && <div className="p-2.5 rounded-xl bg-green-50 border border-green-200 text-[11px] text-green-800 font-bold flex items-center gap-1"><Check className="w-3 h-3"/> Esta falta já está abonada</div>}
                      <div>
                        <label className="text-[11px] font-bold text-black">Tipo de comprovante</label>
                        <select value={tipo} onChange={e=>setTipo(e.target.value)} className="mt-1 w-full h-10 border rounded-xl px-3 text-[13px] bg-white">
                          <option value="atestado">Atestado Médico</option>
                          <option value="declaracao">Declaração</option>
                          <option value="licenca">Licença</option>
                          <option value="outros">Outros</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-black">Observação / motivo real</label>
                        <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Ex: Consulta médica, atestado de 1 dia..." className="mt-1 w-full border rounded-xl p-3 text-[13px] h-24 resize-none" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-black">Link do anexo (S3, foto)</label>
                        <input value={anexo} onChange={e=>setAnexo(e.target.value)} placeholder="https://..." className="mt-1 w-full h-10 border rounded-xl px-3 text-[13px]" />
                      </div>
                    </div>
                  )}

                  {tab === 'gestao' && isFalta && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-gray-50 border">
                        <p className="text-[11px] font-bold text-black mb-2">Fluxo atual</p>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className={`px-2.5 py-1 rounded-full border ${falta.status==='pendente'? 'bg-orange-100 border-orange-200 text-orange-800' : 'bg-white text-black/50'}`}>Pendente</span>
                          <span>→</span>
                          <span className={`px-2.5 py-1 rounded-full border ${falta.status==='pendente_justificacao'? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-white text-black/50'}`}>Em análise</span>
                          <span>→</span>
                          <span className={`px-2.5 py-1 rounded-full border ${falta.status==='justificado'? 'bg-green-100 border-green-200 text-green-800' : 'bg-white text-black/50'}`}>Justificada</span>
                        </div>
                        {falta.abonada && <p className="text-[11px] text-green-700 mt-2 font-bold">✅ Abonada - não desconta na folha</p>}
                      </div>

                      {!isAdmin && <p className="text-[11px] text-black/60 text-center p-2">A aprovação é feita pelo RH/Admin</p>}

                      {isAdmin && (
                        <div className="grid gap-2">
                          {falta.status === 'pendente_justificacao' && (
                            <div className="flex gap-2">
                              <button onClick={handleRejeitar} disabled={loading} className="flex-1 h-11 rounded-full bg-red-50 border border-red-200 text-red-700 font-bold text-[12px] flex items-center justify-center gap-1"><Ban className="w-4 h-4"/>Rejeitar</button>
                              <button onClick={handleAprovar} disabled={loading} className="flex-1 h-11 rounded-full bg-green-600 text-white font-bold text-[12px] flex items-center justify-center gap-1"><Check className="w-4 h-4"/>Aprovar e abonar</button>
                            </div>
                          )}
                          {falta.status === 'pendente' && (
                            <button onClick={()=>setTab('justificar')} className="w-full h-11 rounded-full bg-black text-white font-bold text-[12px]">Ir justificar</button>
                          )}
                          {falta.abonada && (
                            <button onClick={handleRemover} disabled={loading} className="w-full h-11 rounded-full bg-white border border-red-200 text-red-600 font-bold text-[12px] flex items-center justify-center gap-1"><Trash2 className="w-4 h-4"/>Remover da folha (definitivo)</button>
                          )}
                          {!falta.abonada && falta.status === 'justificado' && (
                             <button onClick={handleRemover} disabled={loading} className="w-full h-11 rounded-full bg-white border text-black font-bold text-[12px]">Remover</button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!isFalta && tab==='detalhes' && (
                    <p className="text-[11px] text-black/50 text-center pt-2">Pontos retroativos só precisam de auditoria, não precisam justificar.</p>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t shrink-0 flex gap-2">
                  {tab === 'justificar'? (
                    <>
                      <button onClick={()=>setTab('detalhes')} className="flex-1 h-11 rounded-full bg-gray-100 text-black font-bold text-[13px]">Voltar</button>
                      <button onClick={handleJustificar} disabled={loading} className="flex-1 h-11 rounded-full bg-black text-white font-bold text-[13px] flex items-center justify-center gap-2">
                        {loading && <Loader2 className="w-4 h-4 animate-spin"/>} {falta.justificativa_tipo? 'Atualizar' : 'Enviar justificativa'}
                      </button>
                    </>
                  ) : (
                    <button onClick={onClose} className="w-full h-11 rounded-full bg-black text-white font-bold text-[13px]">Fechar</button>
                  )}
                </div>
            </div>
        </div>
    )
}

export default function TabPonto({ empresa, usuario }: { empresa?: any, usuario?: any }) {
    const [funcs, setFuncs] = useState<Func[]>([])
    const [pontos, setPontos] = useState<Ponto[]>([])
    const [faltas, setFaltas] = useState<Falta[]>([])
    const [faltasPeriodo, setFaltasPeriodo] = useState<Record<string, number>>({})
    const [config, setConfig] = useState<Config | null>(null)
    const [loading, setLoading] = useState(true)
    const [batendo, setBatendo] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [openCfg, setOpenCfg] = useState(false)
    const [openFalta, setOpenFalta] = useState<{ open: boolean, func: Func | null }>({ open: false, func: null })
    const [openCal, setOpenCal] = useState(false)
    const [openRelatorio, setOpenRelatorio] = useState(false)
    const [search, setSearch] = useState('')
    const [dataSelecionada, setDataSelecionada] = useState(() => isoToday())
    const [auditData, setAuditData] = useState<AuditData | null>(null)
    const perPage = 10
    const hoje = isoToday()
    const minDate = addDays(hoje, -6)
    const isHoje = dataSelecionada === hoje
    const isRetro =!isHoje

    const load = async () => {
        setLoading(true)
        try {
            const [fRes, pRes, cRes, faltaRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get(`/api/rh/ponto?data=${dataSelecionada}`),
                api.get('/api/rh/ponto/config').catch(() => ({ data: null })),
                api.get(`/api/rh/faltas?data=${dataSelecionada}`).catch(() => ({ data: [] }))
            ])
            setFuncs(fRes.data.map((f: any) => ({...f, area: f.area_principal?.nome || f.area || 'Geral', funcao: f.funcao_principal?.nome || f.funcao || f.cargo || f.area_principal?.nome || 'Geral'})))
            setPontos(pRes.data)
            setFaltas(faltaRes.data)
            if (cRes.data) setConfig(cRes.data)
            try {
                const periodo = cRes.data?.periodo_regra || 'semana'
                const { data: pontosPeriodo } = await api.get(`/api/rh/ponto/${periodo}`)
                const contagem: Record<string, number> = {}
                pontosPeriodo.forEach((p: any) => { if (p.tipo === 'entrada' && p.atraso_min > 0) { contagem[p.funcionario_id] = (contagem[p.funcionario_id] || 0) + 1 } })
                setFaltasPeriodo(contagem)
            } catch { }
        } catch { toast.error('Erro ao carregar ponto') } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [dataSelecionada])
    useEffect(() => { setPage(1) }, [search])

    const pontosPorFunc = useMemo(() => { const map = new Map<string, Ponto[]>(); pontos.forEach(p => { if (!map.has(p.funcionario_id)) map.set(p.funcionario_id, []); map.get(p.funcionario_id)!.push(p) }); return map }, [pontos])
    const faltasPorFunc = useMemo(() => { const map = new Map<string, Falta>(); faltas.forEach(f => { if(!map.has(f.funcionario_id)) map.set(f.funcionario_id, f) }); return map }, [faltas])
    const filtered = useMemo(() => { if (!search.trim()) return funcs; const s = search.toLowerCase(); return funcs.filter(f => f.nome.toLowerCase().includes(s) || (f.area || '').toLowerCase().includes(s) || (f.funcao || '').toLowerCase().includes(s)) }, [funcs, search])
    const totalPages = Math.ceil(filtered.length / perPage)
    const paginatedFuncs = useMemo(() => { const start = (page - 1) * perPage; return filtered.slice(start, start + perPage) }, [filtered, page])

    const bater = async (funcId: string, tipo: string) => {
        setBatendo(funcId)
        try {
            const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
            const payload: any = { funcionario_id: funcId, tipo, data: dataSelecionada, lancado_por_id: logado?.id }
            if (isRetro) payload.motivo_retroativo = `Lançamento retroativo ${formatDisplay(dataSelecionada)} - Correção RH`
            const { data } = await api.post('/api/rh/ponto/bater', payload)
            const atraso = data.atraso_min?? data.ponto?.atraso_min?? 0
            if (atraso > 0) toast.warning(`Entrada com ${formatAtraso(atraso)}`); else toast.success(`${tipo} batido em ${formatDisplay(dataSelecionada)}`)
            if (data.falta_gerada) toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} atrasos`)
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
                            {isRetro && <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-[11px] text-amber-800 font-bold whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Retroativo</span>}
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:flex-none md:w-[300px]">
                                <Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar funcionário..." className="w-full h-[40px] md:h-[36px] bg-white border border-gray-200 rounded-full pl-8 pr-3 text-[13px] md:text-[12px] text-black placeholder:text-black/40 focus:outline-none focus:border-black" />
                            </div>
                            <button onClick={()=>setOpenRelatorio(true)} className="h-[40px] w-10 md:w-auto md:h-[36px] md:px-4 rounded-full bg-black text-white flex items-center justify-center gap-1.5 hover:bg-black/90 shrink-0">
                                <FileText className="w-4 h-4" />
                                <span className="hidden md:inline text-[11px] font-bold">Relatório</span>
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
                    {paginatedFuncs.map(f => {
                        const lista = (pontosPorFunc.get(f.id) || []).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
                        const temEntrada = lista.some(p => p.tipo === 'entrada')
                        const temSaida = lista.some(p => p.tipo === 'saida')
                        const falta = faltasPorFunc.get(f.id)
                        const atrasos = faltasPeriodo[f.id] || 0
                        return (
                            <div key={f.id} className="px-3 md:px-4 py-2.5 border-b last:border-b-0 flex justify-between items-center gap-3">
                                <div className="min-w-0 flex-1"><p className="font-bold text-[13px] text-black truncate">{f.nome} <span className="font-normal text-black/60">• {f.funcao}</span></p>
                                    {falta? (
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        <button onClick={() => setAuditData({...falta, _kind: 'falta' } as AuditData)} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border font-medium hover:scale-[1.02] transition
                                          ${falta.abonada? 'bg-green-50 border-green-200 text-green-700' : falta.status==='pendente_justificacao'? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                          {falta.abonada? <Check className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                                          Falta • {prettyFalta(falta.motivo)} {falta.is_retroativo && '(retro)'} • {falta.abonada? 'abonada' : falta.status==='pendente_justificacao'? 'em análise' : 'pendente'}
                                        </button>
                                      </div>
                                    ) : lista.length === 0? (
                                      <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                        <span className="text-[11px] text-black/60">Sem ponto em {formatDisplay(dataSelecionada)}</span>
                                        {atrasos > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}
                                      </div>
                                    ) : (
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {lista.map(p => {
                                          const isAtraso =!!(p.atraso_min && p.atraso_min > 0);
                                          const isRetroPonto =!!p.is_retroativo;
                                          const baseCls = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition hover:scale-[1.02] active:scale-95 cursor-pointer`;
                                          if (isAtraso) {
                                            return (
                                              <button key={p.id} onClick={() => setAuditData({...p, _kind: 'ponto' } as AuditData)} className={`${baseCls} bg-amber-50 border-amber-200 text-amber-800 font-medium ${isRetroPonto? 'ring-1 ring-amber-300' : ''}`}>
                                                entrada {new Date(p.timestamp).toLocaleTimeString('pt-AO')} ({formatAtraso(p.atraso_min!)}){isRetroPonto && <><span className="w-px h-3 bg-amber-300 mx-1"/> <Info className="w-3 h-3"/> Ver motivo</>}
                                              </button>
                                            )
                                          }
                                          return (
                                            <button key={p.id} onClick={() => { if(p.is_retroativo) setAuditData({...p, _kind: 'ponto' } as AuditData) }} className={`${baseCls} ${p.tipo === 'entrada'? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff] font-semibold' : 'bg-gray-50 border-gray-200 text-black/60'} ${isRetroPonto? 'bg-amber-50! border-amber-200! text-amber-800! ring-1 ring-amber-300' : ''} ${!isRetroPonto? 'cursor-default' : ''}`}>
                                              {p.tipo} {new Date(p.timestamp).toLocaleTimeString('pt-AO')}{isRetroPonto && <><span className="w-px h-3 bg-amber-300 mx-1"/> <Info className="w-3 h-3"/> Ver motivo</>}
                                            </button>
                                          )
                                        })}
                                        {atrasos > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}
                                      </div>
                                    )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {falta? (
                                    <button onClick={() => setAuditData({...falta, _kind: 'falta' } as AuditData)} className={`h-[26px] px-3 flex items-center text-[11px] rounded-full font-medium border ${falta.abonada? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600'}`}>
                                      {falta.abonada? 'Abonada' : 'Gerir'}
                                    </button>
                                  ) :!temEntrada? (
                                    <><button disabled={batendo === f.id} onClick={() => bater(f.id, 'entrada')} className="h-[26px] px-3 bg-[#0095ff] text-white rounded-full text-[11px] font-medium disabled:opacity-50 hover:bg-[#0085e6]">Entrada</button><button onClick={() => setOpenFalta({ open: true, func: f })} className="h-[26px] px-3 bg-red-50 border border-red-200 text-red-600 rounded-full text-[11px] font-medium hover:bg-red-100">Falta</button></>
                                  ) :!temSaida? (
                                    <button disabled={batendo === f.id} onClick={() => bater(f.id, 'saida')} className="h-[26px] px-3 border border-gray-200 bg-white rounded-full text-[11px] text-black hover:bg-gray-50">Saída</button>
                                  ) : (
                                    <span className="h-[26px] px-3 flex items-center text-[11px] bg-gray-100 text-black rounded-full border">Completo</span>
                                  )}
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
