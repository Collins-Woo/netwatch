/**
 * NetWatch 用户认证系统
 * 支持 JWT Token 认证和角色权限管理
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// JWT配置
const JWT_SECRET = process.env.JWT_SECRET || 'netwatch-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// 密码哈希配置
const SALT_ROUNDS = 10;

/**
 * 生成JWT Token
 */
export function generateToken(user) {
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    {
      id: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

  return {
    token,
    refreshToken,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

/**
 * 验证JWT Token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * 密码哈希
 */
export async function hashPassword(password) {
  // 使用bcryptjs进行密码哈希
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 */
export async function verifyPassword(password, hash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * 生成重置密码Token
 */
export function generateResetToken(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 60 * 60 * 1000; // 1小时
  return { token, expires };
}

/**
 * 验证重置密码Token
 */
export function verifyResetToken(token, storedToken, expires) {
  if (token !== storedToken) return false;
  if (Date.now() > expires) return false;
  return true;
}

/**
 * 权限检查函数
 */
export function checkPermission(userRole, requiredPermission) {
  const RolePermissions = {
    admin: {
      label: '管理员',
      description: '拥有系统完全控制权，可管理所有用户、资源和配置',
      permissions: [
        'user:create', 'user:read', 'user:update', 'user:delete',
        'node:create', 'node:read', 'node:update', 'node:delete',
        'task:create', 'task:read', 'task:update', 'task:delete',
        'alert:read', 'alert:acknowledge', 'alert:config',
        'config:read', 'config:update',
        'audit:read', 'audit:export'
      ]
    },
    operator: {
      label: '运维人员',
      description: '可管理监控任务和节点，无法管理用户和系统配置',
      permissions: [
        'node:create', 'node:read', 'node:update', 'node:delete',
        'task:create', 'task:read', 'task:update', 'task:delete',
        'alert:read', 'alert:acknowledge', 'alert:config',
        'audit:read'
      ]
    },
    auditor: {
      label: '审计员',
      description: '可查看所有操作日志和统计数据，无法进行任何修改操作',
      permissions: [
        'user:read',
        'node:read',
        'task:read',
        'alert:read',
        'audit:read', 'audit:export'
      ]
    },
    viewer: {
      label: '查看者',
      description: '只读权限，可查看监控状态和告警信息',
      permissions: [
        'node:read',
        'task:read',
        'alert:read'
      ]
    }
  };

  const role = RolePermissions[userRole];
  if (!role) return false;
  return role.permissions.includes(requiredPermission);
}

/**
 * 生成API密钥
 */
export function generateApiKey() {
  return `nw_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * 记录操作日志
 */
export async function logAudit(userId, username, action, resource, resourceId, details, ip) {
  const auditLog = {
    id: crypto.randomUUID(),
    user_id: userId,
    username,
    action,
    resource,
    resource_id: resourceId,
    details: details ? JSON.stringify(details) : null,
    ip,
    created_at: new Date().toISOString()
  };

  // 存储到数据库
  try {
    const { supabaseAdmin } = await import('./database.js');
    await supabaseAdmin.from('audit_logs').insert(auditLog);
  } catch (error) {
    console.error('Failed to log audit:', error);
  }

  return auditLog;
}

/**
 * 认证中间件
 */
export function authMiddleware(requiredPermissions = []) {
  return async (req, res, next) => {
    try {
      // 获取Token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未提供认证Token' });
      }

      const token = authHeader.substring(7);

      // 验证Token
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Token无效或已过期' });
      }

      // 检查权限
      for (const permission of requiredPermissions) {
        if (!checkPermission(decoded.role, permission)) {
          return res.status(403).json({ error: '权限不足' });
        }
      }

      // 将用户信息附加到请求对象
      req.user = decoded;

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({ error: '认证系统错误' });
    }
  };
}

/**
 * 速率限制中间件
 */
const rateLimitStore = new Map();

export function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    // 获取或初始化记录
    let record = rateLimitStore.get(key);
    if (!record || now - record.windowStart > windowMs) {
      record = { count: 0, windowStart: now };
    }

    record.count++;
    rateLimitStore.set(key, record);

    if (record.count > maxRequests) {
      return res.status(429).json({
        error: '请求过于频繁，请稍后再试'
      });
    }

    next();
  };
}

/**
 * CORS配置
 */
export function corsOptions() {
  return {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  };
}
