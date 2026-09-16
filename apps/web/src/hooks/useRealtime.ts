import { useEffect, useRef } from 'react'

type RealtimeEvent = {
    event: string
    action?: string
    id?: string
    [key: string]: any
}

type Options = {
    onEvent?: (msg: RealtimeEvent) => void
    enabled?: boolean
}

function getWsUrl() {
    const apiUrl = (import.meta.env.VITE_API_URL as string) || 'https://faturaxpress-backend.onrender.com/api'
    const base = apiUrl.replace(/\/$/, '')
    const wsBase = base.replace(/^http/, 'ws')
    return `${wsBase}/ws/realtime`
}

export function useRealtime({ onEvent, enabled = true }: Options) {
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimer = useRef<number | null>(null)
    const onEventRef = useRef(onEvent)
    useEffect(() => { onEventRef.current = onEvent }, [onEvent])

    useEffect(() => {
        if (!enabled) return
        const token = localStorage.getItem('access_token')
        if (!token) return
        const connect = () => {
            const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`
            const ws = new WebSocket(url)
            wsRef.current = ws
            ws.onmessage = (e) => {
                try { onEventRef.current?.(JSON.parse(e.data) as RealtimeEvent) } catch {}
            }
            ws.onclose = () => {
                if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
                reconnectTimer.current = window.setTimeout(connect, 3000) as any
            }
            ws.onerror = () => ws.close()
        }
        connect()
        return () => {
            if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
            wsRef.current?.close()
            wsRef.current = null
        }
    }, [enabled])
}
