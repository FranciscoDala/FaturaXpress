import { useState } from 'react'
import { Settings } from 'lucide-react'
import SidebarAreas from '../app/dashboard/components/sidebar/sidebar_Areas'

export default function GlobalAreas() {
    const [open, setOpen] = useState(false)
    return (
        <>
            <SidebarAreas open={open} onClose={() => setOpen(false)} />


            <button
                onClick={() => setOpen(true)}
                className="fixed right-4 bottom-6 z-[9997] w-12 h-12 rounded-full bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-105 transition-all"
                title="Áreas"
            >
                <Settings className="w-5 h-5 text-gray-700 animate-[spin_8s_linear_infinite]" />
            </button>
        </>
    )
}
