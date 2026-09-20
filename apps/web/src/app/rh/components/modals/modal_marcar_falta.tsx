import { useState } from 'react'
import { X, Check, AlertTriangle, HeartPulse, FileText } from 'lucide-react'
import { createPortal } from 'react-dom'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

type Func = { id: string; nome: string }

export default function ModalMarcarFalta({ open, funcionario, onClose, onSaved }: { open: boolean, funcionario: Func|null, onClose: ()=>void, onSaved: ()=>void }){
    const [categoria,setCategoria]=useState<'nao_apareceu'|'doente'|'outros'>('nao_apareceu')
    const [obs,setObs]=useState('')
    const [saving,setSaving]=useState(false)

    const save = async()=>{
        if(!funcionario) return
        if(categoria==='outros' &&!obs.trim()){
            toast.error('Descreva o motivo em outros')
            return
        }
        setSaving(true)
        try{
            await api.post('/api/rh/falta',{
                funcionario_id: funcionario.id,
                categoria,
                motivo: categoria==='nao_apareceu'? 'Não apareceu' : categoria==='doente'? 'Doente' : 'Outros',
                observacao: obs
            })
            toast.success(`Falta marcada: ${categoria}`)
            onSaved()
        }catch(e:any){
            toast.error(e?.response?.data?.detail || 'Erro ao marcar falta')
        }finally{setSaving(false)}
    }

    if(!open ||!funcionario) return null

    const Card = ({id,label,sub,icon:Icon}:{id:any,label:string,sub:string,icon:any})=>(
        <button type="button" onClick={()=>setCategoria(id)} className={`w-full text-left p-3 rounded-[12px] border flex items-center gap-3 transition ${categoria===id? 'bg-[#E6F0FF] border-[#C2D8FF]' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border ${categoria===id? 'bg-black text-white border-black' : 'bg-white border-gray-200'}`}><Icon className="w-4 h-4"/></div>
            <div className="flex-1">
                <p className="font-bold text-[13px] text-black">{label}</p>
                <p className="text-[11px] text-black/60">{sub}</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${categoria===id? 'border-black bg-black' : 'border-gray-300 bg-white'}`}>{categoria===id && <Check className="w-3 h-3 text-white"/>}</div>
        </button>
    )

    const modal = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={e=>e.stopPropagation()}/>
            <div className="relative bg-white rounded-[24px] w-full max-w-[460px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col" onClick={e=>e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#FFEAEA] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-600"/></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500"/></button>
                </div>
                <div className="px-6 pt-5 pb-3 border-b">
                    <h3 className="text-[16px] font-bold text-black">Marcar Falta - {funcionario.nome}</h3>
                    <p className="text-[12px] text-black/60 mt-1">Falta fica como <b className="text-black">pendente de justificação</b>. Se for credível, será justificada e removida.</p>
                </div>
                <div className="px-6 py-4 flex flex-col gap-[8px]">
                    <Card id="nao_apareceu" label="Não apareceu" sub="Sem aviso prévio, justificar depois" icon={AlertTriangle}/>
                    <Card id="doente" label="Doente" sub="Aguardando atestado, justificar depois" icon={HeartPulse}/>
                    <Card id="outros" label="Outros" sub="Descreva o motivo abaixo" icon={FileText}/>
                    {categoria==='outros' && (
                        <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder="Descreva o motivo da falta..." className="mt-2 w-full min-h-[80px] bg-white border border-gray-200 rounded-[12px] p-3 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-black"/>
                    )}
                    {categoria!=='outros' && (
                        <input value={obs} onChange={e=>setObs(e.target.value)} placeholder="Observação opcional..." className="mt-1 w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-black"/>
                    )}
                </div>
                <div className="px-6 py-4 border-t flex gap-[2px]">
                    <button onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-black"/></button>
                    <button disabled={saving} onClick={save} className="flex-1 h-11 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 flex items-center justify-center disabled:opacity-50 gap-1.5">{saving? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check className="w-5 h-5"/> Marcar Falta</>}</button>
                </div>
            </div>
        </div>
    )
    return typeof document!=='undefined'? createPortal(modal, document.body) : null
}
