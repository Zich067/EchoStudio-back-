const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const pool = require('../utils/db')

const argon2 = require('argon2')

router.use((req, res, next) => {
  console.log('這裡是 auth router 的中間件')
  next()
})

// 驗證資料 validation -> 因為後端不可以相信來自前端的資料
const registerRules = [
  // 中間件: 負責檢查 email 是否合法
  body('email').isEmail().withMessage('請輸入正確格式的 Email'),
  // 中間件: 檢查密碼的長度
  body('password').isLength({ min: 4 }).withMessage('密碼長度至少為 4'),
  // 中間件: 檢查 password 跟 confirmPassword 是否一致
  // 客製自己想要的檢查條件
  body('confirmPassword')
    .custom((value, { req }) => {
      return value === req.body.password
    })
    .withMessage('驗證密碼不符合'),
]

// /api/auth/register
router.post('/register', registerRules, async (req, res) => {
  console.log('I am register', req.body)

  // 處理驗證的結果
  const validateResult = validationResult(req)
  console.log(validateResult)
  if (!validateResult.isEmpty()) {
    // validateResult 不是空的 -> 表示有錯誤
    return res.status(400).json({ errors: validateResult.array() })
  }

  // 驗證通過
  // 檢查 email 是否已經註冊
  let [user] = await pool.execute('SELECT * FROM user WHERE user_mail = ?', [
    req.body.email,
  ])
  if (user.length > 0) {
    // 表示這個 email 有存在資料庫中
    // 如果已經註冊過，就回覆 400
    return res.status(400).json({
      errors: [
        {
          msg: 'email 已經註冊過',
          param: 'email',
        },
      ],
    })
  }

  // 雜湊 hash 密碼
  const hashedPassword = await argon2.hash(req.body.password)

  // 存到資料庫
 let result = await pool.execute(
    'INSERT INTO user (user_account, user_mail, user_password, user_level_id) VALUES (?, ?, ?, 1);',
    [req.body.name, req.body.email, hashedPassword]
  )
  console.log('register: insert to db', result)

  res.json({
    msg: '註冊成功，請再次登入',
  })
 

  // 回覆給前端
  // res.json({
  //   email: req.body.email,
  //   member_id: result[0].insertId,
  // });
})

// /api/auth/login
router.post('/login', async (req, res) => {
  // 資料驗證？？
  // 確認 email 是否存在
  let [users] = await pool.execute('SELECT * FROM user WHERE user_mail = ?', [
    req.body.email,
  ])
  if (users.length === 0) {
    // 陣列長度 = 0 -> 表示這個 email 不存在資料庫中 -> 尚未註冊過
    // 不存在，就回覆 401
    return res.status(401).json({
      errors: [
        {
          msg: '帳號或密碼錯誤',
        },
      ],
    })
  }
  // 抓到一筆會員，從陣列中拿出資料
  let user = users[0]

  // 如果存在，比對密碼
  let result = await argon2.verify(user.user_password, req.body.password)
  if (result === false) {
    // 密碼比對失敗
    // 密碼錯誤，回覆前端 401
    return res.status(401).json({
      errors: [
        {
          // msg: '密碼錯誤',
          // param: 'password',
          msg: '帳號或密碼錯誤',
        },
      ],
    })
  }

  // 能執行到這裡，表示帳號存在，且密碼正確

  //寫入 session
  // 準備好要寫進 session 的內容
  let retUser = {
    id: user.id,
    name: user.user_name,
    account: user.user_account,
    phone: user.user_phone,
    birthday: user.user_birthday,
    email: user.user_mail,
    address: user.user_address,
    level: user.user_level_id,
    carrier: user.carrier,
    owner: user.owner,
    number: user.number,
    dateline: user.dateline,
  }
  // 寫入 session
  req.session.user = retUser

  // 回覆前端
  res.json({
    msg: '登入成功',
    user: retUser,
  })
})

router.get('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy()
    res.clearCookie('SESSION_ID')
  }
  res.json({
    msg: '登出成功',
  })
  // res.sendStatus(202);
})

module.exports = router