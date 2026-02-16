const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 3306
};

// 获取回滚模式和参数
const rollbackMode = process.argv[2] || 'batch';
const batchCount = process.argv[3] ? parseInt(process.argv[3]) : 1;

async function rollbackDatabase() {
  let connection;
  try {
    // 连接到 MySQL 服务器
    connection = await mysql.createConnection(dbConfig);
    console.log('成功连接到 MySQL 服务器');

    // 切换到 express_ai 数据库
    await connection.execute('USE express_ai');

    // 执行回滚脚本
    await executeRollback(connection);

  } catch (error) {
    console.error('数据库回滚失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

async function executeRollback(connection) {
  const migrationsPath = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsPath)) {
    console.log('迁移目录不存在，跳过回滚');
    return;
  }

  // 检查 migrations 表是否存在
  try {
    await connection.execute('SELECT 1 FROM migrations LIMIT 1');
  } catch (error) {
    console.log('migrations 表不存在，跳过回滚');
    return;
  }

  if (rollbackMode === 'batch') {
    // 按批次回滚
    await rollbackByBatch(connection, batchCount);
  } else {
    // 按数量回滚
    await rollbackByCount(connection, parseInt(rollbackMode));
  }

  console.log('回滚操作完成');
}

async function rollbackByBatch(connection, count) {
  // 获取所有批次（按批次号降序）
  const [batches] = await connection.execute(
    'SELECT DISTINCT batch_id FROM migrations ORDER BY batch_id DESC'
  );
  
  if (batches.length === 0) {
    console.log('没有已执行的迁移，无需回滚');
    return;
  }

  console.log(`准备回滚最近 ${count} 个批次...`);
  
  let rolledBackBatches = 0;
  for (const batch of batches) {
    if (rolledBackBatches >= count) break;
    
    const batchId = batch.batch_id;
    console.log(`回滚批次 ${batchId}...`);
    
    // 获取该批次的所有迁移（按执行时间逆序）
    const [migrations] = await connection.execute(
      'SELECT name FROM migrations WHERE batch_id = ? ORDER BY executed_at DESC',
      [batchId]
    );
    
    let rolledBackMigrations = 0;
    for (const migration of migrations) {
      const upFileName = migration.name;
      const downFileName = upFileName.replace('.up.sql', '.down.sql');
      const downFilePath = path.join(migrationsPath, downFileName);

      if (fs.existsSync(downFilePath)) {
        console.log(`  执行回滚脚本: ${downFileName}`);
        await executeRollbackWithTransaction(connection, upFileName, downFilePath);
        rolledBackMigrations++;
      } else {
        console.warn(`  回滚脚本 ${downFileName} 不存在，跳过`);
      }
    }
    
    console.log(`批次 ${batchId} 回滚完成，共回滚 ${rolledBackMigrations} 个迁移`);
    rolledBackBatches++;
  }

  console.log(`已成功回滚 ${rolledBackBatches} 个批次`);
}

async function rollbackByCount(connection, count) {
  // 获取已执行的迁移（按执行时间逆序，最新的在前）
  const [executed] = await connection.execute(
    'SELECT name FROM migrations ORDER BY executed_at DESC'
  );
  
  if (executed.length === 0) {
    console.log('没有已执行的迁移，无需回滚');
    return;
  }

  console.log(`准备回滚最近 ${count} 个迁移...`);
  
  let rolledBack = 0;
  for (const row of executed) {
    if (rolledBack >= count) break;
    
    const upFileName = row.name;
    const downFileName = upFileName.replace('.up.sql', '.down.sql');
    const downFilePath = path.join(__dirname, 'migrations', downFileName);

    if (fs.existsSync(downFilePath)) {
      console.log(`执行回滚脚本: ${downFileName}`);
      await executeRollbackWithTransaction(connection, upFileName, downFilePath);
      rolledBack++;
    } else {
      console.warn(`回滚脚本 ${downFileName} 不存在，跳过`);
    }
  }

  console.log(`已成功回滚 ${rolledBack} 个迁移`);
}

async function executeRollbackWithTransaction(connection, upFileName, downFilePath) {
  // 开始事务
  await connection.execute('START TRANSACTION');
  try {
    const sqlContent = fs.readFileSync(downFilePath, 'utf8');
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    for (const statement of statements) {
      await connection.execute(statement);
    }
    // 从迁移记录中删除
    await connection.execute(
      'DELETE FROM migrations WHERE name = ?',
      [upFileName]
    );
    // 提交事务
    await connection.execute('COMMIT');
    console.log(`回滚成功: ${upFileName}`);
  } catch (error) {
    // 回滚事务
    await connection.execute('ROLLBACK');
    console.error(`执行回滚脚本失败:`, error.message);
    throw error;
  }
}

// 执行回滚
rollbackDatabase();