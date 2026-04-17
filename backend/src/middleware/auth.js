/**
 * Authentication & Authorization Middleware
 *
 * 提供JWT认证和基于角色的权限控制
 */

import jwt from 'jsonwebtoken';

// JWT Secret (应从环境变量读取)
const JWT_SECRET = process.env.JWT_SECRET || 'netwatch-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 角色权限映射
const RolePermissions = {
  admin: ['*'],
  operator: ['node:*', 'task:*', 'alert:*', 'audit:read'],
  auditor: ['node:read', 'task:read', 'alert:read', 'audit:*'],
  viewer: ['node:read', 'task:read', 'alert:read'],
};

/**
 * 生成JWT Token
 */
export function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
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
 * 认证中间件 - 验证用户是否已登录
 */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: '无效或已过期的令牌' });
    }

    // 将用户信息附加到请求对象
    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    return res.status(500).json({ error: '认证处理失败' });
  }
}

/**
 * 权限检查函数
 */
function hasPermission(userPermissions, requiredPermission) {
  // 检查通配符权限
  if (userPermissions.includes('*')) return true;

  // 检查精确匹配
  if (userPermissions.includes(requiredPermission)) return true;

  // 检查资源通配符 (如 'user:*' 允许 'user:create')
  const [resource, action] = requiredPermission.split(':');
  if (userPermissions.includes(`${resource}:*`)) return true;

  return false;
}

/**
 * 权限检查中间件
 * 用法: requirePermission('user:create')
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '需要登录' });
    }

    const userPermissions = RolePermissions[req.user.role] || [];

    if (!hasPermission(userPermissions, permission)) {
      return res.status(403).json({
        error: '权限不足',
        required: permission,
        message: `需要权限: ${permission}`
      });
    }

    next();
  };
}

/**
 * 角色检查中间件
 * 用法: requireRole(['admin', 'operator'])
 */
export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '需要登录' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: '权限不足',
        requiredRoles: roles,
        currentRole: req.user.role,
        message: `需要角色: ${roles.join(' 或 ')}`
      });
    }

    next();
  };
}

/**
 * 获取用户权限列表
 */
export function getUserPermissions(role) {
  return RolePermissions[role] || [];
}

/**
 * 可选认证中间件 - 如果有token则验证，没有则继续
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    // 忽略错误，继续处理请求
    next();
  }
}

/**
 * CORS 中间件配置
 */
export function corsMiddleware(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

/**
 * 速率限制中间件（简单实现）
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分钟
const MAX_REQUESTS_PER_WINDOW = 100;

export function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // 获取或初始化该IP的请求记录
  let record = requestCounts.get(ip);
  if (!record) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    requestCounts.set(ip, record);
  }

  // 检查是否需要重置计数器
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + RATE_LIMIT_WINDOW;
  }

  // 增加计数
  record.count++;

  // 设置响应头
  res.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW);
  res.set('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS_PER_WINDOW - record.count));

  // 检查是否超过限制
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    });
  }

  next();
}

/**
 * 请求日志中间件
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    return originalSend.call(this, data);
  };

  next();
}

export default {
  generateToken,
  verifyToken,
  authenticate,
  requirePermission,
  requireRole,
  getUserPermissions,
  optionalAuth,
  corsMiddleware,
  rateLimit,
  requestLogger,
};
