const express = require('express')
const router = express.Router()
const { checkLogin } = require('../middlewares/authMiddleware')

router.get('/', checkLogin, (req, res, next) => {
  return res.json(req.session.user)
})
module.exports = router
