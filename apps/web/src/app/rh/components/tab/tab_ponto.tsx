import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings, Search, Loader2 } from 'lucide-react'
import ModalConfigPonto from '../modals/modal_configurar_atraso'
import ModalMarcarFalta from '../modals/modal_marcar_falta'

type Func = { id: string; nome: string; area?: string; funcao?: string; cargo?: string; area_principal?: any; funcao_principal?: any }
type Ponto = { id: string; funcionario_id: string; tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Falta = { id: string; funcionario_id: string; motivo: string; status: string; tipo: string }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }

function formatAtraso(min: number) {
    if (!min || min <= 0) return ''
    if (min < 60) return `${min}min de atraso`
    const h = Math.floor(min / 60)
    const m = min % 60
    if (m === 0) return `${h}h de atraso`
    return `${h}h:${String(m).padStart(2, '0')}min de atraso`
}

function prettyFalta(motivo: string){
    if(!motivo) return "Não apareceu"
    if(motivo.includes('|')){
        const parte = motivo.split('|')[1]?.trim() || motivo.split('|')[0]?.trim()
        return capitalizarFalta(parte)
    }
    return capitalizarFalta(motivo)
}

function capitalizarFalta(txt: string){
    const lower = txt.toLowerCase()
    if(lower.includes('nao_apareceu') || lower.includes('não apareceu')) return 'Não apareceu'
    if(lower.includes('doente')) {
        const resto = txt.split('|')[1]?.trim() || ''
        return resto? resto.charAt(0).toUpperCase() + resto.slice(1).toLowerCase() : 'Doente'
    }
    if(lower.includes('falta - rh') || lower.includes('falta -')) return 'Falta - rh'
    if(lower.startsWith('outros')){
        const resto = txt.split('|')[1]?.trim() || txt.replace(/outros\s*\|?/i,'').trim()
        return resto? `Outros - ${resto}` : 'Outros'
    }
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
}

