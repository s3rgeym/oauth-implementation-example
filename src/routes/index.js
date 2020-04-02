'use strict'

import fs from 'fs'
import path from 'path'

const routes = {}
const basename = path.basename(__filename)

fs.readdirSync(__dirname)
  .filter(
    filename =>
      !['.', '..'].includes(filename) &&
      filename.endsWith('.js') &&
      filename !== basename
  )
  .forEach(filename => {
    routes[path.parse(filename).name] = require(path.join(
      __dirname,
      filename
    )).default
  })

export { routes as default }
