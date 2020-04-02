'strict'

import passport from 'passport'

export const authBearer = scope => (req, res, next) =>
  passport.authenticate('bearer', { session: false })(req, res, err => {
    if (err) return next(err)
    if (!scope) return next()
    if (!req.authInfo.scopes.includes(scope))
      throw { status: 401, message: `scope ${scope} not found for user` }
    next()
  })
