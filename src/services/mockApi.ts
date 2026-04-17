/**
 * Mock API Service
 *
 * 当后端API不可用时，使用本地模拟数据
 * 这样前端Demo可以独立运行
 */

import { Task, Agent, AlertConfig, Alert } from '../types';
import {
  mockTasks as defaultTasks,
  mockAgents as defaultAgents,
  mockAlertConfig as defaultAlertConfig,
  mockAlerts as defaultAlerts,
  mockDashboardStats,
  generateResponseTimeData,
} from '../data/mockData';

// 模拟数据存储（支持CRUD操作）
let tasks = [...defaultTasks];
let agents = [...defaultAgents];
let alertConfig = { ...defaultAlertConfig };
let alerts = [...defaultAlerts];

// 生成唯一ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    return {
      ...mockDashboardStats,
      totalNodes: agents.length,
    };
  },
};

// Tasks API
export const tasksApi = {
  getAll: async (params?: { search?: string; type?: string; status?: string; enabled?: boolean }) => {
    let result = [...tasks];

    if (params?.search) {
      const search = params.search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(search) || t.target.toLowerCase().includes(search)
      );
    }

    if (params?.type && params.type !== 'all') {
      result = result.filter((t) => t.type === params.type);
    }

    if (params?.status && params.status !== 'all') {
      result = result.filter((t) => t.status === params.status);
    }

    if (params?.enabled !== undefined) {
      result = result.filter((t) => t.enabled === params.enabled);
    }

    return result;
  },

  getById: async (id: string) => {
    return tasks.find((t) => t.id === id) || null;
  },

  create: async (data: Partial<Task>) => {
    const newTask: Task = {
      id: generateId(),
      name: data.name || '',
      type: data.type || 'http',
      target: data.target || '',
      interval: data.interval || 5,
      timeout: data.timeout || 10,
      statusCode: data.statusCode,
      alertThreshold: data.alertThreshold || 3,
      nodeId: data.nodeId || '',
      enabled: data.enabled ?? true,
      status: data.enabled ? 'normal' : 'disabled',
      lastResponseTime: undefined,
      lastCheckTime: undefined,
      availability: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.unshift(newTask);
    return newTask;
  },

  update: async (id: string, data: Partial<Task>) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if ('enabled' in data) {
      tasks[index].status = data.enabled ? 'normal' : 'disabled';
    }

    return tasks[index];
  },

  delete: async (id: string) => {
    tasks = tasks.filter((t) => t.id !== id);
    return { success: true };
  },

  batchDelete: async (ids: string[]) => {
    tasks = tasks.filter((t) => !ids.includes(t.id));
    return { success: true, message: `已删除 ${ids.length} 个任务` };
  },

  toggle: async (id: string) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    tasks[index].enabled = !tasks[index].enabled;
    tasks[index].status = tasks[index].enabled ? 'normal' : 'disabled';
    tasks[index].updatedAt = new Date().toISOString();

    return tasks[index];
  },
};

// Nodes API
export const nodesApi = {
  getAll: async (params?: { search?: string; region?: string; status?: string }) => {
    let result = [...agents];

    if (params?.search) {
      const search = params.search.toLowerCase();
      result = result.filter(
        (a) => a.name.toLowerCase().includes(search) || a.ip.includes(search)
      );
    }

    if (params?.region && params.region !== 'all') {
      result = result.filter((a) => a.region === params.region);
    }

    if (params?.status && params.status !== 'all') {
      result = result.filter((a) => a.status === params.status);
    }

    return result;
  },

  getById: async (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return null;

    return {
      ...agent,
      tasks: tasks.filter((t) => t.nodeId === id),
    };
  },

  create: async (data: Partial<Agent>) => {
    const newAgent: Agent = {
      id: generateId(),
      name: data.name || '',
      ip: data.ip || '',
      region: data.region || 'east',
      description: data.description,
      registerKey: `sk_${Math.random().toString(36).substr(2, 16)}`,
      enabled: data.enabled ?? true,
      status: 'offline',
      lastHeartbeat: undefined,
      cpuUsage: 0,
      memoryUsage: 0,
      taskCount: 0,
      createdAt: new Date().toISOString(),
    };

    agents.unshift(newAgent);
    return newAgent;
  },

  update: async (id: string, data: Partial<Agent>) => {
    const index = agents.findIndex((a) => a.id === id);
    if (index === -1) return null;

    agents[index] = {
      ...agents[index],
      ...data,
    };

    return agents[index];
  },

  delete: async (id: string) => {
    agents = agents.filter((a) => a.id !== id);
    return { success: true };
  },

  regenerateKey: async (id: string) => {
    const index = agents.findIndex((a) => a.id === id);
    if (index === -1) return null;

    agents[index].registerKey = `sk_${Math.random().toString(36).substr(2, 16)}`;
    return { register_key: agents[index].registerKey };
  },
};

