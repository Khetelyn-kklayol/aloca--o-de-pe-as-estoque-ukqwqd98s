import type { RecordModel } from 'pocketbase'

export type TipoMovimentacao = 'alocacao' | 'edicao' | 'movimentacao' | 'exclusao'
export type Categoria = 'Estoque' | 'Máquina' | 'Picking' | 'Vazio'

export interface Estrutura extends RecordModel {
  codigo: string
  nome: string
  lados: string[] // json field — pode vir como string
  ordem: number
  created: string
  updated: string
}

export interface Posicao extends RecordModel {
  endereco: string
  estrutura: string
  nivel: number
  lado: string
  posicao: number
  tamanho: string
  categoria: Categoria
  qtd_confirmar: boolean
  created: string
  updated: string
}

export interface Item extends RecordModel {
  posicao: string
  categoria: Exclude<Categoria, 'Vazio'>
  maquina: string
  peca: string
  codigo: string
  quantidade: number | null
  qtd_confirmar: boolean
  preco_custo: number | null
  created: string
  updated: string
}

export interface Movimentacao extends RecordModel {
  tipo: TipoMovimentacao
  posicao_origem?: string
  posicao_destino?: string
  nome_maquina: string
  nome_peca: string
  codigo_peca?: string
  quantidade: number
  observacao?: string
  usuario: string
  created: string
}

export interface ItemInventario {
  id: string
  estrutura: string
  endereco: string
  maquina: string
  peca: string
  codigo: string
  quantidade: number | null
  qtdConfirmar: boolean
  precoCusto: number | null
}

export interface GrupoInventario {
  maquina: string
  totalItens: number
  somaQuantidades: number
  somaValores: number
  itens: ItemInventario[]
  /** v2 do snapshot: itens agregados por código (modelo + código = SKU Bling). */
  lista?: LinhaCodigo[]
}

/** Linha do inventário agregada por código — mesmo código = uma linha, qtd somada. */
export interface LinhaCodigo {
  codigo: string
  /** Quantidade confirmada (linhas "a confirmar" não somam). */
  quantidade: number
  /** Quantas linhas deste código estão com quantidade "a confirmar". */
  pendentes: number
  precoCusto: number | null
  /** quantidade × precoCusto, quando há quantidade confirmada e preço. */
  valorTotal: number | null
}

export interface SnapshotInventario {
  /** 2 = grupos com lista agregada por código; ausente/1 = itens individuais (v1). */
  versao?: number
  total: number
  totalQuantidade: number
  /** Preço total em estoque no momento do snapshot (soma geral). */
  totalValores: number
  grupos: GrupoInventario[]
}

export interface Inventario extends RecordModel {
  mes: string // AAAA-MM
  total: number
  snapshot: SnapshotInventario | null // json field
  usuario: string
  created: string
  updated: string
}

/** Lados json: PocketBase pode devolver string ou array. */
export const ladosDaEstrutura = (e: Estrutura): string[] => {
  const raw = e.lados
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(String(raw))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Item com quantidade nula/0 exibe "a confirmar". */
export const qtdTexto = (item: Pick<Item, 'quantidade' | 'qtd_confirmar'>) =>
  item.qtd_confirmar || !item.quantidade ? 'a confirmar' : String(item.quantidade)

/** Formata um valor em reais (pt-BR); null/undefined → "—". */
export const precoTexto = (valor: number | null | undefined) =>
  valor == null ? '—' : valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
