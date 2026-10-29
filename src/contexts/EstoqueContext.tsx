import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { listarEstruturas, listarItens, listarPosicoes } from '@/services/estruturas'
import { listarMovimentacoes } from '@/services/movimentacoes'
import type { Estrutura, Item, Movimentacao, Posicao } from '@/types/estoque'
import { useAuth } from './AuthContext'

interface EstoqueContextValue {
  estruturas: Estrutura[]
  posicoes: Posicao[]
  itens: Item[]
  movimentacoes: Movimentacao[]
  carregando: boolean
  recarregar: () => Promise<void>
}

const EstoqueContext = createContext<EstoqueContextValue | null>(null)

export function EstoqueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [estruturas, setEstruturas] = useState<Estrutura[]>([])
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [itens, setItens] = useState<Item[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!user) return
    const [novasEstruturas, novasPosicoes, novosItens, novasMovimentacoes] = await Promise.all([
      listarEstruturas(),
      listarPosicoes(),
      listarItens(),
      listarMovimentacoes(),
    ])
    setEstruturas(novasEstruturas)
    setPosicoes(novasPosicoes)
    setItens(novosItens)
    setMovimentacoes(novasMovimentacoes)
    setCarregando(false)
  }, [user])

  useEffect(() => {
    recarregar().catch(() => setCarregando(false))
  }, [recarregar])

  const aoMudar = useCallback(() => {
    recarregar().catch(() => undefined)
  }, [recarregar])
  useRealtime<Estrutura>('estruturas', aoMudar, Boolean(user))
  useRealtime<Posicao>('posicoes', aoMudar, Boolean(user))
  useRealtime<Item>('itens', aoMudar, Boolean(user))
  useRealtime<Movimentacao>('movimentacoes', aoMudar, Boolean(user))

  const value = useMemo(
    () => ({ estruturas, posicoes, itens, movimentacoes, carregando, recarregar }),
    [estruturas, posicoes, itens, movimentacoes, carregando, recarregar],
  )
  return <EstoqueContext.Provider value={value}>{children}</EstoqueContext.Provider>
}

export function useEstoque() {
  const context = useContext(EstoqueContext)
  if (!context) throw new Error('useEstoque deve ser usado dentro de EstoqueProvider')
  return context
}
