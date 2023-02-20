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
  
  app.post('/coursesLikeAdd', async (req, res) => {
    if (!req.session.user) {
      res.json([])
    } else {
      let result = await pool.execute(
        'INSERT INTO user_like ( user_id, class_id ) VALUES ( ?, ?)',
        [req.session.user.id, req.body.class_id]
      )
      console.log('加入收藏', result)
      res.json({
        msg: '加入收藏',
      })
    }
  })
  
  app.delete('/coursesLikeAdd/:courseId', async (req, res) => {
    if (!req.session.user) {
      res.json([])
    } else {
      let result = await pool.execute(
        'DELETE FROM user_like WHERE user_id = ? AND class_id = ?',
        [req.session.user.id, req.params.courseId]
      )
      console.log('取消收藏', result)
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
  
    if (!isEmpty(req.query.chapter)) {
      if (sql.indexOf('WHERE') === -1) {
        sql += ' WHERE '
      } else {
        sql += ' AND '
      }
  
      sql += `class_message.chapter = "${req.query.chapter}" `
    }
  
    if (!isEmpty(req.query.message)) {
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
  