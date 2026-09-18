import axios from 'axios'
import { toast } from 'sonner'

const raw = import.meta.env.VITE_API_URL || 'https://faturaxpress-backend.onrender.com/api'
const baseURL = raw.replace(/\/$/, '')

const api = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (r) => r,
    (error) => {
        const status = error.response?.status
        const detail = error.response?.data?.detail || error.response?.data?.message || ''

        // Sessão expirada
        if (status === 401) {
            localStorage.clear()
            toast.error('Sessão expirada', { description: 'Faça login novamente.' })
            window.location.hash = '#/login'
            return Promise.reject(error)
        }

        // TRAVA DE PLANO - 403
        if (status === 403 && typeof detail === 'string' && detail.toLowerCase().includes('limite do plano')) {
            toast.error('Limite do plano atingido', {
                description: detail,
                duration: 6000,
                action: {
                    label: 'Fazer Upgrade',
                    onClick: () => {
                        window.location.hash = '#/assinatura'
                    }
                }
            })
            return Promise.reject(error)
        }

        // Outros erros com toast automático (evita toast duplo em telas que já tratam)
        if (status >= 400 && status!== 403) {
            // Não mostra aqui se for erro de validação que a página já vai mostrar
            const silentPaths = ['/faturas', '/clientes', '/produtos']
            const url = error.config?.url || ''
            const isSilent = silentPaths.some(p => url.includes(p)) && status === 400

            if (!isSilent && detail) {
                // só mostra se detail for string curta
                if (typeof detail === 'string' && detail.length < 200) {
                    toast.error('Erro', { description: detail })
                }
            }
        }

        return Promise.reject(error)
    }
)

export { api }
