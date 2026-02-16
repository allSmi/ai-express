实现用户注册和登录功能：

注册接口（POST /api/auth/register）：
- 接收 username、email、password
- 验证参数（用户名 3-20 字符，邮箱格式正确，密码至少 6 位）
- 检查用户名和邮箱是否已存在
- 密码用 bcrypt 加密
- 保存到数据库
- 返回成功信息

登录接口（POST /api/auth/login）：
- 接收 username、password
- 验证用户是否存在
- 验证密码是否正确
- 生成 JWT token（有效期 7 天）
- 返回 token 和用户信息


实现文章的增删改查功能：

创建文章（POST /api/posts）：
- 需要登录（验证 JWT token）
- 接收 title、content、category、tags、cover
- author_id 从 token 中获取
- 保存到数据库
- 返回文章信息

获取文章列表（GET /api/posts）：
- 支持分页（page、pageSize）
- 支持分类筛选（category）
- 支持搜索（keyword，搜索标题和内容）
- 返回文章列表和总数

获取文章详情（GET /api/posts/:id）：
- 返回文章详情
- 浏览次数 +1

更新文章（PUT /api/posts/:id）：
- 需要登录
- 只能更新自己的文章
- 更新指定字段

删除文章（DELETE /api/posts/:id）：
- 需要登录
- 只能删除自己的文章
