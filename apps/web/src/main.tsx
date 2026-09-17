import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'

import LoginPage from './app/login/login'
import Register from './app/login/Register'
import DashboardPage from './app/dashboard/page'
import EmitirFaturaPage from './app/faturas/EmitirFaturaPage'
import AssinaturaPage from './app/assinatura/page'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const token = localStorage.getItem("access_token")
    if (!token) {
        return <Navigate to="/login" replace />
    }
    return <>{children}</>
}

function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<Register />} />

                <Route
                    path="/app/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/faturas/nova"
                    element={
                        <ProtectedRoute>
                            <EmitirFaturaPage />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/assinatura"
                    element={
                        <ProtectedRoute>
                            <AssinaturaPage />
                        </ProtectedRoute>
                    }
                />

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </HashRouter>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <Toaster position="top-center" richColors />
            <App />
        </QueryClientProvider>
    </React.StrictMode>
)
