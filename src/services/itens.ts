import pb from '@/lib/pocketbase/client'
import { registrarMovimentacao } from '@/services/movimentacoes'
import type { Item, Posicao } from '@/types/estoque'

export interface ItemInput {
  categoria: 'Estoque' | 'Máquina' | 'Picking'
  maquina: string
  peca: string
  codigo: string
  quantidade: number | null
  qtd_confirmar: boolean
  preco_custo: number | null
}

export const criarItem = (posicaoId: string, data: ItemInput) =>
  pb.collection<Item>('itens').create({ ...data, posicao: posicaoId })

export const editarItem = (id: string, data: ItemInput) =>
  pb.collection<Item>('itens').update(id, data)

export const excluirItem = (id: string) => pb.collection('itens').delete(id)

export const moverItem = (itemId: string, destinoPosicaoId: string) =>
  pb.collection<Item>('itens').update(itemId, { posicao: destinoPosicaoId })

/** Estruturas com regra de gravidade (porta-paletes). PR1/PR2 são prateleiras e ficam de fora. */
const ESTRUTURAS_COM_GRAVIDADE = new Set(['PG1', 'PG2', 'PG3', 'PP1', 'PP2'])

export const aplicaGravidade = (codigoEstrutura: string) =>
  ESTRUTURAS_COM_GRAVIDADE.has(codigoEstrutura)

/** Endereço da posição no mesmo lado, um nível abaixo. Ex.: PG1-N3-B4 → PG1-N2-B4. */
export const enderecoNivelAbaixo = (endereco: string) =>
  endereco.replace(/-N(\d+)-/, (_, n: string) => `-N${Number(n) - 1}-`)

/**
 * Preço de custo conhecido de uma peça: é atributo da PEÇA (mesma peça/código =
 * mesmo preço em todo o estoque). Procura primeiro pelo código exato; sem
 * código, pelo nome exato; usa o preço do registro mais recente encontrado.
 */
export function precoConhecido(itens: Item[], peca: string, codigo: string): number | null {
  const nome = peca.trim().toLocaleLowerCase('pt-BR')
  const cod = codigo.trim().toLocaleLowerCase('pt-BR')
  if (!nome && !cod) return null
  const candidatos = itens
    .filter((i) => i.preco_custo != null)
    .filter((i) =>
      cod
        ? (i.codigo || '').trim().toLocaleLowerCase('pt-BR') === cod
        : i.peca.trim().toLocaleLowerCase('pt-BR') === nome,
    )
    .sort((a, b) => (a.updated < b.updated ? 1 : -1))
  return candidatos[0]?.preco_custo ?? null
}

/** Quantos itens distintos da mesma peça já têm preço cadastrado. */
const itensMesmaPeca = (itens: Item[], peca: string, codigo: string) => {
  const nome = peca.trim().toLocaleLowerCase('pt-BR')
  const cod = codigo.trim().toLocaleLowerCase('pt-BR')
  return itens.filter(
    (i) =>
      (cod
        ? (i.codigo || '').trim().toLocaleLowerCase('pt-BR') === cod
        : i.peca.trim().toLocaleLowerCase('pt-BR') === nome) && i.preco_custo != null,
  )
}

/**
 * Propaga o preço da peça aos demais itens da MESMA peça (mesmo código; sem
 * código, mesmo nome exato) e registra a alteração no histórico. Nada é feito
 * quando o preço ficou vazio ou não mudou.
 */
