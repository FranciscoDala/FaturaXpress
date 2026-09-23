import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import SidebarAreas from '../app/sidebar/sidebar'
import { api } from '../lib/api'
import ModalCliente from '../app/dashboard/components/modals/modal_Cliente'
import ProdutoModal from '../app/dashboard/components/modals/modal_Produto'

export default function GlobalAreas() {
    const [open, setOpen] = useState(false)
    const [count, setCount] = useState(0)
    const [openCliente, setOpenCliente] = useState(false)
    const [openProduto, setOpenProduto] = useState(false)

    const fetchCount = async () => {
        try {
            const raw = localStorage.getItem("funcionario") || localStorage.getItem("funcionario_logado")
            const cargo = raw? JSON.parse(raw)?.cargo?.toLowerCase() : 'admin'
            const area = cargo === 'admin'? 'admin' : 'rh'
            const { data } = await api.get(`/api/rh/notificacoes?area=${area}&status=pendente`)
            const total = Array.isArray(data)? data.length : 0
            setCount(total)
            window.dispatchEvent(new CustomEvent('notificacoes-count', { detail: { count: total } }))
        } catch {}
    }

    useEffect(() => {
        fetchCount()
        const id = setInterval(fetchCount, 15000)
        window.addEventListener('notificacoes-refresh' as any, fetchCount as any)
        window.addEventListener('notificacoes-count' as any, (e:any)=> setCount(e.detail?.count || 0))
        return () => {
            clearInterval(id)
            window.removeEventListener('notificacoes-refresh' as any, fetchCount as any)
        }
    }, [])

    return (
        <>
            <SidebarAreas
                open={open}
                onClose={() => setOpen(false)}
                notifCount={count}
                onOpenCliente={() => setOpenCliente(true)}
                onOpenProduto={() => setOpenProduto(true)}
            />
            {openCliente && (
                <ModalCliente
                    open={openCliente}
                    onClose={() => setOpenCliente(false)}
                    onSuccess={() => {
                        setOpenCliente(false)
                        window.dispatchEvent(new CustomEvent('sidebar-nav', { detail: { view: 'gestao', list: 'clientes' } }))
                        window.dispatchEvent(new CustomEvent('clientes-refresh'))
                    }}
                />
            )}
            {openProduto && (
                <ProdutoModal
                    open={openProduto}
                    produto={null}
                    onClose={() => setOpenProduto(false)}
                    onSuccess={() => {
                        setOpenProduto(false)
                        window.dispatchEvent(new CustomEvent('produtos-refresh'))
                    }}
                />
            )}
            <button
                onClick={() => setOpen(true)}
                className="fixed right-4 bottom-6 z-[9997] w-12 h-12 rounded-full bg-white border border-gray-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] flex items-center justify-center hover:scale-105 transition-all"
                title="Áreas"
            >
                <Settings className="w-5 h-5 text-gray-700 animate-[spin_8s_linear_infinite]" />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#FF3B30] text-white text-[11px] font-bold min-w-[20px] h-[20px] rounded-full flex items-center justify-center px-1 border-2 border-white shadow animate-[pop_0.3s_ease]">{count > 9? '9+' : count}</span>
                )}
            </button>
            <style>{`@keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.2)}100%{transform:scale(1)}}`}</style>
        </>
    )
}
