import type { RecordModel } from 'pocketbase'

export type TipoMovimentacao = 'alocacao' | 'edicao' | 'movimentacao' | 'exclusao'

export interface Posicao extends RecordModel {
  palete: string
  posicao: string
  nome_maquina: string
  nome_peca: string
  quantidade: number
  usuario: string
  created: string
  updated: string
}

export interface Movimentacao extends RecordModel {
  tipo: TipoMovimentacao
  posicao_origem?: string
  posicao_destino?: string
  nome_maquina: string
  nome_peca: string
  quantidade: number
  usuario: string
  created: string
}

export interface Endereco {
  palete: string
  posicao: string
}
