const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const crypto = require("crypto");

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: process.env.DB_PORT || 3306,
};

async function initDatabase(executeMode) {
  let connection;
  try {
    // 连接到 MySQL 服务器
    connection = await mysql.createConnection(dbConfig);
    console.log("成功连接到 MySQL 服务器");

    // 创建数据库（如果不存在）
    await connection.execute("CREATE DATABASE IF NOT EXISTS express_ai");
    console.log("数据库 express_ai 已准备就绪");

    // 切换到 express_ai 数据库
    await connection.execute("USE express_ai");

    // 执行初始 schema
    const schemaPath = path.join(__dirname, "schema.sql");
    const sqlContent = fs.readFileSync(schemaPath, "utf8");
    const statements = sqlContent.split(";").filter((stmt) => stmt.trim());
    for (const statement of statements) {
      await connection.execute(statement);
    }
    console.log("初始表结构创建成功");

    // 根据执行模式选择不同的迁移方式
    console.log(`执行模式: ${executeMode}`);
    if (executeMode === "batch") {
      await executeMigrationsInBatch(connection);
    } else {
      await executeMigrations(connection);
    }
  } catch (error) {
    console.error("数据库初始化失败:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("数据库连接已关闭");
    }
  }
}

async function executeMigrations(connection) {
  const migrationsPath = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsPath)) {
    console.log("迁移目录不存在，跳过迁移");
    return;
  }

  // 创建或更新 migrations 表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      hash VARCHAR(64),
      batch_id INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 获取已执行的迁移
  const [executed] = await connection.execute(
    "SELECT name, hash FROM migrations",
  );
  const executedMap = new Map(executed.map((row) => [row.name, row.hash]));

  // 读取所有 up 脚本并按顺序执行
  const files = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith(".up.sql"));
  files.sort(); // 按文件名排序

  // 计算新批次号（最大批次号 + 1）
  const [batchResult] = await connection.execute(
    "SELECT MAX(batch_id) as max_batch FROM migrations",
  );
  const newBatchId = (batchResult[0].max_batch || 0) + 1;

  let executedCount = 0;
  for (const file of files) {
    const filePath = path.join(migrationsPath, file);
    const sqlContent = fs.readFileSync(filePath, "utf8");
    const currentHash = crypto
      .createHash("sha256")
      .update(sqlContent)
      .digest("hex");

    if (!executedMap.has(file)) {
      // 新迁移，执行并记录
      console.log(`执行新迁移脚本: ${file}`);
      await executeMigrationWithTransaction(
        connection,
        file,
        sqlContent,
        currentHash,
        newBatchId,
      );
      executedCount++;
    } else if (executedMap.get(file) !== currentHash) {
      // 脚本内容已变更，需要处理
      console.warn(`迁移脚本 ${file} 内容已变更，可能需要重新评估`);
    } else {
      // 已执行过且内容未变，跳过
      console.log(`跳过已执行的迁移脚本: ${file}`);
    }
  }

  if (executedCount > 0) {
    console.log(`批次 ${newBatchId} 执行完成，共执行 ${executedCount} 个迁移`);
  } else {
    console.log("没有新的迁移需要执行");
  }
  console.log("所有迁移脚本执行完成");
}

async function executeMigrationWithTransaction(
  connection,
  fileName,
  sqlContent,
  currentHash,
  newBatchId,
) {
  // 开始事务
  await connection.execute("START TRANSACTION");
  try {
    const statements = sqlContent.split(";").filter((stmt) => stmt.trim());
    for (const statement of statements) {
      await connection.execute(statement);
    }
    // 记录迁移，包含批次号
    await connection.execute(
      "INSERT INTO migrations (name, hash, batch_id) VALUES (?, ?, ?)",
      [fileName, currentHash, newBatchId],
    );
    // 提交事务
    await connection.execute("COMMIT");
    console.log(`迁移脚本 ${fileName} 执行成功并记录到批次 ${newBatchId}`);
  } catch (error) {
    // 回滚事务
    await connection.execute("ROLLBACK");
    console.error(`执行脚本 ${fileName} 失败:`, error.message);
    throw error;
  }
}

async function executeMigrationsInBatch(connection) {
  const migrationsPath = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsPath)) {
    console.log("迁移目录不存在，跳过迁移");
    return;
  }

  // 创建或更新 migrations 表
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      hash VARCHAR(64),
      batch_id INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 获取已执行的迁移
  const [executed] = await connection.execute(
    "SELECT name, hash FROM migrations",
  );
  const executedMap = new Map(executed.map((row) => [row.name, row.hash]));

  // 读取所有 up 脚本并按顺序执行
  const files = fs
    .readdirSync(migrationsPath)
    .filter((file) => file.endsWith(".up.sql"));
  files.sort(); // 按文件名排序

  // 筛选出需要执行的新迁移
  const pendingMigrations = [];
  for (const file of files) {
    const filePath = path.join(migrationsPath, file);
    const sqlContent = fs.readFileSync(filePath, "utf8");
    const currentHash = crypto
      .createHash("sha256")
      .update(sqlContent)
      .digest("hex");

    if (!executedMap.has(file)) {
      pendingMigrations.push({ file, filePath, sqlContent, currentHash });
    } else if (executedMap.get(file) !== currentHash) {
      console.warn(`迁移脚本 ${file} 内容已变更，可能需要重新评估`);
    }
  }

  if (pendingMigrations.length === 0) {
    console.log("没有新的迁移需要执行");
    return;
  }

  // 计算新批次号（最大批次号 + 1）
  const [batchResult] = await connection.execute(
    "SELECT MAX(batch_id) as max_batch FROM migrations",
  );
  const newBatchId = (batchResult[0].max_batch || 0) + 1;

  console.log(`准备以批次模式执行 ${pendingMigrations.length} 个迁移...`);
  console.log(`批次号: ${newBatchId}`);

  // 开始批次级事务
  await connection.execute("START TRANSACTION");
  try {
    // 执行所有待处理的迁移
    const executedMigrations = [];
    for (const migration of pendingMigrations) {
      console.log(`执行迁移脚本: ${migration.file}`);
      const statements = migration.sqlContent
        .split(";")
        .filter((stmt) => stmt.trim());
      for (const statement of statements) {
        await connection.execute(statement);
      }
      executedMigrations.push(migration);
    }

    // 记录所有已执行的迁移
    for (const migration of executedMigrations) {
      await connection.execute(
        "INSERT INTO migrations (name, hash, batch_id) VALUES (?, ?, ?)",
        [migration.file, migration.currentHash, newBatchId],
      );
    }

    // 提交事务
    await connection.execute("COMMIT");
    console.log(
      `批次 ${newBatchId} 执行完成，共成功执行 ${executedMigrations.length} 个迁移`,
    );
    console.log("所有迁移脚本执行完成");
  } catch (error) {
    // 回滚事务
    await connection.execute("ROLLBACK");
    console.error(`批次执行失败，已回滚所有操作:`, error.message);
    throw error;
  }
}

// 获取执行模式（默认 single，可选 batch）
const executeMode = process.argv[2] || "single";

// 执行初始化
initDatabase(executeMode);
