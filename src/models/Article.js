const { pool } = require('../config/database');

class Article {
  // 创建文章
  static async create(title, content, category, tags, cover, authorId) {
    try {
      const [result] = await pool.execute(
        `INSERT INTO articles (title, content, category, tags, cover, author_id) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, category, JSON.stringify(tags), cover, authorId]
      );
      
      // 返回创建的文章
      return await this.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // 获取文章列表（支持分页、分类筛选、搜索）
  static async getList({ page = 1, pageSize = 10, category, keyword }) {
    try {
      let whereClause = '';
      let params = [];
      let countParams = [];

      // 分类筛选
      if (category) {
        whereClause += 'WHERE category = ?';
        params.push(category);
        countParams.push(category);
      }

      // 搜索功能
      if (keyword) {
        whereClause += whereClause ? ' AND ' : 'WHERE ';
        whereClause += '(title LIKE ? OR content LIKE ?)';
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam);
        countParams.push(keywordParam, keywordParam);
      }

      // 计算偏移量
      const offset = (page - 1) * pageSize;

      // 获取文章列表
      const [articles] = await pool.execute(
        `SELECT id, title, content, cover, category, tags, author_id, views, created_at, updated_at 
         FROM articles 
         ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      // 获取总数
      const [countResult] = await pool.execute(
        `SELECT COUNT(*) as total 
         FROM articles 
         ${whereClause}`,
        countParams
      );

      return {
        list: articles,
        total: countResult[0].total,
        page,
        pageSize,
        pages: Math.ceil(countResult[0].total / pageSize)
      };
    } catch (error) {
      throw error;
    }
  }

  // 获取文章详情（浏览次数+1）
  static async findById(id) {
    try {
      // 开始事务
      await pool.execute('START TRANSACTION');
      
      // 浏览次数+1
      await pool.execute(
        'UPDATE articles SET views = views + 1 WHERE id = ?',
        [id]
      );
      
      // 获取文章详情
      const [articles] = await pool.execute(
        `SELECT id, title, content, cover, category, tags, author_id, views, created_at, updated_at 
         FROM articles 
         WHERE id = ?`,
        [id]
      );
      
      // 提交事务
      await pool.execute('COMMIT');
      
      return articles[0] || null;
    } catch (error) {
      // 回滚事务
      await pool.execute('ROLLBACK');
      throw error;
    }
  }

  // 更新文章
  static async update(id, updates, authorId) {
    try {
      // 检查文章是否存在且属于当前用户
      const [articles] = await pool.execute(
        'SELECT id FROM articles WHERE id = ? AND author_id = ?',
        [id, authorId]
      );
      
      if (!articles.length) {
        return null;
      }

      // 构建更新语句
      const fields = [];
      const values = [];
      
      if (updates.title) {
        fields.push('title = ?');
        values.push(updates.title);
      }
      
      if (updates.content) {
        fields.push('content = ?');
        values.push(updates.content);
      }
      
      if (updates.category) {
        fields.push('category = ?');
        values.push(updates.category);
      }
      
      if (updates.tags) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
      }
      
      if (updates.cover) {
        fields.push('cover = ?');
        values.push(updates.cover);
      }

      if (fields.length === 0) {
        return await this.findById(id);
      }

      // 执行更新
      await pool.execute(
        `UPDATE articles SET ${fields.join(', ')} WHERE id = ?`,
        [...values, id]
      );
      
      // 返回更新后的文章
      return await this.findById(id);
    } catch (error) {
      throw error;
    }
  }

  // 删除文章
  static async delete(id, authorId) {
    try {
      // 检查文章是否存在且属于当前用户
      const [articles] = await pool.execute(
        'SELECT id FROM articles WHERE id = ? AND author_id = ?',
        [id, authorId]
      );
      
      if (!articles.length) {
        return false;
      }

      // 执行删除
      const [result] = await pool.execute(
        'DELETE FROM articles WHERE id = ? AND author_id = ?',
        [id, authorId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Article;