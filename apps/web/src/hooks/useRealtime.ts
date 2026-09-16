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
    const base = apiUrl.replace(/\/$/, '').replace(/\/api$/, '')
    return `${base.replace(/^http/, 'ws')}/api/ws/realtime`
}

export function useRealtime({ onEvent, enabled = true }: Options) {
    const wsRef = useRef<WebSocket | null>(null)
    const reconnectTimer = useRef<number | null>(null)
    const pingTimer = useRef<number | null>(null)
    const onEventRef = useRef(onEvent)
    useEffect(() => { onEventRef.current = onEvent }, [onEvent])

    useEffect(() => {
        if (!enabled) return
        let shouldReconnect = true

        const connect = () => {
            const token = localStorage.getItem('access_token')
            if (!token) return
            const url = `${getWsUrl()}?token=${encodeURIComponent(token)}`
            const ws = new WebSocket(url)
            wsRef.current = ws

            ws.onopen = () => {
                if (pingTimer.current) window.clearInterval(pingTimer.current)
                pingTimer.current = window.setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) ws.send('ping')
                }, 25000) as any
            }
            ws.onmessage = (e) => {
                if (e.data === 'pong') return
                try { onEventRef.current?.(JSON.parse(e.data) as RealtimeEvent) } catch {}
            }
            ws.onclose = (ev) => {
                if (pingTimer.current) window.clearInterval(pingTimer.current)
                // 4001 = token inválido, não reconecta
                if (ev.code === 4001 || ev.code === 1008) {
                    shouldReconnect = false
                    return
                }
                if (shouldReconnect) {
                    if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
                    reconnectTimer.current = window.setTimeout(connect, 3000) as any
                }
            }
            ws.onerror = () => ws.close()
        }

        connect()

        return () => {
            shouldReconnect = false
            if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
            if (pingTimer.current) window.clearInterval(pingTimer.current)
            wsRef.current?.close()
            wsRef.current = null
        }
    }, [enabled])
}
