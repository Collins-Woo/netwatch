-- NetWatch Monitoring Platform Database Schema v2
-- Extended support for TCP, DNS, SSL, Traceroute, MySQL, Redis monitoring
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if exists (for fresh install)
-- DROP TABLE IF EXISTS response_time_history CASCADE;
-- DROP TABLE IF EXISTS alerts CASCADE;
-- DROP TABLE IF EXISTS alert_rules CASCADE;
-- DROP TABLE IF EXISTS alert_configs CASCADE;
-- DROP TABLE IF EXISTS tasks CASCADE;
-- DROP TABLE IF EXISTS nodes CASCADE;

-- Nodes (Agents) Table
CREATE TABLE IF NOT EXISTS nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  ip VARCHAR(50),
  region VARCHAR(50) DEFAULT 'east' CHECK (region IN ('east', 'south', 'north', 'overseas')),
  description TEXT,
  register_key VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_heartbeat TIMESTAMPTZ,
  cpu_usage INTEGER DEFAULT 0,
  memory_usage INTEGER DEFAULT 0,
  task_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table (Extended with JSONB config)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'http', 'https', 'api', 'ping', 'tcp', 'dns', 'ssl', 'traceroute', 'mysql', 'redis'
  )),
  target VARCHAR(500) NOT NULL,
  interval INTEGER DEFAULT 5,
  timeout INTEGER DEFAULT 10,
  status_code INTEGER,
  alert_threshold INTEGER DEFAULT 3,
  node_id UUID REFERENCES nodes(id) ON DELETE SET NULL,
  enabled BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'normal' CHECK (status IN ('normal', 'slow', 'error', 'disabled')),
  last_response_time INTEGER,
  last_check_time TIMESTAMPTZ,
  availability DECIMAL(5,2),
  -- Extended configuration stored as JSONB
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Configurations Table
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) DEFAULT 'dingtalk',
  webhook_url TEXT NOT NULL,
  secret VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert Rules Table
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID REFERENCES alert_configs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50) DEFAULT 'warning' CHECK (level IN ('critical', 'warning', 'info')),
  condition VARCHAR(50) DEFAULT 'failure_count' CHECK (condition IN ('failure_count', 'response_time', 'availability')),
  threshold INTEGER DEFAULT 3,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts History Table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  task_name VARCHAR(255) NOT NULL,
  level VARCHAR(50) DEFAULT 'warning' CHECK (level IN ('critical', 'warning', 'info')),
  message TEXT,
  response_time INTEGER,
  status_code INTEGER,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Response Time History Table (for charts)
CREATE TABLE IF NOT EXISTS response_time_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  response_time INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- SSL Certificate History Table (for SSL monitoring)
CREATE TABLE IF NOT EXISTS ssl_cert_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  issuer VARCHAR(255),
  subject VARCHAR(255),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  days_until_expiry INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_node_id ON tasks(node_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_enabled ON tasks(enabled);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_config ON tasks(config);
CREATE INDEX IF NOT EXISTS idx_alerts_task_id ON alerts(task_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_response_time_task_id ON response_time_history(task_id);
CREATE INDEX IF NOT EXISTS idx_response_time_recorded_at ON response_time_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_ssl_cert_task_id ON ssl_cert_history(task_id);

-- ============================================
-- User Management Tables
-- ============================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'operator', 'auditor', 'viewer')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'locked')),
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(50),
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB,
  ip VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Sessions Table (for JWT token management)
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, status) VALUES
  ('admin', 'admin@netwatch.local', '$2b$10$rQZ8K.X8K.X8K.X8K.X8KeX8K.X8K.X8K.X8K.X8K.X8K.X8K.X8K', 'admin', 'active')
ON CONFLICT (username) DO NOTHING;

-- Insert sample audit logs
INSERT INTO audit_logs (user_id, username, action, resource, details, ip) VALUES
  ((SELECT id FROM users WHERE username = 'admin'), 'admin', 'login', 'system', '{"result": "success"}', '127.0.0.1'),
  ((SELECT id FROM users WHERE username = 'admin'), 'admin', 'create', 'task', '{"name": "携程官网监控"}', '127.0.0.1'),
  ((SELECT id FROM users WHERE username = 'admin'), 'admin', 'create', 'node', '{"name": "华东节点-01"}', '127.0.0.1');