export default function TabPonto(){
    const [funcs,setFuncs] = useState<Func[]>([])
    const [pontos,setPontos] = useState<Ponto[]>([])
    const [faltas,setFaltas] = useState<Falta[]>([])
    const [faltasPeriodo,setFaltasPeriodo] = useState<Record<string, number>>({})
    const [config,setConfig] = useState<Config | null>(null)
    const [loading,setLoading] = useState(true)
    const [batendo,setBatendo] = useState<string | null>(null)
    const [page,setPage] = useState(1)
    const [openCfg,setOpenCfg] = useState(false)
    const [openFalta,setOpenFalta] = useState<{open:boolean, func: Func|null}>({open:false, func:null})
    const [search,setSearch] = useState('')
    const perPage = 10

    const load = async () => {
        setLoading(true)
        try{
            const [fRes, pRes, cRes, faltaRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get('/api/rh/ponto/hoje'),
                api.get('/api/rh/ponto/config').catch(()=>({data:null})),
                api.get('/api/rh/faltas/hoje').catch(()=>({data:[]}))
            ])
            setFuncs(fRes.data.map((f:any)=>({
           ...f,
                area: f.area_principal?.nome || f.area || 'Geral',
                funcao: f.funcao_principal?.nome || f.funcao || f.cargo || f.area_principal?.nome || 'Geral'
            })))
            setPontos(pRes.data)
            setFaltas(faltaRes.data)
            if(cRes.data) setConfig(cRes.data)
            try{
                const periodo = cRes.data?.periodo_regra || 'semana'
                const {data: pontosPeriodo} = await api.get(`/api/rh/ponto/${periodo}`)
                const contagem: Record<string, number> = {}
                pontosPeriodo.forEach((p:any)=>{
                    if(p.tipo==='entrada' && p.atraso_min>0){
                        contagem[p.funcionario_id] = (contagem[p.funcionario_id]||0)+1
                    }
                })
                setFaltasPeriodo(contagem)
            }catch{}
        }catch{
            toast.error('Erro ao carregar ponto')
        }finally{setLoading(false)}
    }
    useEffect(()=>{load()},[])
    useEffect(()=>{ setPage(1) },[search])

    const pontosPorFunc = useMemo(()=>{
        const map = new Map<string, Ponto[]>()
        pontos.forEach(p=>{
            if(!map.has(p.funcionario_id)) map.set(p.funcionario_id, [])
            map.get(p.funcionario_id)!.push(p)
        })
        return map
    },[pontos])

    const faltasPorFunc = useMemo(()=>{
        const map = new Map<string, Falta>()
        faltas.forEach(f=> map.set(f.funcionario_id, f))
        return map
    },[faltas])

    const filtered = useMemo(()=>{
        if(!search.trim()) return funcs
        const s = search.toLowerCase()
        return funcs.filter(f=> f.nome.toLowerCase().includes(s) || (f.area||'').toLowerCase().includes(s) || (f.funcao||'').toLowerCase().includes(s))
    },[funcs, search])

    const totalPages = Math.ceil(filtered.length / perPage)
    const paginatedFuncs = useMemo(()=>{
        const start = (page-1)*perPage
        return filtered.slice(start, start+perPage)
    },[filtered, page])

    const bater = async (funcId: string, tipo: string) => {
        setBatendo(funcId)
        try{
            const {data} = await api.post('/api/rh/ponto/bater', { funcionario_id: funcId, tipo })
            const atraso = data.atraso_min?? data.ponto?.atraso_min?? 0
            if(atraso>0) toast.warning(`Entrada com ${formatAtraso(atraso)}`)
            else toast.success(`${tipo} batido`)
            if(data.falta_gerada) toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} atrasos`)
            await load()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao bater ponto')
        }finally{setBatendo(null)}
    }

    if(loading) return (
        <div className="bg-white rounded-[16px] border h-[300px] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-black/40" />
        </div>
    )

    return (
        <>
        <div className="bg-white rounded-[16px] border overflow-hidden">
            {/* HEADER - COLUNA NO MOBILE, LINHA NO DESKTOP */}
            <div className="p-3 border-b bg-gray-50 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                    <h3 className="font-bold text-[14px] text-black">Ponto hoje - {new Date().toLocaleDateString('pt-AO')}</h3>
                    {config?.regra_atraso_ativa? (
                        <p className="text-[10px] text-black/70 mt-0.5">ATT: {config.qtd_atrasos_para_falta} atrasos na {config.periodo_regra} resulta em 1 falta</p>
                    ):(
                        <p className="text-[10px] text-black/50 mt-0.5">Regra de atrasos desativada</p>
                    )}
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-[300px] md:flex-none">
                        <Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar funcionário..." className="w-full h-[36px] bg-white border border-gray-200 rounded-full pl-8 pr-3 text-[12px] text-black placeholder:text-black/40 focus:outline-none focus:border-black" />
                    </div>
                    <button onClick={()=>setOpenCfg(true)} className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm shrink-0">
                        <Settings className="w-4 h-4 text-black"/>
                    </button>
                </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
                {paginatedFuncs.length===0 && <p className="text-center py-8 text-[12px] text-black/50">Nenhum funcionário para "{search}"</p>}
                {paginatedFuncs.map(f=>{
                    const lista = (pontosPorFunc.get(f.id) || []).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))
                    const temEntrada = lista.some(p=>p.tipo==='entrada')
                    const temSaida = lista.some(p=>p.tipo==='saida')
                    const falta = faltasPorFunc.get(f.id)
                    const atrasos = faltasPeriodo[f.id] || 0

                    return (
                        <div key={f.id} className="px-3 md:px-4 py-2.5 border-b last:border-b-0 flex justify-between items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-[13px] text-black truncate">
                                    {f.nome} <span className="font-normal text-black/60">• {f.funcao}</span>
                                </p>

                                {falta? (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-[11px] text-red-700">
                                            Falta • {prettyFalta(falta.motivo)} • pendente justificação
                                        </span>
                                    </div>
                                ) : lista.length===0? (
                                    <div className="mt-1.5 flex flex-wrap gap-1 items-center">
                                        <span className="text-[11px] text-black/60">Sem ponto hoje</span>
                                        {atrasos>0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}
                                    </div>
                                ) : (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {lista.map(p=>{
                                            const isAtraso = p.atraso_min && p.atraso_min>0
                                            if(isAtraso){
                                                return (
                                                    <span key={p.id} className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-medium">
                                                        entrada {new Date(p.timestamp).toLocaleTimeString('pt-AO')} ({formatAtraso(p.atraso_min!)})
                                                    </span>
                                                )
                                            }
                                            return (
                                                <span key={p.id} className={`inline-flex px-2.5 py-1 rounded-full text-[11px] border ${p.tipo==='entrada'? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff] font-semibold' : 'bg-gray-50 border-gray-200 text-black/60'}`}>
                                                    {p.tipo} {new Date(p.timestamp).toLocaleTimeString('pt-AO')}
                                                </span>
                                            )
                                        })}
                                        {atrasos>0 && <span className="px-2.5 py-1 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 font-medium">{atrasos} atraso</span>}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                                {falta? (
                                    <span className="h-[26px] px-3 flex items-center text-[11px] bg-red-600 text-white rounded-full font-medium">Falta</span>
                                ):!temEntrada? (
                                    <>
                                        <button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="h-[26px] px-3 bg-[#0095ff] text-white rounded-full text-[11px] font-medium disabled:opacity-50 hover:bg-[#0085e6]">
                                            Entrada
                                        </button>
                                        <button onClick={()=>setOpenFalta({open:true, func:f})} className="h-[26px] px-3 bg-red-50 border border-red-200 text-red-600 rounded-full text-[11px] font-medium hover:bg-red-100">
                                            Falta
                                        </button>
                                    </>
                                ):!temSaida? (
                                    <button disabled={batendo===f.id} onClick={()=>bater(f.id,'saida')} className="h-[26px] px-3 border border-gray-200 bg-white rounded-full text-[11px] text-black hover:bg-gray-50">
                                        Saída
                                    </button>
                                ):(
                                    <span className="h-[26px] px-3 flex items-center text-[11px] bg-gray-100 text-black rounded-full border">Completo</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center p-2.5 border-t bg-gray-50">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 text-[11px] rounded-full border bg-white text-black disabled:opacity-40">Anterior</button>
                    <span className="text-[11px] text-black/60">Página {page} de {totalPages}</span>
                    <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 text-[11px] rounded-full bg-black text-white disabled:opacity-40">Próxima</button>
                </div>
            )}
        </div>

        <ModalConfigPonto open={openCfg} onClose={()=>{setOpenCfg(false); load()}} />
        <ModalMarcarFalta open={openFalta.open} funcionario={openFalta.func} onClose={()=>setOpenFalta({open:false, func:null})} onSaved={()=>{setOpenFalta({open:false, func:null}); load()}} />
        </>
    )
}
