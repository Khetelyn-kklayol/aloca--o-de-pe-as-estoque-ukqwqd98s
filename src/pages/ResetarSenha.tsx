import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export default function ResetarSenha() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha deve ter no mínimo 8 caracteres.')
    if (senha !== confirmar) return setErro('As senhas não coincidem.')
    if (!token) return setErro('Link inválido ou expirado. Solicite um novo link.')
    setLoading(true)
    try {
      await pb.collection('users').confirmPasswordReset(token, senha, confirmar)
      setOk(true)
    } catch {
      setErro('Não foi possível redefinir a senha. O link pode ter expirado.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card fade-in">
        <span className="auth-symbol">
          <KeyRound />
        </span>
        <h1>Resetar senha</h1>
        <p className="auth-subtitle">Crie uma senha segura com no mínimo 8 caracteres.</p>
        {ok ? (
          <div className="success-message">Senha redefinida com sucesso. Você já pode entrar.</div>
        ) : (
          <form className="form-stack" onSubmit={submit}>
            <label>
              Nova senha
              <input
                className="field"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </label>
            <label>
              Confirmar nova senha
              <input
                className="field"
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </label>
            {erro && <p className="field-error">{erro}</p>}
            <button className="btn primary wide large" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir senha'}
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
