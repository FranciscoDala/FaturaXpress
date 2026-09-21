import { useState, useMemo } from 'react'
import { Bell, Clock, Check, X, ArrowUpRight, History, AlertCircle, User } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../../../lib/api'

type Props = { empresa?: any, cargoAtual: string }

export default function TabNotificacoes({ cargoAtual }: Props) {
  const [tab, setTab] = useState<'ativas'|'historico'>('ativas')
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const area = cargoAtual === 'admin'? 'admin' : 'rh'
  const isAdmin = cargoAtual === 'admin'

  const fetch = async () => {
    setLoading(true)
    try {
      const status = tab === 'ativas'? 'pendente' : undefined
      const url = status? `/api/rh/notificacoes?area=${area}&status=${status}` : `/api/rh/notificacoes?area=${area}`
      const { data } = await api.get(url)
      setNotifs(data)
    } catch { toast.error('Erro ao carregar notificações') }
    finally { setLoading(false) }
  }

  useMemo(() => { fetch() }, [tab, area])

  // realtime - ouve evento global
  useState(() => {
    const h = () => fetch()
    window.addEventListener('notificacoes-refresh' as any, h as any)
    return () => window.removeEventListener('notificacoes-refresh' as any, h as any)
  })

  const ativas = notifs.filter(n => n.status_notificacao === 'pendente')
  const historico = notifs.filter(n => n.status_notificacao!== 'pendente')

  const list = tab === 'ativas'? ativas : historico

  const handleAcao = async (tipo: string, funcId: string, acao: 'aplicar'|'ignorar'|'encaminhar') => {
    try {
      if (acao === 'aplicar') await api.post(`/api/rh/atrasos/${funcId}/aplicar-falta`)
      if (acao === 'ignorar') await api.post(`/api/rh/atrasos/${funcId}/ignorar`)
      if (acao === 'encaminhar') await api.post(`/api/rh/atrasos/${funcId}/encaminhar-admin`)
      toast.success(acao === 'aplicar'? 'Falta aplicada' : acao === 'ignorar'? 'Atrasos zerados' : 'Encaminhado para admin')
      fetch()
      window.dispatchEvent(new CustomEvent('notificacoes-refresh'))
    } catch (e:any) { toast.error(e?.response?.data?.detail || 'Erro') }
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-[#0095ff]/10 flex items-center justify-center"><Bell className="w-5 h-5 text-[#0095ff]"/></div>
        <div>
          <h2 className="text-[18px] font-bold">Notificações</h2>
          <p className="text-[12px] text-gray-500">{area.toUpperCase()} • {isAdmin? 'Visão total' : 'Sua área'}</p>
        </div>
        <div className="ml-auto flex bg-gray-100 rounded-full p-1">
          <button onClick={()=>setTab('ativas')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition ${tab==='ativas'?'bg-white shadow text-[#0095ff]':'text-gray-600'}`}>Ativas {ativas.length>0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{ativas.length}</span>}</button>
          <button onClick={()=>setTab('historico')} className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition ${tab==='historico'?'bg-white shadow text-[#0095ff]':'text-gray-600'}`}><History className="w-3.5 h-3.5 inline mr-1"/>Histórico</button>
        </div>
      </div>

      {loading? <div className="py-20 text-center bg-white border rounded-[20px] text-gray-400">Carregando...</div> :
        list.length===0? <div className="py-20 text-center bg-white border rounded-[20px]"><Bell className="w-8 h-8 mx-auto text-gray-300 mb-2"/><p className="text-gray-500 text-[14px]">{tab==='ativas'?'Nenhuma notificação pendente':'Nenhum histórico'}</p></div> :
        <div className="grid gap-3">
          {list.map((n:any)=>(
            <div key={n.notificacao_id} className="bg-white border border-gray-100 rounded-[20px] p-4 shadow-sm hover:shadow-md transition">
              {n.tipo==='atraso_excedido'? (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-amber-600"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-[14px] flex items-center gap-2"><User className="w-4 h-4"/>{n.funcionario?.nome || 'Funcionário'} <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{n.qtd_atrasos} atrasos</span></h3>
                      <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[12px] text-gray-500 mt-1">Regra: {n.qtd_para_falta} atrasos no {n.periodo} = 1 falta • {n.area_origem} → {n.area_destino}</p>
                    <div className="flex flex-wrap gap-1 mt-2">{n.atrasos?.slice(0,4).map((a:any,i:number)=><span key={i} className="text-[11px] bg-gray-50 border px-2 py-1 rounded-full">{a.data} • {a.atraso_min}min</span>)}</div>
                    {n.status_notificacao==='pendente' && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={()=>handleAcao(n.tipo, n.funcionario?.id, 'aplicar')} className="h-8 px-3 rounded-full bg-[#0095ff] text-white text-[12px] font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5"/>Aplicar Falta</button>
                        <button onClick={()=>handleAcao(n.tipo, n.funcionario?.id, 'ignorar')} className="h-8 px-3 rounded-full bg-white border text-[12px] flex items-center gap-1"><X className="w-3.5 h-3.5"/>Ignorar</button>
                        {area==='rh' && <button onClick={()=>handleAcao(n.tipo, n.funcionario?.id, 'encaminhar')} className="h-8 px-3 rounded-full bg-white border text-[12px] flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5"/>Admin</button>}
                      </div>
                    )}
                    {n.status_notificacao!=='pendente' && <span className={`mt-2 inline-block text-[10px] px-2 py-1 rounded-full ${n.status_notificacao==='resolvido'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{n.status_notificacao.toUpperCase()}</span>}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><AlertCircle className="w-5 h-5 text-blue-600"/></div>
                  <div className="flex-1"><h3 className="font-semibold text-[14px]">Falta: {n.falta?.funcionario_id}</h3><p className="text-[12px] text-gray-500">{n.falta?.motivo}</p></div>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  )
}
