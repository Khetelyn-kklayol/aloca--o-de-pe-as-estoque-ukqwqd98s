import { useMemo, useState } from 'react'
import { ArrowRightLeft, Edit3, MapPin, Package, PackagePlus, Trash2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useEstoque } from '@/contexts/EstoqueContext'
import ItemForm from '@/components/ItemForm'
import {
  aplicarGravidade,
  excluirItem,
  sincronizarPosicao,
  moverItem as moverItemSvc,
} from '@/services/itens'
import { registrarMovimentacao } from '@/services/movimentacoes'
import { qtdTexto, type Item, type Posicao } from '@/types/estoque'

interface Props {
  posicao: Posicao | null
  onClose: () => void
  /** Abre direto no formulário quando a posição está vazia (fluxo de nova alocação). */
  alocar?: boolean
}

type Modo = 'detalhes' | 'form' | 'mover'

/** Painel lateral com os detalhes de uma posição e a gestão dos seus itens. */
export default function PosicaoDetalhesDrawer({ posicao, onClose, alocar }: Props) {
  const { posicoes, itens, recarregar } = useEstoque()
  const { toast } = useToast()
  const [modo, setModo] = useState<Modo>(alocar ? 'form' : 'detalhes')
  const [itemEditando, setItemEditando] = useState<Item | null>(null)
  const [itemMovendo, setItemMovendo] = useState<Item | null>(null)
  const [itemExcluindo, setItemExcluindo] = useState<Item | null>(null)
  const [destino, setDestino] = useState('')

  const itensDaPosicao = useMemo(
    () => (posicao ? itens.filter((i) => i.posicao === posicao.id) : []),
    [itens, posicao],
  )
  const vazia = itensDaPosicao.length === 0

  if (!posicao) return null
  const fechado = () => {
    setModo('detalhes')
    setItemEditando(null)
    setItemMovendo(null)
    setItemExcluindo(null)
    onClose()
  }

  async function excluirConfirmado() {
    const item = itemExcluindo
    if (!posicao || !item) return
    try {
      await excluirItem(item.id)
      const restantes = itens.filter((i) => i.posicao === posicao.id && i.id !== item.id)
      await sincronizarPosicao(posicao, restantes)
      await registrarMovimentacao({
        tipo: 'exclusao',
        posicao_origem: posicao.endereco,
        maquina: item.maquina,
        peca: item.peca,
        codigo: item.codigo,
        quantidade: item.quantidade,
      })
      // Regra de gravidade nos porta-paletes: a pilha de cima desce em cascata.
      const resultado = await aplicarGravidade(posicao)
      await recarregar()
      toast({
        title: 'Item excluído',
        description: resultado.quedas.length
          ? `${item.peca} removido de ${posicao.endereco}. ${resultado.quedas.length} caixa(s) desceu(aram) por gravidade.`
          : `${item.peca} removido de ${posicao.endereco}.`,
        className: 'toast-success',
      })
    } catch {
      toast({ title: 'Não foi possível excluir o item', variant: 'destructive' })
    }
    setItemExcluindo(null)
  }

  async function moverConfirmado() {
    const item = itemMovendo
    if (!posicao || !item || !destino) return
    const alvo = posicoes.find((p) => p.endereco === destino)
    if (!alvo || alvo.id === posicao.id) {
      toast({ title: 'Escolha uma posição de destino diferente' })
      return
    }
    try {
      await moverItemSvc(item.id, alvo.id)
      const origemRestantes = itens.filter((i) => i.posicao === posicao.id && i.id !== item.id)
      await sincronizarPosicao(posicao, origemRestantes)
      const destinoAtuais = itens.filter((i) => i.posicao === alvo.id)
      await sincronizarPosicao(alvo, [...destinoAtuais, { ...item, posicao: alvo.id }])
      await registrarMovimentacao({
        tipo: 'movimentacao',
        posicao_origem: posicao.endereco,
        posicao_destino: alvo.endereco,
        maquina: item.maquina,
        peca: item.peca,
        codigo: item.codigo,
        quantidade: item.quantidade,
      })
      // Gravidade: se a origem ficou vazia, a pilha de cima desce em cascata.
      const resultado = await aplicarGravidade(posicao)
      await recarregar()
      toast({
        title: 'Item movido',
        description: resultado.quedas.length
          ? `${item.peca}: ${posicao.endereco} → ${alvo.endereco}. ${resultado.quedas.length} caixa(s) desceu(aram) por gravidade.`
          : `${item.peca}: ${posicao.endereco} → ${alvo.endereco}.`,
        className: 'toast-success',
      })
      setItemMovendo(null)
      fechado()
    } catch {
      toast({ title: 'Não foi possível mover o item', variant: 'destructive' })
    }
  }

  const abrindoForm = modo === 'form' && (alocar || vazia)

  return (
    <>
      <button className="drawer-overlay" aria-label="Fechar painel" onClick={fechado} />
      <aside className="right-drawer">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">{abrindoForm ? 'NOVA ALOCAÇÃO' : 'DETALHES DA POSIÇÃO'}</span>
            <h2>{posicao.endereco}</h2>
            <p>
              {abrindoForm
                ? 'Posição vazia — aloque um item'
                : `${posicao.categoria} · ${
                    vazia ? 'espaço disponível' : `${itensDaPosicao.length} item(ns)`
                  }`}
            </p>
          </div>
          <button aria-label="Fechar" onClick={fechado}>
            <X />
          </button>
        </header>

        {modo === 'form' && (alocar || vazia || itemEditando) ? (
          <ItemForm
            posicao={posicao}
            item={itemEditando || undefined}
            onConcluido={fechado}
            onCancel={() => {
              setModo('detalhes')
              setItemEditando(null)
            }}
          />
        ) : modo === 'form' ? (
          <div className="drawer-body">
            <button className="btn secondary wide" onClick={() => setModo('detalhes')}>
              Voltar aos detalhes
            </button>
          </div>
        ) : itemMovendo ? (
          <div className="drawer-body form-stack">
            <div className="address-box">
              <ArrowRightLeft />
              <div>
                <small>Movendo</small>
                <strong>{itemMovendo.peca}</strong>
              </div>
            </div>
            <label>
              Posição de destino
              <select
                className="field"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              >
                <option value="">Selecione a posição...</option>
                {posicoes
                  .filter((p) => p.id !== posicao.id)
                  .map((p) => (
                    <option key={p.id} value={p.endereco}>
                      {p.endereco}
                    </option>
                  ))}
              </select>
            </label>
            <div className="drawer-actions">
              <button className="btn primary wide" onClick={moverConfirmado} disabled={!destino}>
                Confirmar movimentação
              </button>
              <button className="btn secondary wide" onClick={() => setItemMovendo(null)}>
                Cancelar
              </button>
            </div>
          </div>
        ) : vazia ? (
          <div className="drawer-body">
            <div className="empty-slot-hero">
              <Package />
              <h3>Posição vazia — espaço disponível</h3>
              <p>Nenhum item alocado em {posicao.endereco}.</p>
              <ItemForm posicao={posicao} semEndereco onConcluido={fechado} onCancel={fechado} />
            </div>
          </div>
        ) : (
          <div className="drawer-body">
            <div className="address-box">
              <MapPin />
              <div>
                <small>Endereço da posição</small>
                <strong>{posicao.endereco}</strong>
              </div>
            </div>

            <div className="itens-lista">
              {itensDaPosicao.map((item) => (
                <article className="item-card" key={item.id}>
                  <div className="item-card-top">
                    <strong>{item.peca}</strong>
                    <span className="item-qtd">{qtdTexto(item)}</span>
                  </div>
                  <p className="item-meta">
                    {item.maquina ? `${item.maquina} · ` : ''}
                    {item.codigo || 'sem código'} · {item.categoria}
                  </p>
                  <div className="item-actions">
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setItemEditando(item)
                        setModo('form')
                      }}
                    >
                      <Edit3 /> Editar
                    </button>
                    <button className="btn secondary" onClick={() => setItemMovendo(item)}>
                      <ArrowRightLeft /> Mover
                    </button>
                    <button className="btn secondary" onClick={() => setItemExcluindo(item)}>
                      <Trash2 /> Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <div className="drawer-actions">
              <button
                className="btn primary wide"
                onClick={() => {
                  setItemEditando(null)
                  setModo('form')
                }}
              >
                <PackagePlus /> Adicionar item a esta posição
              </button>
            </div>
          </div>
        )}
      </aside>

      <AlertDialog
        open={Boolean(itemExcluindo)}
        onOpenChange={(o) => setItemExcluindo(o ? itemExcluindo : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este item?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemExcluindo?.peca} será removido de {posicao.endereco} e a exclusão será registrada
              no histórico. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="confirm-danger" onClick={excluirConfirmado}>
              Excluir item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
