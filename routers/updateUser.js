const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const pool = require('../utils/db')
const mysql2 = require('mysql2/promise')

const argon2 = require('argon2')

router.use((req, res, next) => {
  console.log('這裡是 user edit 的中間件')
  next()
})


const multer = require('multer')
const path = require('path')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'public', 'upload', 'user'))
  },
  filename: function (req, file, cb) {
    console.log('multer storage', file)
    const ext = file.originalname.split('.').pop()
    cb(null, `${Date.now()}.${ext}`)
  },
})
const uploader = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (
      file.mimetype !== 'image/jpeg' &&
      file.mimetype !== 'image/jpg' &&
      file.mimetype !== 'image/png'
    ) {
      cb(new Error('上傳圖片格式不合法'), false)
    } else {
      cb(null, true)
    }
  },
})

router.put('/:userId', uploader.single('user_img'), async (req, res, next) => {
  console.log('update user_img', req.body, req.params.userId, req.file)
  let name = req.file.filename
  let result = await pool.execute(
    'UPDATE user SET user_account=?, user_name=?, user_mail=?, user_phone=?, user_birthday=?, user_address=?, carrier=?, user_img=? WHERE id=? ',
    [
      req.body.user_account,
      req.body.user_name,
      req.body.user_mail,
      req.body.user_phone,
      req.body.user_birthday,
      req.body.user_address,
      req.body.carrier,
      name,
      req.params.userId,
    ]
  )
  res.json({
    msg: '修改成功',
  })
})

module.exports = router
