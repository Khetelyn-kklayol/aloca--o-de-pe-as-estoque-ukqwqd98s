import { useCallback, useMemo, useState } from 'react'
import { useEstoque } from '@/contexts/EstoqueContext'
import type { GrupoInventario, ItemInventario, SnapshotInventario } from '@/types/estoque'
import type { LinhaInventario } from '@/lib/export-csv'

/** Máquina de exibição para itens sem máquina digitada. */
export const SEM_MAQUINA = 'Sem máquina'

const rotuloMaquina = (m: string) => (m.trim() ? m.trim() : SEM_MAQUINA)

const qtdDe = (i: ItemInventario) =>
  !i.qtdConfirmar && i.quantidade && i.quantidade > 0 ? i.quantidade : 0

const valorDe = (i: ItemInventario) => (i.precoCusto != null ? qtdDe(i) * i.precoCusto : 0)

const precoCsv = (p: number | null) => (p == null ? '—' : p.toFixed(2).replace('.', ','))
const valorCsv = (v: number) => (v ? v.toFixed(2).replace('.', ',') : '—')

/** Linhas planas na ordem dos grupos — base do CSV e da lista. */
export function linhasInventario(
  itens: ItemInventario[],
): { linha: LinhaInventario; maquina: string }[] {
  return itens.map((i) => ({
    linha: {
      Estrutura: i.estrutura,
      Endereço: i.endereco,
      Máquina: rotuloMaquina(i.maquina),
      Peça: i.peca,
      Código: i.codigo,
      Quantidade:
        i.quantidade && i.quantidade > 0 && !i.qtdConfirmar ? String(i.quantidade) : 'a confirmar',
      'Preço de custo': precoCsv(i.precoCusto),
      'Valor total': valorCsv(valorDe(i)),
    },
    maquina: rotuloMaquina(i.maquina),
  }))
}

/** Agrupa os itens por modelo de máquina (valor exato digitado), com contagens e valores. */
export function agruparPorMaquina(itens: ItemInventario[]): GrupoInventario[] {
  const ordem: string[] = []
  const grupos = new Map<string, GrupoInventario>()
  for (const i of itens) {
    const chave = rotuloMaquina(i.maquina)
    let g = grupos.get(chave)
    if (!g) {
      g = { maquina: chave, totalItens: 0, somaQuantidades: 0, somaValores: 0, itens: [] }
      grupos.set(chave, g)
      ordem.push(chave)
    }
    g.totalItens += 1
    g.somaQuantidades += qtdDe(i)
    g.somaValores += valorDe(i)
    g.itens.push({ ...i })
  }
  return ordem.map((k) => grupos.get(k)!) as GrupoInventario[]
}

/** Inventário completo: itens de todas as estruturas, com endereço resolvido. */
export function useInventario() {
  const { itens, posicoes, estruturas, movimentacoes, carregando, recarregar } = useEstoque()
  const [gerando, setGerando] = useState(false)

  const estruturasPorId = useMemo(
    () => new Map(estruturas.map((e) => [e.id, e.codigo])),
    [estruturas],
  )

  const itensInventario = useMemo(
    () =>
      itens.map((i) => {
        const pos = posicoes.find((p) => p.id === i.posicao)
        return {
          id: i.id,
          estrutura: pos ? estruturasPorId.get(pos.estrutura) || '' : '',
          endereco: pos?.endereco || '',
          maquina: i.maquina,
          peca: i.peca,
          codigo: i.codigo,
          quantidade: i.quantidade,
          qtdConfirmar: i.qtd_confirmar,
          precoCusto: i.preco_custo ?? null,
        }
      }),
    [itens, posicoes, estruturasPorId],
  )

  const grupos = useMemo(() => agruparPorMaquina(itensInventario), [itensInventario])

  const total = itensInventario.length
  const totalQuantidade = useMemo(
    () => itensInventario.reduce((s, i) => s + qtdDe(i), 0),
    [itensInventario],
  )
  /** Preço total em estoque: soma de quantidade × preço de custo de todos os itens. */
  const totalValores = useMemo(
    () => itensInventario.reduce((s, i) => s + valorDe(i), 0),
    [itensInventario],
  )

  const filtrar = useCallback(
    (termo: string) => {
      const t = termo.toLocaleLowerCase('pt-BR').trim()
      if (!t) return grupos
      return grupos
        .map((g) => {
          if (g.maquina.toLocaleLowerCase('pt-BR').includes(t)) return g
          const itensFiltrados = g.itens.filter((i) =>
            `${i.peca} ${i.codigo} ${i.maquina}`.toLocaleLowerCase('pt-BR').includes(t),
          )
          if (itensFiltrados.length === 0) return null
          return {
            ...g,
            itens: itensFiltrados,
            totalItens: itensFiltrados.length,
            somaQuantidades: itensFiltrados.reduce((s, i) => s + qtdDe(i), 0),
            somaValores: itensFiltrados.reduce((s, i) => s + valorDe(i), 0),
          }
        })
        .filter((g): g is GrupoInventario => g !== null)
    },
    [grupos],
  )

  /** Snapshot agregado para gravar no histórico mensal. */
  const snapshot = useCallback(
    (): SnapshotInventario => ({
      total,
      totalQuantidade,
      totalValores,
      grupos: grupos.map((g) => ({
        maquina: g.maquina,
        totalItens: g.totalItens,
        somaQuantidades: g.somaQuantidades,
        somaValores: g.somaValores,
        itens: g.itens.map(
          ({
            id,
            estrutura,
            endereco,
            maquina,
            peca,
            codigo,
            quantidade,
            qtdConfirmar,
            precoCusto,
          }) => ({
            id,
            estrutura,
            endereco,
            maquina,
            peca,
            codigo,
            quantidade,
            qtdConfirmar,
            precoCusto,
          }),
        ),
      })),
    }),
    [total, totalQuantidade, totalValores, grupos],
  )

  const quedasRecentes = useMemo(
    () => movimentacoes.filter((m) => (m.observacao || '').includes('Queda por gravidade')),
    [movimentacoes],
  )

  return {
    grupos,
    filtrar,
    total,
    totalQuantidade,
    totalValores,
    snapshot,
    gerando,
    setGerando,
    quedasRecentes,
    carregando,
    recarregar,
  }
}
