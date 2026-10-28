migrate(
  (app) => {
    const user = app.findAuthRecordByEmail('_pb_users_auth_', 'khetelyn_klay11@hotmail.com')
    const collection = app.findCollectionByNameOrId('movimentacoes')
    const examples = [
      ['Palete 1 | Posição 1', 'Prensa Hidráulica', 'Filtro de Ar', 8],
      ['Palete 1 | Posição 2', 'Misturador', 'Correia V', 3],
      ['Palete 2 | Posição 1', 'Compressor', 'Kit Válvula', 12],
    ]
    examples.forEach((item) => {
      const found = app.findRecordsByFilter(
        'movimentacoes',
        "usuario = {:usuario} && tipo = 'alocacao' && posicao_destino = {:endereco}",
        'created',
        1,
        0,
        { usuario: user.id, endereco: item[0] },
      )
      if (found.length) return
      const record = new Record(collection)
      record.set('tipo', 'alocacao')
      record.set('posicao_destino', item[0])
      record.set('nome_maquina', item[1])
      record.set('nome_peca', item[2])
      record.set('quantidade', item[3])
      record.set('usuario', user.id)
      app.save(record)
    })
  },
  (app) => {
    const rows = app.findRecordsByFilter(
      'movimentacoes',
      "usuario.email = 'khetelyn_klay11@hotmail.com'",
      'created',
      100,
      0,
    )
    rows.forEach((record) => app.delete(record))
  },
)
