import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings, LogIn, LogOut, XCircle } from 'lucide-react'
import ModalConfigPonto from '../modals/modal_configurar_atraso'

type Func = { id: string; nome: string; area?: string; area_principal?: any }
type Ponto = { id: string; funcionario_id: string; tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }

function formatAtraso(min: number) {
    if (!min || min <= 0) return ''
    if (min < 60) return `${min}min de atraso`
    const h = Math.floor(min / 60)
    const m = min % 60
    if (m === 0) return `${h}h de atraso`
    return `${h}h:${String(m).padStart(2, '0')}min de atraso`
}

export default function TabPonto(){
    const [funcs,setFuncs] = useState<Func[]>([])
    const [pontos,setPontos] = useState<Ponto[]>([])
    const [faltasPeriodo,setFaltasPeriodo] = useState<Record<string, number>>({})
    const [config,setConfig] = useState<Config | null>(null)
    const [loading,setLoading] = useState(true)
    const [batendo,setBatendo] = useState<string | null>(null)
    const [page,setPage] = useState(1)
    const [openCfg,setOpenCfg] = useState(false)
    const perPage = 10

    const load = async () => {
        setLoading(true)
        try{
            const [fRes, pRes, cRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get('/api/rh/ponto/hoje'),
                api.get('/api/rh/ponto/config').catch(()=>({data:null}))
            ])
            setFuncs(fRes.data.map((f:any)=>({...f, area: f.area_principal?.nome || f.area_principal_id || f.area || 'Geral'})))
            setPontos(pRes.data)
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

    const pontosPorFunc = useMemo(()=>{
        const map = new Map<string, Ponto[]>()
        pontos.forEach(p=>{
            if(!map.has(p.funcionario_id)) map.set(p.funcionario_id, [])
            map.get(p.funcionario_id)!.push(p)
        })
        return map
    },[pontos])

    const totalPages = Math.ceil(funcs.length / perPage)
    const paginatedFuncs = useMemo(()=>{
        const start = (page-1)*perPage
        return funcs.slice(start, start+perPage)
    },[funcs, page])

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

    const marcarFalta = async (funcId: string) => {
        setBatendo(funcId)
        try{
            await api.post('/api/rh/falta', { funcionario_id: funcId, motivo: "Falta - RH" })
            toast.success('Falta marcada')
            await load()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao marcar falta')
        }finally{setBatendo(null)}
    }

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px] text-black">Carregando ponto...</p>

    return (
        <>
        <div className="bg-white rounded-[16px] border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-[14px] text-black">Ponto hoje - {new Date().toLocaleDateString('pt-AO')}</h3>
                    {config?.regra_atraso_ativa? (
                        <p className="text-[11px] text-black/70 mt-0.5">Regra: {config.qtd_atrasos_para_falta} atrasos na {config.periodo_regra} = 1 falta</p>
                    ):(
                        <p className="text-[11px] text-black/50 mt-0.5">Regra de atrasos desativada</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-black/60 font-medium">{pontos.length} batidas</span>
                    <button onClick={()=>setOpenCfg(true)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 shadow-sm">
                        <Settings className="w-4 h-4 text-black"/>
                    </button>
                </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
                {paginatedFuncs.map(f=>{
                    const lista = (pontosPorFunc.get(f.id) || []).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))
                    const temEntrada = lista.some(p=>p.tipo==='entrada')
                    const temSaida = lista.some(p=>p.tipo==='saida')
                    const atrasos = faltasPeriodo[f.id] || 0
                    const limite = config?.qtd_atrasos_para_falta || 3

                    return (
                        <div key={f.id} className="px-4 py-3 border-b last:border-b-0 flex justify-between items-center gap-3">
                            <div className="min-w-0">
                                <p className="font-bold text-[13px] text-black truncate">
                                    {f.nome} <span className="font-normal text-black/60">• {f.area}</span>
                                    {atrasos>0 && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-black border border-gray-200 font-medium">{atrasos} atraso{atrasos>1?'s':''} na {config?.periodo_regra || 'semana'}</span>}
                                </p>
                                {lista.length===0? (
                                    <p className="text-[11px] text-black/60 mt-0.5">{atrasos>=limite-1 && config?.regra_atraso_ativa? `Atenção: ${limite}º atraso vira falta` : 'Sem ponto hoje'}</p>
                                ):(
                                    <p className="text-[11px] text-black/70 truncate mt-0.5">
                                        {lista.map(p=>`${p.tipo} ${new Date(p.timestamp).toLocaleTimeString('pt-AO')} ${p.atraso_min?`(${formatAtraso(p.atraso_min)})`:''}`).join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-[2px] shrink-0">
                                {!temEntrada && (
                                    <>
                                        <button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="h-[32px] px-3 bg-black text-white rounded-full text-[11px] font-medium flex items-center gap-1.5 disabled:opacity-50 hover:bg-gray-900">
                                            <LogIn className="w-3.5 h-3.5"/> Entrada
                                        </button>
                                        <button disabled={batendo===f.id} onClick={()=>marcarFalta(f.id)} className="h-[32px] px-3 border border-gray-200 bg-white rounded-full text-[11px] text-black flex items-center gap-1 hover:bg-gray-50">
                                            <XCircle className="w-3.5 h-3.5"/> Falta
                                        </button>
                                    </>
                                )}
                                {temEntrada &&!temSaida && (
                                    <button disabled={batendo===f.id} onClick={()=>bater(f.id,'saida')} className="h-[32px] px-3 border border-gray-200 rounded-full text-[11px] text-black flex items-center gap-1.5 hover:bg-gray-50">
                                        <LogOut className="w-3.5 h-3.5"/> Saída
                                    </button>
                                )}
                                {temEntrada && temSaida && (
                                    <span className="h-[32px] px-3 flex items-center text-[11px] bg-gray-100 text-black rounded-full border border-gray-200">Completo</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center p-3 border-t bg-gray-50">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-[12px] rounded-full border bg-white text-black disabled:opacity-40">Anterior</button>
                    <span className="text-[11px] text-black/60">Página {page} de {totalPages}</span>
                    <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-[12px] rounded-full bg-black text-white disabled:opacity-40">Próxima</button>
                </div>
            )}
        </div>

        <ModalConfigPonto open={openCfg} onClose={()=>{setOpenCfg(false); load()}} />
        </>
    )
}
