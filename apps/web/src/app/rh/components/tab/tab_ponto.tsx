import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

type Func = { id: string; nome: string; area?: string; area_principal?: any }
type Ponto = { id: string; funcionario_id: string; tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }

function formatAtraso(min: number) {
    if (!min || min <= 0) return 'NO HORÁRIO'
    if (min < 60) return `${min}MIN DE ATRASO`
    const h = Math.floor(min / 60)
    const m = min % 60
    if (m === 0) return `${h}H DE ATRASO`
    return `${h}H:${String(m).padStart(2, '0')}MIN DE ATRASO`
}

export default function TabPonto(){
    const [funcs,setFuncs] = useState<Func[]>([])
    const [pontos,setPontos] = useState<Ponto[]>([])
    const [faltasSemana,setFaltasSemana] = useState<Record<string, number>>({})
    const [config,setConfig] = useState<Config | null>(null)
    const [loading,setLoading] = useState(true)
    const [batendo,setBatendo] = useState<string | null>(null)
    const [page,setPage] = useState(1)
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
                const {data: pontosSemana} = await api.get('/api/rh/ponto/semana')
                const contagem: Record<string, number> = {}
                pontosSemana.forEach((p:any)=>{
                    if(p.tipo==='entrada' && p.atraso_min>0){
                        contagem[p.funcionario_id] = (contagem[p.funcionario_id]||0)+1
                    }
                })
                setFaltasSemana(contagem)
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
            if(atraso>0) toast.warning(`${formatAtraso(atraso)}`)
            else toast.success(`${tipo.toUpperCase()} BATIDO`)
            if(data.falta_gerada){
                toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} ATRASOS = 1 FALTA`)
            }
            await load()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao bater ponto')
        }finally{setBatendo(null)}
    }

    const marcarFalta = async (funcId: string) => {
        setBatendo(funcId)
        try{
            await api.post('/api/rh/falta', { funcionario_id: funcId, motivo: "Falta - RH" })
            toast.success('FALTA MARCADA')
            await load()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao marcar falta')
        }finally{setBatendo(null)}
    }

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px] font-bold">Carregando ponto...</p>

    return (
        <div className="bg-white rounded-[16px] border overflow-hidden">
            <div className="p-4 border-b bg-black text-white flex justify-between items-center">
                <div>
                    <h3 className="font-extrabold text-[15px] tracking-wide">PONTO HOJE - {new Date().toLocaleDateString('pt-AO')}</h3>
                    {config?.regra_atraso_ativa? (
                        <p className="text-[11px] font-bold text-yellow-300 mt-1">REGRA ATIVA: {config.qtd_atrasos_para_falta} ATRASOS NA {config.periodo_regra.toUpperCase()} = 1 FALTA</p>
                    ):(
                        <p className="text-[11px] font-medium text-gray-300 mt-1">Regra de atrasos desativada</p>
                    )}
                </div>
                <span className="text-[12px] font-extrabold bg-white text-black px-3 py-1 rounded-full">{pontos.length} BATIDAS</span>
            </div>

            {/* linhas já separam, sem padding-y entre elas */}
            <div className="max-h-[70vh] overflow-y-auto">
                {paginatedFuncs.map(f=>{
                    const lista = (pontosPorFunc.get(f.id) || []).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))
                    const temEntrada = lista.some(p=>p.tipo==='entrada')
                    const temSaida = lista.some(p=>p.tipo==='saida')
                    const entradaHoje = lista.find(p=>p.tipo==='entrada')
                    const atrasos = faltasSemana[f.id] || 0
                    const limite = config?.qtd_atrasos_para_falta || 3
                    const vaiVirarFalta = config?.regra_atraso_ativa && atrasos >= limite-1 &&!temEntrada

                    return (
                        <div key={f.id} className={`flex justify-between items-center gap-3 px-4 py-3 border-b last:border-b-0 ${vaiVirarFalta?'bg-red-50':''}`}>
                            <div className="min-w-0 flex-1">
                                <p className="font-extrabold text-[14px] text-gray-900 truncate flex items-center gap-2">
                                    <span className="truncate">{f.nome.toUpperCase()}</span>
                                    <span className="font-bold text-[11px] text-gray-600 shrink-0">• {f.area?.toUpperCase()}</span>
                                    {atrasos>0 && <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${atrasos>=limite && config?.regra_atraso_ativa?'bg-red-600 text-white border-red-600':'bg-yellow-400 text-black border-yellow-400'}`}>{atrasos} ATRASOS</span>}
                                </p>
                                {lista.length===0? (
                                    <p className={`text-[12px] font-extrabold mt-1 ${vaiVirarFalta?'text-red-700':'text-orange-700'}`}>{vaiVirarFalta? `ATENÇÃO: ${limite}º ATRASO VIRA FALTA` : 'SEM PONTO HOJE'}</p>
                                ):(
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                        {lista.map(p=>(
                                            <span key={p.id} className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${p.atraso_min && p.atraso_min>0?'bg-red-600 text-white border-red-600':'bg-gray-900 text-white border-gray-900'}`}>
                                                {p.tipo.toUpperCase()} {new Date(p.timestamp).toLocaleTimeString('pt-AO',{hour:'2-digit',minute:'2-digit'})} {p.atraso_min? `• ${formatAtraso(p.atraso_min)}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!temEntrada && (
                                    <>
                                        <button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="px-5 py-2.5 bg-black text-white rounded-full text-[12px] font-extrabold disabled:opacity-50 hover:bg-gray-800">
                                            {batendo===f.id?'...':'ENTRADA'}
                                        </button>
                                        <button disabled={batendo===f.id} onClick={()=>marcarFalta(f.id)} className="px-3 py-2.5 border-2 border-red-600 text-red-600 rounded-full text-[11px] font-extrabold hover:bg-red-50">
                                            FALTA
                                        </button>
                                    </>
                                )}
                                {temEntrada &&!temSaida && (
                                    <button disabled={batendo===f.id} onClick={()=>bater(f.id,'saida')} className="px-5 py-2.5 border-2 border-black rounded-full text-[12px] font-extrabold hover:bg-gray-100">
                                        SAÍDA
                                    </button>
                                )}
                                {temEntrada && temSaida && (
                                    <span className="px-4 py-2 text-[11px] font-extrabold bg-green-600 text-white rounded-full">COMPLETO</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center p-3 border-t bg-gray-50">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-4 py-2 text-[12px] font-extrabold rounded-full border-2 border-black disabled:opacity-30">ANTERIOR</button>
                    <span className="text-[12px] font-extrabold">PÁGINA {page} DE {totalPages}</span>
                    <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-4 py-2 text-[12px] font-extrabold rounded-full bg-black text-white disabled:opacity-30">PRÓXIMA</button>
                </div>
            )}
        </div>
    )
}
