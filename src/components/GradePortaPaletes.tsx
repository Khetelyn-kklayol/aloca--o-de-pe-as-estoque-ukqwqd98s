import { cn } from '@/lib/utils'
import type { Item, Posicao } from '@/types/estoque'

interface Props {
  lados: string[]
  posicoesDoNivel: Posicao[]
  /** Itens alocados em cada posição (chave = id da posição). */
  itensDaPosicao: Map<string, Item[]>
  buscando: boolean
  enderecosQueCombinam: Set<string> | null
  onAlocar: (p: Posicao) => void
  onDetalhes: (p: Posicao) => void
}

/** Rótulo da face da caixa: "MODELO - CÓDIGO" do primeiro item (ex.: SOFT 3 - AT-64). */
export const rotuloFace = (itens: Item[]) => {
  if (itens.length === 0) return ''
  const modelo = itens[0].peca.trim()
  const codigo = itens[0].codigo.trim()
  return modelo && codigo ? `${modelo} - ${codigo}` : modelo || codigo
}

/**
 * Nível de porta-palete em grades 3×3 numeradas (formato do estoque físico):
 * cada célula é uma caixa numerada pelo último segmento do endereço
 * (PG1-N2-C5 → nível N2, lado Cima, caixa 5). Sem esquema de cores por lado —
 * as caixas usam os tons padrão por categoria do mapa. Com mais de um item na
 * posição, mostra o primeiro e um indicador "+N" (resto fica no drawer).
 */
export default function GradeNivel({
  lados,
  posicoesDoNivel,
  itensDaPosicao,
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
        return (
          <div className="grade-lado" key={lado}>
            <div className="grade-celulas">
              {celulas.map((p) => {
                const combina = enderecosQueCombinam?.has(p.endereco) || false
                const buscaCls = buscando ? (combina ? 'matched' : 'dimmed') : ''
                const itens = itensDaPosicao.get(p.id) || []
                const rotulo = rotuloFace(itens)
                if (p.categoria === 'Vazio') {
                  return (
                    <button
                      key={p.id}
                      title={`${p.endereco} — posição vazia`}
                      className={cn('grade-celula grade-vazia', buscaCls)}
                      onClick={() => onAlocar(p)}
                    >
                      {p.posicao}
                    </button>
                  )
                }
                return (
                  <button
                    key={p.id}
                    title={`${rotulo || p.endereco} · ${p.endereco} — ${itens.length} item(ns)`}
                    className={cn(
                      'grade-celula grade-caixa',
                      `grade-caixa-${p.categoria}`,
                      p.qtd_confirmar && 'caixa-confirmar',
                      buscaCls,
                    )}
                    onClick={() => onDetalhes(p)}
                  >
                    <span className="caixa-topo" aria-hidden />
                    <span className="grade-num">{p.posicao}</span>
                    {rotulo && <span className="grade-rotulo">{rotulo}</span>}
                    {itens.length > 1 && <span className="grade-extras">+{itens.length - 1}</span>}
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
