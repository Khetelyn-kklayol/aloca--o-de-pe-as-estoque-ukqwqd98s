import pb from '@/lib/pocketbase/client'
import type { Item, Posicao } from '@/types/estoque'

export interface ItemInput {
  categoria: 'Estoque' | 'Máquina' | 'Picking'
  maquina: string
  peca: string
  codigo: string
  quantidade: number | null
  qtd_confirmar: boolean
}

export const criarItem = (posicaoId: string, data: ItemInput) =>
  pb.collection<Item>('itens').create({ ...data, posicao: posicaoId })

export const editarItem = (id: string, data: ItemInput) =>
  pb.collection<Item>('itens').update(id, data)

export const excluirItem = (id: string) => pb.collection('itens').delete(id)

export const moverItem = (itemId: string, destinoPosicaoId: string) =>
  pb.collection<Item>('itens').update(itemId, { posicao: destinoPosicaoId })

/** Recalcula categoria e o ponto de "qtd a confirmar" de uma posição após cada alteração. */
export async function sincronizarPosicao(posicao: Posicao, itensRestantes: Item[]) {
  const categoria = itensRestantes.length
    ? itensRestantes[0].categoria
    : posicao.categoria === 'Vazio'
      ? 'Vazio'
      : posicao.categoria
  const qtdConfirmar = itensRestantes.some((i) => i.qtd_confirmar)
  return pb
    .collection<Posicao>('posicoes')
    .update(posicao.id, { categoria, qtd_confirmar: qtdConfirmar })
}
