import pb from '@/lib/pocketbase/client'
import type { Estrutura, Item, Posicao } from '@/types/estoque'
import { ladosDaEstrutura } from '@/types/estoque'

export const listarEstruturas = () =>
  pb.collection<Estrutura>('estruturas').getFullList({ sort: 'ordem' })

export const listarPosicoes = () =>
  pb.collection<Posicao>('posicoes').getFullList({ sort: 'endereco' })

export const listarItens = () => pb.collection<Item>('itens').getFullList({ sort: 'created' })

/** Normaliza a lista de lados lida do campo json. */
export const ladosOrdenados = (estrutura: Estrutura) => ladosDaEstrutura(estrutura)
