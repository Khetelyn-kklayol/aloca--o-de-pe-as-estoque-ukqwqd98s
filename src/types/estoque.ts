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
  usuario: string
  created: string
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
