---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3046022100e2710c292c70183aeecc894abb3b9c5d8299dd4b4934e8437c29c3de2decfac6022100a2c559fe7e2d40d781b7f329831d0bbc8e7c466a3af73dc4c6ca831213476227
    ReservedCode2: 304402204a37e530cd3fad0f74b74d609b00f13571b55f38cb44433557ec7934d0b3a68202200e5fee66666e80a0f498b84909e7a6333baf9848d542ccfc5e874622d955b535
---

# 监控平台前端 Demo 规格说明

## 1. 项目概述

**项目名称**: NetWatch 监控平台

**项目类型**: 监控平台前端演示

**核心功能概述**: 基于监控宝设计理念的公网监控平台Demo，采用中心服务-节点Agent架构，支持HTTP/HTTPS/Ping/API监控，提供任务管理、节点管理、告警配置等核心功能的前端界面。

**目标用户**: 需要了解监控平台功能的企业用户和开发者

## 2. 技术栈

- **框架**: React 18.3 + TypeScript
- **构建工具**: Vite 6.0
- **样式方案**: Tailwind CSS 3.4
- **图表库**: Recharts
- **图标**: Lucide React
- **路由**: React Router v6
- **弹窗/通知**: Sonner (toast), Dialog
- **包管理**: pnpm

## 3. 功能模块

### 3.1 仪表盘 (Dashboard)

- **监控概览统计卡片**
  - 监控任务总数
  - 在线节点数
  - 当前告警数
  - 平均可用率

- **监控状态分布图表**
  - 饼图展示正常/异常/禁用状态比例

- **响应时间趋势图**
  - 折线图展示最近24小时响应时间变化

- **最近告警列表**
  - 显示最近5条告警记录

### 3.2 监控任务管理 (Tasks)

- **任务列表**
  - 支持分页展示
  - 显示任务名称、类型、目标、状态、最近响应时间、可用率
  - 支持搜索和筛选
  - 启用/禁用任务开关

- **任务类型**
  - HTTP/HTTPS 监控
  - Ping 监控
  - API 接口监控
  - 端口监控

- **新建/编辑任务表单**
  - 任务名称 (必填)
  - 监控类型 (单选)
  - 监控目标 URL/IP:Port
  - 监控间隔 (1分钟/5分钟/10分钟/30分钟/1小时)
  - 超时时间设置
  - 期望状态码 (HTTP监控)
  - 告警阈值 (连续失败次数)
  - 关联节点选择
  - 启用状态

- **批量操作**
  - 批量启用/禁用
  - 批量删除

### 3.3 监控节点管理 (Agents)

- **节点列表**
  - 显示节点名称、IP地址、地理位置、状态、最近心跳时间
  - 在线/离线状态指示
  - 支持搜索和筛选

- **新建/编辑节点表单**
  - 节点名称 (必填)
  - 节点描述
  - 所属地区 (华东/华南/华北/海外)
  - 注册密钥 (自动生成,可复制)
  - 启用状态

- **节点详情弹窗**
  - 显示节点详细信息
  - 显示节点分配的监控任务
  - 显示节点性能指标 (CPU/内存使用率)

### 3.4 告警配置 (Alerts)

- **告警渠道管理**
  - 钉钉机器人配置
    - Webhook URL 输入
    - 加签密钥配置
    - 启用/禁用开关
  - 告警测试功能

- **告警规则配置**
  - 告警级别 (严重/警告/提示)
  - 触发条件设置
    - 连续失败次数
    - 响应时间阈值
    - 可用率低于阈值
  - 告警静默时段设置

### 3.5 监控状态 (Status)

- **实时监控视图**
  - 网格布局展示所有任务当前状态
  - 颜色标识: 绿色(正常), 黄色(缓慢), 红色(异常), 灰色(禁用)

- **状态详情**
  - 响应时间
  - HTTP状态码
  - 错误信息
  - 最后检查时间

### 3.6 历史记录 (History)

- **数据概览**
  - 每日/每周/每月可用率统计

- **响应时间历史**
  - 可选择时间段查看
  - 支持导出数据

- **告警历史**
  - 按时间和任务筛选
  - 告警详情查看

## 4. UI/UX 设计

### 4.1 布局结构

- **侧边导航栏** (左侧固定)
  - Logo区域
  - 导航菜单: 仪表盘、监控任务、监控节点、告警配置、监控状态、历史记录
  - 底部: 主题切换、用户信息

