// Preço de custo da peça (atributo da PEÇA, não da posição) e valor total em estoque.
// Idempotente: só adiciona o campo se ele ainda não existir.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    if (!col.fields.getByName('preco_custo')) {
      // Sem min negativo: aceita decimais (R$); opcional — itens antigos ficam sem preço.
      col.fields.add(new NumberField({ name: 'preco_custo' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('itens')
    if (col.fields.getByName('preco_custo')) {
      col.fields.removeByName('preco_custo')
      app.save(col)
    }
  },
)
