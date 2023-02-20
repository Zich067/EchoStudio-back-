const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const pool = require('../utils/db')
const mysql2 = require('mysql2/promise')

const argon2 = require('argon2')

// app.use((req, res, next) => {...})

router.use((req, res, next) => {
  console.log('這裡是 user edit 的中間件')
  next()
})

// 要處理 content-type 是 multipart/form-data
// express 沒有內建，需要另外用套件
// 這邊用第三方套件 multer 來處理
const multer = require('multer')
const path = require('path')
// 設定圖片存哪裡: 位置跟名稱
const storage = multer.diskStorage({
  // 設定儲存的目的地 -> 檔案夾
  // 先手動建立好檔案夾 public/uploads
  destination: function (req, file, cb) {
    // path.join: 避免不同的作業系統之間 / 或 \
    // __dirname 目前檔案所在的目錄路徑
    cb(null, path.join(__dirname, '..', 'public', 'upload', 'user'))
  },
  // 圖片名稱
  filename: function (req, file, cb) {
    console.log('multer storage', file)
    const ext = file.originalname.split('.').pop()
    cb(null, `${Date.now()}.${ext}`)
    // uuid https://www.npmjs.com/package/uuid
  },
})
// 真正在處理上傳
const uploader = multer({
  storage: storage,
  // 圖片格式的 validation
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
  // 限制檔案的大小
  // limits: {
  //   // 1k = 1024 => 200k 200x1024
  //   fileSize: 200 * 1024, // 204800
  // },
})

router.put('/:userId', uploader.single('user_img'), async (req, res, next) => {
  console.log('update user_img', req.body, req.params.userId, req.file)
  let name = req.file.filename
  // const filename = req.file ? path.join('uploads', req.file.filename) : '';
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
  // console.log('register: insert to db', result);

  // 回覆給前端
  res.json({
    msg: '修改成功',
  })
})

module.exports = router
