import GlobalAreas from '../../components/GlobalAreas'

const FUNC_MOCK = [
    { id: '1', nome: 'Ana Silva', cargo: 'Gestora RH', area: 'RH', foto: '', status: 'ativo' },
    { id: '2', nome: 'João Pedro', cargo: 'Recrutador', area: 'RH', foto: '', status: 'ferias' },
]

export default function RHPage() {
    return (
        <div className="min-h-screen bg-white relative">
            <GlobalAreas />

            {/* HEADER IGUAL FATURA - BOLHAS */}
            <div className="relative px-4 sm:px-8 lg:px-12 pt-6 pb-6 border-b border-gray-100 overflow-hidden bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white">
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="bubble bubble-1"></div>
                    <div className="bubble bubble-2"></div>
                    <div className="bubble bubble-3"></div>
                </div>
                <div className="relative z-10">
                    <h1 className="text-[18px] font-bold">Recursos Humanos</h1>
                    <p className="text-[12px] text-gray-500">12 funcionários • 2 de férias • 10 ativos</p>

                    <div className="mt-5 flex bg-white/80 backdrop-blur border rounded-[3px] overflow-hidden max-w-[520px] w-full shadow-sm">
                        <button className="flex-1 py-2 bg-gray-50 text-[#0095ff]"><p className="text-[13px] font-bold">10</p><p className="text-[11px]">Ativos</p></button>
                        <button className="flex-1 py-2 border-l"><p className="text-[13px] font-bold">2</p><p className="text-[11px]">Férias</p></button>
                        <button className="flex-[0.6] border-l bg-[#0095ff] text-white text-[13px] font-semibold">+ Novo</button>
                    </div>
                </div>
                <style>{`.bubble{position:absolute;border-radius:50%;background:radial-gradient(circle at 30% 30%, rgba(0,149,255,0.20), rgba(0,149,255,0.05) 65%);border:1px solid rgba(0,149,255,0.14);animation:floatBubble 8s infinite ease-in-out}.bubble-1{width:80px;height:80px;left:10%;top:20%}.bubble-2{width:120px;height:120px;left:70%;top:10%}.bubble-3{width:60px;height:60px;left:40%;top:60%}@keyframes floatBubble{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}`}</style>
            </div>

            <div className="max-w-[1100px] mx-auto p-4 space-y-3">
                {FUNC_MOCK.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-[16px] border hover:shadow-sm">
                        <img src={`https://ui-avatars.com/api/?name=${f.nome}&background=E8F2FF&color=0095ff`} className="w-11 h-11 rounded-full" />
                        <div className="flex-1"><p className="text-[14px] font-bold">{f.nome}</p><p className="text-[11px] text-gray-500">{f.cargo} • {f.area}</p></div>
                        <span className="text-[10px] px-2 py-1 rounded-full bg-green-50 text-green-600 border">{f.status}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
