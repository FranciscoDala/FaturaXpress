import axios from 'axios'

const raw = import.meta.env.VITE_API_URL || 'https://faturaxpress-backend.onrender.com/api'
const baseURL = raw.replace(/\/$/, '') // garante sem barra no final

const api = axios.create({
    baseURL, // já tem /api dentro
    headers: {
        'Content-Type': 'application/json',
    },
})

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.clear()
            window.location.hash = '#/login'
        }
        return Promise.reject(error)
    }
)

export { api }
