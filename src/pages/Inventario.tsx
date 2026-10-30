import { useMemo, useState } from 'react'
import { Banknote, Download, Loader2, PackageSearch, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useInventario } from '@/hooks/use-inventario'
import { baixarCsv } from '@/lib/export-csv'
import { precoTexto } from '@/types/estoque'
import HistoricoMensal from '@/components/HistoricoMensal'

export default function Inventario() {
  const { grupos, filtrar, total, totalQuantidade, totalValores, snapshot, carregando } =
    useInventario()
  const { toast } = useToast()
  const [busca, setBusca] = useState('')
  const [exportando, setExportando] = useState(false)

  const visiveis = useMemo(() => filtrar(busca), [filtrar, busca])

  const exportar = async () => {
    setExportando(true)
    try {
      const mes = new Date().toISOString().slice(0, 10)
      baixarCsv(
        `inventario-${mes}.csv`,
        visiveis.flatMap((g) =>
          g.itens.map((i) => ({
            Estrutura: i.estrutura,
            Endereço: i.endereco,
            Máquina: g.maquina,
            Peça: i.peca,
            Código: i.codigo,
            Quantidade:
              i.quantidade && i.quantidade > 0 && !i.qtdConfirmar
                ? String(i.quantidade)
                : 'a confirmar',
            'Preço de custo':
              i.precoCusto != null ? i.precoCusto.toFixed(2).replace('.', ',') : '—',
            'Valor total':
              i.precoCusto != null && i.quantidade && i.quantidade > 0 && !i.qtdConfirmar
                ? (i.quantidade * i.precoCusto).toFixed(2).replace('.', ',')
                : '—',
          })),
        ),
      )
      toast({
        title: 'CSV exportado',
        description: 'O arquivo foi baixado para a pasta de downloads.',
        className: 'toast-success',
      })
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="page fade-in">
      <header className="page-header">
        <div>
          <span className="eyebrow">VISÃO POR MODELO DE MÁQUINA</span>
          <h1>Inventário</h1>
          <p>
            {carregando
              ? 'Carregando peças...'
              : `${total} peça(s) · ${totalQuantidade} unidades · ${grupos.length} modelo(s) de máquina`}
          </p>
        </div>
        <button className="btn primary desktop-new" disabled={exportando} onClick={exportar}>
          {exportando ? <Loader2 className="spin" /> : <Download />} Exportar CSV
        </button>
      </header>

      {totalValores > 0 && (
        <section className="inv-total-hero">
          <Banknote />
          <div>
            <small>Preço total em estoque</small>
            <strong>{precoTexto(totalValores)}</strong>
          </div>
        </section>
      )}

      <section className="filters">
        <label className="search-box">
          <Search />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por peça, código ou máquina..."
          />
        </label>
      </section>

      {carregando ? (
        <p className="inv-empty">Carregando inventário...</p>
      ) : visiveis.length === 0 ? (
        <div className="inv-empty-card">
          <PackageSearch />
          <h3>Nenhuma peça encontrada</h3>
          <p>Ajuste a busca ou aloque itens no mapa do estoque.</p>
        </div>
      ) : (
        <section className="inv-grupos">
          {visiveis.map((g) => (
            <article className="inv-grupo" key={g.maquina}>
              <header className="inv-grupo-header">
                <h2>{g.maquina}</h2>
                <span className="inv-grupo-stats">
                  {g.totalItens} item(ns) · {g.somaQuantidades} un. ·{' '}
                  {g.somaValores > 0 ? precoTexto(g.somaValores) : '—'}
                </span>
              </header>
              <div className="inv-tabela-wrap">
                <table className="inv-tabela">
                  <thead>
                    <tr>
                      <th>Estrutura</th>
                      <th>Endereço</th>
                      <th>Peça</th>
                      <th>Código</th>
                      <th className="num">Qtd.</th>
                      <th className="num">Preço de custo</th>
                      <th className="num">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.itens.map((i) => {
                      const qtdOk = Boolean(i.quantidade && i.quantidade > 0 && !i.qtdConfirmar)
                      return (
                        <tr key={i.id}>
                          <td>{i.estrutura}</td>
                          <td>{i.endereco}</td>
                          <td>{i.peca}</td>
                          <td>{i.codigo}</td>
                          <td className="num">{qtdOk ? i.quantidade : 'a confirmar'}</td>
                          <td className="num">{precoTexto(i.precoCusto)}</td>
                          <td className="num">
                            {qtdOk && i.precoCusto != null
                              ? precoTexto(i.quantidade! * i.precoCusto)
                              : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          ))}
        </section>
      )}

      <HistoricoMensal />
    </div>
  )
}
