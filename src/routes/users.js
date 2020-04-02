'use strict'

import express from 'express'
import { authBearer } from '../middlewares/authBearer'
import { apiErrorHandler } from '../middlewares/apiErrorHandler'

const router = express.Router()

router.get(
  '/me',
  authBearer('profile:read'),
  (req, res) => {
    res.json(req.user.toJSON())
  }
)

// Должен быть в конце
router.use(apiErrorHandler)
export default router
