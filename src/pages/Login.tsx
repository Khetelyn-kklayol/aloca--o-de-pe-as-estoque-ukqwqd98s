import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LoaderCircle, Waves } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [visivel, setVisivel] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErro('')
    if (!email || !senha) return setErro('Informe seu e-mail e sua senha.')
    setLoading(true)
    try {
      await login(email.trim(), senha)
      navigate('/mapa')
    } catch {
      setErro('E-mail ou senha inválidos. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow" />
      <section className="auth-card fade-in">
        <div className="auth-symbol">
          <Waves />
        </div>
        <h1 className="brand">OLYRA</h1>
        <p className="auth-subtitle">Acesso do Operador de Manutenção</p>
        <form onSubmit={submit} className="form-stack">
          <label>
            E-mail
            <input
              className="field"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@olyra.com.br"
            />
          </label>
          <label>
            Senha
            <div className="password-wrap">
              <input
                className="field"
                type={visivel ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
              />
              <button
                type="button"
                aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setVisivel(!visivel)}
              >
                {visivel ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>
          {erro && (
            <p className="field-error" role="alert">
              {erro}
            </p>
          )}
          <button className="btn primary wide large" disabled={loading}>
            {loading && <LoaderCircle className="spin" />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <Link className="auth-link" to="/esqueci-senha">
          Esqueci minha senha
        </Link>
      </section>
    </main>
  )
}
