import { useEffect, useState } from 'react'
import { CalendarPlus, ChevronDown, Download, Loader2 } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { useEstoque } from '@/contexts/EstoqueContext'
import { linhasCsv, linhasDoGrupo, useInventario } from '@/hooks/use-inventario'
import { baixarCsv, type LinhaInventario } from '@/lib/export-csv'
import { listarInventarios, registrarInventarioDoMes } from '@/services/inventarios'
import { precoTexto, type Inventario } from '@/types/estoque'

const nomeMes = (mes: string) => {
  const [ano, m] = mes.split('-').map(Number)
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

/** Linhas do snapshot gravado — v2 usa a lista agregada, v1 agrega na hora. */
const linhasDoMes = (inv: Inventario): LinhaInventario[] => linhasCsv(inv.snapshot?.grupos || [])

/** Seção do histórico mensal: grava o snapshot do mês e lista os meses salvos. */
export default function HistoricoMensal() {
  const { recarregar } = useEstoque()
  const { snapshot } = useInventario()
  const { toast } = useToast()
  const [inventarios, setInventarios] = useState<Inventario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [registrando, setRegistrando] = useState(false)

  const carregar = async () => {
    try {
      setInventarios(await listarInventarios())
    } catch {
      toast({ title: 'Não foi possível carregar o histórico mensal', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => {
    carregar()
  }, [])

  const registrar = async () => {
    setRegistrando(true)
    try {
      await registrarInventarioDoMes(snapshot())
      await carregar()
      await recarregar()
      toast({ title: 'Inventário do mês registrado', className: 'toast-success' })
    } catch {
      toast({ title: 'Não foi possível registrar o inventário', variant: 'destructive' })
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <section className="inv-historico">
      <header className="inv-historico-header">
        <div>
          <h2>Histórico mensal</h2>
          <p>
            Snapshots gravados mês a mês com a lista de itens (código, quantidade e preço) por
            modelo — regravar o mês atual atualiza o registro, meses anteriores são preservados.
          </p>
        </div>
        <button className="btn primary" disabled={registrando} onClick={registrar}>
          {registrando ? <Loader2 className="spin" /> : <CalendarPlus />}
          Registrar inventário do mês
        </button>
      </header>

      {carregando ? (
        <p className="inv-empty">Carregando histórico mensal...</p>
      ) : inventarios.length === 0 ? (
        <p className="inv-empty">Nenhum inventário gravado ainda — registre o primeiro mês.</p>
      ) : (
        <Accordion type="multiple" className="inv-acordeon">
          {inventarios.map((inv) => (
            <AccordionItem value={inv.id} key={inv.id}>
              <AccordionTrigger>
                <span className="inv-mes-trigger">
                  <strong>{nomeMes(inv.mes)}</strong>
                  <small>
                    {inv.total} peça(s) · {inv.snapshot?.grupos?.length || 0} máquina(s) · Valor
                    total:{' '}
                    {inv.snapshot?.totalValores != null
                      ? precoTexto(inv.snapshot.totalValores)
                      : '—'}
                  </small>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="inv-mes-listas">
                  {(inv.snapshot?.grupos || []).map((g) => {
                    const linhas = linhasDoGrupo(g)
                    return (
                      <div className="inv-mes-grupo" key={g.maquina}>
                        <header>
                          <strong>{g.maquina}</strong>
                          <span>
                            {g.totalItens} item(ns) · {g.somaQuantidades} un.
                            {g.somaValores ? ` · ${precoTexto(g.somaValores)}` : ''}
                          </span>
                        </header>
                        {linhas.length === 0 ? (
                          <span className="inv-mes-vazio">Nenhum item neste modelo.</span>
                        ) : (
                          <ul className="inv-mes-itens">
                            {linhas.map((l, idx) => (
                              <li key={`${l.codigo}-${idx}`}>
                                <span className="inv-mes-codigo">{l.codigo || '—'}</span>
                                <span className="inv-mes-qtd">
                                  {l.quantidade > 0
                                    ? l.pendentes > 0
                                      ? `${l.quantidade} (+${l.pendentes} a conf.)`
                                      : `${l.quantidade} un.`
                                    : 'a confirmar'}
                                </span>
                                <span className="inv-mes-preco">
                                  {l.precoCusto != null ? precoTexto(l.precoCusto) : '—'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  className="btn secondary"
                  onClick={() => baixarCsv(`inventario-${inv.mes}.csv`, linhasDoMes(inv))}
                >
                  <Download /> Baixar CSV deste mês
                </button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </section>
  )
}
