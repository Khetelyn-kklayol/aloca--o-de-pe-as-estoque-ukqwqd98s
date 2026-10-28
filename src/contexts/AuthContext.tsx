import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

interface AuthContextValue {
  user: RecordModel | null
  ready: boolean
  login: (email: string, senha: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_, record) => setUser(record), true)
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setReady(true))
    } else {
      setReady(true)
    }
    return unsubscribe
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      login: async (email: string, senha: string) => {
        await pb.collection('users').authWithPassword(email, senha)
      },
      logout: () => pb.authStore.clear(),
    }),
    [user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
