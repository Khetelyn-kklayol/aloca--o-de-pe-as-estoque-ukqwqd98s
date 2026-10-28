import { useEffect, useMemo, useState } from 'react'
import { MapPin, PackagePlus, Plus, Search } from 'lucide-react'
import AllocationDrawer from '@/components/AllocationDrawer'
import { useEstoque } from '@/contexts/EstoqueContext'
import { cn } from '@/lib/utils'
import type { Endereco, Posicao } from '@/types/estoque'

const pallets = Array.from({ length: 4 }, (_, i) => `Palete ${i + 1}`)
const slots = Array.from({ length: 8 }, (_, i) => `Posição ${i + 1}`)

export default function MapaEstoque() {
  const { posicoes, carregando } = useEstoque()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [drawer, setDrawer] = useState(false)
  const [endereco, setEndereco] = useState<Endereco | null>(null)
  const [registro, setRegistro] = useState<Posicao | null>(null)
  const index = useMemo(
    () => new Map(posicoes.map((p) => [`${p.palete}|${p.posicao}`, p])),
    [posicoes],
  )
  const searching = Boolean(busca.trim() || filtro !== 'Todos')
  const matches = (item: Posicao | undefined, palete: string) => {
    const byPalete = filtro === 'Todos' || filtro === palete
    if (!item) return !busca.trim() && byPalete
    const term = busca.toLocaleLowerCase('pt-BR').trim()
    return (
      byPalete &&
      (!term || `${item.nome_maquina} ${item.nome_peca}`.toLocaleLowerCase('pt-BR').includes(term))
    )
  }
  const open = (palete?: string, posicao?: string, item?: Posicao) => {
    setRegistro(item || null)
    setEndereco(
      item
        ? null
        : {
            palete: palete || 'Palete 1',
            posicao: posicao || primeiraVazia()?.posicao || 'Posição 1',
          },
    )
    setDrawer(true)
  }
  const primeiraVazia = () => {
    for (const palete of pallets)
      for (const posicao of slots)
        if (!index.has(`${palete}|${posicao}`)) return { palete, posicao }
    return null
  }
  useEffect(() => {
    const listener = () => {
      const empty = primeiraVazia()
      if (empty) open(empty.palete, empty.posicao)
    }
    window.addEventListener('nova-alocacao', listener)
    return () => window.removeEventListener('nova-alocacao', listener)
  })

  return (
    <div className="page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">VISÃO GERAL DO ESTOQUE</span>
          <h1>Mapa do Estoque</h1>
          <p>Visualize e registre a posição de cada peça</p>
        </div>
        <button
          className="btn primary desktop-new"
          onClick={() => {
            const e = primeiraVazia()
            if (e) open(e.palete, e.posicao)
          }}
        >
          <Plus /> Nova Alocação
        </button>
      </header>
      <section className="filters">
        <label className="search-box">
          <Search />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por máquina, peça ou código..."
          />
        </label>
        <select
          className="field pallet-filter"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option>Todos</option>
          {pallets.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </section>
      <div className="map-meta">
        <span>
          <span className="status-dot occupied" /> {posicoes.length} ocupadas
        </span>
        <span>
          <span className="status-dot empty" /> {32 - posicoes.length} vazias
        </span>
      </div>
      {carregando ? (
        <div className="loading-map">Carregando o mapa do estoque...</div>
      ) : (
        <section className="pallet-grid">
          {pallets.map((palete, palletIndex) => (
            <article className="pallet-card" key={palete}>
              <header>
                <div>
                  <span>PALLET {palletIndex + 1}</span>
                  <small>
                    {slots.filter((slot) => index.has(`${palete}|${slot}`)).length} de 8 posições
                    ocupadas
                  </small>
                </div>
                <PackagePlus />
              </header>
              <div className="slot-grid">
                {slots.map((posicao, slotIndex) => {
                  const item = index.get(`${palete}|${posicao}`)
                  const matched = matches(item, palete)
                  return (
                    <button
                      key={posicao}
                      style={{ animationDelay: `${slotIndex * 40}ms` }}
                      onClick={() => open(palete, posicao, item)}
                      className={cn(
                        'slot fade-up',
                        item ? 'filled' : 'vacant',
                        searching && (matched ? 'matched' : 'dimmed'),
                      )}
                    >
                      <div className="slot-top">
                        <strong>P{slotIndex + 1}</strong>
                        {item ? (
                          <>
                            <span className="pin">
                              <MapPin />
                            </span>
                            <span className="quantity-badge">{item.quantidade}</span>
                          </>
                        ) : null}
                      </div>
                      {item ? (
                        <>
                          <span className="machine">{item.nome_maquina}</span>
                          <span className="piece">{item.nome_peca}</span>
                        </>
                      ) : (
                        <span className="empty-label">vazia</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
      )}
      <AllocationDrawer
        open={drawer}
        endereco={endereco}
        registro={registro}
        onClose={() => setDrawer(false)}
      />
    </div>
  )
}
