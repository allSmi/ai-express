const express = require("express");
const cors = require("cors");
const { testConnection } = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const articleRoutes = require("./routes/articleRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const app = express();

// 中间件配置
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3001"], // 前端开发服务器地址
    credentials: true, // 允许携带凭证
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 测试数据库连接
testConnection();

// 路由配置
app.get("/", (req, res) => {
  res.json({ message: "Express 后端服务运行正常" });
});

// 认证路由
app.use("/api/auth", authRoutes);

// 文章路由
app.use("/api/posts", articleRoutes);

// 上传路由
app.use("/api/upload", uploadRoutes);

// 测试路由
app.get("/api/test", (req, res) => {
  res.json({ message: "测试路由工作正常" });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ message: "接口不存在" });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "服务器内部错误" });
});

module.exports = app;
