'use strict'

export const apiErrorHandler = (err, req, res, next) => {
  // TODO: проработать больше кейсов
  const { status, message } = err
  res.status(status || 500).json({ message })
}