export async function propagarPreco(dados: ItemInput, idAlterado?: string) {
  const preco = dados.preco_custo
  if (preco == null) return 0
  const todos = await pb.collection<Item>('itens').getFullList({ sort: 'updated' })
  const anteriores = itensMesmaPeca(todos, dados.peca, dados.codigo)
  const atual = anteriores.find((i) => i.id === idAlterado)
  const precoAnterior = atual?.preco_custo ?? anteriores[0]?.preco_custo ?? null
  if (anteriores.length && precoAnterior != null && precoAnterior === preco) return 0

  const alvo = anteriores.filter((i) => i.id !== idAlterado)
  for (const i of alvo) {
    await pb.collection<Item>('itens').update(i.id, { preco_custo: preco })
  }
  await registrarMovimentacao({
    tipo: 'edicao',
    peca: dados.peca,
    codigo: dados.codigo,
    quantidade: dados.quantidade,
    observacao: `Preço de custo atualizado para ${preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })} — ${alvo.length + (idAlterado ? 1 : 0)} item(ns) da mesma peça`,
  })
  return alvo.length
}

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

export interface QuedaRegistrada {
  peca: string
  de: string
  para: string
}

export interface ResultadoGravidade {
  quedas: QuedaRegistrada[]
  erro?: string
}

/**
 * Regra de gravidade nos porta-paletes (PG1/PG2/PG3/PP1/PP2): nenhuma caixa
 * pode ficar "flutuando". Ao esvaziar um endereço, a pilha do nível de cima
 * desce uma posição (N-1, mesmo lado), em cascata, e cada descida é registrada
 * no histórico como movimentação com a observação "Queda por gravidade...".
 *
 * Executada DEPOIS que a posição ficou vazia (exclusão, movimentação etc.).
 */
export async function aplicarGravidade(posicaoVazia: Posicao): Promise<ResultadoGravidade> {
  const quedas: QuedaRegistrada[] = []
  const codigo = posicaoVazia.endereco.split('-')[0]
  if (!aplicaGravidade(codigo)) return { quedas }

  const [posicoes, itens] = await Promise.all([
    pb.collection<Posicao>('posicoes').getFullList({ sort: 'endereco' }),
    pb.collection<Item>('itens').getFullList({ sort: 'created' }),
  ])
  const porEndereco = new Map(posicoes.map((p) => [p.endereco, p]))
  const itensPorPosicao = new Map<string, Item[]>()
  for (const i of itens) {
    const lista = itensPorPosicao.get(i.posicao) || []
    lista.push(i)
    itensPorPosicao.set(i.posicao, lista)
  }

  // Desce em cascata enquanto a posição abaixo está vazia e a de cima ocupada.
  let endereco = posicaoVazia.endereco
  for (let profundidade = 0; profundidade < 20; profundidade++) {
    const abaixoEnd = enderecoNivelAbaixo(endereco)
    const abaixo = porEndereco.get(abaixoEnd)
    const atual = porEndereco.get(endereco)
    if (!abaixo || !atual) break

    const itensAbaixo = itensPorPosicao.get(abaixo.id) || []
    if (itensAbaixo.length > 0) break // embaixo já tem caixa — pilha ok

    const itensAcima = itensPorPosicao.get(atual.id) || []
    if (itensAcima.length === 0) break // nada acima para descer

    // Toda a pilha da posição de cima desce junto, na mesma ordem.
    const primeira = itensAcima[0]
    for (const item of itensAcima) await moverItem(item.id, abaixo.id)
    const descidos = itensAcima.map((i) => ({ ...i, posicao: abaixo.id }))
    await sincronizarPosicao(abaixo, descidos)
    await sincronizarPosicao(atual, [])
    await registrarMovimentacao({
      tipo: 'movimentacao',
      posicao_origem: atual.endereco,
      posicao_destino: abaixo.endereco,
      maquina: primeira.maquina,
      peca: primeira.peca,
      codigo: primeira.codigo,
      quantidade: primeira.quantidade,
      observacao: `Queda por gravidade — remoção em ${posicaoVazia.endereco}`,
    })
    itensPorPosicao.set(abaixo.id, descidos)
    itensPorPosicao.set(atual.id, [])
    quedas.push({ peca: primeira.peca, de: atual.endereco, para: abaixo.endereco })
    endereco = abaixoEnd
  }

  return { quedas }
}
