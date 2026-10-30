/*
 * O snapshot mensal do inventário passa a gravar a LISTA de itens por máquina
 * (modelo, código — futuro SKU do Bling —, quantidade e preço de custo) além
 * dos totais; o JSON ganha a marca "versao" (2 = com lista agregada).
 * Backfill idempotente: snapshots antigos recebem versao = 1; quem já tem
 * "versao" é pulado. O campo json "snapshot" (4 MB) já comporta a lista.
 */
migrate(
  (app) => {
    const registros = app.findRecordsByFilter('inventarios', '', '-created', 1000, 0)
    for (const rec of registros) {
      const bruto = rec.getString('snapshot')
      if (!bruto) continue
      let dados
      try {
        dados = JSON.parse(bruto)
      } catch (_) {
        continue
      }
      if (!dados || typeof dados !== 'object' || Array.isArray(dados)) continue
      if (dados.versao) continue
      dados.versao = 1
      rec.set('snapshot', dados)
      app.save(rec)
    }
  },
  (app) => {
    try {
      const registros = app.findRecordsByFilter('inventarios', '', '-created', 1000, 0)
      for (const rec of registros) {
        const bruto = rec.getString('snapshot')
        if (!bruto) continue
        try {
          const dados = JSON.parse(bruto)
          if (dados && typeof dados === 'object' && dados.versao === 1) {
            delete dados.versao
            rec.set('snapshot', dados)
            app.save(rec)
          }
        } catch (_) {}
      }
    } catch (_) {}
  },
)
