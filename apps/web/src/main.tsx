import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css' // se não tiver, troca pra './globals.css'

const queryClient = new QueryClient()

// ======================= PAGINAS TEMPORARIAS =======================
function HomePage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>FaturaXpress</h1>
      <p>Frontend ligado ✅</p>
      <Link to="/login">Ir para Login</Link>
    </div>
  )
}

function LoginPage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Login</h1>
      <p>Aqui vai o form de login depois</p>
      <Link to="/">Voltar</Link>
    </div>
  )
}

// ======================= APP =======================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
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
