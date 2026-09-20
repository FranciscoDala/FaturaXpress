import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

type Func = { id: string; nome: string; area?: string; area_principal?: any }
type Ponto = { id: string; funcionario_id: string; tipo: string; timestamp: string; dentro_raio: boolean; dispositivo: string }

export default function TabPonto(){
    const [funcs,setFuncs] = useState<Func[]>([])
    const [pontos,setPontos] = useState<Ponto[]>([])
    const [loading,setLoading] = useState(true)
    const [batendo,setBatendo] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        try{
            const [fRes, pRes] = await Promise.all([
                api.get('/api/funcionarios'),
                api.get('/api/rh/ponto/hoje')
            ])
            // normaliza area igual teu RHPage já faz
            setFuncs(fRes.data.map((f:any)=>({...f, area: f.area_principal?.nome || f.area_principal_id || f.area || 'Geral'})))
            setPontos(pRes.data)
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
            // AJUSTE: RH bate sem lat/lng, backend libera por ser RH
            await api.post('/api/rh/ponto/bater', { funcionario_id: funcId, tipo })
            toast.success(`${tipo} batido`)
            await load()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao bater ponto')
        }finally{setBatendo(null)}
    }

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px]">Carregando ponto...</p>

    return (
        <div className="bg-white rounded-[16px] border overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between">
                <h3 className="font-bold text-[14px]">Ponto hoje - {new Date().toLocaleDateString('pt-AO')} • RH bate por todos</h3>
                <span className="text-[11px] text-gray-500">{pontos.length} batidas hoje</span>
            </div>
            <div className="divide-y">
                {funcs.map(f=>{
                    const lista = (pontosPorFunc.get(f.id) || []).sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))
                    const temEntrada = lista.some(p=>p.tipo==='entrada')
                    const temSaida = lista.some(p=>p.tipo==='saida')

                    return (
                        <div key={f.id} className="p-4 flex justify-between items-center gap-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-[13px] truncate">{f.nome} <span className="font-normal text-gray-500">• {f.area}</span></p>
                                {lista.length===0? (
                                    <p className="text-[11px] text-orange-600">Sem ponto hoje</p>
                                ):(
                                    <p className="text-[11px] text-gray-600">
                                        {lista.map(p=>`${p.tipo} ${new Date(p.timestamp).toLocaleTimeString('pt-AO')} ${p.dispositivo?.startsWith('rh:')?' (por RH)':''}`).join(' • ')}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {!temEntrada && (
                                    <button disabled={batendo===f.id} onClick={()=>bater(f.id,'entrada')} className="px-4 py-2 bg-black text-white rounded-full text-[12px] disabled:opacity-50">
                                        {batendo===f.id?'...':'Bater Entrada'}
                                    </button>
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
