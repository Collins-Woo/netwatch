import { Task, Agent, AlertConfig, Alert, ResponseTimeData } from '../types';

// 模拟监控任务数据
export const mockTasks: Task[] = [
  {
    id: 'task-001',
    name: '携程官网监控',
    type: 'http',
    target: 'http://www.tuniu.com',
    interval: 5,
    timeout: 10,
    statusCode: 200,
    alertThreshold: 3,
    nodeId: 'agent-001',
    enabled: true,
    status: 'normal',
    lastResponseTime: 245,
    lastCheckTime: '2026-04-16T17:30:00Z',
    availability: 99.8,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-16T17:30:00Z',
  },
  {
    id: 'task-002',
    name: '阿里云DNS监控',
    type: 'ping',
    target: '180.97.1.16',
    interval: 1,
    timeout: 5,
    alertThreshold: 3,
    nodeId: 'agent-002',
    enabled: true,
    status: 'normal',
    lastResponseTime: 12,
    lastCheckTime: '2026-04-16T17:31:00Z',
    availability: 100,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-16T17:31:00Z',
  },
  {
    id: 'task-003',
    name: 'GitHub API监控',
    type: 'https',
    target: 'https://api.github.com',
    interval: 5,
    timeout: 15,
    statusCode: 200,
    alertThreshold: 3,
    nodeId: 'agent-001',
    enabled: true,
    status: 'slow',
    lastResponseTime: 1250,
    lastCheckTime: '2026-04-16T17:28:00Z',
    availability: 97.2,
    createdAt: '2026-04-02T00:00:00Z',
    updatedAt: '2026-04-16T17:28:00Z',
  },
  {
    id: 'task-004',
    name: 'GitHub官网监控',
    type: 'https',
    target: 'https://github.com',
    interval: 5,
    timeout: 10,
    statusCode: 200,
    alertThreshold: 3,
    nodeId: 'agent-003',
    enabled: true,
    status: 'error',
    lastResponseTime: 0,
    lastCheckTime: '2026-04-16T17:29:00Z',
    availability: 0,
    createdAt: '2026-04-03T00:00:00Z',
    updatedAt: '2026-04-16T17:29:00Z',
  },
  {
    id: 'task-005',
    name: '本地服务监控',
    type: 'port',
    target: 'localhost:8080',
    interval: 5,
    timeout: 5,
    alertThreshold: 2,
    nodeId: 'agent-004',
    enabled: false,
    status: 'disabled',
    lastResponseTime: undefined,
    lastCheckTime: undefined,
    availability: undefined,
    createdAt: '2026-04-05T00:00:00Z',
    updatedAt: '2026-04-10T00:00:00Z',
  },
  {
    id: 'task-006',
    name: '百度搜索API',
    type: 'https',
    target: 'https://www.baidu.com',
    interval: 3,
    timeout: 8,
    statusCode: 200,
    alertThreshold: 3,
    nodeId: 'agent-002',
    enabled: true,
    status: 'normal',
    lastResponseTime: 156,
    lastCheckTime: '2026-04-16T17:30:30Z',
    availability: 99.5,
    createdAt: '2026-04-06T00:00:00Z',
    updatedAt: '2026-04-16T17:30:30Z',
  },
  {
    id: 'task-007',
    name: '京东商城监控',
    type: 'https',
    target: 'https://www.jd.com',
    interval: 5,
    timeout: 10,
    statusCode: 200,
    alertThreshold: 3,
    nodeId: 'agent-001',
    enabled: true,
    status: 'normal',
    lastResponseTime: 320,
    lastCheckTime: '2026-04-16T17:29:30Z',
    availability: 99.2,
    createdAt: '2026-04-07T00:00:00Z',
    updatedAt: '2026-04-16T17:29:30Z',
  },
  {
    id: 'task-008',
    name: '腾讯云API',
    type: 'https',
    target: 'https://cloud.tencent.com',
    interval: 10,
    timeout: 15,
    statusCode: 200,
    alertThreshold: 5,
    nodeId: 'agent-003',
    enabled: true,
    status: 'slow',
    lastResponseTime: 890,
    lastCheckTime: '2026-04-16T17:25:00Z',
    availability: 98.1,
    createdAt: '2026-04-08T00:00:00Z',
    updatedAt: '2026-04-16T17:25:00Z',
  },
];