-- Row Level Security (RLS) - Enable for production
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Sample Data
-- ============================================

-- Insert sample nodes
INSERT INTO nodes (name, ip, region, description, register_key, enabled, status, last_heartbeat, cpu_usage, memory_usage, task_count) VALUES
  ('华东节点-01', '10.0.1.101', 'east', '位于上海的数据中心节点', 'sk_a1b2c3d4e5f6g7h8', true, 'online', NOW(), 23, 45, 4),
  ('华南节点-01', '10.0.2.102', 'south', '位于深圳的数据中心节点', 'sk_i9j0k1l2m3n4o5p6', true, 'online', NOW(), 35, 52, 3),
  ('华北节点-01', '10.0.3.103', 'north', '位于北京的数据中心节点', 'sk_q7r8s9t0u1v2w3x4', true, 'offline', NOW() - INTERVAL '3 hours', 0, 0, 2),
  ('海外节点-01', '10.0.4.104', 'overseas', '位于洛杉矶的海外节点', 'sk_y5z6a7b8c9d0e1f2', true, 'online', NOW(), 18, 38, 2);

-- Insert sample tasks with extended config
INSERT INTO tasks (name, type, target, interval, timeout, status_code, alert_threshold, node_id, enabled, status, last_response_time, last_check_time, availability, config) VALUES
  -- HTTP监控
  ('携程官网监控', 'http', 'http://www.tuniu.com', 5, 10, 200, 3,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 245, NOW(), 99.8,
   '{"headers": {"User-Agent": "NetWatch/1.0"}}'),

  -- HTTPS监控
  ('GitHub官网监控', 'https', 'https://github.com', 5, 10, 200, 3,
   (SELECT id FROM nodes WHERE name = '华北节点-01'), true, 'error', 0, NOW(), 0,
   '{}'),

  -- API接口监控 - GET方法
  ('GitHub API监控', 'api', 'https://api.github.com', 5, 15, 200, 3,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'slow', 1250, NOW(), 97.2,
   '{"method": "GET", "headers": {"Accept": "application/json", "User-Agent": "NetWatch/1.0"}}'),

  -- API接口监控 - POST方法
  ('用户登录API监控', 'api', 'https://api.example.com/auth/login', 3, 10, 200, 3,
   (SELECT id FROM nodes WHERE name = '华南节点-01'), true, 'normal', 180, NOW(), 99.5,
   '{"method": "POST", "headers": {"Content-Type": "application/json", "Accept": "application/json"}, "body": "{\"username\":\"test\",\"password\":\"***\"}"}'),

  -- API接口监控 - PUT方法
  ('数据更新API监控', 'api', 'https://api.example.com/data/update', 5, 15, 200, 3,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 320, NOW(), 99.2,
   '{"method": "PUT", "headers": {"Content-Type": "application/json", "Authorization": "Bearer ***"}, "body": "{\"id\":1,\"data\":\"updated\"}"}'),

  -- Ping监控
  ('阿里云DNS监控', 'ping', '180.97.1.16', 1, 5, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华南节点-01'), true, 'normal', 12, NOW(), 100,
   '{}'),

  -- TCP端口监控
  ('SSH服务监控', 'tcp', 'ssh.example.com', 5, 5, NULL, 2,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 45, NOW(), 99.9,
   '{"port": 22}'),

  ('MySQL服务监控', 'tcp', 'db.example.com', 5, 5, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华南节点-01'), true, 'normal', 28, NOW(), 99.8,
   '{"port": 3306}'),

  ('Redis服务监控', 'tcp', 'redis.example.com', 5, 5, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 15, NOW(), 99.9,
   '{"port": 6379}'),

  -- DNS解析监控
  ('域名DNS监控', 'dns', 'example.com', 10, 10, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华北节点-01'), true, 'normal', 35, NOW(), 99.7,
   '{"dnsServer": "8.8.8.8", "recordType": "A"}'),

  ('MX记录监控', 'dns', 'example.com', 30, 10, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华北节点-01'), true, 'normal', 42, NOW(), 99.5,
   '{"dnsServer": "8.8.8.8", "recordType": "MX"}'),

  -- SSL证书监控
  ('SSL证书到期监控', 'ssl', 'https://github.com', 1440, 30, NULL, 1,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 850, NOW(), 99.9,
   '{"sslExpiryWarning": 30, "sslExpiryCritical": 7}'),

  -- 路由追踪监控
  ('网络路由监控', 'traceroute', '8.8.8.8', 60, 60, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华北节点-01'), true, 'slow', 1200, NOW(), 98.5,
   '{"maxHops": 30, "maxTimeout": 5000}'),

  -- MySQL数据库监控
  ('MySQL数据库监控', 'mysql', 'db.example.com', 5, 10, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华南节点-01'), true, 'normal', 95, NOW(), 99.6,
   '{"port": 3306, "database": "app_db", "username": "monitor"}'),

  -- Redis缓存监控
  ('Redis缓存监控', 'redis', 'redis.example.com', 5, 5, NULL, 3,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 22, NOW(), 99.9,
   '{"port": 6379, "username": "monitor"}'),

  -- 百度HTTPS监控
  ('百度搜索API', 'https', 'https://www.baidu.com', 3, 8, 200, 3,
   (SELECT id FROM nodes WHERE name = '华南节点-01'), true, 'normal', 156, NOW(), 99.5,
   '{}'),

  -- 京东HTTPS监控
  ('京东商城监控', 'https', 'https://www.jd.com', 5, 10, 200, 3,
   (SELECT id FROM nodes WHERE name = '华东节点-01'), true, 'normal', 320, NOW(), 99.2,
   '{}');

