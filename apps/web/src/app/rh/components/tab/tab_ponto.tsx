import { useEffect, useState } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

export default function TabPonto(){
    const [pontos,setPontos] = useState<any[]>([])
    const [loading,setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        try{
            const {data} = await api.get('/api/rh/ponto/hoje')
            setPontos(data)
        }catch{
            toast.error('Erro ao carregar ponto')
        }finally{setLoading(false)}
    }
    useEffect(()=>{load()},[])

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px]">Carregando ponto...</p>
    if(pontos.length===0) return <p className="text-center py-16 bg-white rounded-[20px] border">Nenhum ponto hoje</p>

    return (
        <div className="bg-white rounded-[16px] border overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                    <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase">
                        <tr><th className="text-left p-3">Funcionário</th><th className="text-left p-3">Tipo</th><th className="text-left p-3">Hora</th><th className="text-left p-3">Local</th></tr>
                    </thead>
                    <tbody>
                        {pontos.map((p:any)=>(
                            <tr key={p.id} className="border-t">
                                <td className="p-3 font-medium">{p.funcionario?.nome || p.funcionario_id}</td>
                                <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] ${p.tipo==='entrada'?'bg-green-100 text-green-700':'bg-gray-100'}`}>{p.tipo}</span></td>
                                <td className="p-3">{new Date(p.timestamp).toLocaleTimeString('pt-AO')}</td>
                                <td className="p-3">{p.dentro_raio? '✓ dentro' : `✗ ${p.distancia_m}m fora`}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