// 模拟监控节点数据
export const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: '华东节点-01',
    ip: '10.0.1.101',
    region: 'east',
    description: '位于上海的数据中心节点',
    registerKey: 'sk_a1b2c3d4e5f6g7h8',
    enabled: true,
    status: 'online',
    lastHeartbeat: '2026-04-16T17:35:00Z',
    cpuUsage: 23,
    memoryUsage: 45,
    taskCount: 3,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'agent-002',
    name: '华南节点-01',
    ip: '10.0.2.102',
    region: 'south',
    description: '位于深圳的数据中心节点',
    registerKey: 'sk_i9j0k1l2m3n4o5p6',
    enabled: true,
    status: 'online',
    lastHeartbeat: '2026-04-16T17:35:30Z',
    cpuUsage: 35,
    memoryUsage: 52,
    taskCount: 2,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'agent-003',
    name: '华北节点-01',
    ip: '10.0.3.103',
    region: 'north',
    description: '位于北京的数据中心节点',
    registerKey: 'sk_q7r8s9t0u1v2w3x4',
    enabled: true,
    status: 'offline',
    lastHeartbeat: '2026-04-16T14:20:00Z',
    cpuUsage: 0,
    memoryUsage: 0,
    taskCount: 2,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'agent-004',
    name: '海外节点-01',
    ip: '10.0.4.104',
    region: 'overseas',
    description: '位于洛杉矶的海外节点',
    registerKey: 'sk_y5z6a7b8c9d0e1f2',
    enabled: true,
    status: 'online',
    lastHeartbeat: '2026-04-16T17:34:00Z',
    cpuUsage: 18,
    memoryUsage: 38,
    taskCount: 1,
    createdAt: '2026-03-15T00:00:00Z',
  },
];

// 模拟告警配置
export const mockAlertConfig: AlertConfig = {
  id: 'alert-config-001',
  type: 'dingtalk',
  webhookUrl: 'https://oapi.dingtalk.com/robot/send?access_token=xxxxxx',
  secret: 'SECxxxxxxxxxxxxxxxxxxxxx',
  enabled: true,
  rules: [
    {
      id: 'rule-001',
      name: '连续失败告警',
      level: 'critical',
      condition: 'failure_count',
      threshold: 3,
      enabled: true,
    },
    {
      id: 'rule-002',
      name: '响应超时告警',
      level: 'warning',
      condition: 'response_time',
      threshold: 5000,
      enabled: true,
    },
    {
      id: 'rule-003',
      name: '可用率低告警',
      level: 'info',
      condition: 'availability',
      threshold: 95,
      enabled: true,
    },
  ],
};

// 模拟告警记录
export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    taskId: 'task-004',
    taskName: 'GitHub官网监控',
    level: 'critical',
    message: '连接超时，目标站点无法访问',
    responseTime: 0,
    statusCode: undefined,
    createdAt: '2026-04-16T17:29:00Z',
    acknowledged: false,
  },
  {
    id: 'alert-002',
    taskId: 'task-003',
    taskName: 'GitHub API监控',
    level: 'warning',
    message: '响应时间超过阈值: 1250ms > 500ms',
    responseTime: 1250,
    statusCode: 200,
    createdAt: '2026-04-16T17:28:00Z',
    acknowledged: true,
  },
  {
    id: 'alert-003',
    taskId: 'task-004',
    taskName: 'GitHub官网监控',
    level: 'critical',
    message: '连续3次检测失败',
    responseTime: 0,
    statusCode: undefined,
    createdAt: '2026-04-16T17:24:00Z',
    acknowledged: true,
  },
  {
    id: 'alert-004',
    taskId: 'task-008',
    taskName: '腾讯云API',
    level: 'warning',
    message: '响应缓慢: 890ms > 500ms',
    responseTime: 890,
    statusCode: 200,
    createdAt: '2026-04-16T17:20:00Z',
    acknowledged: false,
  },
  {
    id: 'alert-005',
    taskId: 'task-006',
    taskName: '百度搜索API',
    level: 'info',
    message: '可用率低于95%: 当前99.5%',
    responseTime: 156,
    statusCode: 200,
    createdAt: '2026-04-16T17:15:00Z',
    acknowledged: true,
  },
];

// 模拟响应时间历史数据 (24小时)
export const generateResponseTimeData = (): ResponseTimeData[] => {
  const data: ResponseTimeData[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      value: Math.floor(Math.random() * 300) + 100, // 100-400ms 随机波动
    });
  }

  return data;
};

// 模拟统计数据
export const mockDashboardStats = {
  totalTasks: mockTasks.length,
  onlineNodes: mockAgents.filter(a => a.status === 'online').length,
  currentAlerts: mockAlerts.filter(a => !a.acknowledged).length,
  avgAvailability: Math.round(
    mockTasks.filter(t => t.availability !== undefined)
      .reduce((sum, t) => sum + (t.availability || 0), 0) /
    mockTasks.filter(t => t.availability !== undefined).length
  ),
};

// 地区映射
export const regionMap = {
  east: '华东',
  south: '华南',
  north: '华北',
  overseas: '海外',
};

// 任务类型映射
export const taskTypeMap = {
  http: 'HTTP',
  https: 'HTTPS',
  ping: 'Ping',
  api: 'API',
  port: '端口',
};

// 状态映射
export const statusMap = {
  normal: '正常',
  slow: '缓慢',
  error: '异常',
  disabled: '已禁用',
};

// 告警级别映射
export const alertLevelMap = {
  critical: '严重',
  warning: '警告',
  info: '提示',
};
