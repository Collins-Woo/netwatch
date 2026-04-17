/**
 * SQLite 数据库配置 - 轻量级方案
 * 使用 better-sqlite3，支持同步操作
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/netwatch.db');

// 确保数据目录存在
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用 WAL 模式提高并发性能
db.pragma('journal_mode = WAL');

// 初始化数据库表
export function initDatabase() {
  db.exec(`
    -- Nodes 表
    CREATE TABLE IF NOT EXISTS nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ip TEXT,
      region TEXT DEFAULT 'east',
      description TEXT,
      register_key TEXT UNIQUE NOT NULL,
      enabled INTEGER DEFAULT 1,
      status TEXT DEFAULT 'offline',
      last_heartbeat TEXT,
      cpu_usage INTEGER DEFAULT 0,
      memory_usage INTEGER DEFAULT 0,
      task_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Tasks 表
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      target TEXT NOT NULL,
      interval INTEGER DEFAULT 5,
      timeout INTEGER DEFAULT 10,
      status_code INTEGER,
      alert_threshold INTEGER DEFAULT 3,
      node_id TEXT,
      enabled INTEGER DEFAULT 1,
      status TEXT DEFAULT 'normal',
      last_response_time INTEGER,
      last_check_time TEXT,
      availability REAL,
      config TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE SET NULL
    );

    -- Alert Configs 表
    CREATE TABLE IF NOT EXISTS alert_configs (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'dingtalk',
      webhook_url TEXT NOT NULL,
      secret TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Alert Rules 表
    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      config_id TEXT,
      name TEXT NOT NULL,
      level TEXT DEFAULT 'warning',
      condition TEXT DEFAULT 'failure_count',
      threshold INTEGER DEFAULT 3,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (config_id) REFERENCES alert_configs(id) ON DELETE CASCADE
    );

    -- Alerts 表
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      task_name TEXT NOT NULL,
      level TEXT DEFAULT 'warning',
      message TEXT,
      response_time INTEGER,
      status_code INTEGER,
      acknowledged INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- Response Time History 表
    CREATE TABLE IF NOT EXISTS response_time_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      response_time INTEGER NOT NULL,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- SSL Cert History 表
    CREATE TABLE IF NOT EXISTS ssl_cert_history (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      issuer TEXT,
      subject TEXT,
      valid_from TEXT,
      valid_until TEXT,
      days_until_expiry INTEGER,
      recorded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_tasks_node_id ON tasks(node_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
    CREATE INDEX IF NOT EXISTS idx_alerts_task_id ON alerts(task_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
    CREATE INDEX IF NOT EXISTS idx_response_time_task_id ON response_time_history(task_id);
  `);

  console.log('SQLite 数据库初始化完成');
}

// 插入示例数据
export function seedDatabase() {
  const nodeCount = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
  if (nodeCount.count > 0) {
    console.log('数据库已有数据，跳过初始化');
    return;
  }

  const { v4: uuidv4 } = await import('uuid');

  // 插入示例节点
  const insertNode = db.prepare(`
    INSERT INTO nodes (id, name, ip, region, description, register_key, enabled, status, last_heartbeat, cpu_usage, memory_usage, task_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?)
  `);

  const nodes = [
    { id: uuidv4(), name: '华东节点-01', ip: '10.0.1.101', region: 'east', desc: '位于上海的数据中心节点', key: 'sk_a1b2c3d4e5f6g7h8', cpu: 23, mem: 45, tasks: 4 },
    { id: uuidv4(), name: '华南节点-01', ip: '10.0.2.102', region: 'south', desc: '位于深圳的数据中心节点', key: 'sk_i9j0k1l2m3n4o5p6', cpu: 35, mem: 52, tasks: 3 },
    { id: uuidv4(), name: '华北节点-01', ip: '10.0.3.103', region: 'north', desc: '位于北京的数据中心节点', key: 'sk_q7r8s9t0u1v2w3x4', cpu: 0, mem: 0, tasks: 2 },
    { id: uuidv4(), name: '海外节点-01', ip: '10.0.4.104', region: 'overseas', desc: '位于洛杉矶的海外节点', key: 'sk_y5z6a7b8c9d0e1f2', cpu: 18, mem: 38, tasks: 2 },
  ];

  nodes.forEach(n => {
    insertNode.run(n.id, n.name, n.ip, n.region, n.desc, n.key, 1, 'online', n.cpu, n.mem, n.tasks);
  });

  // 插入示例任务
  const insertTask = db.prepare(`
    INSERT INTO tasks (id, name, type, target, interval, timeout, status_code, alert_threshold, node_id, enabled, status, last_response_time, last_check_time, availability, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)
  `);

  const node1Id = nodes[0].id;
  const node2Id = nodes[1].id;
  const node3Id = nodes[2].id;

  const tasks = [
    { id: uuidv4(), name: '携程官网监控', type: 'http', target: 'http://www.tuniu.com', interval: 5, timeout: 10, code: 200, nodeId: node1Id, status: 'normal', respTime: 245, avail: 99.8, config: '{}' },
    { id: uuidv4(), name: 'GitHub官网监控', type: 'https', target: 'https://github.com', interval: 5, timeout: 10, code: 200, nodeId: node3Id, status: 'error', respTime: 0, avail: 0, config: '{}' },
    { id: uuidv4(), name: 'GitHub API监控', type: 'api', target: 'https://api.github.com', interval: 5, timeout: 15, code: 200, nodeId: node1Id, status: 'slow', respTime: 1250, avail: 97.2, config: '{"method":"GET"}' },
    { id: uuidv4(), name: '用户登录API监控', type: 'api', target: 'https://api.example.com/auth/login', interval: 3, timeout: 10, code: 200, nodeId: node2Id, status: 'normal', respTime: 180, avail: 99.5, config: '{"method":"POST"}' },
    { id: uuidv4(), name: '阿里云DNS监控', type: 'ping', target: '180.97.1.16', interval: 1, timeout: 5, code: null, nodeId: node2Id, status: 'normal', respTime: 12, avail: 100, config: '{}' },
    { id: uuidv4(), name: 'SSH服务监控', type: 'tcp', target: 'ssh.example.com', interval: 5, timeout: 5, code: null, nodeId: node1Id, status: 'normal', respTime: 45, avail: 99.9, config: '{"port":22}' },
    { id: uuidv4(), name: 'SSL证书到期监控', type: 'ssl', target: 'https://github.com', interval: 1440, timeout: 30, code: null, nodeId: node1Id, status: 'normal', respTime: 850, avail: 99.9, config: '{"sslExpiryWarning":30}' },
  ];

  tasks.forEach(t => {
    insertTask.run(t.id, t.name, t.type, t.target, t.interval, t.timeout, t.code, 3, t.nodeId, 1, t.status, t.respTime, t.avail, t.config);
  });

  console.log('示例数据初始化完成');
}

// 导出数据库实例
export default db;
