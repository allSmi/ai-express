const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { authenticateToken } = require("../middleware/auth");

// 配置存储位置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // 上传文件保存的目录
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = file.originalname.split(".").pop();
    cb(null, file.fieldname + "-" + uniqueSuffix + "." + fileExtension);
  },
});

// 创建 multer 实例
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 文件大小限制：10MB
  },
});

// 处理单个文件上传（需要登录）
router.post("/single", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "请选择要上传的文件" });
  }

  res.json({
    message: "文件上传成功",
    file: {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
    },
    body: req.body,
  });
});

// 处理多个文件上传（需要登录）
router.post(
  "/multiple",
  authenticateToken,
  upload.array("files", 5),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "请选择要上传的文件" });
    }

    const files = req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      size: file.size,
    }));

    res.json({
      message: "文件上传成功",
      files,
      body: req.body,
    });
  },
);

// 处理多个不同字段的文件上传（需要登录）
router.post(
  "/multifields",
  authenticateToken,
  upload.fields([
    { name: "avatar", maxCount: 1 }, // 头像：最多1个文件
    { name: "cover", maxCount: 1 }, // 封面图：最多1个文件
    { name: "background", maxCount: 1 }, // 背景图：最多1个文件
  ]),
  (req, res) => {
    // 获取不同字段的文件
    const avatar = req.files.avatar ? req.files.avatar[0] : null;
    const cover = req.files.cover ? req.files.cover[0] : null;
    const background = req.files.background ? req.files.background[0] : null;

    // 获取文本字段
    const username = req.body.username;

    res.json({
      message: "多字段文件上传成功",
      files: {
        avatar: avatar
          ? {
              filename: avatar.filename,
              originalname: avatar.originalname,
              path: avatar.path,
              size: avatar.size,
            }
          : null,
        cover: cover
          ? {
              filename: cover.filename,
              originalname: cover.originalname,
              path: cover.path,
              size: cover.size,
            }
          : null,
        background: background
          ? {
              filename: background.filename,
              originalname: background.originalname,
              path: background.path,
              size: background.size,
            }
          : null,
      },
      body: req.body,
    });
  },
);

// 处理 JSON 中的 Base64 图片上传
router.post("/json", authenticateToken, (req, res) => {
  try {
    const { title, description, image } = req.body;

    // 验证必要字段
    if (!image) {
      return res.status(400).json({ message: "请提供图片数据" });
    }

    // 提取 Base64 数据（移除 data:image/xxx;base64, 前缀）
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // 验证文件大小（约 10MB 图片的 Base64 大小）
    if (base64Data.length > 10 * 1024 * 1024 * 1.33) {
      return res.status(400).json({ message: "图片大小不能超过 10MB" });
    }

    // 解码 Base64 为二进制数据
    const binaryData = Buffer.from(base64Data, "base64");

    // 生成唯一文件名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `json-image-${uniqueSuffix}.png`;
    const filepath = path.join(__dirname, "../../uploads", filename);

    // 写入文件
    fs.writeFileSync(filepath, binaryData);

    res.json({
      message: "图片上传成功",
      file: {
        filename,
        path: filepath,
        size: binaryData.length,
      },
      body: { title, description },
    });
  } catch (error) {
    console.error("处理图片失败:", error);
    res.status(500).json({ message: "图片处理失败，请稍后重试" });
  }
});

module.exports = router;
