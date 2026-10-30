/** Geração e download de CSV com separador ';' e BOM (Excel BR). */

export interface LinhaInventario {
  Modelo: string
  Código: string
  Quantidade: string
  'Preço de custo': string
  'Valor total': string
}

const CAB = ['Modelo', 'Código', 'Quantidade', 'Preço de custo', 'Valor total']

const esc = (v: string) => {
  const t = (v ?? '').toString()
  return /[";\r\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t
}

/** Junta as linhas (cada uma um objeto com as colunas na ordem) em CSV Excel-BR. */
export function montarCsv(linhas: LinhaInventario[]): string {
  const corpo = linhas.map((l) =>
    CAB.map((c) => esc(l[c as keyof LinhaInventario] ?? '')).join(';'),
  )
  return `\uFEFF${CAB.join(';')}\r\n${corpo.join('\r\n')}\r\n`
}

/** Cria um Blob CSV e dispara o download no navegador. */
export function baixarCsv(nomeArquivo: string, linhas: LinhaInventario[]) {
  const blob = new Blob([montarCsv(linhas)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
