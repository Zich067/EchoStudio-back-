const express = require('express')
// 利用 express 做出一個 web app
const app = express()
require('dotenv').config()
const mysql2 = require('mysql2/promise')

function isEmpty(variable) {
  return (
    variable === undefined ||
    variable === null ||
    (typeof variable === 'string' && variable.length === 0)
  )
}


let pool = mysql2.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PWD,
  database: process.env.DB_DATABASE,
  dateStrings: true,
  //解決時間格式
  // 限制 pool 連線數的上限
  connectionLimit: 10,
})

const cors = require('cors')
app.use(express.json())

// 加上中間件，讓 express 認得 json 資料
app.use(express.json())

const expressSession = require('express-session')
const FileStore = require('session-file-store')(expressSession)
const path = require('path')
const transporter = require('./config/mail.js').transporter
// const argon2 = require('argon2');

app.use(
  expressSession({
    // 告訴 express-session 要存在哪裡
    store: new FileStore({
      path: path.join(__dirname, '..', 'sessions'),
    }),
    secret: process.env.SESSION_SECRET,
    // true: 即使 session 沒有改變也重新儲存一次
    // 取決於你用的 storage 是有時效性的，可能需要不停地刷新這個時效
    resave: false,
    // true: 還沒有正式初始化的 session 也真的存起來
    saveUninitialized: false,
    name: 'SESSION_ID',
    cookie: {
      maxAge: 30 * 86400000,
    },
  })
)

app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true,
  })
)

app.use('/public/upload', express.static('./public/upload'))

app.get('/', (req, res, next) => {
  res.send('Hello Express')
  next()
})
//ProductActivity
app.get('/ProductActivity', async (req, res, next) => {
  console.log('這裡是 /ProductActivity')
  let [data] = await pool.query('SELECT FROM  JOIN  ON = ')
  res.json(data)
  next()
})

//子涵-------------------------------------------------------------
const authRouter = require('./routers/authRouter.js')
app.use('/api/auth', authRouter)

const memberRouter = require('./routers/memberRouter')
app.use('/api/members', memberRouter)

// http://localhost:3001/users/checkusers
app.get('/users/checkusers', async (req, res, next) => {
  // console.log('checkusers', req.session.user)

  if (!req.session.user) return res.json({})

  let [data] = await pool.query(
    `SELECT * FROM user WHERE id = ${req.session.user.id}`
  )
  console.log(data)
  return res.json(data[0])
  next()
})



// http://localhost:3001/api/members
app.get('/api/members', async (req, res, next) => {
  console.log('這裡是 /members')
  let [data] = await pool.query('SELECT * FROM user')
  res.json(data)
  next()
})

// http://localhost:3001/users
app.get('/users', async (req, res, next) => {
  console.log('這裡是 /users')
  let [data] = await pool.query('SELECT * FROM user')
  res.json(data)
  next()
})

// http://localhost:3001/user/1
app.get('/users/:userId', async (req, res, next) => {
  console.log('這裡是 /user/:userId', req.params.userId)
  let [data] = await pool.query('SELECT * FROM user WHERE id=?', [
    req.params.userId,
  ])
  res.json(data)
  next()
})

// 寄送驗證信件
app.post('/send-mail', async (req, res) => {
  console.log('send mail to:', req.body.email)
  const hash = (Math.random() + 1).toString(36).substring(7)

  // update user table code field hash => code
  // 將 hash 過的 code 存到資料庫
  let result = await pool.execute('UPDATE user SET code=?  WHERE user_mail=?', [
    hash,
    req.body.email,
  ])

  console.log(
    '這是hash :',
    hash,
    '這是reult : ',
    result,
    '這是user_mail : ',
    req.body.email
  )

  const mailOptions = {
    from: `"echo-studio"<${process.env.EMAIL_ADDRESS}>`,
    to: `<${req.body.email}>`,
    subject: '【ECHO-STUDIO】重新設定新密碼',
    // text: `點我前往修改密碼 👉 http://localhost:3000/login/updatepassword?code=${hash} \r\n `,
    html: `<p style="text-align:center"><span style="color:null"><strong><span style="font-size:16px ">親愛的會員 您好：</span></strong></p>

    <p style="text-align:center"><span style="color:null"><strong><span style="font-size:16px">請點選下面鏈結重設密碼，以確保您的權益。</span></strong></p>
    
    <p style="text-align:center"><strong><span style="color:#2980b9"><u><span style="font-size:20px"><a href="http://localhost:3000/login/updatepassword?code=${hash}">【請點此修改密碼】</a></span></u></span></strong></p>
    <p style="text-align:center"><span style="font-size:16px">http://localhost:3000/login/updatepassword?code=${hash}</span></p>
    
    <p style="text-align:center"><span style="font-size:14px">Echo Studio管理團隊😊</span></p>
    
    `,
    
  }

  res.json({
    msg: '成功送出，請至信箱收取變更密碼驗證信件',
  })

  //Send Email
  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      return res.status(400).send({ Status: 'Failure', Details: err })
    } else {
      return res.send({ Status: 'Success' })
    }
  })
})

