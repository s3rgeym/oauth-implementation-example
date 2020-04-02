// https://auth0.com/docs/api-auth/tutorials/silent-authentication
'use strict'

import crypto from 'crypto'
import { promisify } from 'util'

import oauth2orize from 'oauth2orize'
import passport from 'passport'
import login from 'connect-ensure-login'
import express from 'express'

import db from '../db'
import { userInfo } from 'os';

const accessTokenExpiresIn =
  parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN) || 3600000
const refreshTokenExpiresIn =
  parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN) || 604800000
const authorizationCodeExpiresIn =
  parseInt(process.env.AUTHORIZATION_CODE_EXPIRES_IN) || 60000

const randomBytesAsync = promisify(crypto.randomBytes)

const generateToken = async (length = 255) =>
  (await randomBytesAsync(Math.ceil(length / 2)))
    .toString('hex')
    .slice(0, length)

const server = oauth2orize.createServer()

server.serializeClient((client, done) => done(null, client.id))

server.deserializeClient(async (id, done) => {
  try {
    const client = await db.Client.findByPk(id)
    if (!client) return done(null, false)
    // console.log(client.toJSON())
    done(null, client)
  } catch (err) {
    done(err)
  }
})

// Авторизация серверных приложений
// GET-запрос на /authorize?reponse_type=code&client_id=...[&redirect_uri=...][&scope=...][&state=...]
// Получение кода авторизации
server.grant(
  // третий аргумент ares
  oauth2orize.grant.code(async (client, redirectUri, user, ares, done) => {
    try {
      // redirectUri не принадлежит клиенту
      if (!client.validateRedirectUri(redirectUri)) return done(null, false)
      // Проверку ares.scope сделаю позже
      const code = await generateToken()
      await db.AuthorizationCode.create({
        clientId: client.id,
        userId: user.id,
        // Тут нужно использовать ares.scope
        scopes: client.scopes,
        redirectUri,
        code,
        expiresAt: Date.now() + authorizationCodeExpiresIn
      })
      done(null, code)
    } catch (err) {
      done(err)
    }
  })
)

// Проверка кода авторизации и создание токенов
// POST-запрос на /token и в теле (json/urlencoded) передаем grant_type=authorization_code, client_id, client_secret, code[, redirect_uri]
server.exchange(
  oauth2orize.exchange.code(async (client, code, redirectUri, done) => {
    try {
      const authCode = await db.AuthorizationCode.findByCode(code)
      if (
        !authCode ||
        authCode.isExpired ||
        authCode.clientId !== client.id ||
        authCode.redirectUri !== redirectUri
      )
        return done(null, false)
      // Нужно удалить код авторизации, чтобы им не могли воспользоваться повторно?
      await authCode.destroy()
      const accessToken = await generateToken()
      const refreshToken = await generateToken()
      const token = await db.Token.create({
        accessToken,
        refreshToken,
        accessExpiresAt: Date.now() + accessTokenExpiresIn,
        refreshExpiresAt: Date.now() + refreshTokenExpiresIn,
        clientId: client.id,
        userId: authCode.userId,
        scopes: authCode.scopes
      })
      const info = {
        expires: token.accessExpiresAt.toISOString(),
        user_id: token.userId
      }
      done(null, token.accessToken, token.refreshToken, info)
    } catch (err) {
      done(err)
    }
  })
)

// Авторизация микросервисов: токен выдается только на клиента
// POST-запрос на /token и в теле (json/urlencoded) передаем grant_type=client_сredentials, client_id, client_secret[, scope]
server.exchange(
  oauth2orize.exchange.clientCredentials(async (client, scope, done) => {
    try {
      const accessToken = await generateToken()
      const refreshToken = await generateToken()
      const token = await db.Token.create({
        accessToken,
        refreshToken,
        accessExpiresAt: Date.now() + accessTokenExpiresIn,
        refreshExpiresAt: Date.now() + refreshTokenExpiresIn,
        clientId: client.id,
        // scope игнорируется
        scopes: client.scopes
      })
      const info = {
        expires: token.accessExpiresAt.toISOString()
      }
      done(null, token.accessToken, token.refreshToken, info)
    } catch (err) {
      done(err)
    }
  })
)

// Использование refresh_token и получение новой пары токенов
// POST-запрос на /token и в теле (json/urlencoded) передаем grant_type=refresh_token, client_id, client_secret, refresh_token, [scope]
server.exchange(
  oauth2orize.exchange.refreshToken(
    async (client, refreshToken, scope, done) => {
      try {
        const token = await db.Token.findByRefreshToken(refreshToken)
        // console.log(token)
        if (
          !token ||
          token.isRefreshTokenExpired ||
          token.clientId !== client.id
        )
          return done(null, false)
        // генерируем новую пару токенов
        token.accessToken = await generateToken()
        token.refreshToken = await generateToken()
        token.accessExpiresAt = Date.now() + accessTokenExpiresIn
        token.refreshExpiresAt = Date.now() + refreshTokenExpiresIn
        // token.scope = scope
        await token.save()
        const info = {
          expires: token.accessExpiresAt.toISOString()
        }
        if (token.userId) {
          info.user_id = token.userId
        }
        done(null, token.accessToken, token.refreshToken, info)
      } catch (err) {
        done(err)
      }
    }
  )
)

const router = express.Router()

router.get(
  '/authorize',
  login.ensureLoggedIn('login'),
  server.authorization(
    // validate
    async (clientId, redirectUri, done) => {
      try {
        const client = await db.Client.findByPk(clientId)
        if (!client) return done(null, false)
        // Обязательно проверяем redirectUri
        if (!client.validateRedirectUri(redirectUri)) return done(null, false)
        done(null, client, redirectUri)
      } catch (e) {
        done(e)
      }
    }
  ),
  (req, res) => {
    res.render('confirm', {
      transactionId: req.oauth2.transactionID,
      user: req.user,
      client: req.oauth2.client
    })
  }
)

router.post('/decision', login.ensureLoggedIn('login'), server.decision())

router.post(
  '/token',
  passport.authenticate(['basic', 'oauth2-client-password'], {
    session: false
  }),
  server.token(),
  server.errorHandler()
)

router.get('/login', (req, res) => {
  res.render('login')
})

// https://github.com/jaredhanson/connect-ensure-login/blob/master/lib/ensureLoggedIn.js#L46
router.post(
  '/login',
  // https://stackoverflow.com/a/21151040
  passport.authenticate('local', {
    // successReturnToOrRedirect: '/',
    failureRedirect: 'login',
    failureFlash: true
  }),
  (req, res) => {
    console.log('redirectTo: %s', req.session.returnTo)
    res.redirect(req.session.returnTo)
    delete req.session.returnTo
  }
)

// router.get('/logout', (req, res) => {
//   req.logout()
//   res.redirect('/')
// })

export default router
