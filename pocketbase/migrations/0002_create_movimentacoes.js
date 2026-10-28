migrate(
  (app) => {
    const collection = new Collection({
      name: 'movimentacoes',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.usuario = @request.auth.id",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['alocacao', 'edicao', 'movimentacao', 'exclusao'],
          maxSelect: 1,
        },
        { name: 'posicao_origem', type: 'text', max: 100 },
        { name: 'posicao_destino', type: 'text', max: 100 },
        { name: 'nome_maquina', type: 'text', required: true, min: 1, max: 180 },
        { name: 'nome_peca', type: 'text', required: true, min: 1, max: 180 },
        { name: 'quantidade', type: 'number', required: true, min: 1, onlyInt: true },
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          minSelect: 1,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_movimentacoes_tipo ON movimentacoes (tipo)',
        'CREATE INDEX idx_movimentacoes_usuario ON movimentacoes (usuario)',
        'CREATE INDEX idx_movimentacoes_created ON movimentacoes (created)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('movimentacoes'))
  },
)
