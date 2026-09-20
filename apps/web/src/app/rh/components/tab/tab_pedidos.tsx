import { useEffect, useState } from 'react'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

export default function TabPedidos(){
    const [pedidos,setPedidos]=useState<any[]>([])
    const [loading,setLoading]=useState(true)

    const load = async()=>{
        setLoading(true)
        try{const {data}=await api.get('/api/rh/pedidos?status=pendente'); setPedidos(data)}catch{}
        finally{setLoading(false)}
    }
    useEffect(()=>{load()},[])

    const aprovar = async(id:string)=>{
        try{await api.patch(`/api/rh/pedidos/${id}/aprovar`); toast.success('Aprovado'); load()}catch(e:any){toast.error(e.response?.data?.detail)}
    }
    const rejeitar = async(id:string)=>{
        try{await api.patch(`/api/rh/pedidos/${id}/rejeitar`,{observacao_gestor:'Rejeitado pelo gestor'}); toast.success('Rejeitado'); load()}catch(e:any){toast.error(e.response?.data?.detail)}
    }

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px]">Carregando pedidos...</p>
    if(pedidos.length===0) return <p className="text-center py-16 bg-white rounded-[20px] border">Nenhum pedido pendente</p>

    return (
        <div className="grid gap-3">
            {pedidos.map((p:any)=>(
                <div key={p.id} className="bg-white border rounded-[16px] p-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-[14px]">{p.funcionario?.nome} - <span className="text-[#0095ff]">{p.tipo}</span></p>
                        <p className="text-[12px] text-gray-500">{p.data_inicio} → {p.data_fim} ({p.dias_uteis} dias úteis)</p>
                        <p className="text-[12px] text-gray-600">{p.motivo}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={()=>rejeitar(p.id)} className="px-3 py-2 text-[12px] border rounded-full hover:bg-gray-50">Rejeitar</button>
                        <button onClick={()=>aprovar(p.id)} className="px-4 py-2 text-[12px] bg-black text-white rounded-full hover:bg-gray-800">Aprovar</button>
                    </div>
                </div>
            ))}
        </div>
    )
}
