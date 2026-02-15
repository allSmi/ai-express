const express = require('express');
const { testConnection } = require('./config/database');

const app = express();

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 测试数据库连接
testConnection();

// 路由配置（后续可根据需要添加）
app.get('/', (req, res) => {
  res.json({ message: 'Express 后端服务运行正常' });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ message: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器内部错误' });
});

module.exports = app;