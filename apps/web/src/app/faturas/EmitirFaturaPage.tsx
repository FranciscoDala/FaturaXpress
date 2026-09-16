import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import TabEmitir from './components/tab/tab_faturaEmitir'
import TabCurso from './components/tab/tab_faturaEmcurso'
import TabEmitidas from './components/tab/tab_faturaEmitida'

export interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
export type Tab = 'emitir' | 'curso' | 'emitidas'

// AGT Angola - FT oficial com hash, NC com hash negativo, PP proforma
export const getNumero = (f: any) => f?.numero_nota_credito || f?.numero_fatura || f?.numero_proforma || f?.numero || f?.id?.slice(0, 8) || '---'
export const getTotal = (f: any) => Number(f?.total_geral ?? f?.total ?? 0)
export const getData = (f: any) => f?.data_emissao || f?.created_at || f?.data
export const isFaturaOficial = (f: any) => f?.tipo_documento === 'fatura' && !!f?.hash_agt
export const isNotaCredito = (f: any) => f?.tipo_documento === 'nota_credito'

export default function EmitirFaturaPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clienteId = searchParams.get('cliente_id')
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [empresa, setEmpresa] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<Tab>('emitir')
    const [faturasCurso, setFaturasCurso] = useState<any[]>([])
    const [faturasEmitidas, setFaturasEmitidas] = useState<any[]>([])
    const [loadingCounts, setLoadingCounts] = useState(true)

    useEffect(() => {
        if (!clienteId) { navigate('/app/dashboard'); return }
        api.get(`/api/clientes/${clienteId}`).then(r => setCliente(r.data)).catch(() => navigate('/app/dashboard'))
        api.get('/api/auth/me').then(r => {
            setEmpresa(r.data.company || r.data)
        }).catch(() => {
            setEmpresa({ nome: 'FaturaXpress', nif: '---', endereco: 'Luanda' })
        })
    }, [clienteId, navigate])

    const fetchFaturas = async () => {
        if (!clienteId) return
        try {
            setLoadingCounts(true)
            const res = await api.get('/api/faturas', { params: { cliente_id: clienteId, limit: 100 } })
            const all = Array.isArray(res.data) ? res.data : (res.data.items || [])
            // AGT: Em curso = só PP em rascunho/em_curso
            setFaturasCurso(all.filter((f: any) => f.tipo_documento === 'proforma' && ['rascunho', 'pendente', 'em_curso'].includes(f.status)))
            // Emitidas = FT + NC + concluídas
            setFaturasEmitidas(all.filter((f: any) => f.tipo_documento === 'fatura' || f.tipo_documento === 'nota_credito' || ['concluida', 'emitida', 'cancelada'].includes(f.status)))
        } catch { }
        finally { setLoadingCounts(false) }
    }

    // CORREÇÃO: carrega logo ao abrir, não precisa clicar
    useEffect(() => {
        if (clienteId) fetchFaturas()
    }, [clienteId])

    if (!cliente) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#0095ff] rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-[1100px] mx-auto">
                <div className="relative px-4 sm:px-8 lg:px-12 pt-8 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                        <div className="bubble bubble-1"></div>
                        <div className="bubble bubble-2"></div>
                        <div className="bubble bubble-3"></div>
                        <div className="bubble bubble-4"></div>
                        <div className="bubble bubble-5"></div>
                        <div className="bubble bubble-6"></div>
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start text-left">
                        <div className="w-[96px] h-[96px] sm:w-[132px] sm:h-[132px] rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm shrink-0 self-start">
                            <img src={`https://ui-avatars.com/api/?name=${cliente.nome}&background=E5E7EB&color=374151&size=132`} className="w-full h-full object-cover" alt={cliente.nome} />
                        </div>
                        <div className="flex-1 w-full">
                            <div className="flex flex-row justify-between items-start gap-4 w-full">
                                <div className="flex flex-col items-start text-left">
                                    <h1 className="text-[22px] sm:text-[24px] font-bold text-[#1a202c] text-left">{cliente.nome}</h1>
                                    <div className="flex gap-1.5 mt-1.5 justify-start">
                                        <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">Cliente</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">NIF {cliente.nif}</span>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[13px] text-[#4a5568] text-left">
                                        <p>{cliente.email}</p>
                                        <p>{cliente.telefone}</p>
                                        <p>{cliente.cidade ? `${cliente.endereco} - ${cliente.cidade}` : cliente.endereco}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/app/dashboard')} className="bg-[#FF3B30] text-white text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 hover:bg-[#e6362c] transition">
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            </div>
                            <div className="mt-6 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                                <button onClick={() => setActiveTab('curso')} className={`flex-1 py-2 ${activeTab === 'curso' ? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{loadingCounts ? '...' : faturasCurso.length}</p>
                                    <p className="text-[11px] text-gray-500">Proformas PP</p>
                                </button>
                                <button onClick={() => setActiveTab('emitidas')} className={`flex-1 py-2 border-l ${activeTab === 'emitidas' ? 'bg-gray-50 text-[#0095ff]' : 'text-gray-800'}`}>
                                    <p className="text-[13px] font-bold">{loadingCounts ? '...' : faturasEmitidas.length}</p>
                                    <p className="text-[11px] text-gray-500">Faturas FT + NC</p>
                                </button>
                                <button onClick={() => setActiveTab('emitir')} className={`flex-[1.2] border-l text-[13px] font-semibold ${activeTab === 'emitir' ? 'bg-[#0095ff] text-white' : 'bg-[#8ecfff] text-white'}`}>+ Emitir Fatura</button>
                            </div>
                        </div>
                    </div>
                    <style>{`
                  .bubble {
                            position: absolute;
                            border-radius: 50%;
                            background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%);
                            border: 1px solid rgba(0,149,255,0.14);
                            box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.10);
                            animation: floatBubble 8s infinite ease-in-out;
                            will-change: transform;
                        }
                  .bubble-1 { width: 80px; height: 80px; left: 10%; top: 20%; animation-delay: 0s; }
                  .bubble-2 { width: 120px; height: 120px; left: 70%; top: 10%; animation-delay: 1s; animation-duration: 10s; }
                  .bubble-3 { width: 60px; height: 60px; left: 40%; top: 60%; animation-delay: 2s; }
                  .bubble-4 { width: 40px; height: 40px; left: 85%; top: 50%; animation-delay: 0.5s; animation-duration: 7s; }
                  .bubble-5 { width: 100px; height: 100px; left: 5%; top: 70%; animation-delay: 1.5s; animation-duration: 9s; }
                  .bubble-6 { width: 50px; height: 50px; left: 55%; top: 15%; animation-delay: 2.5s; }
                        @keyframes floatBubble {
                            0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.55; }
                            25% { transform: translateY(-15px) translateX(10px) scale(1.05); opacity: 0.85; }
                            50% { transform: translateY(-25px) translateX(-5px) scale(0.95); opacity: 0.45; }
                            75% { transform: translateY(-10px) translateX(-10px) scale(1.02); opacity: 0.7; }
                        }
                    `}</style>
                </div>
                <div className="w-full py-6">
                    {activeTab === 'emitir' && <TabEmitir clienteId={clienteId!} onEmitida={() => { fetchFaturas(); setActiveTab('curso'); }} />}
                    {activeTab === 'curso' && <TabCurso faturas={faturasCurso} cliente={cliente} empresa={empresa} onRefresh={fetchFaturas} />}
                    {activeTab === 'emitidas' && <TabEmitidas faturas={faturasEmitidas} cliente={cliente} empresa={empresa} onRefresh={fetchFaturas} />}
                </div>
            </div>
        </div>
    )
}
