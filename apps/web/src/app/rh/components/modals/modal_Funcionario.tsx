import { useEffect, useState, useRef } from 'react'
import { X, Check, UserPlus, ChevronDown, Lock, Briefcase, Building2, Info, Settings, Shield, MapPin, Landmark, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const CARGOS = [
    { value: 'admin', label: 'Administrador' },
    { value: 'financeira', label: 'Financeira' },
    { value: 'recepcao', label: 'Recepção' },
    { value: 'rh', label: 'RH' },
]
const GENEROS = [{ value: 'M', label: 'Masculino' }, { value: 'F', label: 'Feminino' }]
const ESTADO_CIVIL = [
    { value: 'solteiro', label: 'Solteiro(a)' },
    { value: 'casado', label: 'Casado(a)' },
    { value: 'divorciado', label: 'Divorciado(a)' },
    { value: 'viuvo', label: 'Viúvo(a)' },
]
const BANCOS_ANGOLA = [
    "BAI - Banco Angolano de Investimentos", "BFA - Banco de Fomento Angola", "BIC - Banco BIC", "BPC - Banco de Poupança e Crédito", "BCI - Banco de Comércio e Indústria", "BNI - Banco de Negócios Internacional", "BMA - Banco Millennium Atlântico", "BCA - Banco Caixa Geral Angola", "SOL - Banco Sol", "SBA - Standard Bank Angola", "BE - Banco Económico", "BVB - Banco Valor", "BCS - Banco de Crédito do Sul", "BCH - Banco Comercial do Huambo", "BPG - Banco Prestígio", "BMF - Banco BAI Micro Finanças", "BIR - Banco de Investimento Rural", "FNB - First National Bank Angola",
]
const AREAS_MOCK = [{ id: '1', nome: 'Financeiro' }, { id: '2', nome: 'Comercial' }, { id: '3', nome: 'RH' }, { id: '4', nome: 'Logística' }, { id: '5', nome: 'Direção' }]
const PROVINCIAS = ["Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cubango", "Cuanza-Norte", "Cuanza-Sul", "Cunene", "Huambo", "Huíla", "Icolo e Bengo", "Luanda", "Lunda-Norte", "Lunda-Sul", "Malanje", "Moxico", "Moxico Leste", "Namibe", "Uíge", "Zaire"]
const MUNICIPIOS: Record<string, string[]> = {
    "Bengo": ["Dande", "Ambriz", "Bula Atumba", "Dembos", "Nambuangongo", "Pango Aluquém"],
    "Benguela": ["Benguela", "Lobito", "Baía Farta", "Balombo", "Bocoio", "Caimbambo", "Catumbela", "Chongorói", "Cubal", "Ganda"],
    "Bié": ["Kuito", "Andulo", "Camacupa", "Catabola", "Chinguar", "Chitembo", "Cuemba", "Cunhinga", "Nharea"],
    "Cabinda": ["Cabinda", "Belize", "Buco-Zau", "Cacongo"],
    "Cuando": ["Mavinga", "Cuito Cuanavale", "Dirico", "Rivungo"],
    "Cubango": ["Menongue", "Calai", "Cuangar", "Cuchi", "Cuito Cuanavale", "Mavinga"],
    "Cuanza-Norte": ["Cazengo", "Ambaca", "Banga", "Bolongongo", "Cambambe", "Golungo Alto", "Gonguembo", "Lucala", "Quiculungo", "Samba Caju"],
    "Cuanza-Sul": ["Sumbe", "Amboim", "Cassongue", "Cela", "Conda", "Ebo", "Libolo", "Mussende", "Porto Amboim", "Quibala", "Quilenda", "Seles"],
    "Cunene": ["Ondjiva", "Cahama", "Cuanhama", "Curoca", "Cuvelai", "Namacunde", "Ombadja"],
    "Huambo": ["Huambo", "Bailundo", "Caála", "Catchiungo", "Chicala-Choloanga", "Chinjenje", "Ecunha", "Londuimbali", "Longonjo", "Mungo", "Ucuma"],
    "Huíla": ["Lubango", "Caconda", "Cacula", "Caluquembe", "Chibia", "Chicomba", "Chipindo", "Cuvango", "Humpata", "Jamba", "Matala", "Quilengues", "Quipungo"],
    "Icolo e Bengo": ["Catete", "Bom Jesus", "Cabiri", "Caculo Cahango", "Calomboloca"],
    "Luanda": ["Luanda", "Belas", "Cacuaco", "Cazenga", "Kilamba Kiaxi", "Talatona", "Viana", "Kilamba"],
    "Lunda-Norte": ["Dundo", "Cambulo", "Capenda-Camulemba", "Caungula", "Cuango", "Cuilo", "Lubalo", "Lucapa", "Xá-Muteba"],
    "Lunda-Sul": ["Muangueji", "Cassai-Sul", "Cassengo", "Luma-Cassai", "Saurimo", "Cacolo", "Dala", "Muconda"],
    "Malanje": ["Malanje", "Cacuso", "Cahombo", "Calandula", "Cambundi-Catembo", "Cangandala", "Caombo", "Cuaba Nzoji", "Cunda-Dia-Baze", "Luquembo", "Marimba", "Massango", "Mucari", "Quela", "Quirima"],
    "Moxico": ["Luena", "Alto Zambeze", "Bundas", "Camanongue", "Léua", "Luau", "Luchazes"],
    "Moxico Leste": ["Cazombo", "Lago Dilolo", "Lumbala Nguimbo", "Luau"],
    "Namibe": ["Moçâmedes", "Bibala", "Camucuio", "Tômbwa", "Virei"],
    "Uíge": ["Uíge", "Alto Cauale", "Ambuila", "Bembe", "Buengas", "Bungo", "Damba", "Milunga", "Mucaba", "Negage", "Puri", "Quimbele", "Quitexe", "Sanza Pombo", "Songo", "Zombo"],
    "Zaire": ["Mbanza Kongo", "Cuimba", "Nóqui", "Nzeto", "Soyo", "Tomboco"]
}

type Tab = 'obrigatorio' | 'opcional' | 'acesso'
interface FuncionarioForm {
    nome: string; numero_bi: string; data_nascimento: string; genero: string; nacionalidade: string; naturalidade: string; nome_pai: string; nome_mae: string; data_emissao_bi: string; data_validade_bi: string; local_emissao_bi: string; estado_civil: string; telefone: string; email: string; endereco: string; cidade: string; provincia: string; nif: string; banco1?: string; banco2?: string; iban?: string; iban2?: string; contacto_emergencia: string; tem_acesso: boolean; senha: string; cargo: string; area_principal_id?: string; areas_ids: string[];
}
interface Props { open: boolean; funcionario?: any | null; saving?: boolean; onClose: () => void; onSave: (data: any) => void }

const MONTH_LABEL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const WEEK_LABEL = ["D", "S", "T", "Q", "Q", "S", "S"]

function formatDisplay(iso: string) {
    if (!iso) return ""
    const [y, m, d] = iso.split("-")
    if (!y || !m || !d) return iso
    return `${d}/${m}/${y}`
}

function CustomDatePicker({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder: string }) {
    const [open, setOpen] = useState(false)
    const [viewMode, setViewMode] = useState<'days' | 'months' | 'years'>('days')
    const [view, setView] = useState(() => {
        const base = value ? new Date(value + "T12:00:00") : new Date()
        return { year: base.getFullYear(), month: base.getMonth() }
    })
    const [yearPage, setYearPage] = useState(() => {
        const base = value ? new Date(value + "T12:00:00").getFullYear() : new Date().getFullYear()
        return Math.floor(base / 12) * 12
    })
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    useEffect(() => {
        if (value) {
            const d = new Date(value + "T12:00:00")
            setView({ year: d.getFullYear(), month: d.getMonth() })
            setYearPage(Math.floor(d.getFullYear() / 12) * 12)
        }
    }, [])

    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const startDay = new Date(view.year, view.month, 1).getDay()
    const days: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

    const selectDay = (day: number) => {
        const iso = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        onChange(iso)
        setOpen(false)
    }

    const selected = value ? { d: Number(value.split("-")[2]), m: Number(value.split("-")[1]) - 1, y: Number(value.split("-")[0]) } : null
    const isSelected = (day: number) => selected && selected.d === day && selected.m === view.month && selected.y === view.year
    const isToday = (day: number) => {
        const t = new Date()
        return t.getDate() === day && t.getMonth() === view.month && t.getFullYear() === view.year
    }

    return (
        <div ref={ref} className="relative w-full">
            <button type="button" onClick={() => { setOpen(!open); if (!open) setViewMode('days') }} className={`w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition ${value ? 'text-black' : 'text-black/40'} ${open ? 'border-[#0095ff] ring-1 ring-[#0095ff]/20' : ''}`}>
                <span className="flex items-center gap-2 truncate">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    {value ? formatDisplay(value) : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="mt-2 w-full bg-white rounded-[20px] shadow-[0_12px_32px_rgba(0,0,0,0.14)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* HEADER */}
                    <div className="h-[52px] px-3 flex items-center justify-between bg-[#F8FAFF] border-b border-gray-100">
                        {viewMode === 'days' && (
                            <>
                                <button type="button" onClick={() => setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 })} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                                <div className="flex gap-1.5">
                                    <button type="button" onClick={() => setViewMode('months')} className="px-3 py-1 rounded-full bg-white border text-[12px] font-bold">{MONTH_SHORT[view.month]}</button>
                                    <button type="button" onClick={() => { setYearPage(Math.floor(view.year / 12) * 12); setViewMode('years') }} className="px-3 py-1 rounded-full bg-[#0A2540] text-white text-[12px] font-bold">{view.year}</button>
                                </div>
                                <button type="button" onClick={() => setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 })} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                            </>
                        )}
                        {viewMode === 'months' && (
                            <>
                                <button type="button" onClick={() => setView(v => ({ ...v, year: v.year - 1 }))} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                                <button type="button" onClick={() => setViewMode('days')} className="text-[13px] font-bold">{view.year} • voltar</button>
                                <button type="button" onClick={() => setView(v => ({ ...v, year: v.year + 1 }))} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                            </>
                        )}
                        {viewMode === 'years' && (
                            <>
                                <button type="button" onClick={() => setYearPage(p => p - 12)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
                                <span className="text-[13px] font-bold">{yearPage} - {yearPage + 11}</span>
                                <button type="button" onClick={() => setYearPage(p => p + 12)} className="w-8 h-8 rounded-full bg-white border flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
                            </>
                        )}
                    </div>

                    <div className="p-3">
                        {viewMode === 'days' && (
                            <>
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {WEEK_LABEL.map((w, i) => <span key={i} className="h-6 flex items-center justify-center text-[10px] font-bold text-gray-400">{w}</span>)}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {days.map((day, idx) => day === null ? <div key={`empty-${idx}`} className="h-9" /> : (
                                        <button key={`${view.year}-${view.month}-${day}`} type="button" onClick={() => selectDay(day)} className={`h-9 rounded-[10px] text-[13px] font-medium transition ${isSelected(day) ? 'bg-[#0A2540] text-white' : isToday(day) ? 'bg-[#E6F0FF] text-[#0095ff] border border-[#C2D8FF] font-bold' : 'bg-white border border-gray-100 hover:bg-gray-50 text-gray-800'}`}>
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                        {viewMode === 'months' && (
                            <div className="grid grid-cols-3 gap-1.5">
                                {MONTH_LABEL.map((m, idx) => (
                                    <button key={m} type="button" onClick={() => { setView(v => ({ ...v, month: idx })); setViewMode('days') }} className={`h-10 rounded-[10px] text-[12px] font-medium border ${view.month === idx ? 'bg-[#0A2540] text-white border-[#0A2540]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>{m.slice(0, 3)}</button>
                                ))}
                            </div>
                        )}
                        {viewMode === 'years' && (
                            <div className="grid grid-cols-3 gap-1.5">
                                {Array.from({ length: 12 }, (_, i) => yearPage + i).map(y => (
                                    <button key={y} type="button" onClick={() => { setView(v => ({ ...v, year: y })); setViewMode('days') }} className={`h-10 rounded-[10px] text-[12px] font-bold border ${view.year === y ? 'bg-[#0A2540] text-white border-[#0A2540]' : selected?.y === y ? 'bg-[#E6F0FF] text-[#0095ff] border-[#C2D8FF]' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>{y}</button>
                                ))}
                            </div>
                        )}

                        {viewMode === 'days' && (
                            <div className="mt-3 flex gap-2">
                                <button type="button" onClick={() => { onChange(""); setOpen(false) }} className="flex-1 h-9 rounded-full border border-gray-200 text-[12px] bg-white">Limpar</button>
                                <button type="button" onClick={() => { const t = new Date(); onChange(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`); setOpen(false) }} className="flex-1 h-9 rounded-full bg-[#E6F0FF] border border-[#C2D8FF] text-[12px] font-bold text-[#0095ff]">Hoje</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function CustomSelect({ value, options, onChange, placeholder, disabled, icon: Icon }: { value: string, options: { value: string, label: string }[], onChange: (v: string) => void, placeholder: string, disabled?: boolean, icon?: any }) {
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
                <span className={`flex items-center gap-2 truncate ${selected ? 'text-black' : 'text-black/60'}`}>
                    {Icon ? <Icon className="w-4 h-4 text-gray-400" /> : <MapPin className="w-4 h-4 text-gray-400" />}
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[60] top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
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

function BancoSelect({ value, onChange, placeholder }: { value?: string, onChange: (v: string | undefined) => void, placeholder: string }) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])
    return (
        <div ref={ref} className="relative w-full">
            <button type="button" onClick={() => setOpen(!open)} className="w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition">
                <span className="flex items-center gap-2 truncate"><Landmark className="w-4 h-4 text-gray-500 shrink-0" /><span className={value ? 'text-black' : 'text-black/40'}>{value || placeholder}</span></span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[60] top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {BANCOS_ANGOLA.map(b => (
                        <button key={b} type="button" onClick={() => { onChange(b); setOpen(false) }} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] flex items-center justify-between transition ${value === b ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-gray-700'}`}>{b} {value === b && <Check className="w-4 h-4 text-[#0095ff]" />}</button>
                    ))}
                    <button type="button" onClick={() => { onChange(undefined); setOpen(false) }} className="w-full text-left px-3 py-2.5 rounded-[10px] text-[12.5px] text-red-500 hover:bg-red-50">Limpar seleção</button>
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
    const toggle = (id: string) => { if (values.includes(id)) onChange(values.filter(v => v !== id)); else onChange([...values, id]) }
    return (
        <div ref={ref} className="relative w-full">
            <button type="button" onClick={() => setOpen(!open)} className="w-full min-h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 py-2 text-[13.5px] text-black flex items-center justify-between focus:outline-none focus:border-[#0095ff] transition">
                <span className="flex items-center gap-2 flex-wrap"><Building2 className="w-4 h-4 text-gray-500 shrink-0" />{values.length === 0 ? <span className="text-black/40">Áreas de acesso (opcional)</span> : <span className="flex gap-1 flex-wrap">{values.map(v => { const opt = options.find(o => o.value === v); return <span key={v} className="px-2 py-[2px] bg-[#E6F0FF] rounded-full text-[11px] font-medium text-[#0095ff] border border-blue-100">{opt?.label}</span> })}</span>}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[60] top-[48px] left-0 w-full bg-white rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden p-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                    {options.map(o => (<button key={o.value} type="button" onClick={() => toggle(o.value)} className={`w-full text-left px-3 py-2.5 rounded-[10px] text-[13px] flex items-center justify-between transition ${values.includes(o.value) ? 'bg-[#E6F0FF] font-semibold text-black' : 'hover:bg-gray-50 text-gray-700'}`}>{o.label} {values.includes(o.value) && <Check className="w-4 h-4 text-[#0095ff]" />}</button>))}
                </div>
            )}
        </div>
    )
}

export default function ModalFuncionario({ open, funcionario, saving, onClose, onSave }: Props) {
    const [tab, setTab] = useState<Tab>('obrigatorio')
    const [form, setForm] = useState<FuncionarioForm>({
        nome: '', numero_bi: '', data_nascimento: '', genero: '', nacionalidade: 'Angolana', naturalidade: '', nome_pai: '', nome_mae: '',
        data_emissao_bi: '', data_validade_bi: '', local_emissao_bi: '',
        estado_civil: 'solteiro', telefone: '', email: '', endereco: '', cidade: '', provincia: '', nif: '', banco1: '', banco2: '', iban: '', iban2: '', contacto_emergencia: '',
        tem_acesso: false, senha: '', cargo: 'rh', area_principal_id: '', areas_ids: []
    })

    useEffect(() => {
        if (open) {
            if (funcionario) {
                setForm({
                    nome: funcionario.nome || '', numero_bi: funcionario.numero_bi || funcionario.bi || '', data_nascimento: funcionario.data_nascimento || '', genero: funcionario.genero || '', nacionalidade: funcionario.nacionalidade || 'Angolana', naturalidade: funcionario.naturalidade || '', nome_pai: funcionario.nome_pai || '', nome_mae: funcionario.nome_mae || '', data_emissao_bi: funcionario.data_emissao_bi || '', data_validade_bi: funcionario.data_validade_bi || '', local_emissao_bi: funcionario.local_emissao_bi || '', estado_civil: funcionario.estado_civil || 'solteiro', telefone: funcionario.telefone || '', email: funcionario.email || '', endereco: funcionario.endereco || '', cidade: funcionario.cidade || '', provincia: funcionario.provincia || '', nif: funcionario.nif || '', banco1: funcionario.banco1 || funcionario.banco || '', banco2: funcionario.banco2 || '', iban: funcionario.iban || '', iban2: funcionario.iban2 || '', contacto_emergencia: funcionario.contacto_emergencia || '', tem_acesso: funcionario.tem_acesso || !!funcionario.email, senha: '', cargo: funcionario.cargo || 'rh', area_principal_id: funcionario.area_principal_id || '', areas_ids: funcionario.areas_ids || []
                })
            } else {
                setForm({ nome: '', numero_bi: '', data_nascimento: '', genero: '', nacionalidade: 'Angolana', naturalidade: '', nome_pai: '', nome_mae: '', data_emissao_bi: '', data_validade_bi: '', local_emissao_bi: '', estado_civil: 'solteiro', telefone: '', email: '', endereco: '', cidade: '', provincia: '', nif: '', banco1: '', banco2: '', iban: '', iban2: '', contacto_emergencia: '', tem_acesso: false, senha: '', cargo: 'rh', area_principal_id: '', areas_ids: [] })
            }
            setTab('obrigatorio')
        }
    }, [open, funcionario])

    if (!open) return null

    const municipiosDisponiveis = form.provincia ? (MUNICIPIOS[form.provincia] || []) : []
    const handleProvinceChange = (prov: string) => setForm(prev => ({ ...prev, provincia: prov, cidade: '' }))
    const handleCityChange = (cidade: string) => setForm(prev => ({ ...prev, cidade }))

    const inputClass = "w-full h-[44px] bg-white border border-gray-200 rounded-[12px] px-3 text-[13.5px] text-black placeholder:text-black/40 focus:outline-none focus:border-[#0095ff] focus:ring-1 focus:ring-[#0095ff]/20 transition"
    const checkBoxCard = "flex items-center gap-2 h-[44px] px-3 border border-gray-200 rounded-[12px] cursor-pointer bg-white hover:bg-gray-50 transition shrink-0 w-full"
    const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
        <button type="button" onClick={() => setTab(id)} className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-full transition border shrink-0 ${tab === id ? 'bg-[#E6F0FF] border-[#C2D8FF] text-[#0095ff]' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}><Icon className="w-4 h-4" /> {label}</button>
    )

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.nome.trim()) { toast.error('Nome completo obrigatório'); setTab('obrigatorio'); return }
        if (!form.numero_bi.trim()) { toast.error('Nº do BI obrigatório'); setTab('obrigatorio'); return }
        if (!form.data_nascimento) { toast.error('Data nascimento obrigatória'); setTab('obrigatorio'); return }
        if (!form.genero) { toast.error('Género obrigatório'); setTab('obrigatorio'); return }
        if (!form.nome_pai.trim() || !form.nome_mae.trim()) { toast.error('Filiação obrigatória'); setTab('obrigatorio'); return }
        if (form.tem_acesso) {
            if (!funcionario && !form.senha.trim()) { toast.error('Senha obrigatória'); setTab('acesso'); return }
            if (form.senha && form.senha.length < 6) { toast.error('Senha mínima 6'); setTab('acesso'); return }
        }
        onSave({
            nome: form.nome, numero_bi: form.numero_bi, bi: form.numero_bi,
            data_nascimento: form.data_nascimento, genero: form.genero, nacionalidade: form.nacionalidade, naturalidade: form.naturalidade,
            nome_pai: form.nome_pai, nome_mae: form.nome_mae,
            data_emissao_bi: form.data_emissao_bi || null, data_validade_bi: form.data_validade_bi || null, local_emissao_bi: form.local_emissao_bi || null,
            estado_civil: form.estado_civil, telefone: form.telefone, email: form.tem_acesso ? form.email : null,
            endereco: form.endereco, cidade: form.cidade, provincia: form.provincia, nif: form.nif,
            banco1: form.banco1, banco2: form.banco2, iban: form.banco1 ? form.iban : null, iban2: form.banco2 ? form.iban2 : null,
            contacto_emergencia: form.contacto_emergencia,
            tem_acesso: form.tem_acesso, senha: form.tem_acesso ? form.senha : undefined, cargo: form.cargo, area_principal_id: form.area_principal_id || null, areas_ids: form.areas_ids
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-[24px] w-full max-w-[560px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="relative h-[72px] px-5 pt-5 flex justify-between items-start bg-[#E6F0FF] shrink-0">
                    <div className="w-9 h-9 rounded-full bg-white border shadow-sm flex items-center justify-center"><UserPlus className="w-4 h-4 text-[#0095ff]" /></div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border shadow-sm flex items-center justify-center hover:bg-gray-50"><X className="w-4 h-4 text-gray-500" /></button>
                </div>

                <div className="px-6 pt-5 pb-3 shrink-0 border-b border-gray-100">
                    <h3 className="text-[18px] font-bold text-gray-900 leading-tight">{funcionario ? 'Editar Funcionário' : 'Novo Funcionário'}</h3>
                    <p className="text-[13.5px] text-gray-500 mt-1">Cadastro completo via BI</p>
                    <div className="flex gap-[2px] mt-4 overflow-x-auto no-scrollbar">
                        <TabButton id="obrigatorio" label="Obrigatórios" icon={Info} />
                        <TabButton id="opcional" label="Opcionais" icon={Settings} />
                        <TabButton id="acesso" label="Acesso" icon={Shield} />
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-visible no-scrollbar px-6 py-4 overscroll-contain"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style>{`.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>

                        {tab === 'obrigatorio' && (
                            <div className="flex flex-col gap-[2px]">
                                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo (como no BI) *" className={inputClass} />
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <input value={form.numero_bi} onChange={e => setForm({ ...form, numero_bi: e.target.value.toUpperCase() })} placeholder="Nº BI *" className={inputClass} />
                                    <CustomDatePicker value={form.data_nascimento} onChange={v => setForm({ ...form, data_nascimento: v })} placeholder="Nascimento *" />
                                </div>
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <CustomSelect value={form.genero} onChange={v => setForm({ ...form, genero: v })} placeholder="Género *" options={GENEROS} />
                                    <CustomSelect value={form.estado_civil} onChange={v => setForm({ ...form, estado_civil: v })} placeholder="Estado civil" options={ESTADO_CIVIL} />
                                </div>
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <input value={form.nacionalidade} onChange={e => setForm({ ...form, nacionalidade: e.target.value })} placeholder="Nacionalidade" className={inputClass} />
                                    <input value={form.naturalidade} onChange={e => setForm({ ...form, naturalidade: e.target.value })} placeholder="Naturalidade" className={inputClass} />
                                </div>
                                <input value={form.nome_pai} onChange={e => setForm({ ...form, nome_pai: e.target.value })} placeholder="Nome do Pai *" className={inputClass} />
                                <input value={form.nome_mae} onChange={e => setForm({ ...form, nome_mae: e.target.value })} placeholder="Nome da Mãe *" className={inputClass} />

                                <div className="h-[1px] bg-gray-100 my-3" />
                                <p className="text-[11px] font-bold tracking-widest text-black mb-2">DADOS DO BI</p>
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <CustomDatePicker value={form.data_emissao_bi} onChange={v => setForm({ ...form, data_emissao_bi: v })} placeholder="Emissão BI" />
                                    <CustomDatePicker value={form.data_validade_bi} onChange={v => setForm({ ...form, data_validade_bi: v })} placeholder="Validade BI" />
                                </div>
                                <input value={form.local_emissao_bi} onChange={e => setForm({ ...form, local_emissao_bi: e.target.value })} placeholder="Local emissão - ex: Luanda" className={inputClass} />
                            </div>
                        )}

                        {tab === 'opcional' && (
                            <div className="flex flex-col gap-[2px]">
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="Telefone" className={inputClass} />
                                    <input value={form.nif} onChange={e => setForm({ ...form, nif: e.target.value })} placeholder="NIF (opcional)" className={inputClass} />
                                </div>
                                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email pessoal" className={inputClass} />
                                <input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Endereço" className={inputClass} />
                                <div className="grid grid-cols-2 gap-[2px]">
                                    <CustomSelect value={form.provincia} onChange={handleProvinceChange} placeholder="Província" options={PROVINCIAS.map(p => ({ value: p, label: p }))} icon={MapPin} />
                                    <CustomSelect value={form.cidade} onChange={handleCityChange} placeholder={form.provincia ? "Município" : "Selecione província"} options={municipiosDisponiveis.map(m => ({ value: m, label: m }))} disabled={!form.provincia} icon={MapPin} />
                                </div>
                                <div className="h-[1px] bg-gray-100 my-3" />
                                <p className="text-[11px] font-bold tracking-widest text-black mb-2">DADOS BANCÁRIOS</p>
                                <div className="flex flex-col gap-[2px]">
                                    <BancoSelect value={form.banco1} onChange={(v) => setForm({ ...form, banco1: v, iban: v ? form.iban : '' })} placeholder="Selecionar banco 1" />
                                    {form.banco1 && (<input value={form.iban || ''} onChange={e => setForm({ ...form, iban: e.target.value })} placeholder={`IBAN - ${form.banco1.split('-')[0].trim()}`} className={inputClass} />)}
                                </div>
                                <div className="flex flex-col gap-[2px] mt-[2px]">
                                    <BancoSelect value={form.banco2} onChange={(v) => setForm({ ...form, banco2: v, iban2: v ? form.iban2 : '' })} placeholder="Selecionar banco 2 (opcional)" />
                                    {form.banco2 && (<input value={form.iban2 || ''} onChange={e => setForm({ ...form, iban2: e.target.value })} placeholder={`IBAN - ${form.banco2.split('-')[0].trim()}`} className={inputClass} />)}
                                </div>
                                <div className="h-[1px] bg-gray-100 my-3" />
                                <input value={form.contacto_emergencia} onChange={e => setForm({ ...form, contacto_emergencia: e.target.value })} placeholder="Contacto emergência" className={inputClass} />
                            </div>
                        )}

                        {tab === 'acesso' && (
                            <div className="flex flex-col gap-[2px]">
                                <label className={checkBoxCard}>
                                    <input type="checkbox" checked={form.tem_acesso} onChange={e => setForm({ ...form, tem_acesso: e.target.checked })} className="w-4 h-4 accent-[#0095ff] rounded" />
                                    <span className="text-[12px] text-black font-medium">Terá acesso ao app? (login BI + senha)</span>
                                </label>
                                {!form.tem_acesso && <p className="text-[12px] text-gray-500 bg-gray-50 p-3 rounded-[12px] border border-gray-200 mt-1">Sem acesso: só cadastro RH.</p>}
                                {form.tem_acesso && (
                                    <>
                                        <div className="h-[1px] bg-gray-100 my-2" />
                                        <p className="text-[11px] font-bold tracking-widest text-black mb-2">LOGIN - Nº BI + SENHA</p>
                                        <input value={form.numero_bi} disabled className={`${inputClass} opacity-60 bg-gray-50`} placeholder="Nº BI será o login" />
                                        <div className="relative mt-1">
                                            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} type="password" placeholder={funcionario ? "Nova senha (vazio mantém)" : "Senha (mín. 6) *"} className={`${inputClass} pl-10`} />
                                        </div>
                                        <div className="h-[1px] bg-gray-100 my-2" />
                                        <p className="text-[11px] font-bold tracking-widest text-black mb-2">NÍVEL DE ACESSO</p>
                                        <CustomSelect value={form.cargo} onChange={v => setForm({ ...form, cargo: v })} placeholder="Nível de acesso *" options={CARGOS} icon={Briefcase} />
                                        <CustomSelect value={form.area_principal_id || ''} onChange={v => setForm({ ...form, area_principal_id: v })} placeholder="Área principal" options={AREAS_MOCK.map(a => ({ value: a.id, label: a.nome }))} icon={Building2} />
                                        <MultiAreaSelect values={form.areas_ids} onChange={v => setForm({ ...form, areas_ids: v })} options={AREAS_MOCK.map(a => ({ value: a.id, label: a.nome }))} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 px-6 py-4 border-t border-gray-100 bg-white flex gap-[2px]">
                        <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"><X className="w-5 h-5 text-gray-600" /></button>
                        <button type="submit" disabled={saving} className="flex-1 h-11 rounded-full bg-[#0095ff] text-white font-semibold hover:bg-[#0085e6] shadow-[0_6px_20px_rgba(0,149,255,0.35)] flex items-center justify-center disabled:opacity-50">{saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-5 h-5" />}</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
