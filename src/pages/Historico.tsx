import { useMemo, useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { useEstoque } from '@/contexts/EstoqueContext'
import type { TipoMovimentacao } from '@/types/estoque'

const labels: Record<TipoMovimentacao, string> = {
  alocacao: 'Alocação',
  edicao: 'Edição',
  movimentacao: 'Movimentação',
  exclusao: 'Exclusão',
}

export default function Historico() {
  const { movimentacoes, carregando } = useEstoque()
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const rows = useMemo(
    () =>
      movimentacoes.filter((m) => {
        const term = busca.toLocaleLowerCase('pt-BR')
        const text =
          `${m.nome_maquina} ${m.nome_peca} ${m.posicao_origem} ${m.posicao_destino}`.toLocaleLowerCase(
            'pt-BR',
          )
        const date = new Date(m.created)
        return (
          (!term || text.includes(term)) &&
          (tipo === 'todos' || m.tipo === tipo) &&
          (!inicio || date >= new Date(`${inicio}T00:00:00`)) &&
          (!fim || date <= new Date(`${fim}T23:59:59`))
        )
      }),
    [movimentacoes, busca, tipo, inicio, fim],
  )
  return (
    <div className="page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">RASTREABILIDADE</span>
          <h1>Histórico de Movimentações</h1>
          <p>Acompanhe todas as alterações realizadas no estoque</p>
        </div>
      </header>
      <section className="history-filters">
        <label className="search-box">
          <Search />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por máquina, peça ou posição..."
          />
        </label>
        <select className="field" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="alocacao">Alocação</option>
          <option value="edicao">Edição</option>
          <option value="movimentacao">Movimentação</option>
          <option value="exclusao">Exclusão</option>
        </select>
        <label className="date-field">
          <CalendarDays />
          <input
            className="field"
            type="date"
            aria-label="Data inicial"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </label>
        <label className="date-field">
          <CalendarDays />
          <input
            className="field"
            type="date"
            aria-label="Data final"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
      </section>
      <section className="history-card">
        <div className="history-count">
          {rows.length}{' '}
          {rows.length === 1 ? 'movimentação encontrada' : 'movimentações encontradas'}
        </div>
        {carregando ? (
          <p className="empty-state">Carregando histórico...</p>
        ) : rows.length ? (
          <div className="timeline">
            {rows.map((m) => (
              <article className="timeline-item" key={m.id}>
                <span className={`timeline-node ${m.tipo}`} />
                <div className="timeline-content">
                  <header>
                    <span className={`action-badge ${m.tipo}`}>{labels[m.tipo]}</span>
                    <time>
                      {new Date(m.created).toLocaleString('pt-BR', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </header>
                  <h3>{m.nome_peca}</h3>
                  <p>
                    {m.nome_maquina} <span>·</span> {m.quantidade} un.
                  </p>
                  <div className="route">
                    {m.tipo === 'movimentacao' ? (
                      <>
                        <span>{m.posicao_origem}</span>
                        <b>→</b>
                        <span>{m.posicao_destino}</span>
                      </>
                    ) : (
                      <span>{m.posicao_destino || m.posicao_origem}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">Nenhuma movimentação corresponde aos filtros.</div>
        )}
      </section>
    </div>
  )
}
