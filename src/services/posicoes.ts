import pb from '@/lib/pocketbase/client'
import type { Endereco, Posicao } from '@/types/estoque'

export interface PosicaoInput extends Endereco {
  nome_maquina: string
  nome_peca: string
  quantidade: number
}

export const listarPosicoes = () =>
  pb.collection<Posicao>('posicoes').getFullList({ sort: 'palete,posicao' })

export const criarPosicao = (data: PosicaoInput) =>
  pb.collection<Posicao>('posicoes').create({ ...data, usuario: pb.authStore.record?.id })

export const editarPosicao = (
  id: string,
  data: Pick<PosicaoInput, 'nome_maquina' | 'nome_peca' | 'quantidade'>,
) => pb.collection<Posicao>('posicoes').update(id, data)

export const excluirPosicao = (id: string) => pb.collection('posicoes').delete(id)

export async function moverPosicao(origem: Posicao, destino: Endereco) {
  const criada = await criarPosicao({
    ...destino,
    nome_maquina: origem.nome_maquina,
    nome_peca: origem.nome_peca,
    quantidade: origem.quantidade,
  })
  try {
    await excluirPosicao(origem.id)
  } catch (error) {
    await excluirPosicao(criada.id)
    throw error
  }
  return criada
}
