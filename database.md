用户表需要：id（主键）、username（用户名，唯一）、email（邮箱，唯一）、password（密码，加密存储）、avatar（头像 URL）、created_at（创建时间）。

文章表需要：id、title（标题）、content（内容，Markdown 格式）、cover（封面图 URL）、category（分类）、tags（标签，JSON 数组）、author_id（作者 ID，外键关联 users）、views（浏览次数）、created_at、updated_at。

分类表需要：id、name（分类名称）、description（分类描述）。