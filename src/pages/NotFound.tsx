import { ArrowLeft, Map } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card center">
        <span className="auth-symbol">
          <Map />
        </span>
        <h1>Página não encontrada</h1>
        <p className="auth-subtitle">O endereço acessado não existe no controle de estoque.</p>
        <Link className="btn primary wide" to="/">
          <ArrowLeft /> Voltar ao início
        </Link>
      </section>
    </main>
  )
}