// 更新密碼
app.put(`/login/update-password?`, async (req, res, next) => {
  console.log('這裡是update-password', req.body)
  const argon2 = require('argon2')

  // 雜湊 hash 密碼
  const hashedPassword = await argon2.hash(req.body.password)

  // 存到資料庫
  let result = await pool.execute(
    'UPDATE user SET user_password = ? WHERE user.code = ? ',
    [hashedPassword, req.body.code]
  )
  console.log('do update password', result)
  console.log(hashedPassword)

  res.json({
    msg: '修改密碼成功，請重新登入',
  })
})

// 會員收藏 http://localhost:3001/users/user_like/1
app.get('/users/user_like/:userId', async (req, res, next) => {
  console.log('這裡是 /users/user_like')
  console.log('---------', req.session.user)

  let [data] = await pool.query(
    'SELECT user_like.*, product_category.*, product.product_name, product.product_price, product.subject_img FROM user_like JOIN product ON user_like.product_id = product.id JOIN product_category ON product_category.id = product.category_id WHERE user_id=?',
    [req.params.userId]
  )
  res.json(data)
  next()
})
// 會員收藏-課程頁 http://localhost:3001/users/user_like_course/1
app.get('/users/user_like_course/:userId', async (req, res, next) => {
  console.log('這裡是 /users/user_like_course')
  let [data] = await pool.query(
    'SELECT user_like.*, class_category.*, class.class_name, class.class_img, class.class_price FROM user_like JOIN class ON user_like.class_id = class.id JOIN class_category ON class_category.id = class.class_category_id WHERE user_like.user_id=?',
    [req.params.userId]
  )
  res.json(data)
  next()
})

// 會員編輯-撈資料 http://localhost:3001/user/edit/1
app.get('/user/:userId', async (req, res, next) => {
  console.log('這裡是 /user/edit/:userId', req.params.userId) // req.params.userId 取得網址冒號後面的變數
  let [data] = await pool.query('SELECT * FROM user WHERE id=?', [
    req.params.userId,
  ])
  res.json(data)
  next()
})

// 會員編輯-更新資料 http://localhost:3001/user/update/1
const updateUser = require('./routers/updateUser')
app.use('/user/update', updateUser)

// 會員教室預約-撈資料 http://localhost:3001/user/reserver/2
app.get('/user/reserver/:userReserverID', async (req, res, next) => {
  console.log('這裡是 /user/reserver/:', req.params.userReserverID) // req.params.userId 取得網址冒號後面的變數
  // let [data] = await pool.query('SELECT * FROM rehearsal_reserve WHERE user_id=?', [req.params.userReserverID])
  let [data] = await pool.query(
    'SELECT rehearsal_reserve.*, rehearsal.rehearsal_name, rehearsal.rehearsal_img FROM rehearsal_reserve JOIN rehearsal ON rehearsal_reserve.rehearsal_id = rehearsal.id WHERE user_id=?',
    [req.params.userReserverID]
  )
  res.json(data)
  next()
})

// courses--------------------------紫晴------------------------------
app.get('/courses', async (req, res, next) => {
  const page = req.query.page || 1
  let [results] = await pool.query('SELECT COUNT(*) AS total FROM class', [])

  const total = results[0].total

  const perPage = 6
  const totalPage = Math.ceil(total / perPage)

  const limit = perPage
  const offset = perPage * (page - 1)
  const nextPage = parseInt(page) + 1
  const prevPage = page - 1
  let [data] = await pool.query(
    'SELECT * FROM class ORDER BY id LIMIT ? OFFSET ?',
    [limit, offset]
  )
  res.json({
    pagination: {
      total,
      perPage,
      totalPage,
      page,
      nextPage,
      prevPage,
    },
    data,
  })
  next()
})

app.get('/courses/:courseId', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT class.*, user.user_name,user.user_mail,user.user_img,user.teacher_info,user.teacher_youtube,user.teacher_fb FROM class JOIN user ON class.user_id = user.id WHERE class.id=?',
    [req.params.courseId]
  )
  res.json(data)
  next()
})

app.get('/class', async (req, res, next) => {
  console.log('這裡是 /class_img')
  let [data] = await pool.query('SELECT * FROM class')
  res.json(data)
  next()
})

//課程收藏
app.get('/coursesLike/:courseId', async (req, res, next) => {
  if (!req.session.user) {
    res.json([])
  } else {
    let [data] = await pool.query(
      'SELECT user_like.id, user_like.user_id,user_like.class_id FROM user_like JOIN user ON user_like.user_id = user.id JOIN class on user_like.class_id = class.id WHERE user_like.class_id =? AND user_like.user_id=?',
      [req.params.courseId, req.session.user.id]
    )
    console.log('4564651456', req.session.user.id)
    res.json(data)
    next()
  }
})

//課程加入收藏
app.post('/coursesLikeAdd', async (req, res) => {
  if (!req.session.user) {
    res.json([])
  } else {
    let result = await pool.execute(
      'INSERT INTO user_like ( user_id, class_id ) VALUES ( ?, ?)',
      [req.session.user.id, req.body.class_id]
    )
    console.log('加入收藏', result)
    // 回覆給前端
    res.json({
      msg: '加入收藏',
    })
  }
})

//課程取消收藏
app.delete('/coursesLikeAdd/:courseId', async (req, res) => {
  // 存到資料庫
  if (!req.session.user) {
    res.json([])
  } else {
    let result = await pool.execute(
      'DELETE FROM user_like WHERE user_id = ? AND class_id = ?',
      [req.session.user.id, req.params.courseId]
    )
    console.log('取消收藏', result)
    // 回覆給前端
    res.json({
      msg: '取消收藏',
    })
  }
})

