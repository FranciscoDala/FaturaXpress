import { Leaf, ChevronLeft, Home, PencilRuler, ChartLine, Factory, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MENU = [
  { id: '1', label: 'Home', Icon: Home, path: '/app/dashboard' },
  { id: '2', label: 'Measure', Icon: PencilRuler },
  { id: '3', label: 'Analyze', Icon: ChartLine },
  { id: '4', label: 'Reduce', Icon: Factory, path: '/app/rh', active: true },
  { id: '5', label: 'Report', Icon: ClipboardList },
]

export default function SidebarAreas({ open, onClose }: { open: boolean, onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <>
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-[3px] z-[9998] transition-opacity ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />

      <div className={`fixed top-2 right-2 bottom-2 w-[310px] z-[9999] transition-transform duration-300 ${open? 'translate-x-0' : 'translate-x-[110%]'}`}>
        <div className="relative h-full w-full rounded-[28px] bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white border border-[#d6e8ff] p-3 flex flex-col shadow-[0_8px_40px_rgba(0,149,255,0.15)] overflow-hidden">

          {/* BOLHAS IGUAL HEADER */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="bubble bubble-1"></div>
            <div className="bubble bubble-2"></div>
            <div className="bubble bubble-3"></div>
            <div className="bubble bubble-4"></div>
          </div>

          {/* Conteúdo */}
          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-1 pt-1 pb-6">
              <div className="w-12 h-12 rounded-full bg-white border border-[#d6e8ff] shadow-sm flex items-center justify-center">
                <Leaf className="w-6 h-6 text-[#0095ff] fill-[#E8F2FF]" />
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
            </div>

            {/* Itens */}
            <div className="flex flex-col gap-2">
              {MENU.map((m) => {
                const isActive = (m as any).active
                if (isActive) {
                  return (
                    <div key={m.id} className="relative h-[52px] -mr-3">
                      <div className="absolute inset-0 bg-white rounded-l-full rounded-r-[8px] border border-[#e6f0ff] shadow-[0_2px_12px_rgba(0,149,255,0.12)]" />
                      <button
                        onClick={() => { onClose(); m.path && navigate(m.path) }}
                        className="relative z-10 w-full h-full flex items-center gap-3 px-5 text-[#0095ff] font-semibold text-[15px]"
                      >
                        <m.Icon className="w-[20px] h-[20px]" />
                        {m.label}
                      </button>
                    </div>
                  )
                }
                return (
                  <button
                    key={m.id}
                    onClick={() => { onClose(); (m as any).path && navigate((m as any).path) }}
                    className="h-[52px] rounded-full bg-white/70 backdrop-blur border border-[#e6f0ff] flex items-center gap-3 px-5 text-gray-700 text-[15px] font-medium hover:bg-white hover:border-[#d6e8ff] text-left shadow-[0_1px_8px_rgba(0,149,255,0.06)]"
                  >
                    <m.Icon className="w-[20px] h-[20px] text-[#0095ff]/70" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <style>{`
           .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.18), rgba(0,149,255,0.04) 65%); border:1px solid rgba(0,149,255,0.12); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.08); animation: floatBubble 8s infinite ease-in-out; }
           .bubble-1 { width:80px; height:80px; left:8%; top:18%; }
           .bubble-2 { width:120px; height:120px; left:60%; top:8%; }
           .bubble-3 { width:60px; height:60px; left:30%; top:65%; }
           .bubble-4 { width:40px; height:40px; left:75%; top:50%; }
            @keyframes floatBubble { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
          `}</style>
        </div>
      </div>
    </>
  )
}
