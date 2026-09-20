import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings, Search, Loader2, Calendar, ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, Info, User, Clock, X, Download } from 'lucide-react'
import ModalConfigPonto from '../modals/modal_configurar_atraso'
import ModalMarcarFalta from '../modals/modal_marcar_falta'
import ModalCalendarioPonto from '../modals/modal_calendario_ponto'
import { exportPontoPDF } from '../../../../lib/export_ponto'
import RelatorioAuditoriaPonto from '../pdf/pdf_relatorioPonto'

type Func = { id: string; nome: string; area?: string; funcao?: string; cargo?: string; area_principal?: any; funcao_principal?: any }
type BaseAudit = { id: string; funcionario_id: string; is_retroativo?: boolean; lancado_por_id?: string | null; lancado_por_nome?: string | null; motivo_retroativo?: string | null; lancado_em?: string | null }
type Ponto = BaseAudit & { tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Falta = BaseAudit & { motivo: string; status: string; tipo: string }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }
type AuditPonto = Ponto & { _kind: 'ponto' }
type AuditFalta = Falta & { _kind: 'falta' }
type AuditData = AuditPonto | AuditFalta

function formatAtraso(min: number) { if (!min || min <= 0) return ''; if (min < 60) return `${min}min atraso`; const h = Math.floor(min / 60); const m = min % 60; if (m === 0) return `${h}h atraso`; return `${h}h${String(m).padStart(2,'0')}min atraso` }
function prettyFalta(motivo: string) { if (!motivo) return "Não apareceu"; if (motivo.includes('|')) { const parte = motivo.split('|')[1]?.trim() || motivo.split('|')[0]?.trim(); return capitalizarFalta(parte) } return capitalizarFalta(motivo) }
function capitalizarFalta(txt: string) { const lower = txt.toLowerCase(); if (lower.includes('nao_apareceu') || lower.includes('não apareceu')) return 'Não apareceu'; if (lower.includes('doente')) { const resto = txt.split('|')[1]?.trim() || ''; return resto? resto.charAt(0).toUpperCase() + resto.slice(1).toLowerCase() : 'Doente' } if (lower.includes('falta - rh') || lower.includes('falta -')) return 'Falta - rh'; if (lower.startsWith('outros')) { const resto = txt.split('|')[1]?.trim() || txt.replace(/outros\s*\|?/i, '').trim(); return resto? `Outros - ${resto}` : 'Outros' } return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase() }
function isoToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatDisplay(iso: string) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}` }
function addDays(iso: string, days: number) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

function ModalAuditoriaRetro({ data, open, onClose }: { data: AuditData | null, open: boolean, onClose: ()=>void }) {
    useEffect(()=>{ if(open){ const ob = document.body.style.overflow; document.body.style.overflow='hidden'; return()=>{ document.body.style.overflow=ob } } },[open])
    if(!open ||!data) return null
    const isFalta = data._kind === 'falta'
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-[380px] bg-white rounded-[20px] border shadow-xl flex flex-col max-h-[85vh] overflow-hidden">
                <div className="flex items-center gap-2 p-4 border-b shrink-0"><div className="w-8 h-8 rounded-full bg-amber-100 border flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-amber-700"/></div><h3 className="font-black text-[14px] text-black">{isFalta? 'Falta retroativa' : 'Ponto retroativo'}</h3><button onClick={onClose} className="ml-auto w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><X className="w-4 h-4 text-black"/></button></div>
                <div className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border"><Clock className="w-4 h-4 text-black/60 shrink-0"/><div><p className="font-bold text-black text-[13px]">{isFalta? prettyFalta((data as AuditFalta).motivo) : (data as AuditPonto).tipo}</p></div></div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200"><p className="text-[12px] text-amber-900">{data.motivo_retroativo || (isFalta? (data as AuditFalta).motivo : 'Motivo não informado')}</p></div>
                </div>
                <div className="p-4 border-t shrink-0"><button onClick={onClose} className="w-full h-11 rounded-full bg-black text-white font-bold">Fechar</button></div>
            </div>
        </div>
    )
}

export default function TabPonto() {
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
    const [empresa, setEmpresa] = useState<any>({})
    const [search, setSearch] = useState('')
    const [dataSelecionada, setDataSelecionada] = useState(() => isoToday())
    const [auditData, setAuditData] = useState<AuditData | null>(null)
    const perPage = 10
    const hoje = isoToday()
    const minDate = addDays(hoje, -6)
    const isHoje = dataSelecionada === hoje
    const isRetro =!isHoje
    const canGoPrev = dataSelecionada > minDate
    const canGoNext = dataSelecionada < hoje

    const load = async () => {
        setLoading(true)
        try {
            const [fRes, pRes, cRes, faltaRes, empRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get(`/api/rh/ponto?data=${dataSelecionada}`),
                api.get('/api/rh/ponto/config').catch(() => ({ data: null })),
                api.get(`/api/rh/faltas?data=${dataSelecionada}`).catch(() => ({ data: [] })),
                api.get('/api/empresa').catch(()=>({data:{}}))
            ])
            setFuncs(fRes.data.map((f: any) => ({...f, area: f.area_principal?.nome || f.area || 'Geral', funcao: f.funcao_principal?.nome || f.funcao || f.cargo || f.area_principal?.nome || 'Geral'})))
            setPontos(pRes.data)
            setFaltas(faltaRes.data)
            setEmpresa(empRes.data || {})
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

    const shiftDay = (dir: number) => { const novo = addDays(dataSelecionada, dir); if (novo > hoje) { toast.error("Não pode ir para o futuro"); return } if (novo < minDate) { toast.error(`Limite: só até ${formatDisplay(minDate)}`); return } setDataSelecionada(novo) }

    const bater = async (funcId: string, tipo: string) => {
        setBatendo(funcId)
        try {
            const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
            const payload: any = { funcionario_id: funcId, tipo, data: dataSelecionada, lancado_por_id: logado?.id }
            if (isRetro) payload.motivo_retroativo = `Lançamento retroativo ${formatDisplay(dataSelecionada)} - Correção RH`
            const { data } = await api.post('/api/rh/ponto/bater', payload)
            const atraso = data.atraso_min?? data.ponto?.atraso_min?? 0
            if (atraso > 0) toast.warning(`Entrada com ${formatAtraso(atraso)}`); else toast.success(`${tipo} batido em ${formatDisplay(dataSelecionada)}`)
            await load()
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro ao bater ponto') } finally { setBatendo(null) }
    }

    if (loading) return (<div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-black/40" /></div>)

    return (
        <>
            <div className="bg-white rounded-[16px] border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex flex-col gap-2">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 w-full">
                            <button disabled={!canGoPrev} onClick={() => shiftDay(-1)} className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-white border flex items-center justify-center disabled:opacity-30 shrink-0"><ChevronLeft className="w-4 h-4 text-black" /></button>
                            <button type="button" onClick={() => setOpenCal(true)} className="flex-1 h-[40px] md:h-[36px] px-3 bg-white border rounded-full flex items-center justify-center gap-2 text-[14px] font-bold text-black"><Calendar className="w-4 h-4 shrink-0" /><span className="truncate">{formatDisplay(dataSelecionada)}</span><ChevronDown className="w-3.5 h-3.5 shrink-0" /></button>
                            <button disabled={!canGoNext} onClick={() => shiftDay(1)} className="w-9 h-9 md:w-8 md:h-8 rounded-full bg-white border flex items-center justify-center disabled:opacity-30 shrink-0"><ChevronRight className="w-4 h-4 text-black" /></button>
                            <button onClick={()=>setOpenRelatorio(true)} className="hidden md:flex h-8 px-3 rounded-full bg-black text-white text-[11px] font-bold items-center gap-1 shrink-0"><Download className="w-3.5 h-3.5"/> Relatório</button>
                            <button onClick={()=>exportPontoPDF(dataSelecionada, pontos, faltas, funcs, minDate, hoje)} className="hidden md:flex h-8 px-3 rounded-full bg-white border text-[11px] font-bold shrink-0">jsPDF</button>
                            <button onClick={() => setOpenCfg(true)} className="hidden md:flex w-9 h-9 rounded-full bg-white border items-center justify-center shrink-0"><Settings className="w-4 h-4 text-black" /></button>
                        </div>
                        <div className="flex items-center gap-2 w-full">
                            <div className="relative flex-1"><Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar funcionário..." className="w-full h-[40px] md:h-[36px] bg-white border rounded-full pl-8 pr-3 text-[13px] text-black" /></div>
                            <button onClick={()=>setOpenRelatorio(true)} className="flex md:hidden w-10 h-10 rounded-full bg-black text-white items-center justify-center shrink-0"><Download className="w-4 h-4"/></button>
                            <button onClick={() => setOpenCfg(true)} className="flex md:hidden w-10 h-10 rounded-full bg-white border items-center justify-center shrink-0"><Settings className="w-4 h-4 text-black" /></button>
                        </div>
                    </div>
                </div>

                <div className="max-h-[70vh] overflow-y-auto">
                    {paginatedFuncs.map(f => {
                        const lista = (pontosPorFunc.get(f.id) || []).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
                        const temEntrada = lista.some(p => p.tipo === 'entrada'); const temSaida = lista.some(p => p.tipo === 'saida'); const falta = faltasPorFunc.get(f.id)
                        return (
                            <div key={f.id} className="px-3 md:px-4 py-2.5 border-b last:border-b-0 flex justify-between items-center gap-3">
                                <div className="min-w-0 flex-1"><p className="font-bold text-[13px] text-black truncate">{f.nome}</p>
                                    {falta? (<span className="inline-flex mt-1 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] text-red-700">Falta • {prettyFalta(falta.motivo)}</span>) : lista.length===0? (<span className="text-[11px] text-black/60">Sem ponto</span>) : (<div className="mt-1 flex flex-wrap gap-1.5">{lista.map(p => (<span key={p.id} className={`px-2.5 py-1 rounded-full text-[11px] border ${p.atraso_min? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]'}`}>{p.tipo} {new Date(p.timestamp).toLocaleTimeString('pt-AO')} {p.atraso_min? `(${formatAtraso(p.atraso_min)})` : ''}</span>))}</div>)}
                                </div>
                                <div className="flex gap-1.5 shrink-0">{falta? (<span className="h-[26px] px-3 flex items-center text-[11px] bg-red-600 text-white rounded-full">Falta</span>) :!temEntrada? (<><button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="h-[26px] px-3 bg-[#0095ff] text-white rounded-full text-[11px]">Entrada</button><button onClick={()=>setOpenFalta({open:true,func:f})} className="h-[26px] px-3 bg-red-50 border border-red-200 text-red-600 rounded-full text-[11px]">Falta</button></>) :!temSaida? (<button onClick={()=>bater(f.id,'saida')} className="h-[26px] px-3 border bg-white rounded-full text-[11px]">Saída</button>) : (<span className="h-[26px] px-3 flex items-center text-[11px] bg-gray-100 rounded-full border">Completo</span>)}</div>
                            </div>
                        )
                    })}
                </div>
                {totalPages > 1 && (<div className="flex justify-between items-center p-2.5 border-t bg-gray-50"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-[11px] rounded-full border bg-white text-black disabled:opacity-40">Anterior</button><span className="text-[11px] text-black/60">Página {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-[11px] rounded-full bg-black text-white disabled:opacity-40">Próxima</button></div>)}
            </div>

            {openRelatorio && <RelatorioAuditoriaPonto dataSelecionada={dataSelecionada} pontos={pontos} faltas={faltas} funcs={funcs} empresa={empresa} minDate={minDate} hoje={hoje} onClose={()=>setOpenRelatorio(false)} />}
            <ModalAuditoriaRetro data={auditData} open={!!auditData} onClose={()=>setAuditData(null)} />
            <ModalCalendarioPonto open={openCal} value={dataSelecionada} onClose={() => setOpenCal(false)} onSelect={setDataSelecionada} />
            <ModalConfigPonto open={openCfg} onClose={() => { setOpenCfg(false); load() }} />
            <ModalMarcarFalta open={openFalta.open} funcionario={openFalta.func} dataSelecionada={dataSelecionada} onClose={() => setOpenFalta({ open: false, func: null })} onSaved={() => { setOpenFalta({ open: false, func: null }); load() }} />
        </>
    )
}