app.get('/messageForm/:courseId', async (req, res, next) => {
  if (!req.session.user) {
    res.json([])
  } else {
    let [data] = await pool.query(
      'SELECT class_detail.id,class_detail.class_order_id,class_detail.class_id, class_order.user_id FROM class_detail JOIN class_order ON class_detail.class_order_id = class_order.id WHERE class_detail.class_id = ? AND class_order.user_id = ?',
      [req.params.courseId, req.session.user.id]
    )
    console.log('4564651456', req.session.user.id)
    res.json(data)
    next()
  }
})

app.get('/coursesComments', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT comment.*, user.user_name, user.user_img, class_detail.class_id FROM comment JOIN user ON comment.user_id = user.id JOIN class_detail on comment.class_detail_id = class_detail.id ORDER BY comment.create_time DESC'
  )
  res.json(data)
  next()
})

app.get('/coursesComments/:courseId', async (req, res, next) => {
  if (!req.session.user) {
    res.json([])
  } else {
    let [data] = await pool.query(
      'SELECT comment.*, user.user_name, user.user_img, class_detail.class_id FROM comment JOIN user ON comment.user_id = user.id JOIN class_detail on comment.class_detail_id = class_detail.id WHERE class_detail.class_id = ? AND comment.user_id = ? ORDER BY comment.create_time DESC',
      [req.params.courseId, req.session.user.id]
    )
    res.json(data)
    next()
  }
})

app.post('/commentsAdd', async (req, res, next) => {
  await pool.query(
    'INSERT INTO comment(user_id, order_product_id, class_detail_id, create_time, comment, star) VALUES (?,?,?,?,?,?)',
    [
      req.body.userId,
      req.body.order_product_id,
      req.body.class_detail_id,
      req.body.create_time,
      req.body.comment,
      req.body.star,
    ]
  )
  res.json({
    msg: '新增成功',
  })
  next()
})

app.get('/commenTotal', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT Count(class_id) AS total , class_detail.class_id FROM comment JOIN class_detail on comment.class_detail_id = class_detail.id GROUP BY class_id'
  )
  res.json(data)
  next()
})
app.get('/commentsPeople', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT class_id, COUNT(class_id) AS total FROM class_detail GROUP BY class_id'
  )
  res.json(data)
  next()
})

app.get('/coursesStar', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT FORMAT(AVG(star),1) AS total, class_detail.class_id FROM comment JOIN class_detail on comment.class_detail_id = class_detail.id GROUP BY class_id'
  )
  res.json(data)
  next()
})

app.get('/coursesMessages', async (req, res, next) => {
  let sql = `FROM class_message JOIN user ON class_message.user_id = user.id `

  //有送分類給後端就過濾分類
  if (!isEmpty(req.query.chapter)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += ' WHERE '
    } else {
      sql += ' AND '
    }

    sql += `class_message.chapter = "${req.query.chapter}" `
  }

  if (!isEmpty(req.query.message)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `class_message.message LIKE '%${req.query.message}%' `
  }

  let [data] = await pool.query(
    `SELECT class_message.*, user.user_name, user.user_img ${sql} ORDER BY created_time DESC`
  )
  res.json(data)
  next()
})

app.post('/coursesMessagesAdd', async (req, res, next) => {
  await pool.execute(
    'INSERT INTO class_message (class_id, user_id, chapter, message,created_time) VALUES (?,?,?,?,?)',
    [
      req.body.cousers,
      req.body.userId,
      req.body.chapter,
      req.body.message,
      req.body.created_time,
    ]
  )

  res.json({
    msg: '新增成功',
  })
  next()
})

app.post('/coursesMessagesRepalyAdd', async (req, res, next) => {
  await pool.execute(
    'INSERT INTO class_detail_message(class_message_id, user_id, replay, creat_time) VALUES (?,?,?,?)',
    [
      req.body.class_message_id,
      req.body.userId,
      req.body.replay,
      req.body.created_time,
    ]
  )
  res.json({
    msg: '回覆成功',
  })
  next()
})

app.get('/messageDetial', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT class_detail_message.*, user.user_name, user.user_img ,user.user_level_id, class_message.class_id FROM class_detail_message JOIN user ON class_detail_message.user_id = user.id JOIN class_message ON class_detail_message.class_message_id = class_message.id ORDER BY class_detail_message.creat_time DESC',
    []
  )
  res.json(data)
  next()
})

app.get('/classMessageDetailPeople', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT COUNT(class_message_id) AS total, class_message.id FROM class_detail_message JOIN class_message ON class_detail_message.class_message_id = class_message.id GROUP BY class_message_id',
    []
  )
  res.json(data)
  next()
})

app.get('/cart/cart_add/courses', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT id, user_id, class_name, class_price , class_img FROM class WHERE id >= 9 LIMIT 8'
  )
  res.json(data)
  next()
})

//cart_add-----------------------培伃------------------------
app.get('/cart/cart_add/product', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product_add.*, product_add.id AS pa_id, product.product_name, product.subject_img, product.product_price, product.spec_id ,product_spec.spec_name FROM product_add JOIN product ON product_add.product_id=product.id JOIN product_spec ON product.spec_id=product_spec.id'
  )
  res.json(data)
  next()
})

