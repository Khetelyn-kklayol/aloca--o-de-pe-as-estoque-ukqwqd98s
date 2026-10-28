import pb from '@/lib/pocketbase/client'
import type { Movimentacao, Posicao, TipoMovimentacao } from '@/types/estoque'

export const listarMovimentacoes = () =>
  pb.collection<Movimentacao>('movimentacoes').getFullList({ sort: '-created' })

export function registrarMovimentacao(
  tipo: TipoMovimentacao,
  posicao: Pick<Posicao, 'nome_maquina' | 'nome_peca' | 'quantidade'>,
  posicao_origem?: string,
  posicao_destino?: string,
) {
  return pb.collection<Movimentacao>('movimentacoes').create({
    tipo,
    posicao_origem,
    posicao_destino,
    nome_maquina: posicao.nome_maquina,
    nome_peca: posicao.nome_peca,
    quantidade: posicao.quantidade,
    usuario: pb.authStore.record?.id,
  })
}
