import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import TabEmitir from './components/tab/tab_faturaEmitir'
import TabCurso from './components/tab/tab_faturaEmcurso'
import TabEmitidas from './components/tab/tab_faturaEmitida'

export interface Cliente { id: string; nome: string; nif: string; email: string | null; telefone: string | null; endereco: string | null; cidade: string | null; provincia: string | null }
export type Tab = 'emitir' | 'curso' | 'emitidas'
export const getNumero = (f: any) => f?.numero_fatura || f?.numero_proforma || f?.numero || f?.id?.slice(0, 8) || '---'
export const getTotal = (f: any) => Number(f?.total_geral?? f?.total?? 0)

export default function EmitirFaturaPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const clienteId = searchParams.get('cliente_id')
    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [empresa, setEmpresa] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<Tab>('emitir')
    const [faturasCurso, setFaturasCurso] = useState<any[]>([])
    const [faturasEmitidas, setFaturasEmitidas] = useState<any[]>([])

    useEffect(() => {
        if (!clienteId) { navigate('/app/dashboard'); return }
        api.get(`/api/clientes/${clienteId}`).then(r => setCliente(r.data)).catch(() => navigate('/app/dashboard'))
        api.get('/api/auth/me').then(r => setEmpresa(r.data.company || r.data)).catch(() => setEmpresa({ nome: 'FaturaXpress', nif: '---', endereco: 'Luanda' }))
    }, [clienteId, navigate])

    const fetchFaturas = async () => {
        if (!clienteId) return
        try {
            const res = await api.get('/api/faturas', { params: { cliente_id: clienteId } })
            const all = Array.isArray(res.data)? res.data : (res.data.items || [])
            setFaturasCurso(all.filter((f: any) => ['rascunho','pendente','em_curso'].includes(f.status)))
            setFaturasEmitidas(all)
        } catch {}
    }
    useEffect(() => { if (activeTab!== 'emitir') fetchFaturas() }, [activeTab])

    if (!cliente) return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#0095ff] rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-white">
            {/* MESMO CONTAINER PARA TUDO - 1100px CENTRALIZADO */}
            <div className="w-full max-w-[1100px] mx-auto">

                {/* HEADER - MESMO PADDING */}
                <div className="bg-white px-4 sm:px-8 lg:px-12 pt-8 pb-6 border-b border-gray-100">
                    <div className="flex flex-row gap-4 sm:gap-6 items-start text-left">
                        <div className="w-[96px] h-[96px] sm:w-[132px] sm:h-[132px] rounded-full overflow-hidden bg-gray-200 border-[6px] border-white shadow-sm shrink-0 self-start">
                            <img src={`https://ui-avatars.com/api/?name=${cliente.nome}&background=E5E7EB&color=374151&size=132`} className="w-full h-full object-cover" alt={cliente.nome} />
                        </div>
                        <div className="flex-1 w-full min-w-0">
                            <div className="flex flex-row justify-between items-start gap-4 w-full">
                                <div className="flex flex-col items-start text-left min-w-0">
                                    <h1 className="text-[22px] sm:text-[24px] font-bold text-[#1a202c]">{cliente.nome}</h1>
                                    <div className="flex gap-1.5 mt-1.5">
                                        <span className="text-[9px] px-2 py-[2px] bg-[#fff2e0] border border-[#ffd9a0] text-[#8a5a20] rounded">Cliente</span>
                                        <span className="text-[9px] px-2 py-[2px] bg-white border rounded text-gray-600">NIF {cliente.nif}</span>
                                    </div>
                                    <div className="mt-3 space-y-1 text-[13px] text-[#4a5568]">
                                        <p>{cliente.email}</p>
                                        <p>{cliente.telefone}</p>
                                        <p>{cliente.cidade? `${cliente.endereco} - ${cliente.cidade}` : cliente.endereco}</p>
                                    </div>
                                </div>
                                <button onClick={() => navigate('/app/dashboard')} className="bg-[#FF3B30] text-white text-[12px] font-semibold px-4 py-1.5 rounded-full shrink-0 flex items-center gap-1.5 hover:bg-[#e6362c] transition">
                                    <ArrowLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            </div>
                            <div className="mt-6 flex bg-white border rounded-[3px] overflow-hidden max-w-[520px] w-full">
                                <button onClick={() => setActiveTab('curso')} className={`flex-1 py-2 ${activeTab==='curso'?'bg-gray-50 text-[#0095ff]':'text-gray-800'}`}><p className="text-[13px] font-bold">{faturasCurso.length}</p><p className="text-[11px] text-gray-500">Em Curso</p></button>
                                <button onClick={() => setActiveTab('emitidas')} className={`flex-1 py-2 border-l ${activeTab==='emitidas'?'bg-gray-50 text-[#0095ff]':'text-gray-800'}`}><p className="text-[13px] font-bold">{faturasEmitidas.length}</p><p className="text-[11px] text-gray-500">Emitidas</p></button>
                                <button onClick={() => setActiveTab('emitir')} className={`flex-[1.2] border-l text-[13px] font-semibold ${activeTab==='emitir'?'bg-[#0095ff] text-white':'bg-[#8ecfff] text-white'}`}>+ Emitir Fatura</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTEÚDO DAS ABAS - MESMO PADDING E MESMO INICIO DO HEADER */}
                <div className="w-full px-4 sm:px-8 lg:px-12 py-6">
                    <div className="w-full">
                        {activeTab === 'emitir' && <TabEmitir clienteId={clienteId!} onEmitida={() => { setActiveTab('curso'); fetchFaturas() }} />}
                        {activeTab === 'curso' && <TabCurso faturas={faturasCurso} cliente={cliente} empresa={empresa} onRefresh={fetchFaturas} />}
                        {activeTab === 'emitidas' && <TabEmitidas faturas={faturasEmitidas} cliente={cliente} empresa={empresa} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
