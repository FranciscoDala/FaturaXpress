import { useEffect, useState, useRef, useMemo } from 'react'
import { X, Check, Clock, Timer, Settings, ShieldAlert, CalendarRange, ChevronDown, Loader2, Lock } from 'lucide-react'
import { createPortal } from 'react-dom'
import { api } from '../../../../lib/api'
import { toast } from 'sonner'

type Config = { hora_entrada: string; tolerancia_min: number; regra_atraso_ativa: boolean; qtd_atrasos_para_falta: number; periodo_regra: string }

const CARGOS_PERMISSOES: Record<string, string[]> = {
    admin: ["*"],
    rh: ["config_ponto"],
    financeira: [],
    recepcao: []
}

function temPermissao(cargo: string, perm: string) {
    if (cargo === 'admin') return true
    const perms = CARGOS_PERMISSOES[cargo] || []
    return perms.includes(perm) || perms.includes("*")
}

function CustomSelect({ value, options, onChange, placeholder, icon: Icon, disabled }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string, icon?: any, disabled?: boolean }) {
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
            <button disabled={disabled} type="button" onClick={() =>!disabled && setOpen(!open)} className={`w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-black transition ${disabled? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
                <span className={`flex items-center gap-2 truncate ${selected? 'text-black' : 'text-black/40'}`}>
                    {Icon? <Icon className="w-4 h-4 text-gray-400 shrink-0" /> : null}
                    {selected? selected.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open? 'rotate-180' : ''} shrink-0`} />
            </button>
            {open &&!disabled && (
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

    const funcionarioLogado = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("funcionario") || "null") } catch { return null }
    }, [])

    const cargoAtual = funcionarioLogado?.cargo?.toLowerCase() || 'admin'
    const podeConfig = funcionarioLogado? temPermissao(cargoAtual, 'config_ponto') || cargoAtual === 'admin' : true

    useEffect(() => {
        if (open) {
            setLoadingCfg(true)
            api.get('/api/rh/ponto/config').then(r => setCfg(r.data)).catch(()=>{}).finally(() => setLoadingCfg(false))
        }
    }, [open])

    const save = async () => {
        if (!podeConfig) { toast.error('Só admin pode configurar'); return }
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
                    <h3 className="text-[18px] font-bold text-black leading-tight">Regras de Ponto <span className="text-[10px] bg-gray-100 border px-2 py-1 rounded-full ml-1">{cargoAtual.toUpperCase()}</span></h3>
                    <p className="text-[13px] text-black/60 mt-1">Configure horário e conversão automática de atrasos em faltas</p>
                    {!podeConfig && (
                        <div className="mt-3 p-2.5 rounded-[10px] bg-red-50 border border-red-200 flex items-center gap-2 text-[11px] text-red-700"><Lock className="w-4 h-4"/> Só admin pode alterar configuração de ponto</div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-5 flex flex-col">
                    <style>{`
                      .no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
                        input[type="time"]{ -webkit-appearance:none; appearance:none; }
                        input[type="time"]::-webkit-calendar-picker-indicator{ opacity:0.5; margin-left:4px; }
                        input[type="number"]::-webkit-outer-spin-button,
                        input[type="number"]::-webkit-inner-spin-button{ -webkit-appearance:none; margin:0; }
                    `}</style>

                    {loadingCfg? (
                        <div className="py-20 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-black/30" />
                        </div>
                    ) : <>
                        <p className="text-[11px] font-bold tracking-widest text-black mb-2">HORÁRIO BASE</p>

                        <div className="grid grid-cols-2 gap-3">
                            <div className={`bg-white border border-gray-200 rounded-[14px] px-3 py-2.5 flex flex-col gap-1 shadow-sm ${!podeConfig? 'opacity-50 bg-gray-50' : ''}`}>
                                <div className="flex items-center gap-1.5 text-[10px] text-black/50 font-medium">
                                    <Clock className="w-3.5 h-3.5" /> Entrada
                                </div>
                                <input
                                    disabled={!podeConfig}
                                    value={cfg.hora_entrada}
                                    onChange={e => setCfg({...cfg, hora_entrada: e.target.value })}
                                    className="w-full bg-transparent text-[15px] font-semibold text-black focus:outline-none disabled:cursor-not-allowed"
                                    type="time"
                                    style={{ minWidth: 0 }}
                                />
                            </div>

                            <div className={`bg-white border border-gray-200 rounded-[14px] px-3 py-2.5 flex flex-col gap-1 shadow-sm ${!podeConfig? 'opacity-50 bg-gray-50' : ''}`}>
                                <div className="flex items-center gap-1.5 text-[10px] text-black/50 font-medium">
                                    <Timer className="w-3.5 h-3.5" /> Tolerância (min)
                                </div>
                                <input
                                    disabled={!podeConfig}
                                    value={cfg.tolerancia_min}
                                    onChange={e => setCfg({...cfg, tolerancia_min: parseInt(e.target.value) || 0 })}
                                    className="w-full bg-transparent text-[15px] font-semibold text-black focus:outline-none disabled:cursor-not-allowed"
                                    type="number"
                                    placeholder="15"
                                    inputMode="numeric"
                                />
                            </div>
                        </div>

                        <div className="h-[1px] bg-gray-100 my-4" />

                        <div className={`bg-white border border-gray-200 rounded-[14px] p-3 flex items-center justify-between gap-3 shadow-sm ${!podeConfig? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-gray-50 border flex items-center justify-center shrink-0"><ShieldAlert className="w-4 h-4 text-black" /></div>
                                <div className="min-w-0">
                                    <p className="font-semibold text-[13px] text-black">X atrasos = 1 falta</p>
                                    <p className="text-[11px] text-black/60 truncate">Gera falta automática em tempo real</p>
                                </div>
                            </div>
                            <label className={`relative inline-flex items-center shrink-0 ${!podeConfig? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <input disabled={!podeConfig} type="checkbox" checked={cfg.regra_atraso_ativa} onChange={e => podeConfig && setCfg({...cfg, regra_atraso_ativa: e.target.checked })} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                            </label>
                        </div>

                        {cfg.regra_atraso_ativa && (
                            <div className="mt-3 bg-gray-50 p-3 rounded-[16px] border border-gray-100 grid grid-cols-2 gap-3">
                                <div className={`bg-white border border-gray-200 rounded-[14px] px-3 py-2.5 flex flex-col gap-1 shadow-sm ${!podeConfig? 'opacity-50' : ''}`}>
                                    <label className="text-[10px] text-black/50 font-medium">Qtd atrasos p/ falta</label>
                                    <input disabled={!podeConfig} min={2} max={10} value={cfg.qtd_atrasos_para_falta} onChange={e => podeConfig && setCfg({...cfg, qtd_atrasos_para_falta: parseInt(e.target.value) || 3 })} className="w-full bg-transparent text-[14px] font-semibold text-black focus:outline-none disabled:cursor-not-allowed" type="number" inputMode="numeric" />
                                </div>
                                <div className={`bg-white border border-gray-200 rounded-[14px] px-3 py-2.5 flex flex-col gap-1 shadow-sm ${!podeConfig? 'opacity-50' : ''}`}>
                                    <label className="text-[10px] text-black/50 font-medium">Período</label>
                                    <div className="mt-0.5">
                                        <CustomSelect disabled={!podeConfig} value={cfg.periodo_regra} onChange={v => podeConfig && setCfg({...cfg, periodo_regra: v })} placeholder="Período" options={[{ value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }]} icon={CalendarRange} />
                                    </div>
                                </div>
                                <p className="col-span-2 text-[10px] text-black/50">Ex: {cfg.qtd_atrasos_para_falta} atrasos na {cfg.periodo_regra} = 1 falta automática</p>
                            </div>
                        )}
                    </>}
                </div>

                <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-black" /></button>
                    <button type="button" disabled={saving || loadingCfg ||!podeConfig} onClick={save} className="flex-1 h-11 rounded-full bg-black text-white font-semibold hover:bg-gray-900 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed gap-1.5">{saving? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-5 h-5" /></>}</button>
                </div>
            </div>
        </div>
    )

    return typeof document!== 'undefined'? createPortal(modal, document.body) : null
}
