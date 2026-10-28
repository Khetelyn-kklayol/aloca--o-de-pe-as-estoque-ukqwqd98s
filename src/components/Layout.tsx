import { useState, type ReactNode } from 'react'
import { Clock3, LogOut, Menu, PackageOpen, Plus, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const name = String(user?.name || user?.email?.split('@')[0] || 'Operador')

  const nova = () => {
    navigate('/mapa')
    setMenu(false)
    window.setTimeout(() => window.dispatchEvent(new Event('nova-alocacao')), 20)
  }

  const sidebar = (
    <aside className={cn('sidebar', menu && 'sidebar-open')}>
      <button className="close-menu" aria-label="Fechar menu" onClick={() => setMenu(false)}>
        <X />
      </button>
      <div className="logo-block">
        <div className="brand">OLYRA</div>
        <div className="brand-seal">
          MARKETING OLFATIVO <span>—</span>
          <br /> CONTROLE DE ESTOQUE
        </div>
      </div>
      <nav className="nav-list">
        <NavLink
          to="/mapa"
          onClick={() => setMenu(false)}
          className={({ isActive }) => cn('nav-item', isActive && 'active')}
          title="Mapa do Estoque"
        >
          <PackageOpen />
          <span>Mapa do Estoque</span>
        </NavLink>
        <NavLink
          to="/historico"
          onClick={() => setMenu(false)}
          className={({ isActive }) => cn('nav-item', isActive && 'active')}
          title="Histórico"
        >
          <Clock3 />
          <span>Histórico</span>
        </NavLink>
      </nav>
      <div className="sidebar-footer">
        <div className="profile">
          <span className="avatar">{initials(name)}</span>
          <div>
            <strong>{name}</strong>
            <small>Operador de manutenção</small>
          </div>
        </div>
        <button className="btn primary wide" onClick={nova}>
          <Plus /> <span>Nova Alocação</span>
        </button>
        <button
          className="logout"
          onClick={() => {
            logout()
            navigate('/')
          }}
        >
          <LogOut /> <span>Sair</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <button aria-label="Abrir menu" onClick={() => setMenu(true)}>
          <Menu />
        </button>
        <span className="brand">OLYRA</span>
        <span className="avatar small">{initials(name)}</span>
      </header>
      {menu && (
        <button className="menu-overlay" aria-label="Fechar menu" onClick={() => setMenu(false)} />
      )}
      {sidebar}
      <main className="main-content">{children}</main>
      <button className="fab" aria-label="Nova Alocação" onClick={nova}>
        <Plus />
      </button>
    </div>
  )
}
