/**
 * User Management Routes
 *
 * 用户管理API路由 - CRUD操作、认证、审计日志
 */

import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { authenticate, requirePermission, requireRole, generateToken, getUserPermissions } from '../middleware/auth.js';

const router = express.Router();

// Salt rounds for bcrypt
const SALT_ROUNDS = 10;

/**
 * 辅助函数：转换数据库字段为驼峰命名
 */
function transformUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    loginCount: row.login_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

/**
 * 辅助函数：转换审计日志
 */
function transformAuditLog(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    action: row.action,
    resource: row.resource,
    resourceId: row.resource_id,
    details: row.details,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

/**
 * 创建审计日志
 */
async function createAuditLog(supabaseAdmin, userId, username, action, resource, resourceId, details, req) {
  await supabaseAdmin.from('audit_logs').insert({
    user_id: userId,
    username: username,
    action: action,
    resource: resource,
    resource_id: resourceId,
    details: details,
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.headers['user-agent'],
  });
}

// ============================================
// 认证相关路由
// ============================================

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查询用户
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 检查用户状态
    if (user.status === 'locked') {
      return res.status(403).json({ error: '账户已被锁定，请联系管理员' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: '账户已停用' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // 记录失败的登录尝试
      await createAuditLog(
        supabaseAdmin, user.id, user.username, 'login_failed',
        'system', null, { reason: '密码错误' }, req
      );
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成JWT token
    const token = generateToken(user);

    // 更新最后登录信息
    await supabaseAdmin
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: req.ip || req.connection.remoteAddress,
        login_count: user.login_count + 1,
      })
      .eq('id', user.id);

    // 记录成功登录
    await createAuditLog(
      supabaseAdmin, user.id, user.username, 'login',
      'system', null, { result: 'success' }, req
    );

    // 返回用户信息（不含密码）
    const userResponse = transformUser(user);
    delete userResponse.passwordHash;

    res.json({
      token,
      user: userResponse,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userResponse = transformUser(user);
    delete userResponse.passwordHash;

    // 添加权限列表
    userResponse.permissions = getUserPermissions(user.role);

    res.json(userResponse);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * 登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');

    // 记录登出日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'logout',
      'system', null, {}, req
    );

    res.json({ success: true, message: '登出成功' });
  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({ error: '登出失败' });
  }
});

/**
 * 修改密码
 * PUT /api/auth/password
 */
router.put('/password', authenticate, async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '请提供原密码和新密码' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度不能少于6位' });
    }

    // 获取当前用户
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证原密码
    const isValidPassword = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '原密码错误' });
    }

    // 更新密码
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', req.user.id);

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'change_password',
      'user', req.user.id, {}, req
    );

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

// ============================================
// 用户管理路由
// ============================================

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', authenticate, requirePermission('user:read'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { search, role, status, page = 1, pageSize = 10 } = req.query;

    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 搜索过滤
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // 角色过滤
    if (role) {
      query = query.eq('role', role);
    }

    // 状态过滤
    if (status) {
      query = query.eq('status', status);
    }

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    query = query.range(offset, offset + parseInt(pageSize) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const users = data.map(transformUser);
    // 移除密码哈希
    users.forEach(u => delete u.passwordHash);

    res.json({
      data: users,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * 获取单个用户
 * GET /api/users/:id
 */
router.get('/:id', authenticate, requirePermission('user:read'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const userResponse = transformUser(user);
    delete userResponse.passwordHash;

    // 添加权限列表
    userResponse.permissions = getUserPermissions(user.role);

    res.json(userResponse);
  } catch (error) {
    console.error('获取用户失败:', error);
    res.status(500).json({ error: '获取用户失败' });
  }
});

/**
 * 获取用户权限
 * GET /api/users/:id/permissions
 */
router.get('/:id/permissions', authenticate, async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    let userId = id;
    // 如果是 'me'，使用当前用户
    if (id === 'me' || id === 'current') {
      userId = req.user.id;
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      userId,
      role: user.role,
      permissions: getUserPermissions(user.role),
    });
  } catch (error) {
    console.error('获取权限失败:', error);
    res.status(500).json({ error: '获取权限失败' });
  }
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', authenticate, requirePermission('user:create'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { username, email, phone, role, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码不能为空' });
    }

    // 检查用户名是否存在
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 检查邮箱是否存在
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: '邮箱已被使用' });
    }

    // 哈希密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const { data: newUser, error } = await supabaseAdmin
      .from('users')
      .insert({
        username,
        email,
        phone: phone || null,
        role: role || 'viewer',
        password_hash: passwordHash,
        status: 'active',
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'create',
      'user', newUser.id, { username, email, role }, req
    );

    const userResponse = transformUser(newUser);
    delete userResponse.passwordHash;

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('创建用户失败:', error);
    res.status(500).json({ error: '创建用户失败' });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', authenticate, requirePermission('user:update'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;
    const { email, phone, role, status } = req.body;

    // 检查用户是否存在
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 构建更新数据
    const updateData = {};
    if (email !== undefined) {
      // 检查邮箱是否被其他用户使用
      const { data: existingEmail } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single();

      if (existingEmail) {
        return res.status(400).json({ error: '邮箱已被其他用户使用' });
      }
      updateData.email = email;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;

    updateData.updated_at = new Date().toISOString();

    // 更新用户
    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'update',
      'user', id, updateData, req
    );

    const userResponse = transformUser(updatedUser);
    delete userResponse.passwordHash;

    res.json(userResponse);
  } catch (error) {
    console.error('更新用户失败:', error);
    res.status(500).json({ error: '更新用户失败' });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticate, requirePermission('user:delete'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    // 不能删除自己
    if (id === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    // 检查用户是否存在
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 删除用户（会级联删除会话）
    const { error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'delete',
      'user', id, { username: existingUser.username }, req
    );

    res.json({ success: true, message: '用户已删除' });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({ error: '删除用户失败' });
  }
});

