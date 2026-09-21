import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings, Search, Loader2, Calendar, ChevronDown, AlertTriangle, Info, FileText, Lock } from 'lucide-react'
import ModalConfigPonto from '../modals/modal_configurar_atraso'
import ModalMarcarFalta from '../modals/modal_marcar_falta'
import ModalCalendarioPonto from '../modals/modal_calendario_ponto'
import RelatorioAuditoriaPonto from '../pdf/pdf_relatorioPonto'
import ModalGestaoFalta from '../modals/modal_gestao_falta'

type Func = { id: string; nome: string; area?: string; funcao?: string; cargo?: string; area_principal?: any; funcao_principal?: any }
type BaseAudit = { id: string; funcionario_id: string; is_retroativo?: boolean; lancado_por_id?: string | null; lancado_por_nome?: string | null; motivo_retroativo?: string | null; lancado_em?: string | null; justificativa_tipo?: string | null; justificativa_obs?: string | null; justificativa_anexo_url?: string | null; abonada?: boolean; }
type Ponto = BaseAudit & { tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Falta = BaseAudit & { motivo: string; status: string; tipo: string }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }
type AuditPonto = Ponto & { _kind: 'ponto' }
type AuditFalta = Falta & { _kind: 'falta' }
type AuditData = AuditPonto | AuditFalta

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    rh: ["gerir_funcionarios", "ver_ponto", "bater_ponto", "config_ponto", "gerir_faltas", "aprovar_faltas"],
    financeira: ["ver_faturas"],
    recepcao: ["ver_faturas", "bater_ponto_proprio"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

function formatAtraso(min: number) { if (!min || min <= 0) return ''; if (min < 60) return `${min}min de atraso`; const h = Math.floor(min / 60); const m = min % 60; if (m === 0) return `${h}h de atraso`; return `${h}h:${String(m).padStart(2,'0')}min de atraso` }
function prettyFalta(motivo: string) { if (!motivo) return "Não apareceu"; if (motivo.includes('|')) { const parte = motivo.split('|')[1]?.trim() || motivo.split('|')[0]?.trim(); return capitalizarFalta(parte) } return capitalizarFalta(motivo) }
function capitalizarFalta(txt: string) { const lower = txt.toLowerCase(); if (lower.includes('nao_apareceu') || lower.includes('não apareceu')) return 'Não apareceu'; if (lower.includes('doente')) { const resto = txt.split('|')[1]?.trim() || ''; return resto? resto.charAt(0).toUpperCase() + resto.slice(1).toLowerCase() : 'Doente' } if (lower.includes('falta - rh') || lower.includes('falta -')) return 'Falta - rh'; if (lower.startsWith('outros')) { const resto = txt.split('|')[1]?.trim() || txt.replace(/outros\s*\|?/i, '').trim(); return resto? `Outros - ${resto}` : 'Outros' } return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase() }
function isoToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function formatDisplay(iso: string) { if (!iso) return ""; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}` }
function addDays(iso: string, days: number) { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }

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

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_ponto') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true
    const podeBater = funcionarioLogado? temPermissao(cargoAtual, 'bater_ponto') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true
    const podeConfig = funcionarioLogado? temPermissao(cargoAtual, 'config_ponto') || cargoAtual === 'admin' : true
    const podeGerirFalta = funcionarioLogado? temPermissao(cargoAtual, 'gerir_faltas') || cargoAtual === 'admin' : true

    const load = async () => {
        setLoading(true)
        try {
            const [fRes, pRes, cRes, faltaRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get(`/api/rh/ponto?data=${dataSelecionada}`),
                api.get('/api/rh/ponto/config').catch(() => ({ data: null })),
                api.get(`/api/rh/faltas?data=${dataSelecionada}`).catch(() => ({ data: [] }))
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
            } catch { }
        } catch { toast.error('Erro ao carregar ponto') } finally { setLoading(false) }
    }
    useEffect(() => { load() }, [dataSelecionada])
    useEffect(() => { setPage(1) }, [search])

    const pontosPorFunc = useMemo(() => { const map = new Map<string, Ponto[]>(); pontos.forEach((p: Ponto) => { if (!map.has(p.funcionario_id)) map.set(p.funcionario_id, []); map.get(p.funcionario_id)!.push(p) }); return map }, [pontos])
    const faltasPorFunc = useMemo(() => { const map = new Map<string, Falta>(); faltas.forEach((f: Falta) => { if(!map.has(f.funcionario_id)) map.set(f.funcionario_id, f) }); return map }, [faltas])
    const filtered = useMemo(() => { if (!search.trim()) return funcs; const s = search.toLowerCase(); return funcs.filter((f: Func) => f.nome.toLowerCase().includes(s) || (f.area || '').toLowerCase().includes(s) || (f.funcao || '').toLowerCase().includes(s)) }, [funcs, search])
    const totalPages = Math.ceil(filtered.length / perPage)
    const paginatedFuncs = useMemo(() => { const start = (page - 1) * perPage; return filtered.slice(start, start + perPage) }, [filtered, page])

    const bater = async (funcId: string, tipo: string) => {
        if (!podeBater) { toast.error('Sem permissão para bater ponto'); return }
        if (isRetro &&!podeGerirFalta) { toast.error('Só admin/RH pode lançar retroativo'); return }
        setBatendo(funcId)
        try {
            const stored = localStorage.getItem('funcionario_logado'); const logado = stored? JSON.parse(stored): null
            const payload: any = { funcionario_id: funcId, tipo, data: dataSelecionada, lancado_por_id: logado?.id || funcionarioLogado?.id }
            if (isRetro) payload.motivo_retroativo = `Lançamento retroativo ${formatDisplay(dataSelecionada)} - Correção RH`
            const { data } = await api.post('/api/rh/ponto/bater', payload)
            const atraso = (data as any).atraso_min?? (data as any).ponto?.atraso_min?? 0
            if (atraso > 0) toast.warning(`Entrada com ${formatAtraso(atraso)}`); else toast.success(`${tipo} batido em ${formatDisplay(dataSelecionada)}`)
            if ((data as any).falta_gerada) toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} atrasos`)
            await load()
        } catch (e: any) { toast.error(e?.response?.data?.detail || 'Erro ao bater ponto') } finally { setBatendo(null) }
    }

    if (!podeVer) {
        return (
            <div className="bg-white rounded-[16px] border p-10 text-center">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-[13px] text-gray-500">Seu cargo <b>{cargoAtual}</b> não tem acesso ao ponto</p>
            </div>
        )
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
                            {isRetro && <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-[11px] text-amber-800 font-bold whitespace-nowrap"><AlertTriangle className="w-3 h-3" /> Retroativo {cargoAtual.toUpperCase()}</span>}
                            {!podeBater && <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 border text-[10px] font-bold">SOMENTE LEITURA</span>}
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
                            {podeConfig? (
                                <button onClick={() => setOpenCfg(true)} className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm shrink-0">
                                    <Settings className="w-4 h-4 text-black" />
                                </button>
                            ) : (
                                <div className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-gray-100 border flex items-center justify-center opacity-50"><Settings className="w-4 h-4 text-gray-400" /></div>
                            )}
                        </div>
                    </div>
                    <p className="text-[11px] text-black/60">Lista de presença de todos funcionarios da empresa • {cargoAtual}</p>
                </div>

                <div className="max-h-[70vh] overflow-y-auto no-scrollbar overscroll-contain">
                    {paginatedFuncs.length === 0 && <p className="text-center py-8 text-[12px] text-black/50">Nenhum funcionário para "{search}"</p>}
                    {paginatedFuncs.map((f: Func) => {
                        const lista = (pontosPorFunc.get(f.id) || []).sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
                        const temEntrada = lista.some(p => p.tipo === 'entrada')
                        const temSaida = lista.some(p => p.tipo === 'saida')
                        const falta = faltasPorFunc.get(f.id)
                        const atrasos = faltasPeriodo[f.id] || 0
                        return (
                            <div key={f.id} className="px-3 md:px-4 py-2.5 border-b last:border-b-0 flex justify-between items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-[13px] text-black truncate">{f.nome} <span className="font-normal text-black/60">• {f.funcao}</span></p>
                                    {falta? (
                                      <div className="mt-1.5 flex flex-wrap gap-1">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] text-red-700">
                                          ⚠ Falta • {prettyFalta(falta.motivo)} • {falta.status}
                                        </span>
                                        <button onClick={() => setAuditData({...falta, _kind: 'falta' } as AuditData)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-bold hover:bg-amber-100">
                                          <Info className="w-3 h-3"/> Ver motivo
                                        </button>
                                      </div>
                                    ) : lista.length === 0? (
                                      <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                        <span className="text-[11px] text-black/60">Sem ponto em {formatDisplay(dataSelecionada)}</span>
                                        {atrasos > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}
                                      </div>
                                    ) : (
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {lista.map((p: Ponto) => {
                                          const isAtraso =!!(p.atraso_min && p.atraso_min > 0);
                                          if (isAtraso) {
                                            return (
                                              <span key={p.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border bg-amber-50 border-amber-200 text-amber-800 font-medium">
                                                entrada {new Date(p.timestamp).toLocaleTimeString('pt-AO')} ({formatAtraso(p.atraso_min!)})
                                              </span>
                                            )
                                          }
                                          return (
                                            <span key={p.id} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${p.tipo === 'entrada'? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff] font-semibold' : 'bg-gray-50 border-gray-200 text-black/60'}`}>
                                              {p.tipo} {new Date(p.timestamp).toLocaleTimeString('pt-AO')}
                                            </span>
                                          )
                                        })}
                                        {atrasos > 0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}
                                      </div>
                                    )}
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {falta? (<span className="h-[26px] px-3 flex items-center text-[11px] bg-red-600 text-white rounded-full font-medium">Falta</span>) :!temEntrada? (<><button disabled={batendo === f.id ||!podeBater} onClick={() => bater(f.id, 'entrada')} className={`h-[26px] px-3 rounded-full text-[11px] font-medium disabled:opacity-50 ${podeBater? 'bg-[#0095ff] text-white hover:bg-[#0085e6]' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Entrada</button><button disabled={!podeGerirFalta} onClick={() => podeGerirFalta && setOpenFalta({ open: true, func: f })} className={`h-[26px] px-3 rounded-full text-[11px] font-medium ${podeGerirFalta? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed border'}`}>Falta</button></>) :!temSaida? (<button disabled={batendo === f.id ||!podeBater} onClick={() => bater(f.id, 'saida')} className={`h-[26px] px-3 border rounded-full text-[11px] ${podeBater? 'bg-white text-black hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>Saída</button>) : (<span className="h-[26px] px-3 flex items-center text-[11px] bg-gray-100 text-black rounded-full border">Completo</span>)}
                                </div>
                            </div>
                        )
                    })}
                </div>
                {totalPages > 1 && (<div className="flex justify-between items-center p-2.5 border-t bg-gray-50"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-[11px] rounded-full border bg-white text-black disabled:opacity-40">Anterior</button><span className="text-[11px] text-black/60">Página {page} de {totalPages} • {formatDisplay(dataSelecionada)}</span><button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-[11px] rounded-full bg-black text-white disabled:opacity-40">Próxima</button></div>)}
            </div>
            {openRelatorio && <RelatorioAuditoriaPonto dataSelecionada={dataSelecionada} pontos={pontos} faltas={faltas} funcs={funcs} empresa={empresa} minDate={minDate} hoje={hoje} onClose={()=>setOpenRelatorio(false)} />}
            {podeGerirFalta && <ModalGestaoFalta data={auditData} open={!!auditData} onClose={()=>setAuditData(null)} onSaved={load} dataSelecionada={dataSelecionada} usuario={usuario} />}
            {!podeGerirFalta && auditData && (
                <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[16px] p-6 max-w-[400px] w-full">
                        <h3 className="font-bold">Detalhe da falta</h3>
                        <p className="text-[13px] mt-2">{prettyFalta((auditData as any).motivo)}</p>
                        <button onClick={()=>setAuditData(null)} className="mt-4 w-full h-10 bg-black text-white rounded-full">Fechar</button>
                    </div>
                </div>
            )}
            <ModalCalendarioPonto open={openCal} value={dataSelecionada} onClose={() => setOpenCal(false)} onSelect={setDataSelecionada} />
            {podeConfig && <ModalConfigPonto open={openCfg} onClose={() => { setOpenCfg(false); load() }} />}
            {podeGerirFalta && <ModalMarcarFalta open={openFalta.open} funcionario={openFalta.func} dataSelecionada={dataSelecionada} onClose={() => setOpenFalta({ open: false, func: null })} onSaved={() => { setOpenFalta({ open: false, func: null }); load() }} />}
        </>
    )
}
