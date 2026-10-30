/*
 * Colecao "inventarios": snapshot mensal do estoque para o Inventário.
 * Um registro por mes (AAAA-MM unico) — regravar o mesmo mes atualiza o
 * snapshot em vez de duplicar. Nunca apaga meses anteriores.
 */
migrate(
  (app) => {
    app.save(
      new Collection({
        name: 'inventarios',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: null,
        fields: [
          { name: 'mes', type: 'text', required: true, min: 7, max: 7, pattern: '^\\d{4}-\\d{2}$' },
          { name: 'total', type: 'number', onlyInt: true, min: 0 },
          { name: 'snapshot', type: 'json', maxSize: 4000000 },
          { name: 'usuario', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_inventarios_mes ON inventarios (mes)'],
      }),
    )

    // Campo "observacao" no histórico — usado nas quedas por gravidade.
    const mov = app.findCollectionByNameOrId('movimentacoes')
    if (!mov.fields.getByName('observacao')) {
      mov.fields.add(new TextField({ name: 'observacao', max: 300 }))
      app.save(mov)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('inventarios'))
    } catch (_) {}
  },
)
