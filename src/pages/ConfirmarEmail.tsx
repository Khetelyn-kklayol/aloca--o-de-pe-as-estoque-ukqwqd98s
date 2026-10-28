import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export default function ConfirmarEmail() {
  pb.authStore.clear()
  return (
    <main className="auth-page">
      <section className="auth-card center fade-in">
        <span className="auth-symbol success">
          <CheckCircle2 />
        </span>
        <h1>Alteração confirmada</h1>
        <p className="auth-subtitle">
          Seu e-mail foi atualizado. Por segurança, entre novamente para continuar.
        </p>
        <Link className="btn primary wide large" to="/">
          Voltar ao login
        </Link>
      </section>
    </main>
  )
}
