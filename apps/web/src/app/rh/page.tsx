import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Crown, Power, Search } from 'lucide-react'
import { toast } from 'sonner'
import GlobalAreas from '../../components/GlobalAreas'
import ModalConfirmSair from '../dashboard/components/modals/modal_ConfirmSair'
import ModalUsuario from './components/modals/modal_UsuarioView'
import { api } from '../../lib/api'

const PLAN_LIMITS: Record<string, { label: string }> = {
  free: { label: 'FREE' },
  plus: { label: 'PLUS' },
  premium: { label: 'PREMIUM' },
  diamond: { label: 'DIAMOND' },
}

const FUNC_MOCK = [
  { id: '1', nome: 'Ana Silva', cargo: 'Gestora RH', area: 'RH', foto: '', status: 'ativo' },
  { id: '2', nome: 'João Pedro', cargo: 'Recrutador', area: 'RH', foto: '', status: 'ferias' },
  { id: '3', nome: 'Casimiro Quiala', cargo: 'Contabilista', area: 'Financeiro', foto: '', status: 'ativo' },
  { id: '4', nome: 'Deolinda Rodrigues', cargo: 'Vendedora', area: 'Comercial', foto: '', status: 'ativo' },
]

export default function RHPage() {
  const navigate = useNavigate()
  const [empresa, setEmpresa] = useState<any>(null)
  const [usuario, setUsuario] = useState<any>(null)
  const [companyName, setCompanyName] = useState(localStorage.getItem("company_name") || '')
  const [modalSairOpen, setModalSairOpen] = useState(false)
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false)
  const [search, setSearch] = useState('')

  const logoUrlSafe = useMemo(() => {
    const raw = empresa?.logo_url || empresa?.image_url || ''
    if (!raw) return ''
    return raw.replace(/^http:\/\//i, 'https://')
  }, [empresa])

  const planId = (empresa?.subscription_plan || 'free').toLowerCase()
  const planInfo = PLAN_LIMITS[planId] || PLAN_LIMITS.free

  const fetchMe = useCallback(async () => {
    try {
      const r = await api.get('/api/auth/me')
      const comp = r.data.company || r.data
      const user = r.data.user || r.data
      setEmpresa(comp)
      setUsuario(user)
      const nome = comp.nome || comp.companyName || localStorage.getItem("company_name")
      if (nome) { setCompanyName(nome); localStorage.setItem("company_name", nome) }
    } catch {}
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const handleLogout = () => setModalSairOpen(true)
  const handleConfirmLogout = () => { localStorage.clear(); toast.success("Sessão encerrada"); setModalSairOpen(false); navigate('/login') }

  // FILTRO BUSCA RAPIDA
  const funcionariosFiltrados = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return FUNC_MOCK
    return FUNC_MOCK.filter(f =>
      f.nome.toLowerCase().includes(q) ||
      f.cargo.toLowerCase().includes(q) ||
      f.area.toLowerCase().includes(q)
    )
  }, [search])

  const ativos = FUNC_MOCK.filter(f => f.status === 'ativo').length
  const ferias = FUNC_MOCK.filter(f => f.status === 'ferias').length

  return (
    <div className="min-h-screen bg-white relative">
      <GlobalAreas />
      <ModalConfirmSair open={modalSairOpen} companyName={companyName} onClose={() => setModalSairOpen(false)} onConfirm={handleConfirmLogout} />
      <ModalUsuario open={modalUsuarioOpen} usuario={usuario} empresa={empresa} onClose={() => setModalUsuarioOpen(false)} />

      <div className="max-w-[1100px] mx-auto">
        <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="bubble bubble-1"></div><div className="bubble bubble-2"></div><div className="bubble bubble-3"></div><div className="bubble bubble-4"></div><div className="bubble bubble-5"></div><div className="bubble bubble-6"></div>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start text-left">
            <div className="relative w-[84px] h-[84px] sm:w-[110px] sm:h-[110px] shrink-0 self-start">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[5px] border-white shadow-sm">
                <img src={logoUrlSafe || `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName || 'FX')}&background=E5E7EB&color=374151&size=132}`} className="w-full h-full object-cover" alt={companyName} />
              </div>
              <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-[2px] border-white shadow" style={{ background: empresa?.is_active === false? '#ef4444' : '#22c55e' }}></div>
              <button onClick={() => setModalUsuarioOpen(true)} className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-white border shadow flex items-center justify-center hover:bg-gray-50">
                <User className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>
            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-row justify-between items-start gap-3 w-full">
                <div className="flex flex-col items-start text-left flex-1 min-w-0">
                  <h1 className="text-[16px] sm:text-[19px] font-bold text-[#1a202c] uppercase tracking-wide leading-tight truncate max-w-[180px] sm:max-w-[320px]">{companyName || 'CONNECT'}</h1>
                  <div className="mt-2.5 space-y-0 text-[12px] sm:text-[13px] text-gray-700 leading-[1.4]">
                    <p><span className="font-medium text-gray-500">NIF:</span> {empresa?.nif || '50924984'}</p>
                    <p><span className="font-medium text-gray-500">Tel:</span> {empresa?.telefone || empresa?.phone || '+244930438947'}</p>
                    <p className="truncate max-w-[220px] sm:max-w-none"><span className="font-medium text-gray-500">Email:</span> {empresa?.email || 'killerbless12@gmail.com'}</p>
                    <p className="line-clamp-2"><span className="font-medium text-gray-500">Endereço:</span> {(empresa?.endereco || empresa?.address || 'Sassamba')} • {empresa?.cidade || empresa?.city || 'Saurimo'} • {empresa?.provincia || empresa?.province || 'Lunda-Sul'}</p>
                  </div>
                  <div className="mt-4 space-y-0 w-full">
                    <p className="text-[11px] text-gray-500">Funcionários - {FUNC_MOCK.length} registados</p>
                    <p className="text-[11px] text-gray-500">Ativos - <span className="text-[#22c55e] font-bold text-[13px]">{ativos} ativos</span></p>
                    <p className="text-[11px] text-gray-600 font-medium">Férias - {ferias} este mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 pl-2">
                  <div className="relative">
                    <div className="absolute -top-3 -right-2 z-10">
                      <span className="text-[8px] font-bold tracking-wide bg-white border border-yellow-200 text-yellow-700 px-1.5 py-[1px] rounded-full shadow-sm">{planInfo.label}</span>
                    </div>
                    <button onClick={() => navigate('/assinatura')} className="w-10 h-10 rounded-full bg-white border border-yellow-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#f59e0b] hover:bg-yellow-50 transition shrink-0">
                      <Crown className="w-[18px] h-[18px]" />
                    </button>
                  </div>
                  <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-[#FF3B30] border border-[#FF3B30] shadow-[0_2px_12px_rgba(255,59,48,0.25)] flex items-center justify-center text-white hover:bg-[#e6352b] transition shrink-0">
                    <Power className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
              <div className="mt-5 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                <button className="flex-1 py-2 bg-gray-50 text-[#0095ff]"><p className="text-[13px] font-bold">{ativos}</p><p className="text-[11px] text-gray-500">Ativos</p></button>
                <button className="flex-1 py-2 border-l text-gray-800"><p className="text-[13px] font-bold">{ferias}</p><p className="text-[11px] text-gray-500">Férias</p></button>
                <button className="flex-[0.6] border-l bg-white hover:bg-gray-50 text-gray-800 flex items-center justify-center"><span className="text-[12px] font-semibold">+ Novo</span></button>
              </div>
            </div>
          </div>
          <style>{`
         .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%); border:1px solid rgba(0,149,255,0.14); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10); animation: floatBubble 8s infinite ease-in-out; }
         .bubble-1 { width:80px; height:80px; left:10%; top:20%; }.bubble-2 { width:120px; height:120px; left:70%; top:10%; }.bubble-3 { width:60px; height:60px; left:40%; top:60%; }.bubble-4 { width:40px; height:40px; left:85%; top:50%; }.bubble-5 { width:100px; height:100px; left:5%; top:70%; }.bubble-6 { width:50px; height:50px; left:55%; top:15%; }
            @keyframes floatBubble { 0%,100%{transform:translateY(0) scale(1);} 50%{transform:translateY(-25px) scale(0.95);} }
          `}</style>
        </div>

        {/* BUSCA + TABELA FUNCIONARIOS */}
        <div className="px-4 sm:px-8 lg:px-12 py-6">
          {/* Campo busca igual dashboard */}
          <div className="relative max-w-[520px] w-full mb-5">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar funcionário por nome, cargo ou área..."
              className="w-full h-[46px] pl-11 pr-4 bg-white border border-gray-200 rounded-full text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            />
          </div>

          <div className="space-y-3">
            {funcionariosFiltrados.length === 0? (
              <p className="text-[13px] text-gray-500 text-center py-10">Nenhum funcionário encontrado para "{search}"</p>
            ) : (
              funcionariosFiltrados.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-[16px] border border-gray-100 bg-white hover:shadow-[0_2px_12px_rgba(0,149,255,0.08)] transition">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(f.nome)}&background=E8F2FF&color=0095ff`} className="w-11 h-11 rounded-full border-2 border-white shadow-sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold truncate">{f.nome}</p>
                    <p className="text-[11px] text-gray-500 truncate">{f.cargo} • {f.area}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full border font-medium shrink-0 ${f.status === 'ativo'? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'}`}>{f.status}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
