'use strict'

// Сначала нужно dotenv загрузить, а потом импортировать модули. Проблема в том, что babel импорты вверх переносит
import './bootstrap'
// import './bootstrap'
import path from 'path'
import { promisify } from 'util'

import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'

import { middleware as passportMiddleware } from './middlewares/passport'
// import auth from './auth'
import routes from './routes'

const startServer = async () => {
  const port = parseInt(process.env.PORT) || 3000
  const host = process.env.HOST || 'localhost'
  const app = express()
  app.set(express.static(path.join(__dirname, '..', 'assets')))
  app.set('views', path.join(__dirname, '..', 'views'))
  app.set('view engine', 'pug')
  app.locals.pretty = true
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  app.use(cookieParser())
  app.use(passportMiddleware)
  // Важна очередность использования ротутеров
  app.use('/auth', routes.auth)
  app.use('/users', routes.users)
  await promisify(app.listen).bind(app)(port, host)
  console.log(`app listening on http://${host}:${port}`)
}

startServer()
