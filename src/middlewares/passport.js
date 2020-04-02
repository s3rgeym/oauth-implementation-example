// https://github.com/awais786327/oauth2orize-examples/blob/master/auth/index.js
'use strict'

import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import { BasicStrategy } from 'passport-http'
import { Strategy as ClientPasswordStrategy } from 'passport-oauth2-client-password'
import { Strategy as BearerStrategy } from 'passport-http-bearer'

import db from '../db'

passport.serializeUser((user, done) => done(null, user.id))

passport.deserializeUser(async (id, done) => {
  try {
    // sequelize бросат исключения или возвращает null/undefined?
    const user = await db.User.findByPk(id)
    if (!user) return done(null, false)
    done(null, user)
  } catch (err) {
    done(err)
  }
})

/**
 * LocalStrategy
 *
 * This strategy is used to authenticate users based on a username and password.
 * Anytime a request is made to authorize an application, we must ensure that
 * a user is logged in before asking them to approve the request.
 */
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await db.User.findByUsername(username)
      const isAuthenticated = user && (await user.authenticate(password))
      if (!isAuthenticated) return done(null, false)
      done(null, user)
    } catch (err) {
      done(err)
    }
  })
)

// app.post(
//   '/login',
//   (req, res) => {
//     passport.authenticate('local', (err, user, info) => {
//       if (err)
//         return res.status(401).json({ message: 'Auth error' })
//       const token = user.generateJwt()
//       res.send({ token })
//     })
//   }
// )

/**
 * BasicStrategy & ClientPasswordStrategy
 *
 * These strategies are used to authenticate registered OAuth clients. They are
 * employed to protect the `token` endpoint, which consumers use to obtain
 * access tokens. The OAuth 2.0 specification suggests that clients use the
 * HTTP Basic scheme to authenticate. Use of the client password strategy
 * allows clients to send the same credentials in the request body (as opposed
 * to the `Authorization` header). While this approach is not recommended by
 * the specification, in practice it is quite common.
 */
async function verifyClient(id, secret, done) {
  try {
    const client = await db.Client.findByIdAndSecret(id, secret)
    if (!client) return done(null, false)
    done(null, client)
  } catch (err) {
    done(err)
  }
}

// Authorization: Basic <base64 'username:password'>
passport.use(new BasicStrategy(verifyClient))
passport.use(new ClientPasswordStrategy(verifyClient))

/**
 * BearerStrategy
 *
 * This strategy is used to authenticate either users or clients based on an access token
 * (aka a bearer token). If a user, they must have previously authorized a client
 * application, which is issued an access token to make requests on behalf of
 * the authorizing user.
 */
passport.use(
  new BearerStrategy(async (accessToken, done) => {
    try {
      console.log(accessToken)
      const token = await db.Token.scope('withUser').findByAccessToken(
        accessToken
      )
      if (token) {
        if (!token.isAccessTokenExpired) {
          const info = { scopes: token.scopes }
          return done(null, token.user, info)
        }
        await token.destroy()
      }
      done(null, false)
    } catch (err) {
      done(err)
    }
  })
)

const middleware = express()

middleware.use(
  session({
    // store: new RedisStore({
    //   host: process.env.REDIS_HOST,
    //   port: process.env.REDIS_PORT
    // }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: parseInt(process.env.COOKIE_EXPIRES_IN) || 86400000
    }
  })
)

middleware.use(passport.initialize())
middleware.use(passport.session())

export { middleware }

// export default middleware
