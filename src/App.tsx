import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { EstoqueProvider } from '@/contexts/EstoqueContext'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import RecuperarSenha from '@/pages/RecuperarSenha'
import ResetarSenha from '@/pages/ResetarSenha'
import ConfirmarEmail from '@/pages/ConfirmarEmail'
import MapaEstoque from '@/pages/MapaEstoque'
import Historico from '@/pages/Historico'
import NotFound from '@/pages/NotFound'

function Entrada() {
  const { user, ready } = useAuth()
  if (!ready)
    return (
      <div className="splash">
        <span className="brand">OLYRA</span>
      </div>
    )
  return user ? <Navigate to="/mapa" replace /> : <Login />
}

function Protegida() {
  const { user, ready } = useAuth()
  if (!ready)
    return (
      <div className="splash">
        <span className="brand">OLYRA</span>
      </div>
    )
  if (!user) return <Navigate to="/" replace />
  return (
    <EstoqueProvider>
      <Layout>
        <Outlet />
      </Layout>
    </EstoqueProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Entrada />} />
          <Route path="/esqueci-senha" element={<RecuperarSenha />} />
          <Route path="/resetar-senha" element={<ResetarSenha />} />
          <Route path="/confirmar-email" element={<ConfirmarEmail />} />
          <Route element={<Protegida />}>
            <Route path="/mapa" element={<MapaEstoque />} />
            <Route path="/historico" element={<Historico />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}
