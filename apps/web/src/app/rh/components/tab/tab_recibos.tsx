import { useEffect, useState } from 'react'
import { api } from '../../../../lib/api'

export default function TabRecibos(){
    const [recibos,setRecibos]=useState<any[]>([])
    useEffect(()=>{api.get('/api/rh/recibos').then(r=>setRecibos(r.data)).catch(()=>{})},[])

    if(recibos.length===0) return <p className="text-center py-16 bg-white rounded-[20px] border">Nenhum recibo publicado</p>

    return (
        <div className="grid gap-2">
            {recibos.map((r:any)=>(
                <div key={r.id} className="bg-white border rounded-[16px] p-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-[13px]">{r.funcionario?.nome} - {r.mes}/{r.ano}</p>
                        <p className="text-[11px] text-gray-500">{r.tipo} • {r.status}</p>
                    </div>
                    <a href={r.arquivo_pdf_url} target="_blank" className="text-[12px] text-[#0095ff] underline">Ver PDF</a>
                </div>
            ))}
        </div>
    )
}
