---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022056bb2bbdcc88515df41b1a4c161b46a151a9b238a731358fb5835b91b9cc0c4f022100a7b5484df5973d814fa1b3422788aa95d69ff85740e9d0cc95950dbf1a1915f8
    ReservedCode2: 304402204ea553841a3bfa59f356970f77229c890491dc9a7630166501784bf4d1e0debe0220145f052fd05df693bcc00cda73dc4c60730dca245ab95a888fee2e64d726de6d
---

# NetWatch 监控平台 - 数据库切换指南

## 目录

1. [支持的数据库](#支持的数据库)
2. [快速切换方法](#快速切换方法)
3. [详细配置](#详细配置)
4. [性能对比](#性能对比)
5. [数据迁移](#数据迁移)
6. [常见问题](#常见问题)

---

## 支持的数据库

NetWatch 监控平台支持三种数据库后端，您可以根据实际需求选择：

| 数据库 | 环境变量 | 适用场景 | 依赖 |
|--------|----------|----------|------|
| **JSON文件** | `DATABASE_TYPE=json` | 开发测试、微型部署 | 无额外依赖 |
| **SQLite** | `DATABASE_TYPE=sqlite` | 单机部署、小规模生产 | `better-sqlite3` |
| **Supabase** | `DATABASE_TYPE=supabase` | 规模化生产、多节点 | `@supabase/supabase-js` |

---

## 快速切换方法

### 方式一：通过环境变量切换（推荐）

在 `.env` 文件中设置 `DATABASE_TYPE` 变量：

```bash
# .env 文件

# 选择数据库类型：json | sqlite | supabase
DATABASE_TYPE=json

# ============ JSON 文件配置（默认）============
DATA_DIR=./data

# ============ SQLite 配置 ====================
# DB_PATH=./data/netwatch.db

# ============ Supabase 配置 =================
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 方式二：直接修改 server.js

修改 `backend/src/server.js` 中的导入：

```javascript
// 方式1: 使用 JSON 文件（最轻量）
import jsonDb from './config/database-json.js';

// 方式2: 使用 SQLite
// import db, { initDatabase, seedDatabase } from './config/database-sqlite.js';

// 方式3: 使用 Supabase
// const { supabaseAdmin } = await import('./config/database.js');
```

---

## 详细配置

### 1. JSON 文件数据库（默认，最轻量）

**特点**：
- 无需安装任何数据库软件
- 数据存储在 JSON 文件中
- 适合开发和测试环境
- 单文件，易于备份和迁移

**环境变量**：
```bash
DATABASE_TYPE=json
DATA_DIR=./data  # 数据存储目录
```

**数据文件位置**：
```
backend/data/
├── nodes.json          # 节点数据
├── tasks.json          # 任务数据
├── alerts.json         # 告警记录
├── alert_configs.json  # 告警配置
├── alert_rules.json    # 告警规则
└── history.json        # 历史记录
```

**初始化**：
```javascript
import jsonDb from './config/database-json.js';

// 初始化示例数据
jsonDb.seed();

// 初始化完成
console.log('JSON数据库就绪');
```

---

### 2. SQLite 数据库（轻量级生产环境）

**特点**：
- 单文件数据库
- 高性能，支持并发读写
- 无需单独的数据库服务
- 适合单机部署

**安装依赖**：
```bash
cd backend
npm install better-sqlite3
```

**环境变量**：
```bash
DATABASE_TYPE=sqlite
DB_PATH=./data/netwatch.db  # 数据库文件路径
```

**初始化**：
```javascript
import db, { initDatabase, seedDatabase } from './config/database-sqlite.js';

// 初始化数据库表
initDatabase();

// 插入示例数据（可选）
seedDatabase();

console.log('SQLite数据库就绪');
```

**表结构**：
```sql
-- 节点表
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  ip TEXT,
  region TEXT DEFAULT 'east',
  register_key TEXT UNIQUE,
  enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'offline',
  created_at TEXT
);

-- 任务表
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  interval INTEGER DEFAULT 5,
  node_id TEXT,
  enabled INTEGER DEFAULT 1,
  status TEXT DEFAULT 'normal',
  created_at TEXT
);

-- 更多表结构见 database-sqlite.js
```

---

### 3. Supabase 数据库（规模化生产环境）

**特点**：
- 云端托管，无需服务器维护
- 自动备份，高可用
- 支持实时订阅
- 支持 Row Level Security (RLS)

**注册 Supabase**：
1. 访问 [supabase.com](https://supabase.com)
2. 创建新项目
3. 获取项目 URL 和 Keys

**环境变量**：
```bash
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**数据库初始化**：
在 Supabase SQL Editor 中执行 `backend/supabase/schema.sql`：

```bash
# 登录 Supabase Dashboard
# 进入 SQL Editor
# 粘贴并执行 schema.sql 内容
```

**schema.sql 关键表结构**：
```sql
-- 节点表
CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ip TEXT,
  region TEXT DEFAULT 'east',
  register_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  interval INTEGER DEFAULT 5,
  node_id UUID REFERENCES nodes(id),
  enabled BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 告警配置表
CREATE TABLE alert_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT DEFAULT 'dingtalk',
  webhook_url TEXT NOT NULL,
  secret TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更多表结构见 backend/supabase/schema.sql
```

---

## 性能对比

| 指标 | JSON | SQLite | Supabase |
|------|------|---------|----------|
| **读取速度** | 慢 | 快 | 快 |
| **写入速度** | 慢 | 快 | 快 |
| **并发支持** | 差 | 中 | 好 |
| **数据量上限** | 1万条 | 100万条 | 无限制 |
| **部署复杂度** | 低 | 低 | 中 |
| **维护成本** | 低 | 低 | 低 |
| **适用规模** | <100任务 | <1000任务 | 无限制 |

---

## 数据迁移

### JSON → SQLite

```javascript
// 迁移脚本
import jsonDb from './config/database-json.js';
import db, { initDatabase } from './config/database-sqlite.js';

async function migrate() {
  initDatabase();

  // 迁移节点
  const nodes = jsonDb.getNodes();
  nodes.forEach(node => {
    db.prepare(`
      INSERT INTO nodes (id, name, ip, region, register_key, enabled, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(node.id, node.name, node.ip, node.region, node.register_key,
           node.enabled ? 1 : 0, node.status, node.created_at);
  });

  // 迁移任务
  const tasks = jsonDb.getTasks();
  tasks.forEach(task => {
    db.prepare(`
      INSERT INTO tasks (id, name, type, target, interval, timeout, node_id, enabled, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(task.id, task.name, task.type, task.target, task.interval,
           task.timeout, task.node_id, task.enabled ? 1 : 0, task.status, task.created_at);
  });

  console.log('迁移完成');
}
```

### JSON → Supabase

```javascript
import jsonDb from './config/database-json.js';
import { supabaseAdmin } from './config/database.js';

async function migrate() {
  // 迁移节点
  const nodes = jsonDb.getNodes();
  if (nodes.length > 0) {
    await supabaseAdmin.from('nodes').insert(nodes);
  }

  // 迁移任务
  const tasks = jsonDb.getTasks();
  if (tasks.length > 0) {
    await supabaseAdmin.from('tasks').insert(tasks);
  }

  console.log('迁移完成');
}
```

---

## 常见问题

### Q1: 如何选择数据库？

**推荐原则**：
- **开发/测试** → 使用 JSON 文件
- **小型生产（单机）** → 使用 SQLite
- **中大型生产（多节点）** → 使用 Supabase

### Q2: 如何备份数据？

**JSON**：
```bash
# 备份数据目录
tar -czvf backup.tar.gz backend/data/
```

**SQLite**：
```bash
# 备份数据库文件
cp data/netwatch.db backup/netwatch_backup.db
```

**Supabase**：
在 Dashboard 中手动备份或设置自动备份。

### Q3: 如何处理数据量增长？

**JSON**：数据量超过5000条时建议迁移到 SQLite 或 Supabase

**SQLite**：数据量超过10万条时建议迁移到 Supabase

**自动清理历史数据**：
```javascript
// 在 database-json.js 中
const MAX_HISTORY = 10000;  // 最多保留10000条
const MAX_ALERTS = 1000;    // 最多保留1000条
```

### Q4: 数据库连接失败？

检查环境变量配置：
```bash
# 查看当前配置
echo $DATABASE_TYPE
echo $SUPABASE_URL
```

### Q5: 如何重置数据？

**JSON**：
```bash
# 删除数据文件
rm -rf backend/data/*.json
```

**SQLite**：
```bash
# 删除数据库文件
rm backend/data/netwatch.db
```

**Supabase**：
在 Dashboard 中删除表数据。

---

## 一键切换脚本

在项目根目录创建 `switch-db.sh`：

```bash
#!/bin/bash

echo "NetWatch 数据库切换工具"
echo "========================"
echo ""
echo "可用选项："
echo "1) JSON 文件（开发测试）"
echo "2) SQLite（小型生产）"
echo "3) Supabase（规模化生产）"
echo ""
read -p "请选择 [1-3]: " choice

case $choice in
  1)
    sed -i 's/DATABASE_TYPE=.*/DATABASE_TYPE=json/' backend/.env
    echo "已切换到 JSON 文件数据库"
    ;;
  2)
    sed -i 's/DATABASE_TYPE=.*/DATABASE_TYPE=sqlite/' backend/.env
    echo "已切换到 SQLite 数据库"
    ;;
  3)
    echo "请配置 Supabase 环境变量："
    read -p "SUPABASE_URL: " url
    read -p "SUPABASE_ANON_KEY: " anon
    read -p "SUPABASE_SERVICE_ROLE_KEY: " service
    sed -i "s|DATABASE_TYPE=.*|DATABASE_TYPE=supabase|" backend/.env
    sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$url|" backend/.env
    sed -i "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$anon|" backend/.env
    sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$service|" backend/.env
    echo "已切换到 Supabase 数据库"
    ;;
  *)
    echo "无效选择"
    ;;
esac
```

使用：
```bash
chmod +x switch-db.sh
./switch-db.sh
```
