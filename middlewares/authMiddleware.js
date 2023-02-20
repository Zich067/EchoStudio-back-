function checkLogin(req, res, next) {
    if (req.session.user) {
      next();
    } else {
      return res.status(400).json({ msg: '尚未登入' });
    }
  }
  
  module.exports = {
    checkLogin,
  };  