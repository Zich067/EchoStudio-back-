const express = require('express')
const router = express.Router()
const { body, validationResult } = require('express-validator')
const pool = require('../utils/db')

const argon2 = require('argon2')

router.use((req, res, next) => {
  console.log('這裡是 auth router 的中間件')
  next()
})


const registerRules = [
  body('email').isEmail().withMessage('請輸入正確格式的 Email'),
  body('password').isLength({ min: 4 }).withMessage('密碼長度至少為 4'),
  body('confirmPassword')
    .custom((value, { req }) => {
      return value === req.body.password
    })
    .withMessage('驗證密碼不符合'),
]

router.post('/register', registerRules, async (req, res) => {
  console.log('I am register', req.body)
  const validateResult = validationResult(req)
  console.log(validateResult)
  if (!validateResult.isEmpty()) {
    return res.status(400).json({ errors: validateResult.array() })
  }

  let [user] = await pool.execute('SELECT * FROM user WHERE user_mail = ?', [
    req.body.email,
  ])
  if (user.length > 0) {
    return res.status(400).json({
      errors: [
        {
          msg: 'email 已經註冊過',
          param: 'email',
        },
      ],
    })
  }
  const hashedPassword = await argon2.hash(req.body.password)
 let result = await pool.execute(
    'INSERT INTO user (user_account, user_mail, user_password, user_level_id) VALUES (?, ?, ?, 1);',
    [req.body.name, req.body.email, hashedPassword]
  )
  console.log('register: insert to db', result)

  res.json({
    msg: '註冊成功，請再次登入',
  })
})

router.post('/login', async (req, res) => {
  let [users] = await pool.execute('SELECT * FROM user WHERE user_mail = ?', [
    req.body.email,
  ])
  if (users.length === 0) {
    return res.status(401).json({
      errors: [
        {
          msg: '帳號或密碼錯誤',
        },
      ],
    })
  }
  let user = users[0]

  let result = await argon2.verify(user.user_password, req.body.password)
  if (result === false) {
    return res.status(401).json({
      errors: [
        {
          msg: '帳號或密碼錯誤',
        },
      ],
    })
  }
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
  req.session.user = retUser
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
})

module.exports = router