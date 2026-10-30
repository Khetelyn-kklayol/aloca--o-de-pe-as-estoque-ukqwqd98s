import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useEstoque } from '@/contexts/EstoqueContext'
import { listarItens, listarPosicoes } from '@/services/estruturas'
import {
  criarItem,
  editarItem,
  precoConhecido,
  propagarPreco,
  sincronizarPosicao,
  type ItemInput,
} from '@/services/itens'
import { registrarMovimentacao } from '@/services/movimentacoes'
import type { Item, Posicao } from '@/types/estoque'

interface Props {
  posicao: Posicao
  item?: Item
  onConcluido: () => void
  onCancel: () => void
  /** Esconde o cabeçalho de endereço (usado quando já exibido acima). */
  semEndereco?: boolean
}

type CategoriaInput = ItemInput['categoria']

/** Texto "1234,56" → 1234.56 (aceita ponto ou vírgula como decimal). */
const parsePreco = (t: string): number | null => {
  const t2 = t.trim().replace(/\s|R\$/gi, '')
  if (!t2) return null
  // Remove separadores de milhar (pontos em pt-BR) e usa vírgula como decimal.
  const limpo = t2.includes(',') ? t2.replace(/\./g, '').replace(',', '.') : t2
  const v = Number(limpo)
  return Number.isFinite(v) && v >= 0 ? v : null
}

/** Formulário de alocação/edição de um item em uma posição, com aba de preço. */
export default function ItemForm({ posicao, item, onConcluido, onCancel, semEndereco }: Props) {
  const { recarregar, itens } = useEstoque()
  const { toast } = useToast()
  const [categoria, setCategoria] = useState<CategoriaInput>(
    (posicao.categoria === 'Vazio' ? 'Estoque' : posicao.categoria) as CategoriaInput,
  )
  const [maquina, setMaquina] = useState(item?.maquina || '')
  const [peca, setPeca] = useState(item?.peca || '')
  const [codigo, setCodigo] = useState(item?.codigo || '')
  const [qtdTexto, setQtdTexto] = useState(
    item && !item.qtd_confirmar ? String(item.quantidade ?? '') : '',
  )
  const [precoTexto, setPrecoTexto] = useState(
    item?.preco_custo != null ? String(item.preco_custo).replace('.', ',') : '',
  )
  const [confirmarQtd, setConfirmarQtd] = useState(item?.qtd_confirmar || false)
  const [saving, setSaving] = useState(false)

  const precoAtual = parsePreco(precoTexto)

  // Auto-preenchimento: ao digitar nome/código de peça que já existe no estoque,
  // sugere o preço cadastrado mais recente — só quando o campo está vazio.
  useEffect(() => {
    if (precoTexto.trim()) return
    const conhecido = precoConhecido(itens, peca, codigo)
    if (conhecido != null) setPrecoTexto(String(conhecido).replace('.', ','))
  }, [peca, codigo]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!peca.trim()) {
      toast({ title: 'Informe o nome da peça', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const semQtd = confirmarQtd || qtdTexto.trim() === ''
      const dados: ItemInput = {
        categoria,
        maquina: maquina.trim(),
        peca: peca.trim(),
        codigo: codigo.trim(),
        quantidade: semQtd ? null : Number(qtdTexto),
        qtd_confirmar: semQtd,
        preco_custo: parsePreco(precoTexto),
      }
      if (item) {
        await editarItem(item.id, dados)
        await propagarPreco(dados, item.id)
      } else {
        await criarItem(posicao.id, dados)
        await propagarPreco(dados)
      }
      // Recalcula categoria/ponto amarelo da posição com os itens atuais.
      const [todosItens, todasPosicoes] = await Promise.all([listarItens(), listarPosicoes()])
      const atual = todasPosicoes.find((p) => p.id === posicao.id)
      if (atual) {
        await sincronizarPosicao(
          atual,
          todosItens.filter((i) => i.posicao === posicao.id),
        )
      }
      await registrarMovimentacao({
        tipo: item ? 'edicao' : 'alocacao',
        posicao_origem: posicao.endereco,
        posicao_destino: posicao.endereco,
        maquina: dados.maquina,
        peca: dados.peca,
        codigo: dados.codigo,
        quantidade: dados.quantidade,
      })
      await recarregar()
      toast({
        title: item ? 'Item atualizado' : 'Item alocado',
        description: `${dados.peca} em ${posicao.endereco}.`,
        className: 'toast-success',
      })
      onConcluido()
    } catch {
      toast({ title: 'Não foi possível salvar o item', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="drawer-body form-stack">
      {!semEndereco && (
        <div className="address-box">
          <MapPin />
          <div>
            <small>{item ? 'Editando item em' : 'Endereço da peça'}</small>
            <strong>{posicao.endereco}</strong>
          </div>
        </div>
      )}
      <Tabs defaultValue="identificacao">
        <TabsList>
          <TabsTrigger value="identificacao">Peça</TabsTrigger>
          <TabsTrigger value="preco">Preço de custo</TabsTrigger>
        </TabsList>
        <TabsContent value="identificacao" className="form-stack">
          <label>
            Categoria
            <select
              className="field"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaInput)}
            >
              <option value="Estoque">Estoque</option>
              <option value="Máquina">Máquina</option>
              <option value="Picking">Picking</option>
            </select>
          </label>
          <label>
            Nome da Máquina
            <input
              className="field"
              value={maquina}
              onChange={(e) => setMaquina(e.target.value)}
              placeholder="ex.: Wind Deluxe, Aerosol"
            />
          </label>
          <label>
            Nome da Peça
            <input
              className="field"
              value={peca}
              onChange={(e) => setPeca(e.target.value)}
              placeholder="ex.: Bomba Wind Deluxe"
            />
          </label>
          <label>
            Código da Peça
            <input
              className="field"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="ex.: AT-347"
            />
          </label>
          <label>
            Quantidade
            <input
              className="field"
              type="number"
              min="0"
              value={qtdTexto}
              onChange={(e) => setQtdTexto(e.target.value)}
              disabled={confirmarQtd}
              placeholder="em branco = a confirmar"
            />
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={confirmarQtd}
              onChange={(e) => setConfirmarQtd(e.target.checked)}
            />
            Quantidade a confirmar
          </label>
        </TabsContent>
        <TabsContent value="preco" className="form-stack">
          <label>
            Preço de custo da peça (R$)
            <input
              className="field"
              inputMode="decimal"
              value={precoTexto}
              onChange={(e) => setPrecoTexto(e.target.value)}
              placeholder="ex.: 49,90 — vazio = sem preço"
            />
          </label>
          <p className="form-hint">
            {precoAtual != null ? (
              <>
                Preço registrado:{' '}
                <strong>
                  {precoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </strong>
                . Ao salvar, o preço é aplicado a todos os itens da mesma peça (mesmo código) e
                registrado no histórico.
              </>
            ) : (
              'Informe um preço de custo para vê-lo no inventário e no valor total em estoque. Peças já cadastradas preenchem automaticamente.'
            )}
          </p>
        </TabsContent>
      </Tabs>
      <div className="drawer-actions">
        <button className="btn primary wide" disabled={saving}>
          {saving ? 'Salvando...' : item ? 'Salvar Alterações' : 'Salvar Alocação'}
        </button>
        <button className="btn secondary wide" type="button" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
