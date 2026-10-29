import pb from '@/lib/pocketbase/client'
import type { Movimentacao, TipoMovimentacao } from '@/types/estoque'

export interface MovimentacaoInput {
  tipo: TipoMovimentacao
  posicao_origem?: string
  posicao_destino?: string
  maquina?: string
  peca: string
  codigo?: string
  quantidade?: number | null
}

export const listarMovimentacoes = () =>
  pb.collection<Movimentacao>('movimentacoes').getFullList({ sort: '-created' })

export function registrarMovimentacao(data: MovimentacaoInput) {
  return pb.collection<Movimentacao>('movimentacoes').create({
    tipo: data.tipo,
    posicao_origem: data.posicao_origem,
    posicao_destino: data.posicao_destino,
    nome_maquina: data.maquina || '',
    nome_peca: data.peca,
    codigo_peca: data.codigo || '',
    quantidade: data.quantidade ?? 0,
    usuario: pb.authStore.record?.id,
  })
}