// cart-order 建立訂單
app.post('/insetCartOrder', async (req, res) => {
  // 存到資料庫
  const [r] = await pool.execute(
    'INSERT INTO orders (user_id, order_number, order_name, order_phone, order_address, pay_method, take_method, order_status, coupon_sn_id, freight, total_amount, receipt, memo, gui, carrier, order_create_time, order_valid) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      req.body.user_id,
      req.body.order_number,
      req.body.order_name,
      req.body.order_phone,
      req.body.order_address,
      req.body.pay_method,
      req.body.take_method,
      req.body.order_status,
      req.body.coupon_sn_id,
      req.body.freight,
      req.body.total_amount,
      req.body.receipt,
      req.body.memo,
      req.body.gui,
      req.body.carrier,
      req.body.order_create_time,
      req.body.order_valid,
    ]
  )

  await insertIntoDb(req.body.cartItems)
  async function insertIntoDb(cartItems) {
    for (const item of cartItems) {
      await pool.execute(
        'INSERT INTO order_product(order_id, product_id, ac_product_id, product_price, activity_price, color_id, spec_id, order_amount) VALUES (?,?,?,?,?,?,?,?)',
        [
          r.insertId,
          item.product_id,
          item.ac_product_id === undefined ? null : item.ac_product_id,
          item.product_price,
          item.activity_price === undefined ? 0 : item.activity_price,
          item.color_id,
          item.spec_id,
          item.quantity,
        ]
      )
    }
  }

  // 回覆給前端
  res.json({
    msg: '訂單創建成功',
  })
})

// cart-order_course 建立課程訂單
app.post('/insetCourseOrder', async (req, res) => {
  // 存到資料庫
  const [r] = await pool.execute(
    'INSERT INTO class_order (user_id, order_name, order_phone, order_price, class_email, pay_method, carrier, creat_date, class_order_valid) VALUES (?,?,?,?,?,?,?,?,?)',
    [
      req.body.user_id,
      req.body.order_name,
      req.body.order_phone,
      req.body.order_price,
      req.body.class_email,
      req.body.pay_method,
      req.body.carrier,
      req.body.creat_date,
      req.body.class_order_valid,
    ]
  )

  await insertIntoDb(req.body.cartItems)
  async function insertIntoDb(cartItems) {
    for (const item of cartItems) {
      console.log('------------------', [r.insertId, item.id, item.class_price])
      await pool.execute(
        'INSERT INTO class_detail(class_order_id, class_id, class_price) VALUES (?,?,?)',
        [r.insertId, item.id, item.class_price]
      )
    }
  }
  // 回覆給前端
  res.json({
    msg: '課程訂單創建成功',
  })
})

//product_color cart 使用
app.get('/product/cart/product_color_detail', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product_color_detail.*, product_color.color_name FROM product_color_detail JOIN product_color ON product_color_detail.color_id=product_color.id JOIN product ON product_color_detail.product_id=product.id'
  )
  res.json(data)
  next()
})

//product_color:id
app.get('/product/cart/product_color_detail/:test', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product_color_detail.*, product_color.color_name FROM product_color_detail JOIN product_color ON product_color_detail.color_id=product_color.id JOIN product ON product_color_detail.product_id=product.id WHERE product_id=?',
    [req.params.test]
  )
  res.json(data)
  next()
})

//cart coupon
app.get('/couponcart/:couponSN', async (req, res, next) => {
  console.log('這裡是 /couponcart/:couponSN', req.params)
  let [data] = await pool.query(
    'SELECT coupon_detail.*, coupon.sn, coupon.discount FROM coupon_detail JOIN coupon ON coupon_detail.coupon_id = coupon.id WHERE user_id=? AND coupon.sn=?',
    [req.session.user.id, req.params.couponSN]
  )
  res.json(data)
  next()
})


//Home article
app.get('/home/article', async (req, res, next) => {
  console.log('這裡是 /home/article')
  let [data] = await pool.query(
    'SELECT article.*, article_category.category_name FROM article JOIN article_category ON article.article_category_id = article_category.id WHERE article.article_category_id=4')
  res.json(data)
  next()
})

//product----------------------米花--------------------------

