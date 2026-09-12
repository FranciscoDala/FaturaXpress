import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { authService } from './services/auth'
import './globals.css'

// ======================= LAYOUTS =======================
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'

// ======================= PAGES =======================
import Login from './pages/auth/Login'
import SchoolsPage from './pages/admin/SchoolsPage'
import UsersPage from './pages/admin/UsersPage'
import AjudaPage from './pages/admin/AjudaPage'
import EscolaListPage from './pages/escola/EscolaListPage'
import DefinicoesEscolaPage from './pages/escola/escola_definicoes'
import DirecaoPage from './pages/escola/escola_direcao'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
})

const getUserNivel = () => (authService.getNivel() ?? '').toUpperCase()

const isMinisterio = () => getUserNivel() === 'MINISTERIO'
const isAuthenticated = () => authService.isAuthenticated()

// ======================= THEME =======================
const applySavedTheme = () => {
    const t = localStorage.getItem('escola_tema')
    if (!t) return

    try {
        const tema = JSON.parse(t)
        const root = document.documentElement

        root.style.setProperty('--cor-primaria', tema.cor_primaria || '#3B82F6')
        root.style.setProperty('--cor-secundaria', tema.cor_secundaria || '#8B5CF6')
        root.style.setProperty('--cor-fundo', tema.cor_fundo || '#FFFFFF')
        root.setAttribute('data-tema', tema.tema || 'escuro')
        root.setAttribute('data-card-style', tema.estilo_card || 'arredondado')
        root.setAttribute('data-fonte-titulo', tema.fonte_titulo || 'Poppins')
        root.setAttribute('data-fonte-corpo', tema.fonte_corpo || 'Inter')
    } catch (error) {
        console.error('Erro ao aplicar tema salvo', error)
    }
}

// ======================= LISTENER =======================
const ThemeListener = () => {
    useEffect(() => {
        applySavedTheme()

        const handleTemaUpdated = () => applySavedTheme()
        window.addEventListener('escola-tema-updated', handleTemaUpdated)

        return () => {
            window.removeEventListener('escola-tema-updated', handleTemaUpdated)
        }
    }, [])

    return null
}

// ======================= ROUTE GUARDS =======================
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />
    }

    if (!isMinisterio()) {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}

const SchoolRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/" replace />
    }

    if (isMinisterio()) {
        return <Navigate to="/admin" replace />
    }

    return <>{children}</>
}

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAuthenticated()) {
        return <>{children}</>
    }

    return isMinisterio() ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Toaster position="top-center" richColors />
            <ThemeListener />
            <HashRouter>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <PublicRoute>
                                <Login />
                            </PublicRoute>
                        }
                    />

                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <AdminLayout />
                            </AdminRoute>
                        }
                    >
                        <Route index element={<SchoolsPage />} />
                        <Route path="escolas/:id" element={<div>Detalhes da Escola</div>} />
                        <Route path="users" element={<UsersPage />} />
                        <Route path="ajuda" element={<AjudaPage />} />
                        <Route path="settings" element={<div>Configurações Admin</div>} />
                    </Route>

                    <Route
                        path="/dashboard"
                        element={
                            <SchoolRoute>
                                <MainLayout />
                            </SchoolRoute>
                        }
                    >
                        <Route index element={<EscolaListPage />} />
                        <Route path="definicoes" element={<DefinicoesEscolaPage />} />
                        <Route path="direcao" element={<DirecaoPage />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </HashRouter>
        </QueryClientProvider>
    </React.StrictMode>
)
