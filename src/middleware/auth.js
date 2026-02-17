const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥（与控制器中保持一致）
const JWT_SECRET = process.env.JWT_SECRET;

// 验证JWT token的中间件
async function authenticateToken(req, res, next) {
  try {
    // 从请求头获取token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ message: '未提供认证token' });
    }
    
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    // 将用户信息添加到请求对象中
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '认证token已过期' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '认证token无效' });
    }
    console.error('认证失败:', error.message);
    res.status(500).json({ message: '认证失败，请稍后重试' });
  }
}

module.exports = {
  authenticateToken
};