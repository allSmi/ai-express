const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authenticateToken } = require('../middleware/auth');

// 创建文章（需要登录）
router.post('/', authenticateToken, articleController.validateCreateArticle, articleController.createArticle);

// 获取文章列表（无需登录）
router.get('/', articleController.getArticleList);

// 获取文章详情（无需登录）
router.get('/:id', articleController.getArticleDetail);

// 更新文章（需要登录，只能更新自己的文章）
router.put('/:id', authenticateToken, articleController.updateArticle);

// 删除文章（需要登录，只能删除自己的文章）
router.delete('/:id', authenticateToken, articleController.deleteArticle);

module.exports = router;