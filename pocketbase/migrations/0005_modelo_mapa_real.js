/*
 * Substitui o modelo antigo (4 paletes x 8 posicoes, 1 item por posicao)
 * pela estrutura real do estoque: estruturas, posicoes (endereco unico,
 * nivel, lado, posicao, tamanho, categoria) e itens (N itens por posicao).
 * O historico de movimentacoes do modelo antigo e limpo — os dados reais
 * passam a ser a verdade.
 */
migrate(
  (app) => {
    // 1. Remove a colecao antiga "posicoes" (modelo simplificado).
    try {
      const antiga = app.findCollectionByNameOrId('posicoes')
      app.delete(antiga)
    } catch (_) {}

    // 2. Ajusta movimentacoes: maquina/quantidade opcionais + codigo da peca.
    const mov = app.findCollectionByNameOrId('movimentacoes')
    const qtd = mov.fields.getByName('quantidade')
    if (qtd) qtd.required = false
    const maq = mov.fields.getByName('nome_maquina')
    if (maq) maq.required = false
    if (!mov.fields.getByName('codigo_peca')) {
      mov.fields.add(new TextField({ name: 'codigo_peca' }))
    }
    app.save(mov)

    // 3. Historico reiniciado (os dados reais passam a ser a verdade).
    try {
      app.truncateCollection(app.findCollectionByNameOrId('movimentacoes'))
    } catch (_) {}

    // 4. Estruturas fisicas (portas-paletes e prateleiras).
    app.save(
      new Collection({
        name: 'estruturas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'codigo', type: 'text', required: true, min: 2, max: 10 },
          { name: 'nome', type: 'text', required: true, max: 80 },
          { name: 'lados', type: 'json', maxSize: 500 },
          { name: 'ordem', type: 'number', onlyInt: true },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_estruturas_codigo ON estruturas (codigo)'],
      }),
    )

    const estruturasId = app.findCollectionByNameOrId('estruturas').id

    // 5. Posicoes fisicas (endereco unico tipo PG1-N2-T1).
    app.save(
      new Collection({
        name: 'posicoes',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'endereco', type: 'text', required: true, min: 5, max: 20 },
          {
            name: 'estrutura',
            type: 'relation',
            required: true,
            collectionId: estruturasId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'nivel', type: 'number', required: true, onlyInt: true, min: 1 },
          { name: 'lado', type: 'text', required: true, max: 10 },
          { name: 'posicao', type: 'number', required: true, onlyInt: true, min: 1 },
          { name: 'tamanho', type: 'text', max: 4 },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['Estoque', 'Máquina', 'Picking', 'Vazio'],
            maxSelect: 1,
          },
          { name: 'qtd_confirmar', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_posicoes_endereco ON posicoes (endereco)',
          'CREATE INDEX idx_posicoes_estrutura ON posicoes (estrutura)',
          'CREATE INDEX idx_posicoes_nivel ON posicoes (estrutura, nivel, lado, posicao)',
        ],
      }),
    )

    const posicoesId = app.findCollectionByNameOrId('posicoes').id

    // 6. Itens alocados (uma posicao pode ter N itens).
    app.save(
      new Collection({
        name: 'itens',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'posicao',
            type: 'relation',
            required: true,
            collectionId: posicoesId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['Estoque', 'Máquina', 'Picking'],
            maxSelect: 1,
          },
          { name: 'maquina', type: 'text', max: 80 },
          { name: 'peca', type: 'text', required: true, max: 200 },
          { name: 'codigo', type: 'text', max: 40 },
          { name: 'quantidade', type: 'number', onlyInt: true },
          { name: 'qtd_confirmar', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_itens_posicao ON itens (posicao)',
          'CREATE INDEX idx_itens_peca ON itens (peca)',
          'CREATE INDEX idx_itens_codigo ON itens (codigo)',
        ],
      }),
    )
  },
  (app) => {
    // down: remove o novo modelo e recria o antigo (simplificado).
    for (const nome of ['itens', 'posicoes', 'estruturas']) {
      try {
        app.delete(app.findCollectionByNameOrId(nome))
      } catch (_) {}
    }
    app.save(
      new Collection({
        name: 'posicoes',
        type: 'base',
        listRule: "@request.auth.id != '' && usuario = @request.auth.id",
        viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
        createRule: "@request.auth.id != '' && @request.body.usuario = @request.auth.id",
        updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
        deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
        fields: [
          { name: 'palete', type: 'text', required: true },
          { name: 'posicao', type: 'text', required: true },
          { name: 'nome_maquina', type: 'text', required: true },
          { name: 'nome_peca', type: 'text', required: true },
          { name: 'quantidade', type: 'number', required: true },
          {
            name: 'usuario',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
      }),
    )
  },
)
