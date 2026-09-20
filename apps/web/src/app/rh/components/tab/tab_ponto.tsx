import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

type Func = { id: string; nome: string; area?: string; area_principal?: any }
type Ponto = { id: string; funcionario_id: string; tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string; atraso_min?: number }
type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }

export default function TabPonto(){
    const [funcs,setFuncs] = useState<Func[]>([])
    const [pontos,setPontos] = useState<Ponto[]>([])
    const [faltasSemana,setFaltasSemana] = useState<Record<string, number>>({})
    const [config,setConfig] = useState<Config | null>(null)
    const [loading,setLoading] = useState(true)
    const [batendo,setBatendo] = useState<string | null>(null)

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

    const bater = async (funcId: string, tipo: string) => {
        setBatendo(funcId)
        try{
            const {data} = await api.post('/api/rh/ponto/bater', { funcionario_id: funcId, tipo })
            const ponto = data.ponto || data
            const atraso = data.atraso_min || ponto.atraso_min || 0
            if(atraso>0) toast.warning(`Entrada com ${atraso}min atraso`)
            else toast.success(`${tipo} batido`)
            if(data.falta_gerada){
                toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} atrasos no ${config?.periodo_regra}`)
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
            toast.success('Falta marcada')
            await load()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao marcar falta')
        }finally{setBatendo(null)}
    }

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px]">Carregando ponto...</p>

    return (
        <div className="bg-white rounded-[16px] border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-[14px]">Ponto hoje - {new Date().toLocaleDateString('pt-AO')}</h3>
                    {config?.regra_atraso_ativa? (
                        <p className="text-[10px] text-orange-600 mt-0.5 font-semibold">Regra ativa: {config.qtd_atrasos_para_falta} atrasos na {config.periodo_regra} = 1 falta</p>
                    ):(
                        <p className="text-[10px] text-gray-500 mt-0.5">Regra de atrasos desativada (ativar em Configurações)</p>
                    )}
                </div>
                <span className="text-[11px] text-gray-500">{pontos.length} batidas hoje</span>
            </div>
            <div className="divide-y max-h-[70vh] overflow-y-auto">
                {funcs.map(f=>{
                    const lista = (pontosPorFunc.get(f.id) || []).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))
                    const temEntrada = lista.some(p=>p.tipo==='entrada')
                    const temSaida = lista.some(p=>p.tipo==='saida')
                    const atrasos = faltasSemana[f.id] || 0
                    const limite = config?.qtd_atrasos_para_falta || 3
                    const vaiVirarFalta = config?.regra_atraso_ativa && atrasos >= limite-1 &&!temEntrada

                    return (
                        <div key={f.id} className={`p-4 flex justify-between items-center gap-3 ${vaiVirarFalta?'bg-orange-50':''}`}>
                            <div className="min-w-0">
                                <p className="font-semibold text-[13px] truncate">
                                    {f.nome} <span className="font-normal text-gray-500">• {f.area}</span>
                                    {atrasos>0 && <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${config?.regra_atraso_ativa && atrasos>=limite?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{atrasos} atraso{atrasos>1?'s':''}</span>}
                                </p>
                                {lista.length===0? (
                                    <p className="text-[11px] text-orange-600">{vaiVirarFalta? `Atenção: ${limite}º atraso vira falta` : 'Sem ponto hoje'}</p>
                                ):(
                                    <p className="text-[11px] text-gray-600">
                                        {lista.map(p=>`${p.tipo} ${new Date(p.timestamp).toLocaleTimeString('pt-AO')} ${p.atraso_min?`(${p.atraso_min}min atraso)`:''}`).join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!temEntrada && (
                                    <>
                                        <button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="px-4 py-2 bg-black text-white rounded-full text-[12px] disabled:opacity-50">
                                            {batendo===f.id?'...':'Bater Entrada'}
                                        </button>
                                        <button disabled={batendo===f.id} onClick={()=>marcarFalta(f.id)} className="px-3 py-2 border border-red-200 text-red-600 rounded-full text-[11px] hover:bg-red-50">
                                            Falta
                                        </button>
                                    </>
                                )}
                                {temEntrada &&!temSaida && (
                                    <button disabled={batendo===f.id} onClick={()=>bater(f.id,'saida')} className="px-4 py-2 border rounded-full text-[12px] hover:bg-gray-50">
                                        Bater Saída
                                    </button>
                                )}
                                {temEntrada && temSaida && (
                                    <span className="px-3 py-2 text-[11px] bg-green-100 text-green-700 rounded-full">Completo</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