- **顶部栏**
  - 面包屑导航
  - 全局搜索
  - 通知铃铛
  - 用户头像

- **主内容区**
  - 页面标题
  - 功能区域
  - 数据表格/卡片

### 4.2 视觉风格

- **配色方案**
  - 主色: #2B5D3A (深绿色,代表稳定可靠)
  - 辅助色: #4A90E2 (蓝色,代表科技感)
  - 强调色: #F5A623 (橙色,用于告警)
  - 背景色: #F8FAFC (浅灰白)
  - 文字色: #1E293B (深灰黑)

- **状态颜色**
  - 正常: #22C55E (绿色)
  - 缓慢: #F59E0B (橙色)
  - 异常: #EF4444 (红色)
  - 离线/禁用: #9CA3AF (灰色)

- **字体**
  - 主字体: Inter, -apple-system, sans-serif
  - 代码字体: JetBrains Mono, monospace

### 4.3 交互设计

- **表格交互**
  - 行悬停高亮
  - 行点击选中
  - 支持排序
  - 支持批量选择

- **表单交互**
  - 实时表单验证
  - 错误提示
  - 成功/失败反馈

- **数据加载**
  - 骨架屏加载状态
  - 空数据状态展示
  - 错误状态重试

## 5. 数据模型 (前端模拟)

### 5.1 监控任务 (Task)

```typescript
interface Task {
  id: string;
  name: string;
  type: 'http' | 'https' | 'ping' | 'api' | 'port';
  target: string;
  interval: number; // 分钟
  timeout: number; // 秒
  statusCode?: number; // HTTP期望状态码
  alertThreshold: number; // 连续失败次数
  nodeId: string;
  enabled: boolean;
  status: 'normal' | 'slow' | 'error' | 'disabled';
  lastResponseTime?: number; // 毫秒
  lastCheckTime?: string;
  availability?: number; // 可用率百分比
  createdAt: string;
  updatedAt: string;
}
```

### 5.2 监控节点 (Agent)

```typescript
interface Agent {
  id: string;
  name: string;
  ip: string;
  region: 'east' | 'south' | 'north' | 'overseas';
  description?: string;
  registerKey: string;
  enabled: boolean;
  status: 'online' | 'offline';
  lastHeartbeat?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  taskCount: number;
  createdAt: string;
}
```

### 5.3 告警配置 (AlertConfig)

```typescript
interface AlertConfig {
  id: string;
  type: 'dingtalk';
  webhookUrl: string;
  secret?: string;
  enabled: boolean;
  rules: AlertRule[];
}

interface AlertRule {
  id: string;
  name: string;
  level: 'critical' | 'warning' | 'info';
  condition: 'failure_count' | 'response_time' | 'availability';
  threshold: number;
  enabled: boolean;
}
```

### 5.4 告警记录 (Alert)

```typescript
interface Alert {
  id: string;
  taskId: string;
  taskName: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  responseTime?: number;
  statusCode?: number;
  createdAt: string;
  acknowledged: boolean;
}
```

## 6. 页面路由

- `/` - 仪表盘
- `/tasks` - 监控任务列表
- `/tasks/new` - 新建任务
- `/tasks/:id/edit` - 编辑任务
- `/nodes` - 监控节点列表
- `/nodes/new` - 新建节点
- `/nodes/:id` - 节点详情
- `/alerts` - 告警配置
- `/status` - 监控状态
- `/history` - 历史记录

## 7. 示例数据

### 示例监控任务
1. 监控 tuniu.com (HTTP) - 正常
2. 监控 180.97.1.16 (Ping) - 正常
3. 监控 api.github.com (HTTPS) - 缓慢
4. 监控 github.com (HTTPS) - 异常
5. 监控 localhost:8080 (Port) - 禁用

### 示例节点
1. 华东节点-01 - 在线
2. 华南节点-01 - 在线
3. 华北节点-01 - 离线
4. 海外节点-01 - 在线

## 8. 开发计划

- [x] 初始化 React 项目
- [ ] 创建 SPEC.md 规格说明
- [ ] 实现应用核心结构和路由
- [ ] 实现仪表盘页面
- [ ] 实现监控任务管理 (列表 + 新建/编辑)
- [ ] 实现监控节点管理 (列表 + 新建/详情)
- [ ] 实现告警配置页面
- [ ] 实现监控状态视图
- [ ] 实现历史记录页面
- [ ] 构建和部署
