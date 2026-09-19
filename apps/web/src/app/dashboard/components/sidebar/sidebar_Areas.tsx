import { Leaf, ChevronLeft, Home, PencilRuler, ChartNoAxesColumn, Factory, ClipboardList } from 'lucide-react'

const MENU = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'measure', label: 'Measure', Icon: PencilRuler },
  { id: 'analyze', label: 'Analyze', Icon: ChartNoAxesColumn },
  { id: 'reduce', label: 'Reduce', Icon: Factory, active: true },
  { id: 'report', label: 'Report', Icon: ClipboardList },
]

export default function SidebarExact({ open = true, onClose }: any) {
  return (
    <>
      <div className={`fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[9998] ${open? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />

      <div className={`fixed top-2 right-2 bottom-2 w-[320px] z-[9999] transition-transform ${open? '' : 'translate-x-[110%]'}`}>
        {/* CONTAINER VERDE */}
        <div className="relative w-full h-full rounded-[28px] bg-gradient-to-b from-[#1a8a5f] to-[#032314] overflow-hidden border border-white/10">

          {/* COLUNA BRANCA DA DIREITA - igual print */}
          <div className="absolute top-0 right-0 bottom-0 w-[72px] bg-[#f6f6] rounded-l-[0px] z-0">
            {/* topo arredondado da coluna branca */}
            <div className="absolute top-0 left-0 w-full h-[68px] bg-[#f6f6f6] rounded-tl-[28px] rounded-tr-[28px]" />
            {/* icone topo da coluna */}
            <div className="absolute top-3 right-3 w-10 h-10 bg-white rounded-[14px] shadow-sm flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* CONTEUDO VERDE */}
          <div className="relative z-10 p-3 h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center pr-[80px] pb-5">
              <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center border border-white/10">
                <Leaf className="w-6 h-6 text-white fill-white/30" />
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <ChevronLeft className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Menu */}
            <div className="flex flex-col gap-2 pr-[56px]">
              {MENU.map((m) => {
                const isActive = (m as any).active
                if (isActive) {
                  return (
                    <div key={m.id} className="relative h-[48px] -mr-[72px]">
                      {/* Fundo branco que conecta na coluna */}
                      <div className="absolute inset-0 bg-[#f6f6f6] rounded-l-[22px] rounded-r-[6px]">
                        {/* curva superior */}
                        <div className="absolute -top-4 right-[56px] w-4 h-4 bg-[#f6f6f6]">
                          <div className="w-full h-full bg-[#0d6a42] rounded-br-[16px]" />
                        </div>
                        {/* curva inferior */}
                        <div className="absolute -bottom-4 right-[56px] w-4 h-4 bg-[#f6f6f6]">
                          <div className="w-full h-full bg-[#0a4a2f] rounded-tr-[16px]" />
                        </div>
                      </div>
                      {/* Conteúdo */}
                      <div className="relative z-10 h-full flex items-center gap-3 px-4 text-black font-semibold text-[14px]">
                        <m.Icon className="w-[20px] h-[20px]" />
                        {m.label}
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={m.id} className="h-[48px] rounded-full bg-white/10 backdrop-blur flex items-center gap-3 px-4 text-white/90 text-[14px] hover:bg-white/15">
                    <m.Icon className="w-[20px] h-[20px]" />
                    {m.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