// Alerts API
export const alertsApi = {
  getConfig: async () => {
    return {
      ...alertConfig,
      rules: alertConfig.rules || [],
    };
  },

  updateConfig: async (data: any) => {
    alertConfig = {
      ...alertConfig,
      ...data,
    };
    return alertConfig;
  },

  getRules: async () => {
    return alertConfig.rules || [];
  },

  createRule: async (data: any) => {
    const newRule = {
      id: generateId(),
      ...data,
    };

    if (!alertConfig.rules) {
      alertConfig.rules = [];
    }
    alertConfig.rules.push(newRule);

    return newRule;
  },

  updateRule: async (id: string, data: any) => {
    const index = alertConfig.rules?.findIndex((r: any) => r.id === id);
    if (index === undefined || index === -1) return null;

    alertConfig.rules[index] = {
      ...alertConfig.rules[index],
      ...data,
    };

    return alertConfig.rules[index];
  },

  deleteRule: async (id: string) => {
    if (alertConfig.rules) {
      alertConfig.rules = alertConfig.rules.filter((r: any) => r.id !== id);
    }
    return { success: true };
  },

  test: async (data: any) => {
    console.log('发送测试消息到:', data.webhook_url);
    return { success: true, message: '测试消息已发送，请检查钉钉群' };
  },

  getHistory: async (params?: { task_id?: string; level?: string; acknowledged?: boolean; limit?: number }) => {
    let result = [...alerts];

    if (params?.task_id) {
      result = result.filter((a) => a.taskId === params.task_id);
    }

    if (params?.level) {
      result = result.filter((a) => a.level === params.level);
    }

    if (params?.acknowledged !== undefined) {
      result = result.filter((a) => a.acknowledged === params.acknowledged);
    }

    if (params?.limit) {
      result = result.slice(0, params.limit);
    }

    return result;
  },

  acknowledge: async (id: string) => {
    const index = alerts.findIndex((a) => a.id === id);
    if (index === -1) return null;

    alerts[index].acknowledged = true;
    return alerts[index];
  },
};

// Status API
export const statusApi = {
  getAll: async (params?: { status?: string; type?: string; search?: string }) => {
    let result = [...tasks];

    if (params?.status && params.status !== 'all') {
      result = result.filter((t) => t.status === params.status);
    }

    if (params?.type && params.type !== 'all') {
      result = result.filter((t) => t.type === params.type);
    }

    if (params?.search) {
      const search = params.search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(search) || t.target.toLowerCase().includes(search)
      );
    }

    return result;
  },

  getStats: async () => {
    return {
      normal: tasks.filter((t) => t.status === 'normal').length,
      slow: tasks.filter((t) => t.status === 'slow').length,
      error: tasks.filter((t) => t.status === 'error').length,
      disabled: tasks.filter((t) => t.status === 'disabled').length,
      total: tasks.length,
    };
  },

  getDetail: async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;

    const node = agents.find((a) => a.id === task.nodeId);

    return {
      task,
      node: node ? { name: node.name, ip: node.ip, status: node.status } : null,
      history: generateResponseTimeData(),
    };
  },
};

