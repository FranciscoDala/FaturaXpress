import { Leaf, ChevronLeft, Home, PencilRuler, ChartLine, Factory, ClipboardList } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MENU = [
  { id: '1', label: 'Painel', Icon: Home, path: '/app/dashboard' },
  { id: '2', label: 'Recursos Humanos', Icon: Factory, path: '/app/rh', active: true },
  { id: '3', label: 'Reduce', Icon: PencilRuler },
  { id: '4', label: 'Analyze', Icon: ChartLine },
  { id: '5', label: 'Report', Icon: ClipboardList },
]

export default function SidebarAreas({ open, onClose }: { open: boolean, onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <>
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-[3px] z-[9998] transition-opacity ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />

      <div className={`fixed top-2 right-2 bottom-2 w-[300px] z-[9999] transition-transform duration-300 ${open? 'translate-x-0' : 'translate-x-[110%]'}`}>
        <div className="relative h-full w-full rounded-[24px] bg-gradient-to-br from-[#E8F2FF] via-[#F0F7FF] to-white border border-[#d6e8ff] p-2.5 flex flex-col shadow-[0_8px_40px_rgba(0,149,255,0.15)] overflow-hidden">

          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            <div className="bubble bubble-1"></div>
            <div className="bubble bubble-2"></div>
            <div className="bubble bubble-3"></div>
            <div className="bubble bubble-4"></div>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between px-1 pt-1 pb-4">
              <div className="w-9 h-9 rounded-full bg-white border border-[#d6e8ff] shadow-sm flex items-center justify-center">
                <Leaf className="w-5 h-5 text-[#0095ff] fill-[#E8F2FF]" />
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-700" />
              </button>
            </div>

            <div className="flex flex-col gap-[5px]">
              {MENU.map((m) => {
                const isActive = (m as any).active
                if (isActive) {
                  return (
                    <div key={m.id} className="relative h-[40px] -mr-2.5">
                      <div className="absolute inset-0 bg-white rounded-l-full rounded-r-[6px] border border-[#e6f0ff] shadow-[0_2px_10px_rgba(0,149,255,0.10)]" />
                      <button
                        onClick={() => { onClose(); m.path && navigate(m.path) }}
                        className="relative z-10 w-full h-full flex items-center gap-2.5 px-4 text-[#0095ff] font-semibold text-[13.5px]"
                      >
                        <m.Icon className="w-[16px] h-[16px]" />
                        {m.label}
                      </button>
                    </div>
                  )
                }
                return (
                  <button
                    key={m.id}
                    onClick={() => { onClose(); (m as any).path && navigate((m as any).path) }}
                    className="h-[40px] rounded-full bg-white/70 backdrop-blur border border-[#e6f0ff] flex items-center gap-2.5 px-4 text-gray-700 text-[13.5px] font-medium hover:bg-white text-left"
                  >
                    <m.Icon className="w-[16px] h-[16px] text-[#0095ff]/70" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <style>{`
         .bubble { position:absolute; border-radius:50%; background: radial-gradient(circle at 30% 30%, rgba(0,149,255,0.18), rgba(0,149,255,0.04) 65%); border:1px solid rgba(0,149,255,0.12); box-shadow: inset 0 0 10px rgba(255,255,255,0.7), 0 2px 12px rgba(0,149,255,0.08); animation: floatBubble 8s infinite ease-in-out; }
         .bubble-1 { width:70px; height:70px; left:8%; top:18%; }
         .bubble-2 { width:100px; height:100px; left:60%; top:8%; }
         .bubble-3 { width:50px; height:50px; left:30%; top:65%; }
         .bubble-4 { width:36px; height:36px; left:75%; top:50%; }
            @keyframes floatBubble { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
          `}</style>
        </div>
      </div>
    </>
  )
}