app.get('/product', async (req, res, next) => {
  const page = req.query.page || 1

  let sql = `
    FROM product
    JOIN product_category ON product.category_id = product_category.id
    JOIN product_spec ON product.spec_id = product_spec.id
    LEFT JOIN user_like ON product.id = user_like.product_id
    LEFT JOIN product_color_detail ON product.id = product_color_detail.product_id
    LEFT JOIN product_color ON product_color.id = product_color_detail.color_id `

  //有送名稱搜尋給後端就過濾名稱
  if (!isEmpty(req.query.product_name)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `product.product_name LIKE '%${req.query.product_name}%' `
  }

  //有送分類給後端就過濾分類
  if (!isEmpty(req.query.category_name)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `product_category.category_name = '${req.query.category_name}' `
  }

  //有送規格給後端就過濾規格
  if (!isEmpty(req.query.spec_name)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `product_spec.spec_name = '${req.query.spec_name}' `
  }

  // 有送顏色給後端就過濾顏色
  if (!isEmpty(req.query.color_name)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `product_color.color_name = '${req.query.color_name}' `
  }

  // 有送價格給後端就過濾價格
  if (
    !isEmpty(req.query.product_price_start) &&
    !isEmpty(req.query.product_price_end)
  ) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `
      product.product_price >= '${req.query.product_price_start}' AND 
      product.product_price <= '${req.query.product_price_end}'
    `
  }

  // 頁碼
  let [results] = await pool.query(
    `SELECT COUNT(DISTINCT product.id) AS total ${sql}`
  )
  const total = results[0].total

  const perPage = 16
  const totalPage = Math.ceil(total / perPage)

  const limit = perPage
  const offset = perPage * (page - 1)
  const nextPage = parseInt(page) + 1
  const prevPage = page - 1

  sql += `
    GROUP BY product.id
    ORDER BY product.create_time DESC
  `
  // 資料
  let [data] = await pool.query(
    `SELECT
      product.*,
      product_category.category_name,
      product_spec.spec_name,
      GROUP_CONCAT(color_name separator ',') AS color_name
    ${sql}
    LIMIT ? OFFSET ?`,
    [limit, offset]
  )
  return res.json({
    pagination: {
      total,
      perPage,
      totalPage,
      page,
      nextPage,
      prevPage,
    },
    data,
  })
  next()
})

app.get('/product/:productId', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product.*,  product_category.category_name, product_spec.spec_name FROM product JOIN product_category ON product.category_id=product_category.id JOIN  product_spec ON product.spec_id=product_spec.id WHERE product.id=?',
    [req.params.productId]
  )
  res.json(data)
  next()
})

app.get(
  '/product/product_category/:categoryId/productdetail/:productId',
  async (req, res, next) => {
    console.log(
      '/product/product_category/:categoryId/productdetail/:productId => ',
      req.params.productId,
      req.params.categoryId
    )
    let [data] = await pool.query(
      'SELECT product.*,  product_category.category_name, product_spec.spec_name FROM product JOIN product_category ON product.category_id=product_category.id JOIN  product_spec ON product.spec_id=product_spec.id WHERE product.id=? AND category_id=?',
      [req.params.productId, req.params.categoryId]
    )
    res.json(data)
    next()
  }
)

//隨機取20個商品
app.get('/randproduct', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT * FROM product ORDER BY RAND() LIMIT 20'
  )
  res.json(data)
  next()
})

//product_category(分類篩選)
app.get('/product/product_category/:categoryId', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product.*,  product_category.category_name, product_spec.spec_name FROM product JOIN product_category ON product.category_id=product_category.id JOIN  product_spec ON product.spec_id=product_spec.id WHERE category_id=?',
    [req.params.categoryId]
  )
  res.json(data)
  next()
})

//product_img
app.get('/product_img', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM product_img')
  res.json(data)
  next()
})

app.get('/product/product_img/:productId', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT * FROM product_img WHERE product_id=?',
    [req.params.productId]
  )
  res.json(data)
  next()
})

//product_color
app.get('/product_color', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM product_color')
  res.json(data)
  next()
})

app.get('/product/product_color/:colorId', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM product_color  WHERE id=?', [
    req.params.colorId,
  ])
  res.json(data)
  next()
})

//product_color_detail
app.get('/product_color_detail', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product_color_detail.*, product_color.color_name, product_color.rgb FROM product_color_detail JOIN product_color ON product_color_detail.color_id=product_color.id JOIN product ON product_color_detail.product_id=product.id'
  )
  res.json(data)
  next()
})

//針對產品有甚麼顏色(加入購物車時產品挑顏色)
app.get('/product/product_color_detail/:productId', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product_color_detail.*, product_color.color_name, product_color.rgb FROM product_color_detail JOIN product_color ON product_color_detail.color_id=product_color.id JOIN product ON product_color_detail.product_id=product.id WHERE product.id=?',
    [req.params.productId]
  )
  res.json(data)
  next()
})

//針對顏色有甚麼產品(顏色搜尋產品)
app.get('/product/product_color_detail/color/', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT product_color_detail.*, product_color.color_name, product_color.rgb FROM product_color_detail JOIN product_color ON product_color_detail.color_id=product_color.id JOIN product ON product_color_detail.product_id=product.id'
  )
  res.json(data)
  next()
})

//product_spec
app.get('/product_spec', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM product_spec')
  res.json(data)
  next()
})

app.get('/product_spec/:specId', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM product_spec WHERE id=?', [
    req.params.specId,
  ])
  res.json(data)
  next()
})

//product comment
app.get('/product/:productId/comment', async (req, res, next) => {
  let [data] = await pool.query(
    'SELECT comment.*, user.user_img, user.user_name, order_product.product_id FROM comment JOIN user ON comment.user_id = user.id JOIN order_product ON comment.order_product_id = order_product.id WHERE product_id=? ORDER BY create_time DESC',
    [req.params.productId]
  )
  res.json(data)
  next()
})

//訂單畫面 order --------------------10-----------------------------
app.get('/user/orders/:userID', async (req, res, next) => {
  console.log('這裡是 /user/orders')
  let [data] = await pool.query(
    'SELECT orders.*,product.subject_img FROM orders JOIN user ON orders.user_id = user.id JOIN order_product ON orders.id = order_product.order_id JOIN product ON order_product.product_id = product.id WHERE orders.user_id=? GROUP BY orders.id ORDER BY id DESC',
    [req.params.userID]
  )
  res.json(data)
  next()
})

