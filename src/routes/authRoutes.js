const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// 注册接口
router.post('/register', authController.validateRegisterData, authController.register);

// 登录接口
router.post('/login', authController.validateLoginData, authController.login);

module.exports = router;