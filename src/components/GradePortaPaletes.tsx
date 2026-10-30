import { cn } from '@/lib/utils'
import type { Posicao } from '@/types/estoque'

interface Props {
  lados: string[]
  posicoesDoNivel: Posicao[]
  itensPorPosicao: Map<string, number>
  buscando: boolean
  enderecosQueCombinam: Set<string> | null
  onAlocar: (p: Posicao) => void
  onDetalhes: (p: Posicao) => void
}

/** Tom da grade conforme o lado: baixo = amarelo, cima = verde, demais = neutro. */
const tomDoLado = (lado: string) => (lado === 'Baixo' ? 'baixo' : lado === 'Cima' ? 'cima' : 'meio')

/**
 * Nível de porta-palete em grades 3×3 lado a lado (como no estoque físico):
 * cada célula é uma caixa numerada pelo último segmento do endereço
 * (PG1-N2-C5 → nível N2, lado Cima, caixa 5), amarelo = baixo, verde = cima.
 */
export default function GradeNivel({
  lados,
  posicoesDoNivel,
  itensPorPosicao,
  buscando,
  enderecosQueCombinam,
  onAlocar,
  onDetalhes,
}: Props) {
  return (
    <div className="grade-lados">
      {lados.map((lado) => {
        const celulas = posicoesDoNivel
          .filter((p) => p.lado === lado)
          .sort((a, b) => a.posicao - b.posicao)
        if (celulas.length === 0) return null
        const tom = tomDoLado(lado)
        return (
          <div className="grade-lado" key={lado}>
            <div className="grade-celulas">
              {celulas.map((p) => {
                const combina = enderecosQueCombinam?.has(p.endereco) || false
                const buscaCls = buscando ? (combina ? 'matched' : 'dimmed') : ''
                if (p.categoria === 'Vazio') {
                  return (
                    <button
                      key={p.id}
                      title={`${p.endereco} — posição vazia`}
                      className={cn('grade-celula', `grade-vazia-${tom}`, buscaCls)}
                      onClick={() => onAlocar(p)}
                    >
                      {p.posicao}
                    </button>
                  )
                }
                return (
                  <button
                    key={p.id}
                    title={`${p.endereco} — ${itensPorPosicao.get(p.id) || 0} item(ns)`}
                    className={cn(
                      'grade-celula grade-caixa',
                      `grade-caixa-${tom}`,
                      p.qtd_confirmar && 'caixa-confirmar',
                      buscaCls,
                    )}
                    onClick={() => onDetalhes(p)}
                  >
                    <span className="caixa-topo" aria-hidden />
                    {p.posicao}
                    {p.qtd_confirmar && <span className="caixa-alerta" aria-hidden />}
                  </button>
                )
              })}
            </div>
            <span className="grade-lado-caption">{lado.toLocaleLowerCase('pt-BR')}</span>
          </div>
        )
      })}
    </div>
  )
}
