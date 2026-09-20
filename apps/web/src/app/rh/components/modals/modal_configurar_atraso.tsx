import { useEffect, useState, useRef } from 'react'
import { X, Check, Clock, Timer, Settings, ShieldAlert, CalendarRange, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }

function CustomSelect({ value, options, onChange, placeholder, icon: Icon }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string, icon?: any }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current &&!ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    const selected = options.find(o => o.value === value)
    return (
        <div ref={ref} className="relative w-full">
            <button type="button" onClick={() => setOpen(!open)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-black transition">
                <span className={`flex items-center gap-2 truncate ${selected? 'text-black' : 'text-black/40'}`}>
                    {Icon? <Icon className="w-4 h-4 text-gray-400" /> : null}
                    {selected? selected.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[70] top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5">
                    {options.map(o => (
                        <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${value === o.value? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-black/70'}`}>
                            {o.label} {value === o.value && <Check className="w-4 h-4 text-black" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ModalConfigPonto({ open, onClose }: { open: boolean, onClose: () => void }) {
    const [cfg, setCfg] = useState<Config>({ hora_entrada: "08:00", tolerancia_min: 15, regra_atraso_ativa: false, qtd_atrasos_para_falta: 3, periodo_regra: "semana" })
    const [saving, setSaving] = useState(false)
    const [loadingCfg, setLoadingCfg] = useState(true)

    useEffect(() => {
        if (open) {
            setLoadingCfg(true)
            api.get('/api/rh/ponto/config').then(r => setCfg(r.data)).catch(()=>{}).finally(() => setLoadingCfg(false))
        }
    }, [open])

    const save = async () => {
        setSaving(true)
        try {
            const { data } = await api.put('/api/rh/ponto/config', cfg)
            setCfg(data)
            toast.success('Configuração salva em tempo real')
            onClose()
        } catch { toast.error('Erro ao salvar') }
        finally { setSaving(false) }
    }

    if (!open) return null

    const modal = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />
            <div className="relative bg-white rounded-[24px] w-full max-w-[480px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><Settings className="w-4 h-4 text-black" /></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-black leading-tight">Regras de Ponto</h3>
                    <p className="text-[13px] text-black/60 mt-1">Configure horário e conversão automática de atrasos em faltas</p>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-4 flex flex-col gap-[2px]">
                    <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
                    {loadingCfg? <p className="text-[12px] text-black/50 py-10 text-center">Carregando...</p> : <>
                        <p className="text-[11px] font-bold tracking-widest text-black mb-1">HORÁRIO BASE</p>
                        <div className="grid grid-cols-2 gap-[2px]">
                            <div className="relative">
                                <Clock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={cfg.hora_entrada} onChange={e => setCfg({...cfg, hora_entrada: e.target.value })} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] pl-10 pr-3 text-[13.5px] text-black focus:outline-none focus:border-black" type="time" />
                            </div>
                            <div className="relative">
                                <Timer className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input value={cfg.tolerancia_min} onChange={e => setCfg({...cfg, tolerancia_min: parseInt(e.target.value) || 0 })} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] pl-10 pr-3 text-[13.5px] text-black focus:outline-none focus:border-black" type="number" placeholder="Tolerância min" />
                            </div>
                        </div>

                        <div className="h-[1px] bg-gray-100 my-3" />
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-black" /></div>
                                <div>
                                    <p className="font-semibold text-[13px] text-black">X atrasos = 1 falta</p>
                                    <p className="text-[11px] text-black/60">Gera falta automática em tempo real</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={cfg.regra_atraso_ativa} onChange={e => setCfg({...cfg, regra_atraso_ativa: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                            </label>
                        </div>

                        {cfg.regra_atraso_ativa && (
                            <div className="mt-3 grid grid-cols-2 gap-[2px] bg-gray-50 p-3 rounded-[16px] border border-gray-100">
                                <div>
                                    <label className="text-[11px] text-black/60">Qtd atrasos p/ falta</label>
                                    <div className="relative mt-1">
                                        <input min={2} max={10} value={cfg.qtd_atrasos_para_falta} onChange={e => setCfg({...cfg, qtd_atrasos_para_falta: parseInt(e.target.value) || 3 })} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black" type="number" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[11px] text-black/60">Período</label>
                                    <div className="mt-1">
                                        <CustomSelect value={cfg.periodo_regra} onChange={v => setCfg({...cfg, periodo_regra: v })} placeholder="Período" options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]} icon={CalendarRange} />
                                    </div>
                                </div>
                                <p className="col-span-2 text-[10px] text-black/50 mt-1">Ex: {cfg.qtd_atrasos_para_falta} atrasos na {cfg.periodo_regra} = 1 falta automática (conta tempo real)</p>
                            </div>
                        )}
                    </>}
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                    <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-black" /></button>
                    <button type="button" disabled={saving || loadingCfg} onClick={save} className="flex-1 h-11 rounded-full bg-black text-white font-semibold hover:bg-gray-900 flex items-center justify-center disabled:opacity-50 gap-1.5">{saving? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="w-5 h-5" /> Salvar</>}</button>
                </div>
            </div>
        </div>
    )

    return typeof document!== 'undefined'? createPortal(modal, document.body) : null
}
