const express = require('express')
const router = express.Router()
const { checkLogin } = require('../middlewares/authMiddleware')

// router.get('/',(req, res, next)=>{
//   if (req.session.user) {
//     // session 有資料，表示登入過
//     res.json(req.session.user)
//   } else {
//     // req.session 沒有 member 這個值 -> 尚未登入
//     res.status(400).json({ msg: '尚未登入' });
//   }
// })

// GET /api/users
router.get('/', checkLogin, (req, res, next) => {
  // 能夠通過 checkLogin 中間件，表示一定一定有 req.session.user -> 一定是登入後
  return res.json(req.session.user)
})

// router.get('/orders', checkLogin, (req, res, next) => {
//   // 能夠通過 checkLogin 中間件，表示一定一定有 req.session.user -> 一定是登入後
//   // 安心地使用 req.session.user.id 去資料庫拿這個 id 的訂單
//   res.json(req.session.user);
// });

module.exports = router
