import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import { Settings } from 'lucide-react'

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
    const [faltasSemana,setFaltasSemana] = useState<Record<string, number>>({})
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
            if(atraso>0) toast.warning(`Entrada com ${formatAtraso(atraso)}`)
            else toast.success(`${tipo} batido`)
            if(data.falta_gerada){
                toast.error(`FALTA GERADA: ${config?.qtd_atrasos_para_falta} atrasos na ${config?.periodo_regra}`)
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
        <>
        <div className="bg-white rounded-[16px] border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-[14px]">Ponto hoje - {new Date().toLocaleDateString('pt-AO')}</h3>
                    {config?.regra_atraso_ativa? (
                        <p className="text-[10px] text-orange-600 mt-0.5">Regra ativa: {config.qtd_atrasos_para_falta} atrasos na {config.periodo_regra} = 1 falta</p>
                    ):(
                        <p className="text-[10px] text-gray-500 mt-0.5">Regra de atrasos desativada</p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">{pontos.length} batidas</span>
                    <button onClick={()=>setOpenCfg(true)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center hover:bg-gray-100">
                        <Settings className="w-4 h-4 text-gray-600"/>
                    </button>
                </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
                {paginatedFuncs.map(f=>{
                    const lista = (pontosPorFunc.get(f.id) || []).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))
                    const temEntrada = lista.some(p=>p.tipo==='entrada')
                    const temSaida = lista.some(p=>p.tipo==='saida')
                    const atrasos = faltasSemana[f.id] || 0
                    const limite = config?.qtd_atrasos_para_falta || 3
                    const vaiVirarFalta = config?.regra_atraso_ativa && atrasos >= limite-1 &&!temEntrada

                    return (
                        <div key={f.id} className="px-4 py-3 border-b last:border-b-0 flex justify-between items-center gap-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-[13px] truncate">
                                    {f.nome} <span className="font-normal text-gray-500">• {f.area}</span>
                                    {atrasos>0 && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-700 border">{atrasos} atraso{atrasos>1?'s':''} na {config?.periodo_regra || 'semana'}</span>}
                                </p>
                                {lista.length===0? (
                                    <p className="text-[11px] text-gray-500">{vaiVirarFalta? `Atenção: ${limite}º atraso vira falta` : 'Sem ponto hoje'}</p>
                                ):(
                                    <p className="text-[11px] text-gray-600 truncate">
                                        {lista.map(p=>`${p.tipo} ${new Date(p.timestamp).toLocaleTimeString('pt-AO')} ${p.atraso_min?`(${formatAtraso(p.atraso_min)})`:''}`).join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!temEntrada && (
                                    <>
                                        <button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="px-4 py-2 bg-black text-white rounded-full text-[12px] disabled:opacity-50">
                                            {batendo===f.id?'...':'Bater Entrada'}
                                        </button>
                                        <button disabled={batendo===f.id} onClick={()=>marcarFalta(f.id)} className="px-3 py-2 border text-gray-600 rounded-full text-[11px] hover:bg-gray-50">
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
                                    <span className="px-3 py-2 text-[11px] bg-gray-100 text-gray-700 rounded-full border">Completo</span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-between items-center p-3 border-t bg-gray-50">
                    <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-[12px] rounded-full border bg-white disabled:opacity-40">Anterior</button>
                    <span className="text-[11px] text-gray-500">Página {page} de {totalPages} • {funcs.length} funcionários</span>
                    <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-[12px] rounded-full bg-black text-white disabled:opacity-40">Próxima</button>
                </div>
            )}
        </div>

        {openCfg && <ModalConfigPonto open={openCfg} onClose={()=>{setOpenCfg(false); load()}} />}
        </>
    )
}

function ModalConfigPonto({open, onClose}:{open:boolean, onClose:()=>void}){
    const [cfg,setCfg] = useState<any>({hora_entrada:"08:00", tolerancia_min:15, regra_atraso_ativa:false, qtd_atrasos_para_falta:3, periodo_regra:"semana"})
    const [saving,setSaving] = useState(false)
    const [loadingCfg,setLoadingCfg] = useState(true)

    useEffect(()=>{
        if(open){
            setLoadingCfg(true)
            api.get('/api/rh/ponto/config').then(r=>setCfg(r.data)).finally(()=>setLoadingCfg(false))
        }
    },[open])

    const save = async () => {
        setSaving(true)
        try{
            const {data} = await api.put('/api/rh/ponto/config', cfg)
            setCfg(data)
            toast.success('Configuração salva')
            onClose()
        }catch{ toast.error('Erro ao salvar') }
        finally{ setSaving(false) }
    }

    if(!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-[20px] w-full max-w-[460px] p-5 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-[14px]">Configurar Regras de Atraso</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">✕</button>
                </div>
                {loadingCfg? <p className="text-[12px] text-gray-500 py-8 text-center">Carregando...</p> : <>
                <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] text-gray-500">Hora Entrada</label><input value={cfg.hora_entrada} onChange={e=>setCfg({...cfg, hora_entrada:e.target.value})} className="w-full border rounded-lg p-2 text-[13px] mt-1" type="time"/></div>
                    <div><label className="text-[11px] text-gray-500">Tolerância (min)</label><input value={cfg.tolerancia_min} onChange={e=>setCfg({...cfg, tolerancia_min:parseInt(e.target.value)||0})} className="w-full border rounded-lg p-2 text-[13px] mt-1" type="number"/></div>
                </div>
                <hr/>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-[12px]">Regra: X atrasos = 1 falta</p>
                        <p className="text-[11px] text-gray-500">Gera falta automática quando atingir limite</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={cfg.regra_atraso_ativa} onChange={e=>setCfg({...cfg, regra_atraso_ativa:e.target.checked})} className="sr-only peer"/>
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                </div>
                {cfg.regra_atraso_ativa && (
                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border">
                        <div><label className="text-[11px] text-gray-500">Qtd atrasos p/ falta</label><input min={2} max={10} value={cfg.qtd_atrasos_para_falta} onChange={e=>setCfg({...cfg, qtd_atrasos_para_falta:parseInt(e.target.value)||3})} className="w-full border rounded-lg p-2 text-[13px] mt-1" type="number"/></div>
                        <div><label className="text-[11px] text-gray-500">Período</label><select value={cfg.periodo_regra} onChange={e=>setCfg({...cfg, periodo_regra:e.target.value})} className="w-full border rounded-lg p-2 text-[13px] mt-1"><option value="semana">Semana</option><option value="mes">Mês</option></select></div>
                        <p className="col-span-2 text-[10px] text-gray-500">Ex: {cfg.qtd_atrasos_para_falta} atrasos na {cfg.periodo_regra} = 1 falta automática</p>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-full text-[12px] border">Cancelar</button>
                    <button disabled={saving} onClick={save} className="px-5 py-2 bg-black text-white rounded-full text-[12px] disabled:opacity-50">{saving?'Salvando...':'Salvar'}</button>
                </div>
                </>}
            </div>
        </div>
    )
}
