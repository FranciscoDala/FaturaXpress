import { useState, useEffect } from 'react'
import { X, Check, AlertTriangle, HeartPulse, FileText, Calendar, Loader2, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'
import ModalCalendarioPonto from './modal_calendario_ponto'

type Func = { id: string; nome: string }

function isoToday(){
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function formatDisplay(iso: string){
    if(!iso) return ""
    const [y,m,d] = iso.split("-")
    return `${d}/${m}/${y}`
}
function addDays(iso: string, days: number) {
    const d = new Date(iso + "T12:00:00")
    d.setDate(d.getDate() + days)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function ModalMarcarFalta({ open, funcionario, onClose, onSaved, dataSelecionada }: { open: boolean, funcionario: Func|null, onClose: ()=>void, onSaved: ()=>void, dataSelecionada?: string }){
    const [categoria,setCategoria]=useState<'nao_apareceu'|'doente'|'outros'>('nao_apareceu')
    const [obs,setObs]=useState('')
    const [motivoRetro,setMotivoRetro]=useState('')
    const [saving,setSaving]=useState(false)
    const [dataFalta,setDataFalta]=useState(dataSelecionada || isoToday())
    const [openCal,setOpenCal]=useState(false)

    const hoje = isoToday()
    const minDate = addDays(hoje, -6)

    useEffect(()=>{
        if(open){
            setDataFalta(dataSelecionada || isoToday())
            setMotivoRetro('')
            setObs('')
            setCategoria('nao_apareceu')
        }
    },[open, dataSelecionada])

    const isRetro = dataFalta!== hoje

    const save = async()=>{
        if(!funcionario) return
        if(categoria==='outros' &&!obs.trim()){
            toast.error('Descreva o motivo em outros')
            return
        }
        if(isRetro &&!motivoRetro.trim()){
            toast.error('Para falta retroativa informe o motivo (ex: Falta de luz)')
            return
        }
        setSaving(true)
        try{
            const stored = localStorage.getItem('funcionario_logado')
            const logado = stored? JSON.parse(stored) : null

            await api.post('/api/rh/falta',{
                funcionario_id: funcionario.id,
                categoria,
                motivo: categoria==='nao_apareceu'? 'Não apareceu' : categoria==='doente'? 'Doente' : 'Outros',
                observacao: obs,
                data: dataFalta,
                motivo_retroativo: isRetro? motivoRetro : undefined,
                lancado_por_id: logado?.id
            })
            toast.success(`Falta marcada em ${formatDisplay(dataFalta)}: ${categoria}`)
            setObs('')
            setMotivoRetro('')
            setCategoria('nao_apareceu')
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
        <>
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
            <div className="relative bg-white rounded-[24px] w-full max-w-[460px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex flex-col max-h-[90vh]" onClick={e=>e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#FFEAEA] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-600"/></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500"/></button>
                </div>
                <div className="px-6 pt-5 pb-3 border-b shrink-0">
                    <h3 className="text-[16px] font-bold text-black">Marcar Falta - {funcionario.nome}</h3>

                    {/* SELETOR DE DATA - FULL WIDTH NO CELULAR */}
                    <button type="button" onClick={()=>setOpenCal(true)} className="mt-3 w-full h-[44px] px-3 bg-white border border-gray-200 rounded-full flex items-center justify-between text-[13px] font-bold text-black hover:border-black">
                        <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/> {formatDisplay(dataFalta)}</span>
                        <ChevronDown className="w-4 h-4"/>
                    </button>
                    <p className="text-[11px] text-black/50 mt-1.5">Janela: {formatDisplay(minDate)} até hoje</p>

                    <div className="flex items-center gap-2 mt-2">
                        {isRetro && <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-200 text-[11px] text-amber-800 font-bold">Retroativo • {formatDisplay(dataFalta)}</span>}
                    </div>
                    <p className="text-[12px] text-black/60 mt-2">
                        Falta fica como <b className="text-black">pendente de justificação</b> em {formatDisplay(dataFalta)}.
                    </p>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-[8px]">
                    <Card id="nao_apareceu" label="Não apareceu" sub={`Não apareceu em ${formatDisplay(dataFalta)}`} icon={AlertTriangle}/>
                    <Card id="doente" label="Doente" sub="Aguardando atestado" icon={HeartPulse}/>
                    <Card id="outros" label="Outros" sub="Descreva o motivo abaixo" icon={FileText}/>

                    {categoria==='outros'? (
                        <textarea value={obs} onChange={e=>setObs(e.target.value)} placeholder={`Descreva o motivo da falta em ${formatDisplay(dataFalta)}...`} className="mt-2 w-full min-h-[80px] bg-white border border-gray-200 rounded-[12px] p-3 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-black"/>
                    ) : (
                        <input value={obs} onChange={e=>setObs(e.target.value)} placeholder={`Observação para ${formatDisplay(dataFalta)} (opcional)`} className="mt-1 w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13px] text-black placeholder:text-black/40 focus:outline-none focus:border-black"/>
                    )}

                    {isRetro && (
                        <div className="mt-2 p-3 rounded-[12px] bg-amber-50 border border-amber-200 flex flex-col gap-2">
                            <div className="flex gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-800 font-bold">Motivo obrigatório do retroativo *</p>
                            </div>
                            <input value={motivoRetro} onChange={e=>setMotivoRetro(e.target.value)} placeholder="Ex: Falta de luz, sem internet..." className="w-full h-[40px] px-3 bg-white border border-amber-200 rounded-full text-[12px] focus:outline-none focus:border-amber-500"/>
                            <p className="text-[11px] text-amber-700/80">Ficará registado com auditoria: quem lançou + quando.</p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 border-t bg-white flex gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-black"/></button>
                    <button disabled={saving} onClick={save} className="flex-1 h-11 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 flex items-center justify-center disabled:opacity-50 gap-1.5">
                        {saving? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-5 h-5" /> Marcar em {formatDisplay(dataFalta)}</>}
                    </button>
                </div>
            </div>
        </div>
        <ModalCalendarioPonto open={openCal} value={dataFalta} onClose={()=>setOpenCal(false)} onSelect={setDataFalta} />
        </>
    )
    return typeof document!=='undefined'? createPortal(modal, document.body) : null
}
