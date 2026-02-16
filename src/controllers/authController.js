const User = require('../models/User');
const jwt = require('jsonwebtoken');

// JWT密钥（实际项目中应放在环境变量中）
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

// 验证注册参数
function validateRegisterData(req, res, next) {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: '用户名、邮箱和密码不能为空' });
  }
  
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ message: '用户名长度必须在3-20个字符之间' });
  }
  
  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ message: '邮箱格式不正确' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ message: '密码长度至少为6位' });
  }
  
  next();
}

// 验证登录参数
function validateLoginData(req, res, next) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ message: '用户名和密码不能为空' });
  }
  
  next();
}

// 生成JWT token
function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// 注册控制器
async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户名是否已存在
    const existingUserByUsername = await User.findByUsername(username);
    if (existingUserByUsername) {
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 检查邮箱是否已存在
    const existingUserByEmail = await User.findByEmail(email);
    if (existingUserByEmail) {
      return res.status(400).json({ message: '邮箱已存在' });
    }
    
    // 创建新用户
    const newUser = await User.create(username, email, password);
    
    // 生成token
    const token = generateToken(newUser.id);
    
    res.status(201).json({
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      },
      token
    });
  } catch (error) {
    console.error('注册失败:', error.message);
    res.status(500).json({ message: '注册失败，请稍后重试' });
  }
}

// 登录控制器
async function login(req, res) {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 验证密码
    const isPasswordValid = await User.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }
    
    // 生成token
    const token = generateToken(user.id);
    
    res.status(200).json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('登录失败:', error.message);
    res.status(500).json({ message: '登录失败，请稍后重试' });
  }
}

module.exports = {
  validateRegisterData,
  validateLoginData,
  register,
  login
};