// 訂單詳細頁面
app.get('/orders/:ordersID', async (req, res, next) => {
  console.log('這裡是 /orders/:ordersID')
  let [data] = await pool.query(
    'SELECT orders.*, coupon.discount_name,coupon.sn,coupon.discount FROM orders JOIN user ON orders.user_id = user.id JOIN coupon ON orders.coupon_sn_id = coupon.id WHERE orders.id=?',
    [req.params.ordersID]
  )
  res.json(data)
  next()
})


//訂單詳細頁面商品
app.get('/orders/:ordersID/order_product', async (req, res, next) => {
  console.log('這裡是 /order_product')
  let [data] = await pool.query(
    'SELECT order_product.*, orders.user_id, product_color.color_name, product.product_name, product.subject_img,  product_spec.spec_name ,order_product.order_amount FROM order_product JOIN product_color ON order_product.color_id = product_color.id JOIN product ON order_product.product_id = product.id JOIN product_spec ON product.spec_id = product_spec.id JOIN orders ON order_product.order_id = orders.id WHERE orders.id=? ',
    [req.params.ordersID]
  )
  res.json(data)
  next()
})

// 會員訂單編輯
app.get('/orders/update/:ordersID', async (req, res, next) => {
  console.log('這裡是 /orders/update/:ordersID', req.params.ordersID)
  let [data] = await pool.query('SELECT * FROM orders WHERE orders.id=?', [
    req.params.ordersID,
  ])
  res.json(data)
  next()
})

// 會員訂單編輯
app.put('/orders/updateStatus/:ordersID', async (req, res, next) => {
  console.log('這裡是 /orders/updateStatus/:ordersID', req.params.ordersID) // req.params.ordersID 取得網址冒號後面的變數
  let [data] = await pool.execute(
    'UPDATE orders SET order_status=? WHERE id=? ',
    [(req.order_status = 5), req.params.ordersID]
  )
  res.json({
    msg: '訂單取消成功',
  })
  next()
})

app.get('/user/class_order/:userID', async (req, res, next) => {
  console.log('這裡是 user/class_order/:userID')
  let [data] = await pool.query(
    'SELECT class_order.* ,class_detail.*,class.class_name,class.class_img FROM class_order JOIN user ON class_order.user_id = user.id JOIN class_detail ON class_order.id = class_detail.class_order_id JOIN class ON class_detail.class_id = class.id WHERE class_order.user_id=?',
    [req.params.userID]
  )
  res.json(data)
  next()
})

//產品評論資料庫
app.get('/orderComment/:orderID', async (req, res, next) => {
  console.log('*********',req.session.user)
  console.log('這裡是 /orderComment')
  let [data] = await pool.query('SELECT comment.*,order_product.order_id FROM comment JOIN order_product ON comment.order_product_id = order_product.id WHERE user_id=? AND order_product.order_id=?',[req.session.user.id, req.params.orderID])
  res.json(data)
  next()
})

//新增產品評論
app.post('/insetComment', async (req, res, next) => {
  // 存到資料庫
  const values = req.body.user_ids.map((v, i) => {
    return [v, req.body.order_product_ids[i], req.body.create_time, req.body.comments[i]]
  })
  let result = await pool.query(
    'INSERT INTO comment ( user_id, order_product_id, create_time, comment ) VALUES ?',
    [values]
  )
  // 回覆給前端
  res.json({
    msg: '評論成功',
  })
})

//coupon
app.get('/user/coupon_detail/:userID', async (req, res, next) => {
  console.log('這裡是 user/coupon_detail/:userID')

  let [data] = await pool.query(
    'SELECT coupon_detail.* ,coupon.coupon_name,coupon.start_time ,coupon.end_time,coupon.coupon_img ,coupon.sn FROM coupon_detail JOIN coupon ON coupon_detail.coupon_id = coupon.id WHERE coupon_detail.user_id=?',
    [req.params.userID]
  )
  res.json(data)
  next()
})

// rehearsal--------------------------欣玫---------------------------------------------
app.get('/rehearsal', async (req, res, next) => {
  console.log('這裡是 /rehearsal')
  let [data] = await pool.query('SELECT * FROM rehearsal')
  res.json(data)
  next()
})

app.get('/rehearsal/:rehearsalId', async (req, res, next) => {
  console.log('/rehearsal/:rehearsalId => ', req.params.rehearsalId)
  let [data] = await pool.query('SELECT * FROM rehearsal WHERE id=?', [
    req.params.rehearsalId,
  ])
  res.json(data)
  next()
})

app.get('/rehearsal_img/', async (req, res, next) => {
  console.log('這裡是 /rehearsal')
  let [data] = await pool.query('SELECT * FROM rehearsal_img')
  res.json(data)
  next()
})

//預約練團室
app.post('/rehearsal_reserve', async (req, res) => {
 console.log('',req.params.rehearsalId)
  // 存到資料庫
  let result = await pool.execute(
    'INSERT INTO rehearsal_reserve (user_id, rehearsal_user_name, rehearsal_id, rehearsal_mail, rehearsal_userphone, order_price, reserve_date, reserve_time_start, resever_valid) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?);',
    [
      req.body.user_id,
      req.body.name,
      req.body.rehearsal,
      req.body.email,
      req.body.phone,
      req.body.price,
      req.body.reserve_date,
      req.body.reserve_time_start,
      1,
    ]
  )
  console.log('rehearsal_reserve: insert to db', result)
  // 回覆給前端
  res.json({
    msg: '預約成功',
  })
})