// History API
export const historyApi = {
  getResponseTime: async (params?: { task_id?: string; start_date?: string; end_date?: string; interval?: string }) => {
    return generateResponseTimeData();
  },

  getAvailability: async (params?: { task_id?: string; period?: string }) => {
    const activeTasks = tasks.filter((t) => t.availability !== undefined);

    return {
      period: params?.period || '7d',
      tasks: activeTasks.map((t) => ({
        id: t.id,
        name: t.name,
        availability: t.availability,
      })),
      average:
        activeTasks.length > 0
          ? Math.round(activeTasks.reduce((sum, t) => sum + (t.availability || 0), 0) / activeTasks.length)
          : 0,
    };
  },

  getAlerts: async (params?: { task_id?: string; start_date?: string; end_date?: string; period?: string }) => {
    const stats = {
      critical: alerts.filter((a) => a.level === 'critical').length,
      warning: alerts.filter((a) => a.level === 'warning').length,
      info: alerts.filter((a) => a.level === 'info').length,
      total: alerts.length,
      unacknowledged: alerts.filter((a) => !a.acknowledged).length,
    };

    return {
      stats,
      alerts: alerts,
    };
  },

  getStats: async (period: string = '24h') => {
    return {
      totalChecks: 13452,
      avgResponseTime: 287,
      maxResponseTime: 1250,
      minResponseTime: 8,
    };
  },
};

// Mock Users data
const mockUsers = [
  {
    id: 'user-1',
    username: 'admin',
    email: 'admin@netwatch.local',
    phone: '138****8888',
    role: 'admin',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    lastLoginIp: '192.168.1.100',
    loginCount: 128,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  },
  {
    id: 'user-2',
    username: 'operator1',
    email: 'operator@netwatch.local',
    phone: '139****6666',
    role: 'operator',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    lastLoginIp: '192.168.1.101',
    loginCount: 45,
    createdAt: '2024-02-10T00:00:00.000Z',
    updatedAt: '2024-02-15T14:20:00.000Z',
  },
  {
    id: 'user-3',
    username: 'auditor1',
    email: 'auditor@netwatch.local',
    phone: '137****5555',
    role: 'auditor',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 172800000).toISOString(),
    lastLoginIp: '192.168.1.102',
    loginCount: 23,
    createdAt: '2024-03-05T00:00:00.000Z',
    updatedAt: '2024-03-10T09:15:00.000Z',
  },
  {
    id: 'user-4',
    username: 'viewer1',
    email: 'viewer@netwatch.local',
    phone: '136****4444',
    role: 'viewer',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 259200000).toISOString(),
    lastLoginIp: '192.168.1.103',
    loginCount: 12,
    createdAt: '2024-04-01T00:00:00.000Z',
    updatedAt: '2024-04-05T11:45:00.000Z',
  },
  {
    id: 'user-5',
    username: 'locked_user',
    email: 'locked@netwatch.local',
    phone: '135****3333',
    role: 'viewer',
    status: 'locked',
    lastLoginAt: new Date(Date.now() - 604800000).toISOString(),
    lastLoginIp: '10.0.0.1',
    loginCount: 3,
    createdAt: '2024-05-10T00:00:00.000Z',
    updatedAt: '2024-05-12T08:00:00.000Z',
  },
];

// Mock Audit Logs
const mockAuditLogs = [
  { id: 'log-1', userId: 'user-1', username: 'admin', action: 'login', resource: 'system', details: { result: 'success' }, ip: '192.168.1.100', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'log-2', userId: 'user-1', username: 'admin', action: 'create', resource: 'task', resourceId: 'task-1', details: { name: '携程官网监控' }, ip: '192.168.1.100', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'log-3', userId: 'user-1', username: 'admin', action: 'create', resource: 'node', resourceId: 'node-1', details: { name: '华东节点-01' }, ip: '192.168.1.100', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'log-4', userId: 'user-2', username: 'operator1', action: 'update', resource: 'task', resourceId: 'task-2', details: { field: 'interval', value: 10 }, ip: '192.168.1.101', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'log-5', userId: 'user-3', username: 'auditor1', action: 'login', resource: 'system', details: { result: 'success' }, ip: '192.168.1.102', createdAt: new Date(Date.now() - 172800000).toISOString() },
  { id: 'log-6', userId: 'user-1', username: 'admin', action: 'delete', resource: 'task', resourceId: 'task-old', details: { name: '旧监控任务' }, ip: '192.168.1.100', createdAt: new Date(Date.now() - 259200000).toISOString() },
  { id: 'log-7', userId: 'user-1', username: 'admin', action: 'create', resource: 'user', resourceId: 'user-4', details: { username: 'viewer1' }, ip: '192.168.1.100', createdAt: new Date(Date.now() - 345600000).toISOString() },
  { id: 'log-8', userId: 'user-2', username: 'operator1', action: 'update', resource: 'alert_config', details: { field: 'webhook_url' }, ip: '192.168.1.101', createdAt: new Date(Date.now() - 432000000).toISOString() },
];

