-- 添加 bio 字段到 users 表
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;