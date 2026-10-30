import pb from '@/lib/pocketbase/client'
import type { Inventario, SnapshotInventario } from '@/types/estoque'

export const listarInventarios = () =>
  pb.collection<Inventario>('inventarios').getFullList({ sort: '-mes' })

/**
 * Registra (ou regrava) o snapshot do inventário do mês corrente (AAAA-MM).
 * A chave única por mês faz o mesmo mês ser atualizado, nunca duplicado;
 * meses anteriores são preservados.
 */
export async function registrarInventarioDoMes(snapshot: SnapshotInventario) {
  const mes = new Date().toISOString().slice(0, 7)
  const existentes = await pb
    .collection<Inventario>('inventarios')
    .getList<Inventario>(1, 1, { filter: `mes = "${mes}"` })
  const dados = {
    mes,
    total: snapshot.total,
    snapshot,
    usuario: pb.authStore.record?.id,
  }
  if (existentes.items.length > 0) {
    return pb.collection<Inventario>('inventarios').update(existentes.items[0].id, dados)
  }
  return pb.collection<Inventario>('inventarios').create(dados)
}
