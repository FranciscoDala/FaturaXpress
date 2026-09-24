import { useEffect, useRef } from 'react'

export default function SwipeCard({ children, id, isOpen, setOpen, swipeWidth = 300, actions, onDoubleTap }: any) {
    const cardRef = useRef<HTMLDivElement>(null)
    const startX = useRef(0)
    const startY = useRef(0)
    const curX = useRef(0)
    const dragging = useRef(false)
    const moved = useRef(false)
    const lastTap = useRef(0)
    const lastDoubleTap = useRef(0)

    const triggerDoubleTap = () => {
        const now = Date.now()
        if (now - lastDoubleTap.current < 500) return
        lastDoubleTap.current = now
        onDoubleTap?.()
    }

    const setTx = (x: number, anim = false) => {
        curX.current = x
        if (cardRef.current) {
            cardRef.current.style.transition = anim ? 'transform 0.3s cubic-bezier(0.22,1,0.36,1)' : 'none'
            cardRef.current.style.transform = `translate3d(${x}px,0,0)`
        }
    }

    useEffect(() => { setTx(isOpen ? -swipeWidth : 0, true) }, [isOpen, swipeWidth])

    const handleDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button')) return
        dragging.current = true
        moved.current = false
        startX.current = e.clientX
        startY.current = e.clientY
        cardRef.current?.setPointerCapture(e.pointerId)
    }

    const handleMove = (e: React.PointerEvent) => {
        if (!dragging.current) return
        const dx = e.clientX - startX.current
        const dy = e.clientY - startY.current
        if (!moved.current && Math.abs(dx) < 5 && Math.abs(dy) < 5) return
        if (Math.abs(dy) > Math.abs(dx)) return
        moved.current = true
        let next = dx
        if (isOpen) next = -swipeWidth + dx
        next = Math.max(-swipeWidth, Math.min(0, next))
        setTx(next, false)
    }

    const handleUp = () => {
        if (!dragging.current) return
        dragging.current = false
        if (!moved.current) {
            const now = Date.now()
            if (now - lastTap.current < 350) {
                triggerDoubleTap()
                lastTap.current = 0
            } else {
                lastTap.current = now
            }
        }
        const threshold = -swipeWidth * 0.35
        if (curX.current < threshold) {
            setTx(-swipeWidth, true)
            setOpen(id)
        } else {
            setTx(0, true)
            setOpen(null)
        }
    }

    return (
        <div className="relative overflow-hidden border-b last:border-b-0">
            {actions}
            <div ref={cardRef} className="relative bg-white will-change-transform select-none" onPointerDown={handleDown} onPointerMove={handleMove} onPointerUp={handleUp} onPointerCancel={handleUp} onDoubleClick={triggerDoubleTap} style={{ touchAction: 'pan-y' }}>
                {children}
            </div>
        </div>
    )
}