-- Insert alert configurations
INSERT INTO alert_configs (webhook_url, secret, enabled) VALUES
  ('https://oapi.dingtalk.com/robot/send?access_token=xxxxxx', 'SECxxxxxxxxxxxxxxxxxxxxx', true);

-- Insert alert rules
INSERT INTO alert_rules (config_id, name, level, condition, threshold, enabled) VALUES
  ((SELECT id FROM alert_configs LIMIT 1), '连续失败告警', 'critical', 'failure_count', 3, true),
  ((SELECT id FROM alert_configs LIMIT 1), '响应超时告警', 'warning', 'response_time', 5000, true),
  ((SELECT id FROM alert_configs LIMIT 1), '可用率低告警', 'info', 'availability', 95, true),
  ((SELECT id FROM alert_configs LIMIT 1), 'SSL证书即将到期', 'critical', 'availability', 99, true);

-- Insert sample alerts
INSERT INTO alerts (task_id, task_name, level, message, response_time, status_code, acknowledged, created_at) VALUES
  ((SELECT id FROM tasks WHERE name = 'GitHub官网监控'), 'GitHub官网监控', 'critical', '连接超时，目标站点无法访问', 0, NULL, false, NOW()),
  ((SELECT id FROM tasks WHERE name = 'GitHub API监控'), 'GitHub API监控', 'warning', '响应时间超过阈值: 1250ms > 500ms', 1250, 200, true, NOW() - INTERVAL '1 minute'),
  ((SELECT id FROM tasks WHERE name = 'GitHub官网监控'), 'GitHub官网监控', 'critical', '连续3次检测失败', 0, NULL, true, NOW() - INTERVAL '5 minutes'),
  ((SELECT id FROM tasks WHERE name = '网络路由监控'), '网络路由监控', 'warning', '路由追踪响应缓慢: 1200ms > 1000ms', 1200, NULL, false, NOW() - INTERVAL '10 minutes'),
  ((SELECT id FROM tasks WHERE name = '百度搜索API'), '百度搜索API', 'info', '可用率低于95%: 当前99.5%', 156, 200, true, NOW() - INTERVAL '15 minutes');
