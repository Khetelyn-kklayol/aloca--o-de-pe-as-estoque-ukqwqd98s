migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'khetelyn_klay11@hotmail.com')
    } catch (_) {
      user = new Record(users)
      user.setEmail('khetelyn_klay11@hotmail.com')
      user.setPassword('Skip@Pass')
      user.setVerified(true)
      user.set('name', 'Khetelyn Klay')
      app.save(user)
    }
    const collection = app.findCollectionByNameOrId('posicoes')
    const examples = [
      ['Palete 1', 'Posição 1', 'Prensa Hidráulica', 'Filtro de Ar', 8],
      ['Palete 1', 'Posição 2', 'Misturador', 'Correia V', 3],
      ['Palete 2', 'Posição 1', 'Compressor', 'Kit Válvula', 12],
    ]
    examples.forEach((item) => {
      const found = app.findRecordsByFilter(
        'posicoes',
        'palete = {:palete} && posicao = {:posicao}',
        'created',
        1,
        0,
        { palete: item[0], posicao: item[1] },
      )
      if (found.length) return
      const record = new Record(collection)
      record.set('palete', item[0])
      record.set('posicao', item[1])
      record.set('nome_maquina', item[2])
      record.set('nome_peca', item[3])
      record.set('quantidade', item[4])
      record.set('usuario', user.id)
      app.save(record)
    })
  },
  (app) => {
    const rows = app.findRecordsByFilter(
      'posicoes',
      "usuario.email = 'khetelyn_klay11@hotmail.com'",
      'created',
      100,
      0,
    )
    rows.forEach((record) => app.delete(record))
  },
)