// 練團室多圖
app.get('/rehearsal_img/:rehearsalId', async (req, res, next) => {
  console.log('/rehearsal_img/:rehearsalId => ', req.params.rehearsalId)
  let [data] = await pool.query(
    'SELECT * FROM rehearsal_img WHERE rehearsal_id=?',
    [req.params.rehearsalId]
  )
  res.json(data)
  next()
})

// acproduct---------------------------欣玫--------------------------------------------
app.get('/activity/acproduct', async (req, res) => {
  console.log('/activity/acproduct => ', req.params.activity_productID)
  let [data] = await pool.query(
    'SELECT activity_product.* , product.* ,product_spec.spec_name FROM activity_product JOIN product ON activity_product.product_id =product.id JOIN product_spec ON product.spec_id =product_spec.id WHERE activity_product.id = 9'
  )
})

app.get('/activity', async (req, res, next) => {
  console.log('這裡是 /activity')
  let [data] = await pool.query(
    'SELECT activity.* , coupon.discount_name, coupon.discount FROM activity JOIN coupon ON activity.coupon_sn = coupon.sn WHERE activity.id=1'
  )
  res.json(data)
  next()
})

app.get('/activity/:activityId', async (req, res, next) => {
  console.log('/activity/:activityId => ', req.params.activityId)
  let [data] = await pool.query(
    'SELECT activity.* , coupon.discount_name, coupon.discount FROM activity JOIN coupon ON activity.coupon_sn = coupon.sn WHERE id=?',
    [req.params.activityId]
  )
  res.json(data)
  next()
})

app.get('/acproduct', async (req, res, next) => {
  console.log('這裡是 /acproduct')
  let [data] = await pool.query(
    'SELECT activity_product.* , product.product_name, product.subject_img, product.spec_id, product.product_price, product.information, product.spec_decration	 ,product_spec.spec_name FROM activity_product JOIN product ON activity_product.product_id =product.id JOIN product_spec ON product.spec_id =product_spec.id'
  )
  res.json(data)
  next()
})

app.get('/acproduct/:activityProductID', async (req, res, next) => {
  console.log('/activity/acproduct/:activityProductID => ', req.params.activityProductID)
  let [data] = await pool.query(
    'SELECT activity_product.* , product.product_name, product.subject_img, product.spec_id, product.product_price, product.information, product.spec_decration	 ,product_spec.spec_name FROM activity_product JOIN product ON activity_product.product_id =product.id JOIN product_spec ON product.spec_id =product_spec.id WHERE activity_product.id = ?',
    [req.params.activityProductID]
  )
  res.json(data)
  next()
})

//POST優惠券
app.post('/ActivityCoupon', async (req, res) => {
  console.log('ActivityCoupon',req.body)
   // 存到資料庫
   let result = await pool.execute("INSERT INTO coupon_detail (coupon_id , user_id , status) VALUES (?,?,?);", [ req.coupon_id=3, req.body.user_id ,req.status=1]);
   console.log('ActivityCoupon: insert to db', result);
   // 回覆給前端
   res.json({
     msg:'領取成功'
   })
 });

//活動商品隨機取4個商品
app.get('/randacproduct', async (req, res, next) => {
  console.log('隨機取4個商品')
  let [data] = await pool.query(
    'SELECT activity_product.*, product.subject_img, product.product_price,product.product_name FROM activity_product JOIN product ON activity_product.product_id = product.id ORDER BY RAND() LIMIT 4')
  res.json(data)
  next()
})

app.get('/users/userlevel_like/:userLevelId', async (req, res, next) => {
  console.log('這裡是 /users/userlevel_like', req.params.userLevelId)
  let [data] = await pool.query(
    'SELECT COUNT(product_id) AS p_total, COUNT(class_id) AS c_total FROM user_like WHERE user_id=? ',
    [req.params.userLevelId]
  )
  console.log(data)
  res.json(data)
  next()
})

app.get('/users/userlevel_coupon/:userLevelId', async (req, res, next) => {
  console.log('這裡是 /users/userlevel_coupon', req.params.userLevelId)
  let [data] = await pool.query(
    'SELECT coupon_detail.user_id, COUNT(coupon_detail.user_id) AS total FROM coupon_detail WHERE user_id=? AND coupon_detail.status=1 GROUP BY coupon_detail.user_id; ',
    [req.params.userLevelId]
  )
  console.log(data)
  res.json(data)
  next()
})

app.get('/users/userlevelname/:userLevelId', async (req, res, next) => {
  console.log('這裡是 /users/userlevelname', req.params.userLevelId)
  let [data] = await pool.query(
    ' SELECT user.* , user_level.level_name FROM user JOIN user_level ON user.user_level_id = user_level.id WHERE user.id=?',
    [req.params.userLevelId]
  )
  res.json(data)
  next()
})

