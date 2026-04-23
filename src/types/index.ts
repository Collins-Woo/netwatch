// 监控任务类型
export type TaskType =
  | 'http'           // HTTP监控
  | 'https'          // HTTPS监控
  | 'api'            // API接口监控（支持多种方法）
  | 'ping'           // Ping监控
  | 'tcp'            // TCP端口监控
  | 'dns'            // DNS解析监控
  | 'ssl'            // SSL证书监控
  | 'traceroute'     // 路由追踪
  | 'mysql'          // MySQL服务检测
  | 'redis';         // Redis服务检测

export type TaskStatus = 'normal' | 'slow' | 'error' | 'disabled';

// HTTP方法类型
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

// 任务配置接口（支持多种监控类型）
export interface TaskConfig {
  // HTTP/API监控配置
  method?: HttpMethod;                    // 请求方法
  headers?: Record<string, string>;      // 请求头
  body?: string;                          // 请求体
  expectedPattern?: string;              // 期望响应内容

  // TCP端口配置
  port?: number;                         // 端口号

  // DNS配置
  dnsServer?: string;                    // DNS服务器
  recordType?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';  // DNS记录类型

  // SSL配置
  sslExpiryWarning?: number;             // 证书到期预警天数
  sslExpiryCritical?: number;            // 证书到期严重预警天数

  // MySQL/Redis配置
  database?: string;                     // 数据库名
  username?: string;                     // 用户名
  password?: string;                     // 密码（加密存储）

  // 路由追踪配置
  maxHops?: number;                      // 最大跳数
  maxTimeout?: number;                  // 最大超时时间
}

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  target: string;
  interval: number;          // 分钟
  timeout: number;           // 秒
  statusCode?: number;       // HTTP期望状态码
  alertThreshold: number;    // 连续失败次数
  nodeIds: string[];         // 监控节点ID列表（支持多选）
  enabled: boolean;
  status: TaskStatus;
  lastResponseTime?: number;  // 毫秒
  lastCheckTime?: string;
  availability?: number;     // 可用率百分比
  config?: TaskConfig;        // 扩展配置
  createdAt: string;
  updatedAt: string;
}

// 监控节点类型
export type NodeRegion = 'east' | 'south' | 'north' | 'overseas';
export type NodeStatus = 'online' | 'offline';

export interface Agent {
  id: string;
  name: string;
  ip: string;
  region: NodeRegion;
  description?: string;
  registerKey: string;
  enabled: boolean;
  status: NodeStatus;
  lastHeartbeat?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  taskCount: number;
  createdAt: string;
}

// 告警配置
export type AlertLevel = 'critical' | 'warning' | 'info';
export type AlertCondition = 'failure_count' | 'response_time' | 'availability';

export interface AlertRule {
  id: string;
  name: string;
  level: AlertLevel;
  condition: AlertCondition;
  threshold: number;
  enabled: boolean;
}

export interface AlertConfig {
  id: string;
  type: 'dingtalk';
  webhookUrl: string;
  secret?: string;
  enabled: boolean;
  rules: AlertRule[];
}

// 告警记录
export interface Alert {
  id: string;
  taskId: string;
  taskName: string;
  level: AlertLevel;
  message: string;
  responseTime?: number;
  statusCode?: number;
  createdAt: string;
  acknowledged: boolean;
}

// 响应时间历史数据
export interface ResponseTimeData {
  time: string;
  value: number;
}

// 统计概览
export interface DashboardStats {
  totalTasks: number;
  onlineNodes: number;
  currentAlerts: number;
  avgAvailability: number;
}

// ============ 用户管理模块 ============

// 用户角色枚举
export type UserRole =
  | 'admin'      // 管理员 - 完全控制
  | 'operator'   // 运维人员 - 管理任务和节点
  | 'auditor'    // 审计员 - 只读权限，查看日志
  | 'viewer';    // 查看者 - 只读权限

// 用户状态
export type UserStatus = 'active' | 'inactive' | 'locked';

// 用户实体
export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  lastLoginIp?: string;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// 角色权限映射
export const RolePermissions: Record<UserRole, {
  label: string;
  description: string;
  permissions: string[];
}> = {
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

// 用户表单数据
export interface UserFormData {
  username: string;
  email: string;
  phone?: string;
  role: UserRole;
  password?: string;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

// 操作日志
export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ip: string;
  userAgent?: string;
  createdAt: string;
}

// 监控类型元数据
export const TaskTypeMeta: Record<TaskType, {
  label: string;
  icon: string;
  color: string;
  description: string;
}> = {
  http: {
    label: 'HTTP',
    icon: 'Globe',
    color: 'blue',
    description: '监控HTTP网站可用性和响应时间'
  },
  https: {
    label: 'HTTPS',
    icon: 'Lock',
    color: 'green',
    description: '监控HTTPS网站，验证SSL证书'
  },
  api: {
    label: 'API接口',
    icon: 'Code',
    color: 'purple',
    description: '监控RESTful API，支持多种请求方法和自定义请求体'
  },
  ping: {
    label: 'Ping',
    icon: 'Activity',
    color: 'cyan',
    description: 'ICMP ping检测网络连通性'
  },
  tcp: {
    label: 'TCP端口',
    icon: 'Server',
    color: 'orange',
    description: '检测TCP端口是否开放'
  },
  dns: {
    label: 'DNS解析',
    icon: 'Globe',
    color: 'indigo',
    description: '检测DNS记录解析是否正确'
  },
  ssl: {
    label: 'SSL证书',
    icon: 'Shield',
    color: 'emerald',
    description: '监控SSL证书到期时间和有效性'
  },
  traceroute: {
    label: '路由追踪',
    icon: 'Route',
    color: 'rose',
    description: '追踪网络路由路径'
  },
  mysql: {
    label: 'MySQL',
    icon: 'Database',
    color: 'sky',
    description: '检测MySQL数据库服务可用性'
  },
  redis: {
    label: 'Redis',
    icon: 'Zap',
    color: 'red',
    description: '检测Redis缓存服务可用性'
  }
};
