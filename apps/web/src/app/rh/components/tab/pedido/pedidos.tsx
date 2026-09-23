import { useEffect, useState, useMemo } from 'react'
import { api } from '../../../../../lib/api'
import { toast } from 'sonner'
import { Lock } from 'lucide-react'

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    rh: ["gerir_funcionarios", "gerir_pedidos", "ver_pedidos", "aprovar_pedidos"],
    financeira: ["ver_faturas"],
    recepcao: ["ver_faturas"]
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

export default function TabPedidos(){
    const [pedidos,setPedidos]=useState<any[]>([])
    const [loading,setLoading]=useState(true)

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeVer = funcionarioLogado? temPermissao(cargoAtual, 'ver_pedidos') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true
    const podeAprovar = funcionarioLogado? temPermissao(cargoAtual, 'aprovar_pedidos') || temPermissao(cargoAtual, 'gerir_pedidos') || temPermissao(cargoAtual, 'gerir_funcionarios') || cargoAtual === 'admin' : true

    const load = async()=>{
        setLoading(true)
        try{const {data}=await api.get('/api/rh/pedidos?status=pendente'); setPedidos(data)}catch{}
        finally{setLoading(false)}
    }
    useEffect(()=>{load()},[])

    const aprovar = async(id:string)=>{
        if (!podeAprovar) { toast.error('Sem permissão'); return }
        try{await api.patch(`/api/rh/pedidos/${id}/aprovar`); toast.success('Aprovado'); load()}catch(e:any){toast.error(e.response?.data?.detail)}
    }
    const rejeitar = async(id:string)=>{
        if (!podeAprovar) { toast.error('Sem permissão'); return }
        try{await api.patch(`/api/rh/pedidos/${id}/rejeitar`,{observacao_gestor:'Rejeitado pelo gestor'}); toast.success('Rejeitado'); load()}catch(e:any){toast.error(e.response?.data?.detail)}
    }

    if (!podeVer) {
        return (
            <div className="text-center py-16 bg-white rounded-[20px] border">
                <Lock className="w-8 h-8 mx-auto text-gray-300 mb-2"/>
                <p className="text-black/60 text-[13px]">Seu cargo <b>{cargoAtual}</b> não pode ver pedidos</p>
            </div>
        )
    }

    if(loading) return <p className="text-center py-10 bg-white border rounded-[16px]">Carregando pedidos...</p>
    if(pedidos.length===0) return <p className="text-center py-16 bg-white rounded-[20px] border">Nenhum pedido pendente</p>

    return (
        <div className="grid gap-3">
            {pedidos.map((p:any)=>(
                <div key={p.id} className="bg-white border rounded-[16px] p-4 flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-[14px]">{p.funcionario?.nome} - <span className="text-[#0095ff]">{p.tipo}</span> {cargoAtual!== 'admin' && <span className="ml-2 text-[9px] bg-gray-100 border px-2 py-[2px] rounded-full">{cargoAtual.toUpperCase()}</span>}</p>
                        <p className="text-[12px] text-gray-500">{p.data_inicio} → {p.data_fim} ({p.dias_uteis} dias úteis)</p>
                        <p className="text-[12px] text-gray-600">{p.motivo}</p>
                    </div>
                    <div className="flex gap-2">
                        <button disabled={!podeAprovar} onClick={()=>rejeitar(p.id)} className={`px-3 py-2 text-[12px] border rounded-full ${podeAprovar? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed bg-gray-50'}`}>Rejeitar</button>
                        <button disabled={!podeAprovar} onClick={()=>aprovar(p.id)} className={`px-4 py-2 text-[12px] rounded-full ${podeAprovar? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Aprovar</button>
                    </div>
                </div>
            ))}
        </div>
    )
}
