import { useEffect, useState, useRef } from 'react'
import { X, Check, UserPlus, ChevronDown, Lock, Briefcase, Building2 } from 'lucide-react'
import { toast } from 'sonner'

const CARGOS = [
    { value: 'admin', label: 'Administrador' },
    { value: 'financeira', label: 'Financeira' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'rh', label: 'RH' },
]

// Mock - depois vem da tua API /api/areas
const AREAS_MOCK = [
    { id: '1', nome: 'Financeiro' },
    { id: '2', nome: 'Comercial' },
    { id: '3', nome: 'RH' },
    { id: '4', nome: 'Logística' },
    { id: '5', nome: 'Direção' },
]

interface FuncionarioForm {
    nome: string
    email: string
    senha: string
    cargo: string
    area_principal_id?: string
    areas_ids: string[]
}

interface Props {
    open: boolean
    funcionario?: any | null
    saving?: boolean
    onClose: () => void
    onSave: (data: FuncionarioForm) => void
}

function CustomSelect({ value, options, onChange, placeholder, icon: Icon, disabled }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string, icon?: any, disabled?: boolean }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    const selected = options.find(o => o.value === value)
    return (
        <div ref={ref} className="relative w-full">
            <button type="button" disabled={disabled} onClick={() => !disabled && setOpen(!open)} className={`w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition ${disabled ? 'opacity-60 bg-gray-50 cursor-not-allowed' : ''}`}>
                <span className="flex items-center gap-2 truncate">
                    {Icon && <Icon className="w-4 h-4 text-gray-500 shrink-0" />}
                    <span className={selected ? 'text-black' : 'text-black/40'}>{selected ? selected.label : placeholder}</span>
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {options.map(o => (
                        <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${value === o.value ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-gray-700'}`}>
                            {o.label} {value === o.value && <Check className="w-4 h-4 text-[#0095ff]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function MultiAreaSelect({ values, options, onChange }: { values: string[], options: { value: string, label: string }[], onChange: (v: string[]) => void }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    const toggle = (id: string) => {
        if (values.includes(id)) onChange(values.filter(v => v !== id))
        else onChange([...values, id])
    }

    return (
        <div ref={ref} className="relative w-full">
            <button type="button" onClick={() => setOpen(!open)} className="w-full min-h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 py-2 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition">
                <span className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
                    {values.length === 0 ? <span className="text-black/40">Áreas de acesso (opcional)</span> :
                        <span className="flex gap-1 flex-wrap">
                            {values.map(v => {
                                const opt = options.find(o => o.value === v)
                                return <span key={v} className="px-2 py-[2px] bg-[#E6F0FF] rounded-full text-[11px] font-medium text-[#0095ff] border border-blue-100">{opt?.label}</span>
                            })}
                        </span>
                    }
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-50 top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {options.map(o => (
                        <button key={o.value} type="button" onClick={() => toggle(o.value)} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${values.includes(o.value) ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-gray-700'}`}>
                            {o.label} {values.includes(o.value) && <Check className="w-4 h-4 text-[#0095ff]" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ModalFuncionario({ open, funcionario, saving, onClose, onSave }: Props) {
    const [form, setForm] = useState<FuncionarioForm>({
        nome: '',
        email: '',
        senha: '',
        cargo: 'rh',
        area_principal_id: '',
        areas_ids: []
    })

    useEffect(() => {
        if (open) {
            if (funcionario) {
                setForm({
                    nome: funcionario.nome || '',
                    email: funcionario.email || '',
                    senha: '',
                    cargo: funcionario.cargo || 'rh',
                    area_principal_id: funcionario.area_principal_id || '',
                    areas_ids: funcionario.areas_ids || []
                })
            } else {
                setForm({ nome: '', email: '', senha: '', cargo: 'rh', area_principal_id: '', areas_ids: [] })
            }
        }
    }, [open, funcionario])

    if (!open) return null

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nome.trim()) return toast.error('Nome obrigatório')
        if (!form.email.trim()) return toast.error('Email obrigatório')
        if (!funcionario && !form.senha.trim()) return toast.error('Senha obrigatória')
        if (form.senha && form.senha.length < 6) return toast.error('Senha mínima 6 caracteres')
        if (!form.cargo) return toast.error('Cargo obrigatório')

        onSave(form)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* TRAVADO - backdrop não fecha modal */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()} />

            <div className="relative bg-white rounded-[24px] w-full max-w-[560px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-[#0095ff]" />
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{funcionario ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1">Defina acesso por cargo e áreas da empresa</p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-6 py-4">
                        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                        <div className="flex flex-col gap-[2px]">
                            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" className={inputClass} />
                            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="E-mail do funcionário" className={inputClass} disabled={!!funcionario} />

                            <div className="relative">
                                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    value={form.senha}
                                    onChange={e => setForm({ ...form, senha: e.target.value })}
                                    type="password"
                                    placeholder={funcionario ? "Nova senha (deixe vazio para manter)" : "Senha (mín. 6 caracteres)"}
                                    className={`${inputClass} pl-10`}
                                />
                            </div>

                            <div className="h-[1px] bg-gray-100 my-3" />
                            <p className="text-[11px] font-bold tracking-widest text-black mb-2">PERMISSÕES</p>

                            <CustomSelect
                                value={form.cargo}
                                onChange={(v) => setForm({ ...form, cargo: v })}
                                placeholder="Selecione o cargo"
                                options={CARGOS}
                                icon={Briefcase}
                            />

                            <CustomSelect
                                value={form.area_principal_id || ''}
                                onChange={(v) => setForm({ ...form, area_principal_id: v })}
                                placeholder="Área principal (opcional)"
                                options={AREAS_MOCK.map(a => ({ value: a.id, label: a.nome }))}
                                icon={Building2}
                            />

                            <MultiAreaSelect
                                values={form.areas_ids}
                                onChange={(v) => setForm({ ...form, areas_ids: v })}
                                options={AREAS_MOCK.map(a => ({ value: a.id, label: a.nome }))}
                            />

                            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-[12px]">
                                <p className="text-[11px] text-blue-700 leading-[1.4]">
                                    <b>admin:</b> acesso total • <b>financeira:</b> faturas/pagamentos • <b>recepcao:</b> clientes/produtos • <b>rh:</b> funcionários
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50">
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                        <button type="submit" disabled={saving} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50">
                            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
