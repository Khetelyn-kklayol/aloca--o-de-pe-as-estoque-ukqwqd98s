import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import GradeNivel from '@/components/GradePortaPaletes'
import PosicaoDetalhesDrawer from '@/components/PosicaoDetalhesDrawer'
import { useEstoque } from '@/contexts/EstoqueContext'
import { cn } from '@/lib/utils'
import {
  ladosDaEstrutura,
  type Categoria,
  type Estrutura,
  type Item,
  type Posicao,
} from '@/types/estoque'
import { rotuloFace } from '@/components/GradePortaPaletes'

const LEGENDA: { categoria: Categoria | 'Confirmar'; label: string }[] = [
  { categoria: 'Estoque', label: 'Estoque' },
  { categoria: 'Máquina', label: 'Máquina' },
  { categoria: 'Picking', label: 'Picking' },
  { categoria: 'Vazio', label: 'Vazio' },
  { categoria: 'Confirmar', label: 'Qtd a confirmar' },
]

export default function MapaEstoque() {
  const { estruturas, posicoes, itens, carregando } = useEstoque()
  // Apenas os PGs seguem o formato do estoque físico (grades 3×3 numeradas).
  const emGrade = (e: Estrutura | undefined) => !!e && ['PG1', 'PG2', 'PG3'].includes(e.codigo)
  const [codigo, setCodigo] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [alocarEm, setAlocarEm] = useState<Posicao | null>(null)
  const [detalhesDe, setDetalhesDe] = useState<Posicao | null>(null)

  const atual: Estrutura | undefined = estruturas.find((e) => e.codigo === codigo) || estruturas[0]

  const posicoesDaEstrutura = useMemo(
    () => (atual ? posicoes.filter((p) => p.estrutura === atual.id) : []),
    [posicoes, atual],
  )
  const itensPorPosicao = useMemo(() => {
    const mapa = new Map<string, number>()
    for (const item of itens) mapa.set(item.posicao, (mapa.get(item.posicao) || 0) + 1)
    return mapa
  }, [itens])
  const itensAgrupados = useMemo(() => {
    const mapa = new Map<string, Item[]>()
    for (const item of itens) {
      const lista = mapa.get(item.posicao) || []
      lista.push(item)
      mapa.set(item.posicao, lista)
    }
    return mapa
  }, [itens])

  const niveis = useMemo(
    () => [...new Set(posicoesDaEstrutura.map((p) => p.nivel))].sort((a, b) => a - b),
    [posicoesDaEstrutura],
  )
  const lados = useMemo(() => (atual ? ladosDaEstrutura(atual) : []), [atual])

  const termo = busca.toLocaleLowerCase('pt-BR').trim()
  const buscando = termo.length > 0
  const enderecosQueCombinam = useMemo(() => {
    if (!buscando) return null
    const combinam = new Set<string>()
    for (const item of itens) {
      const pos = posicoes.find((p) => p.id === item.posicao)
      if (!pos) continue
      const texto = `${item.maquina} ${item.peca} ${item.codigo} ${pos.endereco}`.toLocaleLowerCase(
        'pt-BR',
      )
      if (texto.includes(termo)) combinam.add(pos.endereco)
    }
    if (atual?.codigo && atual.codigo.toLocaleLowerCase('pt-BR').includes(termo)) {
      for (const p of posicoesDaEstrutura) combinam.add(p.endereco)
    }
    return combinam
  }, [buscando, termo, itens, posicoes, atual, posicoesDaEstrutura])

  const primeiraVazia = () => posicoes.find((p) => p.categoria === 'Vazio') || null

  useEffect(() => {
    const listener = () => {
      const vazia = primeiraVazia()
      if (vazia) setAlocarEm(vazia)
    }
    window.addEventListener('nova-alocacao', listener)
    return () => window.removeEventListener('nova-alocacao', listener)
  }, [posicoes])

  const ocupadas = posicoesDaEstrutura.filter((p) => p.categoria !== 'Vazio').length

  return (
    <div className="page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">VISÃO GERAL DO ESTOQUE</span>
          <h1>Mapa do Estoque</h1>
          <p>
            {atual
              ? `${atual.nome} · ${ocupadas} de ${posicoesDaEstrutura.length} posições ocupadas`
              : 'Visualize e registre a posição de cada peça'}
          </p>
        </div>
        <button
          className="btn primary desktop-new"
          onClick={() => {
            const vazia = primeiraVazia()
            if (vazia) setAlocarEm(vazia)
          }}
        >
          <Plus /> Nova Alocação
        </button>
      </header>

      <nav className="estrutura-tabs" aria-label="Estruturas do estoque">
        {estruturas.map((e) => (
          <button
            key={e.id}
            title={e.nome}
            className={cn('estrutura-tab', atual?.id === e.id && 'active')}
            onClick={() => setCodigo(e.codigo)}
          >
            {e.codigo}
          </button>
        ))}
      </nav>

      <div className="mapa-legend">
        {LEGENDA.map((l) => (
          <span key={l.label}>
            <i
              className={cn(
                'legend-swatch',
                `sw-${l.categoria === 'Confirmar' ? 'confirmar' : l.categoria}`,
              )}
            />
            {l.label}
          </span>
        ))}
      </div>

      <section className="filters">
        <label className="search-box">
          <Search />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por peça, máquina ou código..."
          />
        </label>
      </section>
      {buscando && enderecosQueCombinam && (
        <p className="map-busca-info">
          {enderecosQueCombinam.size
            ? `${enderecosQueCombinam.size} posição(ões) correspondem à busca — destacadas no mapa.`
            : 'Nenhuma posição corresponde à busca.'}
        </p>
      )}

      {carregando ? (
        <div className="loading-map">Carregando o mapa do estoque...</div>
      ) : (
        <section className="mapa-card">
          {atual && (
            <h2 className="mapa-titulo">
              {atual.codigo} <small>{atual.nome}</small>
            </h2>
          )}
          <div className="rack-scene">
            <div className="rack" key={atual?.id}>
              <span className="rack-post rack-post-esq" />
              <span className="rack-post rack-post-dir" />
              {[...niveis].reverse().map((nivel) => (
                <div className="rack-nivel" key={nivel}>
                  <div className="rack-nivel-conteudo">
                    <span className="rack-nivel-label">N{nivel}</span>
                    {emGrade(atual) ? (
                      <GradeNivel
                        lados={lados}
                        posicoesDoNivel={posicoesDaEstrutura.filter((p) => p.nivel === nivel)}
                        itensDaPosicao={itensAgrupados}
                        buscando={buscando}
                        enderecosQueCombinam={enderecosQueCombinam}
                        onAlocar={setAlocarEm}
                        onDetalhes={setDetalhesDe}
                      />
                    ) : (
                      <div className="rack-lados">
                        {lados
                          .map((lado) => ({
                            lado,
                            celulas: posicoesDaEstrutura
                              .filter((p) => p.nivel === nivel && p.lado === lado)
                              .sort((a, b) => a.posicao - b.posicao),
                          }))
                          .filter(({ celulas }) => celulas.length > 0)
                          .map(({ lado, celulas }) => (
                            <div className="rack-lado" key={lado}>
                              <span className="rack-lado-label">{lado}</span>
                              <div className="rack-slots">
                                {celulas.map((p) => {
                                  const qtdItens = itensPorPosicao.get(p.id) || 0
                                  const combina = enderecosQueCombinam?.has(p.endereco) || false
                                  if (p.categoria === 'Vazio')
                                    return (
                                      <button
                                        key={p.id}
                                        title={`${p.endereco} — posição vazia`}
                                        className={cn(
                                          'slot-vazio',
                                          buscando && (combina ? 'matched' : 'dimmed'),
                                        )}
                                        onClick={() => setAlocarEm(p)}
                                      >
                                        {p.posicao}
                                      </button>
                                    )
                                  return (
                                    <button
                                      key={p.id}
                                      title={`${p.endereco} — ${qtdItens} item(ns)`}
                                      className={cn(
                                        'caixa',
                                        `caixa-${p.categoria}`,
                                        p.qtd_confirmar && 'caixa-confirmar',
                                        buscando && (combina ? 'matched' : 'dimmed'),
                                      )}
                                      onClick={() => setDetalhesDe(p)}
                                    >
                                      <span className="caixa-topo" aria-hidden />
                                      <span className="caixa-lado" aria-hidden />
                                      <span className="caixa-fita" aria-hidden />
                                      <span className="caixa-etiqueta">
                                        {rotuloFace(itensAgrupados.get(p.id) || []) || p.endereco}
                                        {(itensAgrupados.get(p.id) || []).length > 1 && (
                                          <b className="caixa-extras">
                                            {' '}
                                            +{(itensAgrupados.get(p.id) || []).length - 1}
                                          </b>
                                        )}
                                      </span>
                                      {p.qtd_confirmar && <span className="caixa-alerta" />}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <div className="rack-prateleira" aria-hidden />
                </div>
              ))}
              <div className="rack-base" aria-hidden />
            </div>
          </div>
        </section>
      )}

      <PosicaoDetalhesDrawer posicao={alocarEm} alocar onClose={() => setAlocarEm(null)} />
      <PosicaoDetalhesDrawer posicao={detalhesDe} onClose={() => setDetalhesDe(null)} />
    </div>
  )
}
