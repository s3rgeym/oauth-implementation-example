'use strict'

import Sequelzie from 'sequelize'
import fs from 'fs'
import path from 'path'

const sequelize = new Sequelzie(
  process.env.DATABASE_NAME,
  process.env.DATABASE_USERNAME,
  process.env.DATABASE_PASSWORD,
  {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    dialect: 'postgres',
    // Без версии БД происходит ошибка при создании схемы (вместо create if not exists делает просто create)
    // Версия Postgres может быть любая старше 9.6.5 (?)
    databaseVersion: '9.6.9',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
    // omitNull: true,
    // Разрешаем алиасы типа $and, $or и т.п. (не работает)
    // operatorsAliases: true,
  }
)

const models = {}
const basename = path.basename(__filename)

fs.readdirSync(__dirname)
  .filter(
    filename =>
      !['.', '..'].includes(filename) &&
      filename.endsWith('.js') &&
      filename !== basename
  )
  .forEach(filename => {
    // Мне не нравится использование здесь require. Я так и не смог настроить
    // синхронный динамический import babel
    const model = require(path.join(__dirname, filename)).default.init(
      sequelize
    )
    models[model.name] = model
  })

Object.values(models).forEach(model => {
  if ('associate' in model) model.associate(models)
  if ('loadScopes' in model) model.loadScopes(models)
})

sequelize
  // Создаем схему, если ее не существует
  .createSchema(process.env.DATABASE_SCHEMA)
  // В любом случае пытаемся создать таблицы
  .finally(async () => {
    // await sequelize.sync({ force: false })
    // Этот код нужно закомментировать, чтобы таблицы не пересоздавались заново
    await sequelize.sync({ force: true })
    const password = 'tester'
    const user = await models.User.create({
      username: 'tester',
      email: 'tester@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password
    })
    console.log('Created user_id: %s', user.id)
    const isAutheticated = await user.authenticate(password)
    console.log('Test authenticate: %s', isAutheticated)
    const client = await models.Client.create({
      secret: 't0p$3cret',
      name: 'Sample Client Application',
      // Сюда нужно добавить URL на который происходит переадресация. Они проверяются
      redirectUris: [
        'http://127.0.0.1:5000/authorize',
        'http://172.27.0.88:5000/authorize',
        'http://site-auth.rancher.i-dgtl.ru/authorize'
      ],
      scopes: ['profile:read', 'profile:update', 'users:read'],
      userId: user.id
    })
    console.log('Created client_id: %s', client.id)
  })

export { sequelize }
export { models }
export default models
