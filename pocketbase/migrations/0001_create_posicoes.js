migrate(
  (app) => {
    const collection = new Collection({
      name: 'posicoes',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != '' && @request.body.usuario = @request.auth.id",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        { name: 'palete', type: 'text', required: true, min: 1, max: 40 },
        { name: 'posicao', type: 'text', required: true, min: 1, max: 40 },
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
        'CREATE INDEX idx_posicoes_palete ON posicoes (palete)',
        'CREATE INDEX idx_posicoes_posicao ON posicoes (posicao)',
        'CREATE INDEX idx_posicoes_usuario ON posicoes (usuario)',
        'CREATE INDEX idx_posicoes_created ON posicoes (created)',
        'CREATE UNIQUE INDEX idx_posicoes_endereco_unique ON posicoes (palete, posicao)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('posicoes'))
  },
)