//QuesionDetail--------------浩然----------------------
app.get('/user/quesion/quesionDetail', async (req, res, next) => {
  // 頁碼
  const page = req.query.page || 1
  let [results] = await pool.query(`SELECT COUNT(*) AS total FROM question WHERE user_id=?`, [req.session.user.id])

  const total = results[0].total

  const perPage = 5
  const totalPage = Math.ceil(total / perPage)

  const limit = perPage
  const offset = perPage * (page - 1)
  const nextPage = parseInt(page) + 1
  const prevPage = page - 1

  // 資料
  let [data] = await pool.query(
    `SELECT * FROM question WHERE user_id=? ORDER BY create_time DESC LIMIT ? OFFSET ? `,
    [req.session.user.id, limit, offset]
  )

  res.json({
    pagination: {
      total,
      perPage,
      totalPage,
      page,
      nextPage,
      prevPage,
    },
    data,
  })
  next()
})

app.get('/answer', async (req, res, next) => {
  let [data] = await pool.query('SELECT * FROM answer')
  res.json(data)
  next()
})

//新增Quesion----------------------------------
app.post('/user/quesion', async (req, res, next) => {
  console.log('這裡是 /Quesion', req.body, req.session.user)
  // 存到資料庫
  let result = await pool.execute(
    'INSERT INTO question (user_id, create_time, message) VALUES (?, ?, ?);',
    [req.session.user.id, req.body.create_time, req.body.message]
  )
  console.log('register: insert to db', result)
  // 回覆給前端
  res.json({
    msg: '提問成功',
  })
  next()
})

//news--------------------------------------------
app.get('/news', async (req, res, next) => {
  console.log('這裡是 /news')
  const page = req.query.page || 1

  let sql = `
    FROM article
    JOIN article_category ON article.article_category_id = article_category.id
    `

  //有送分類給後端就過濾分類
  if (!isEmpty(req.query.category_name)) {
    // 判斷有沒有 WHERE，沒有的話要加上 WHERE，否則加上 AND
    if (sql.indexOf('WHERE') === -1) {
      sql += 'WHERE '
    } else {
      sql += 'AND '
    }

    sql += `article_category.category_name = '${req.query.category_name}' `
  }
  //pages
  let [results] = await pool.query(
    `SELECT COUNT(DISTINCT article.id) AS total ${sql}`
  )
  const total = results[0].total

  const perPage = 4
  const totalPage = Math.ceil(total / perPage)
  const limit = perPage
  const offset = perPage * (page - 1)
  const nextPage = parseInt(page) + 1
  const prevPage = page - 1

  sql += `
  GROUP BY article.id
  ORDER BY article.create_time DESC
`

  // 資料
  let [data] = await pool.query(
    `SELECT
    article.*,
    article_category.category_name
    ${sql}
    LIMIT ? OFFSET ?`,
    [limit, offset]
  )
  res.json({
    pagination: {
      total,
      perPage,
      totalPage,
      page,
      nextPage,
      prevPage,
    },
    data,
  })
  next()
})

//NewsDetail
app.get('/news/:itemID', async (req, res, next) => {
  console.log('這裡是 /news/NewsDetail')
  let [data] = await pool.query(
    'SELECT article.* FROM article_category JOIN article ON article_category.id=article.article_category_id WHERE article.id=? ',
    [req.params.itemID]
  )
  res.json(data)
  next()
})

//產品收藏 ---------------------------------------------------------------
app.get('/users/user_like_get_all', async (req, res, next) => {
  console.log('這裡是 收藏')
  let [data] = await pool.query(
    'SELECT user_like.*, product_category.*, product.product_name, product.product_price, product.subject_img FROM user_like JOIN product ON user_like.product_id = product.id JOIN product_category ON product_category.id = product.category_id'
  )
  res.json(data)
  next()
})

//產品single
app.get('/users/user_like_get/:productId', async (req, res, next) => {
  console.log('這裡是 單一產品收藏')
  if (!req.session.user) {
    res.json([])
  } else {
    let [data] = await pool.query(
      'SELECT user_like.*, product_category.category_name, product.product_name, product.product_price, product.subject_img FROM user_like JOIN product ON user_like.product_id = product.id JOIN product_category ON product_category.id = product.category_id WHERE user_id=? AND user_like.product_id=?',
      [req.session.user.id, req.params.productId]
    )
    res.json(data)
    next()
  }
})

//產品加入收藏
app.post('/users/user_like_add', async (req, res, next) => {
  // console.log(req.session.user.id, req.body.product_id)
  // 存到資料庫
  if (!req.session.user) {
    res.json([])
  } else {
    let result = await pool.execute(
      'INSERT INTO user_like ( user_id, product_id ) VALUES ( ?,?)',
      [req.session.user.id, req.body.product_id]
    )

    console.log('加入收藏', result)
    // 回覆給前端
    res.json({
      msg: '加入收藏',
    })
  }
})

//產品取消收藏
app.delete('/users/user_like_delete/:productId', async (req, res, next) => {
  // 存到資料庫
  if (!req.session.user) {
    res.json([])
  } else {
    let result = await pool.execute(
      'DELETE FROM user_like WHERE user_id = ? AND product_id = ?',
      [req.session.user.id, req.params.productId]
    )

    // 回覆給前端
    res.json({
      msg: '取消收藏',
    })
  }
})

app.listen(3001, () => {
  console.log(`Server running at port 3001.`)
})
