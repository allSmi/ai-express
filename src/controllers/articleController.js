const Article = require("../models/Article");

// 验证创建文章的参数
function validateCreateArticle(req, res, next) {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "标题和内容不能为空" });
  }

  if (title.length < 1 || title.length > 255) {
    return res.status(400).json({ message: "标题长度必须在1-255个字符之间" });
  }

  next();
}

// 创建文章
async function createArticle(req, res) {
  try {
    const { title, content, category, tags, cover } = req.body;
    const authorId = req.user.id; // 从认证中间件获取用户ID

    // 创建文章
    const article = await Article.create(
      title,
      content,
      category,
      tags || [],
      cover,
      authorId,
    );

    res.status(201).json({
      message: "创建文章成功",
      article,
    });
  } catch (error) {
    console.error("创建文章失败:", error.message);
    res.status(500).json({ message: "创建文章失败，请稍后重试" });
  }
}

// 获取文章列表
async function getArticleList(req, res) {
  try {
    // 解析查询参数
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const category = req.query.category;
    const keyword = req.query.keyword;

    // 获取文章列表
    const result = await Article.getList({ page, pageSize, category, keyword });

    res.status(200).json({
      message: "获取文章列表成功",
      data: result,
    });
  } catch (error) {
    console.error("获取文章列表失败:", error.message);
    res.status(500).json({ message: "获取文章列表失败，请稍后重试" });
  }
}

// 获取文章详情
async function getArticleDetail(req, res) {
  try {
    const { id } = req.params;

    // 获取文章详情
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: "文章不存在" });
    }

    res.status(200).json({
      message: "获取文章详情成功",
      article,
    });
  } catch (error) {
    console.error("获取文章详情失败:", error.message);
    res.status(500).json({ message: "获取文章详情失败，请稍后重试" });
  }
}

// 更新文章
async function updateArticle(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    const authorId = req.user.id; // 从认证中间件获取用户ID

    // 更新文章
    const article = await Article.update(id, updates, authorId);

    if (!article) {
      return res.status(404).json({ message: "文章不存在或无权限更新" });
    }

    res.status(200).json({
      message: "更新文章成功",
      article,
    });
  } catch (error) {
    console.error("更新文章失败:", error.message);
    res.status(500).json({ message: "更新文章失败，请稍后重试" });
  }
}

// 删除文章
async function deleteArticle(req, res) {
  try {
    const { id } = req.params;
    const authorId = req.user.id; // 从认证中间件获取用户ID

    // 删除文章
    const success = await Article.delete(id, authorId);

    if (!success) {
      return res.status(404).json({ message: "文章不存在或无权限删除" });
    }

    res.status(200).json({
      message: "删除文章成功",
    });
  } catch (error) {
    console.error("删除文章失败:", error.message);
    res.status(500).json({ message: "删除文章失败，请稍后重试" });
  }
}

module.exports = {
  validateCreateArticle,
  createArticle,
  getArticleList,
  getArticleDetail,
  updateArticle,
  deleteArticle,
};
