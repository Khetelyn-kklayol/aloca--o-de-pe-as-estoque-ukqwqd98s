import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Edit3, MapPin, Package, Trash2, X } from 'lucide-react'
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
import { editarPosicao, excluirPosicao, moverPosicao, criarPosicao } from '@/services/posicoes'
import { registrarMovimentacao } from '@/services/movimentacoes'
import type { Endereco, Posicao } from '@/types/estoque'

type Mode = 'create' | 'details' | 'edit' | 'move'
interface Props {
  open: boolean
  onClose: () => void
  endereco: Endereco | null
  registro: Posicao | null
}
const labelEndereco = (endereco: Endereco) => `${endereco.palete} | ${endereco.posicao}`

export default function AllocationDrawer({ open, onClose, endereco, registro }: Props) {
  const { posicoes, movimentacoes, recarregar } = useEstoque()
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('create')
  const [maquina, setMaquina] = useState('')
  const [peca, setPeca] = useState('')
  const [quantidade, setQuantidade] = useState(1)
  const [destino, setDestino] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setMode(registro ? 'details' : 'create')
    setMaquina(registro?.nome_maquina || '')
    setPeca(registro?.nome_peca || '')
    setQuantidade(registro?.quantidade || 1)
    setDestino('')
    setErrors({})
  }, [open, registro])
  const vazias = useMemo(() => {
    const ocupadas = new Set(posicoes.map((p) => `${p.palete}|${p.posicao}`))
    return Array.from({ length: 4 }, (_, p) =>
      Array.from({ length: 8 }, (_, i) => ({
        palete: `Palete ${p + 1}`,
        posicao: `Posição ${i + 1}`,
      })),
    )
      .flat()
      .filter((e) => !ocupadas.has(`${e.palete}|${e.posicao}`))
  }, [posicoes])
  const recentes = useMemo(
    () =>
      registro
        ? movimentacoes
            .filter((m) => [m.posicao_origem, m.posicao_destino].includes(labelEndereco(registro)))
            .slice(0, 4)
        : [],
    [movimentacoes, registro],
  )
  if (!open || (!endereco && !registro)) return null
  const atual = registro ? { palete: registro.palete, posicao: registro.posicao } : endereco!

  const validate = () => {
    const next: Record<string, string> = {}
    if (!maquina.trim()) next.maquina = 'Informe o nome da máquina.'
    if (!peca.trim()) next.peca = 'Informe o nome ou código da peça.'
    if (!Number.isInteger(quantidade) || quantidade < 1)
      next.quantidade = 'A quantidade deve ser um número inteiro maior que zero.'
    setErrors(next)
    return !Object.keys(next).length
  }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (mode === 'edit' && registro) {
        const updated = await editarPosicao(registro.id, {
          nome_maquina: maquina.trim(),
          nome_peca: peca.trim(),
          quantidade,
        })
        await registrarMovimentacao('edicao', updated, labelEndereco(atual), labelEndereco(atual))
        toast({
          title: 'Alocação atualizada',
          description: 'As informações foram salvas com sucesso.',
          className: 'toast-success',
        })
      } else {
        const created = await criarPosicao({
          ...atual,
          nome_maquina: maquina.trim(),
          nome_peca: peca.trim(),
          quantidade,
        })
        await registrarMovimentacao('alocacao', created, undefined, labelEndereco(atual))
        toast({
          title: 'Alocação salva',
          description: `${labelEndereco(atual)} agora está ocupada.`,
          className: 'toast-success',
        })
      }
      await recarregar()
      onClose()
    } catch {
      toast({
        title: 'Não foi possível salvar',
        description: 'Verifique se a posição ainda está disponível.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }
  async function move() {
    if (!registro || !destino) return
    const [palete, posicao] = destino.split('|')
    setSaving(true)
    try {
      await moverPosicao(registro, { palete, posicao })
      await registrarMovimentacao(
        'movimentacao',
        registro,
        labelEndereco(registro),
        labelEndereco({ palete, posicao }),
      )
      await recarregar()
      toast({
        title: 'Peça movimentada',
        description: `Novo endereço: ${labelEndereco({ palete, posicao })}.`,
        className: 'toast-success',
      })
      onClose()
    } catch {
      toast({ title: 'Movimentação não concluída', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }
  async function remove() {
    if (!registro) return
    setSaving(true)
    try {
      await excluirPosicao(registro.id)
      await registrarMovimentacao('exclusao', registro, labelEndereco(registro))
      await recarregar()
      toast({
        title: 'Registro excluído',
        description: 'A posição está disponível novamente.',
        className: 'toast-success',
      })
      setConfirmDelete(false)
      onClose()
    } catch {
      toast({ title: 'Não foi possível excluir', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const form = (
    <form onSubmit={submit} className="drawer-body form-stack">
      <div className="address-box">
        <MapPin />{' '}
        <div>
          <small>Endereço da Peça</small>
          <strong>{labelEndereco(atual)}</strong>
        </div>
      </div>
      <label>
        Nome da Máquina
        <input
          className="field"
          value={maquina}
          onChange={(e) => setMaquina(e.target.value)}
          onBlur={validate}
          placeholder="ex.: Prensas, Misturador"
        />
        {errors.maquina && <small className="field-error">{errors.maquina}</small>}
      </label>
      <label>
        Nome/Código da Peça
        <input
          className="field"
          value={peca}
          onChange={(e) => setPeca(e.target.value)}
          onBlur={validate}
          placeholder="ex.: Correia V, Kit Válvula"
        />
        {errors.peca && <small className="field-error">{errors.peca}</small>}
      </label>
      <label>
        Quantidade
        <div className="quantity">
          <button type="button" onClick={() => setQuantidade(Math.max(1, quantidade - 1))}>
            −
          </button>
          <input
            className="field"
            type="number"
            min="1"
            step="1"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
          />
          <button type="button" onClick={() => setQuantidade(quantidade + 1)}>
            +
          </button>
        </div>
        {errors.quantidade && <small className="field-error">{errors.quantidade}</small>}
      </label>
      <div className="drawer-actions">
        <button className="btn primary wide" disabled={saving}>
          {saving ? 'Salvando...' : mode === 'edit' ? 'Salvar Alterações' : 'Salvar Alocação'}
        </button>
        <button className="btn secondary wide" type="button" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </form>
  )

  return (
    <>
      <button className="drawer-overlay" aria-label="Fechar painel" onClick={onClose} />
      <aside className="right-drawer">
        <header className="drawer-header">
          <div>
            <span className="eyebrow">CONTROLE DE ESTOQUE</span>
            <h2>
              {mode === 'details'
                ? 'Detalhes da Posição'
                : mode === 'edit'
                  ? 'Editar Alocação'
                  : mode === 'move'
                    ? 'Mover Peça'
                    : 'Nova Alocação'}
            </h2>
            <p>{labelEndereco(atual)}</p>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        {(mode === 'create' || mode === 'edit') && form}
        {mode === 'details' && registro && (
          <div className="drawer-body">
            <div className="detail-hero">
              <Package />
              <span className="quantity-badge">{registro.quantidade} un.</span>
              <small>Peça armazenada</small>
              <h3>{registro.nome_peca}</h3>
            </div>
            <dl className="details">
              <div>
                <dt>Máquina</dt>
                <dd>{registro.nome_maquina}</dd>
              </div>
              <div>
                <dt>Posição</dt>
                <dd>{labelEndereco(registro)}</dd>
              </div>
              <div>
                <dt>Quantidade</dt>
                <dd>{registro.quantidade} unidades</dd>
              </div>
            </dl>
            <div className="detail-buttons">
              <button className="btn secondary" onClick={() => setMode('edit')}>
                <Edit3 /> Editar
              </button>
              <button className="btn secondary" onClick={() => setMode('move')}>
                <ArrowRight /> Mover Peça
              </button>
            </div>
            <section className="recent">
              <h3>Últimas movimentações</h3>
              {recentes.length ? (
                recentes.map((m) => (
                  <div key={m.id}>
                    <span className="timeline-dot" />
                    <p>
                      <strong>{m.tipo}</strong>
                      <small>{new Date(m.created).toLocaleString('pt-BR')}</small>
                    </p>
                  </div>
                ))
              ) : (
                <p className="muted">Nenhuma movimentação registrada.</p>
              )}
            </section>
            <button className="btn danger-link" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> Excluir Registro
            </button>
            <button className="btn secondary wide" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
        {mode === 'move' && registro && (
          <div className="drawer-body form-stack">
            <div className="move-summary">
              <small>Você está movendo</small>
              <strong>{registro.nome_peca}</strong>
              <span>
                {registro.nome_maquina} · {registro.quantidade} un.
              </span>
            </div>
            <label>
              Selecione a posição de destino
              <select
                className="field"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
              >
                <option value="">Escolha uma posição vazia</option>
                {vazias.map((v) => (
                  <option key={`${v.palete}|${v.posicao}`} value={`${v.palete}|${v.posicao}`}>
                    {labelEndereco(v)}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary wide" disabled={!destino || saving} onClick={move}>
              {saving ? 'Movimentando...' : 'Confirmar Movimentação'}
            </button>
            <button className="btn secondary wide" onClick={() => setMode('details')}>
              Cancelar
            </button>
          </div>
        )}
      </aside>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              A posição ficará vazia e a exclusão será registrada no histórico. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="confirm-danger" onClick={remove}>
              Excluir registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
