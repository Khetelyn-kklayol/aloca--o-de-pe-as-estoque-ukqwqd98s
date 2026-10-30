import { useCallback, useMemo, useState } from 'react'
import { useEstoque } from '@/contexts/EstoqueContext'
import type {
  GrupoInventario,
  ItemInventario,
  LinhaCodigo,
  SnapshotInventario,
} from '@/types/estoque'
import type { LinhaInventario } from '@/lib/export-csv'

/** Máquina de exibição para itens sem máquina digitada. */
export const SEM_MAQUINA = 'Sem máquina'

const rotuloMaquina = (m: string) => (m.trim() ? m.trim() : SEM_MAQUINA)

const qtdDe = (i: ItemInventario) =>
  !i.qtdConfirmar && i.quantidade && i.quantidade > 0 ? i.quantidade : 0

const valorDe = (i: ItemInventario) => (i.precoCusto != null ? qtdDe(i) * i.precoCusto : 0)

const precoCsv = (p: number | null) => (p == null ? '—' : p.toFixed(2).replace('.', ','))
const valorCsv = (v: number | null) => (v ? v.toFixed(2).replace('.', ',') : '—')

/** Texto da quantidade agregada: soma confirmada + nota de pendências. */
export function qtdAgregadaTexto(l: Pick<LinhaCodigo, 'quantidade' | 'pendentes'>) {
  if (l.quantidade > 0)
    return l.pendentes > 0 ? `${l.quantidade} (+${l.pendentes} a conf.)` : String(l.quantidade)
  return l.pendentes > 0 ? 'a confirmar' : '0'
}

/** Agrega linhas de item por código — mesmo código na mesma máquina = uma linha. */
export function agregarPorCodigo(
  itens: Pick<ItemInventario, 'codigo' | 'quantidade' | 'qtdConfirmar' | 'precoCusto'>[],
): LinhaCodigo[] {
  const ordem: string[] = []
  const porCodigo = new Map<string, LinhaCodigo>()
  for (const i of itens) {
    const chave = i.codigo.trim().toLocaleLowerCase('pt-BR')
    const rotulo = i.codigo.trim()
    let l = porCodigo.get(chave)
    if (!l) {
      l = { codigo: rotulo, quantidade: 0, pendentes: 0, precoCusto: null, valorTotal: null }
      porCodigo.set(chave, l)
      ordem.push(chave)
    } else if (rotulo && !l.codigo) {
      l.codigo = rotulo
    }
    if (i.qtdConfirmar || !i.quantidade || i.quantidade <= 0) l.pendentes += 1
    else l.quantidade += i.quantidade
    if (l.precoCusto == null && i.precoCusto != null) l.precoCusto = i.precoCusto
  }
  return ordem.map((k) => {
    const l = porCodigo.get(k)!
    l.valorTotal = l.precoCusto != null && l.quantidade > 0 ? l.quantidade * l.precoCusto : null
    return l
  })
}

/**
 * Linhas de um grupo: snapshots v2 já gravam a lista agregada ("lista");
 * snapshots v1 agregam na hora a partir dos itens individuais.
 */
export function linhasDoGrupo(g: GrupoInventario): LinhaCodigo[] {
  if (g.lista && g.lista.length > 0) return g.lista.map((l) => ({ ...l }))
  return agregarPorCodigo(g.itens || [])
}

/** Linhas planas (uma por código/máquina) na ordem dos grupos — base do CSV. */
export function linhasCsv(grupos: GrupoInventario[]): LinhaInventario[] {
  return grupos.flatMap((g) =>
    linhasDoGrupo(g).map((l) => ({
      Modelo: g.maquina,
      Código: l.codigo || '—',
      Quantidade: qtdAgregadaTexto(l),
      'Preço de custo': precoCsv(l.precoCusto),
      'Valor total': valorCsv(l.valorTotal),
    })),
  )
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

  /**
   * Snapshot v2 para gravar no histórico mensal: totais + a LISTA de itens por
   * máquina agregada por código (modelo, código — futuro SKU do Bling —,
   * quantidade e preço de custo). Regravar o mês substitui o registro inteiro.
   */
  const snapshot = useCallback(
    (): SnapshotInventario => ({
      versao: 2,
      total,
      totalQuantidade,
      totalValores,
      grupos: grupos.map((g) => ({
        maquina: g.maquina,
        totalItens: g.totalItens,
        somaQuantidades: g.somaQuantidades,
        somaValores: g.somaValores,
        itens: [],
        lista: agregarPorCodigo(g.itens),
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
