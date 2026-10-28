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
import { listarMovimentacoes } from '@/services/movimentacoes'
import { listarPosicoes } from '@/services/posicoes'
import type { Movimentacao, Posicao } from '@/types/estoque'
import { useAuth } from './AuthContext'

interface EstoqueContextValue {
  posicoes: Posicao[]
  movimentacoes: Movimentacao[]
  carregando: boolean
  recarregar: () => Promise<void>
}

const EstoqueContext = createContext<EstoqueContextValue | null>(null)

export function EstoqueProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [posicoes, setPosicoes] = useState<Posicao[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!user) return
    const [novasPosicoes, novasMovimentacoes] = await Promise.all([
      listarPosicoes(),
      listarMovimentacoes(),
    ])
    setPosicoes(novasPosicoes)
    setMovimentacoes(novasMovimentacoes)
    setCarregando(false)
  }, [user])

  useEffect(() => {
    recarregar().catch(() => setCarregando(false))
  }, [recarregar])
  useRealtime<Posicao>(
    'posicoes',
    () => {
      recarregar().catch(() => undefined)
    },
    Boolean(user),
  )
  useRealtime<Movimentacao>(
    'movimentacoes',
    () => {
      recarregar().catch(() => undefined)
    },
    Boolean(user),
  )

  const value = useMemo(
    () => ({ posicoes, movimentacoes, carregando, recarregar }),
    [posicoes, movimentacoes, carregando, recarregar],
  )
  return <EstoqueContext.Provider value={value}>{children}</EstoqueContext.Provider>
}

export function useEstoque() {
  const context = useContext(EstoqueContext)
  if (!context) throw new Error('useEstoque deve ser usado dentro de EstoqueProvider')
  return context
}
