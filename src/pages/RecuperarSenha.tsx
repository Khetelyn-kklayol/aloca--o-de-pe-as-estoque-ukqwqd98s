import { useState, type FormEvent } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(email.trim())
    } catch {
      /* resposta neutra por segurança */
    } finally {
      setEnviado(true)
      setLoading(false)
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card fade-in">
        <span className="auth-symbol">
          <Mail />
        </span>
        <h1>Esqueci minha senha</h1>
        <p className="auth-subtitle">Informe o e-mail usado no acesso ao estoque.</p>
        {enviado ? (
          <div className="success-message">Se o e-mail existir, você receberá um link.</div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label>
              E-mail
              <input
                className="field"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@olyra.com.br"
              />
            </label>
            <button className="btn primary wide large" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link de redefinição'}
            </button>
          </form>
        )}
        <Link className="auth-link back" to="/">
          <ArrowLeft /> Voltar ao login
        </Link>
      </section>
    </main>
  )
}
