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
      <div className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[9998] transition-opacity ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />

      <div className={`fixed top-2 right-2 bottom-2 w-[300px] z-[9999] transition-transform duration-300 ${open? 'translate-x-0' : 'translate-x-[110%]'}`}>
        <div className="h-full w-full rounded-[28px] bg-gradient-to-b from-[#1d9a6b] via-[#0a5c3a] to-[#032014] p-3 flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.3)] border border-white/10">

          {/* Header - folha + voltar */}
          <div className="flex items-center justify-between px-1 pt-1 pb-6">
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white fill-white/20" />
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/20">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Itens */}
          <div className="flex flex-col gap-2">
            {MENU.map((m) => {
              const isActive = (m as any).active
              if (isActive) {
                return (
                  <div key={m.id} className="relative h-[52px] -mr-3">
                    <div className="absolute inset-0 bg-white rounded-l-full rounded-r-[8px] shadow-[0_2px_10px_rgba(0,0,0,0.1)]" />
                    <button
                      onClick={() => { onClose(); m.path && navigate(m.path) }}
                      className="relative z-10 w-full h-full flex items-center gap-3 px-5 text-black font-semibold text-[15px]"
                    >
                      <m.Icon className="w-[20px] h-[20px] text-black" />
                      {m.label}
                    </button>
                  </div>
                )
              }
              return (
                <button
                  key={m.id}
                  onClick={() => { onClose(); (m as any).path && navigate((m as any).path) }}
                  className="h-[52px] rounded-full bg-white/10 backdrop-blur flex items-center gap-3 px-5 text-white/90 text-[15px] font-medium hover:bg-white/15 text-left"
                >
                  <m.Icon className="w-[20px] h-[20px]" />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