/**
 * 锁定用户
 * POST /api/users/:id/lock
 */
router.post('/:id/lock', authenticate, requirePermission('user:update'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    // 不能锁定自己
    if (id === req.user.id) {
      return res.status(400).json({ error: '不能锁定自己的账户' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ status: 'locked', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'lock',
      'user', id, { username: user.username }, req
    );

    res.json(transformUser(user));
  } catch (error) {
    console.error('锁定用户失败:', error);
    res.status(500).json({ error: '锁定用户失败' });
  }
});

/**
 * 解锁用户
 * POST /api/users/:id/unlock
 */
router.post('/:id/unlock', authenticate, requirePermission('user:update'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'unlock',
      'user', id, { username: user.username }, req
    );

    res.json(transformUser(user));
  } catch (error) {
    console.error('解锁用户失败:', error);
    res.status(500).json({ error: '解锁用户失败' });
  }
});

/**
 * 修改用户密码（管理员）
 * PUT /api/users/:id/password
 */
router.put('/:id/password', authenticate, requirePermission('user:update'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: '密码长度不能少于6位' });
    }

    // 检查用户是否存在
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // 更新密码
    await supabaseAdmin
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    // 记录操作日志
    await createAuditLog(
      supabaseAdmin, req.user.id, req.user.username, 'reset_password',
      'user', id, { targetUsername: existingUser.username }, req
    );

    res.json({ success: true, message: '密码已重置' });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

// ============================================
// 审计日志路由
// ============================================

/**
 * 获取审计日志
 * GET /api/audit
 */
router.get('/audit/logs', authenticate, requirePermission('audit:read'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { userId, action, resource, startDate, endDate, page = 1, pageSize = 20 } = req.query;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 用户过滤
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // 操作类型过滤
    if (action) {
      query = query.eq('action', action);
    }

    // 资源类型过滤
    if (resource) {
      query = query.eq('resource', resource);
    }

    // 时间范围过滤
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // 分页
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    query = query.range(offset, offset + parseInt(pageSize) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const logs = data.map(transformAuditLog);

    res.json({
      data: logs,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  } catch (error) {
    console.error('获取审计日志失败:', error);
    res.status(500).json({ error: '获取审计日志失败' });
  }
});

/**
 * 导出审计日志
 * GET /api/audit/export
 */
router.get('/audit/export', authenticate, requirePermission('audit:export'), async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { startDate, endDate, format = 'csv' } = req.query;

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000); // 限制导出数量

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 生成CSV
    const headers = ['时间', '用户名', '操作', '资源', '资源ID', 'IP地址', '详情'];
    const rows = data.map(log => [
      log.created_at,
      log.username,
      log.action,
      log.resource,
      log.resource_id || '',
      log.ip,
      JSON.stringify(log.details || {}),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('导出审计日志失败:', error);
    res.status(500).json({ error: '导出审计日志失败' });
  }
});

export default router;
