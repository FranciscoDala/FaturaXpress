import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../lib/api'
import { Lock } from 'lucide-react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    rh: ["gerir_funcionarios", "ver_recibos", "gerir_recibos"],
    financeira: ["ver_recibos_proprio"],
    recepcao: ["ver_recibos_proprio"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function TabRecibos(){
    const [recibos,setRecibos]=useState<any[]>([])

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_recibos') || temPermissao(cargoAtual, 'ver_recibos_proprio') || cargoAtual === 'admin' : true
    const podeVerTodos = funcionarioLogado? temPermissao(cargoAtual, 'ver_recibos') || cargoAtual === 'admin' : true

    useEffect(()=>{
        if (!podeVer) return
        const url = podeVerTodos? '/api/rh/recibos' : `/api/rh/recibos?funcionario_id=${funcionarioLogado?.id}`
        api.get(url).then(r=>setRecibos(r.data)).catch(()=>{})
    },[podeVer, podeVerTodos, funcionarioLogado?.id])

    if (!podeVer) {
        return (
            <div className="text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-black/60 text-[13px]">Seu cargo <b>{cargoAtual}</b> não pode ver recibos</p>
            </div>
        )
    }

    if(recibos.length===0) return <p className="text-center py-16 bg-white rounded-[20px] border">Nenhum recibo publicado {podeVerTodos? '' : 'para você'}</p>

    return (
        <div className="grid gap-2">
            <div className="px-1 pb-1 text-[11px] text-gray-500">
                {podeVerTodos? `Todos os recibos • cargo: ${cargoAtual}` : `Seus recibos • ${funcionarioLogado?.nome}`}
            </div>
            {recibos.map((r:any)=>(
                <div key={r.id} className="bg-white border rounded-[16px] p-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-[13px]">{r.funcionario?.nome} - {r.mes}/{r.ano}</p>
                        <p className="text-[11px] text-gray-500">{r.tipo} • {r.status} {!podeVerTodos && ' • só leitura'}</p>
                    </div>
                    <a href={r.arquivo_pdf_url} target="_blank" className="text-[12px] text-[#0095ff] underline">Ver PDF</a>
                </div>
            ))}
        </div>
    )
}