// Users storage
let users = [...mockUsers];
let auditLogs = [...mockAuditLogs];

// Users API
export const usersApi = {
  getAll: async (params?: { search?: string; role?: string; status?: string; page?: number; pageSize?: number }) => {
    let result = [...users];

    if (params?.search) {
      const search = params.search.toLowerCase();
      result = result.filter(
        (u) => u.username.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)
      );
    }

    if (params?.role) {
      result = result.filter((u) => u.role === params.role);
    }

    if (params?.status) {
      result = result.filter((u) => u.status === params.status);
    }

    // Pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedResult = result.slice(start, start + pageSize);

    return {
      data: paginatedResult,
      total: result.length,
      page,
      pageSize,
    };
  },

  getById: async (id: string) => {
    return users.find((u) => u.id === id) || null;
  },

  create: async (data: any) => {
    const newUser = {
      id: generateId(),
      username: data.username,
      email: data.email,
      phone: data.phone || '',
      role: data.role || 'viewer',
      status: 'active',
      lastLoginAt: null,
      lastLoginIp: null,
      loginCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.unshift(newUser);
    return newUser;
  },

  update: async (id: string, data: any) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    users[index] = {
      ...users[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return users[index];
  },

  delete: async (id: string) => {
    users = users.filter((u) => u.id !== id);
    return { success: true };
  },

  lock: async (id: string) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index].status = 'locked';
    return users[index];
  },

  unlock: async (id: string) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index].status = 'active';
    return users[index];
  },

  getPermissions: async (userId?: string) => {
    const targetId = userId || 'current';
    const user = users.find((u) => u.id === targetId);
    if (!user) return [];

    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      operator: ['node:*', 'task:*', 'alert:*', 'audit:read'],
      auditor: ['node:read', 'task:read', 'alert:read', 'audit:*'],
      viewer: ['node:read', 'task:read', 'alert:read'],
    };

    return rolePermissions[user.role] || [];
  },
};

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    const user = users.find((u) => u.username === username);
    if (!user) {
      throw new Error('用户名或密码错误');
    }

    // Mock password check (in real app, use bcrypt)
    if (password !== 'admin123' && password !== '123456') {
      throw new Error('用户名或密码错误');
    }

    const token = `mock-jwt-token-${Date.now()}`;

    return {
      token,
      user,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  },

  logout: async () => {
    return { success: true };
  },

  getCurrentUser: async () => {
    return users[0]; // Return admin as mock current user
  },

  refreshToken: async () => {
    return {
      token: `mock-jwt-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
  },

  changeMyPassword: async (oldPassword: string, newPassword: string) => {
    if (oldPassword !== 'admin123' && oldPassword !== '123456') {
      throw new Error('原密码错误');
    }
    return { success: true };
  },
};

// Audit API
export const auditApi = {
  getLogs: async (params?: { userId?: string; action?: string; resource?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => {
    let result = [...auditLogs];

    if (params?.userId) {
      result = result.filter((l) => l.userId === params.userId);
    }

    if (params?.action) {
      result = result.filter((l) => l.action === params.action);
    }

    if (params?.resource) {
      result = result.filter((l) => l.resource === params.resource);
    }

    // Pagination
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedResult = result.slice(start, start + pageSize);

    return {
      data: paginatedResult,
      total: result.length,
      page,
      pageSize,
    };
  },

  exportLogs: async () => {
    return { downloadUrl: '/mock-export/audit-logs.csv' };
  },
};

// Session API
export const sessionApi = {
  getMySessions: async () => {
    return [
      { id: 'session-1', createdAt: new Date(Date.now() - 3600000).toISOString(), ip: '192.168.1.100', userAgent: 'Chrome/120.0' },
      { id: 'session-2', createdAt: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.100', userAgent: 'Firefox/121.0' },
    ];
  },

  revokeSession: async (sessionId: string) => {
    return { success: true };
  },

  revokeAllOtherSessions: async () => {
    return { success: true };
  },
};

// Export all APIs
export default {
  tasks: tasksApi,
  nodes: nodesApi,
  alerts: alertsApi,
  status: statusApi,
  history: historyApi,
  dashboard: dashboardApi,
  users: usersApi,
  auth: authApi,
  audit: auditApi,
  session: sessionApi,
};
