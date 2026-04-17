---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3045022100ce9cd9bd1a002a5d75423baad45ba02ddf8da93a0f648d3453f642a3272448fb02201ad0030cf766bfb2a1fa4a88dd8bf3c679c2b5e2c7b39f7b1b41f0dba8fc982f
    ReservedCode2: 30440220435b1391d7ade6abe078d1b19979fe2536a369bc779f86cddf6834975dfa6cc502205723a207b99b18e70f22208f19cebc82e200aed3fbd8417a181e51d051ae0975
---

# NetWatch 监控平台

> 企业级网站与服务监控系统，支持 HTTP/HTTPS/API/TCP/DNS/SSL 等多种监控类型

## 功能特性

### 监控类型
- **HTTP/HTTPS 监控** - 监控网站可用性和响应时间
- **API 接口监控** - 支持 GET/POST/PUT/DELETE 等 HTTP 方法，自定义请求头和请求体
- **Ping 监控** - ICMP ping 检测主机可达性
- **TCP 端口监控** - 检测端口连通性
- **DNS 解析监控** - 支持 A/AAAA/CNAME/MX/TXT/NS 记录类型
- **SSL 证书监控** - 监控证书到期时间
- **路由追踪** - 网络路径分析
- **MySQL 数据库监控** - 数据库连接检测
- **Redis 缓存监控** - Redis 服务可用性检测

### 核心功能
- **中心服务 + Agent 架构** - Agent 可部署在任意服务器
- **任务分配** - 自动将监控任务分配给在线节点
- **实时告警** - 支持钉钉机器人告警
- **历史数据** - 完整的监控历史记录
- **响应时间图表** - 直观的性能趋势展示

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/your-repo/netwatch.git
cd netwatch

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 Supabase 凭证

# 启动服务
docker compose up -d

# 访问 http://localhost:3001
```

### 方式二：手动部署

详见 [Rocky Linux 部署指南](docs/DEPLOY_ROCKY_LINUX.md)

## 目录结构

```
netwatch/
├── backend/                    # 后端 API 服务
│   ├── src/
│   │   ├── agent/             # Agent 节点代码
│   │   │   ├── agent.js       # Agent 主程序
│   │   │   ├── agent-init.sh  # Linux 安装脚本
│   │   │   └── Dockerfile.agent
│   │   ├── config/            # 配置文件
│   │   ├── routes/            # API 路由
│   │   └── server.js          # Express 服务器
│   ├── supabase/              # 数据库 Schema
│   └── package.json
├── docs/                      # 文档
│   └── DEPLOY_ROCKY_LINUX.md  # Rocky Linux 部署指南
├── src/                       # React 前端
│   ├── pages/                 # 页面组件
│   ├── services/              # API 服务
│   └── types/                 # TypeScript 类型
├── docker-compose.yml         # Docker Compose 配置
└── README.md
```

## 配置说明

### 环境变量 (.env)

```env
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 服务端口
PORT=3000
NODE_ENV=production
```

### Supabase 数据库设置

1. 登录 [Supabase](https://supabase.com)
2. 创建新项目
3. 在 SQL Editor 中运行 `backend/supabase/schema.sql`
4. 获取 API URL 和密钥

## 添加监控节点

### 1. 在 Web 界面创建节点

1. 访问 NetWatch 控制台
2. 进入「监控节点」页面
3. 点击「新建节点」
4. 填写节点信息（名称、IP、地区）
5. 复制生成的「注册密钥」

### 2. 在目标服务器安装 Agent

```bash
# 方式一：使用安装脚本（Linux）
curl -LO https://raw.githubusercontent.com/your-repo/netwatch/main/backend/src/agent/agent-init.sh
chmod +x agent-init.sh
sudo ./agent-init.sh

# 方式二：Docker 部署
cd /opt/netwatch-agent
docker compose -f docker-compose.agent.yml up -d
```

### 3. 配置 Agent

创建 `.env` 文件：

```env
CENTER_SERVER=http://your-server:3000
REGISTER_KEY=sk_your_register_key
```

### 4. 启动 Agent

```bash
# 手动启动
node agent.js

# 或使用 PM2
pm2 start agent.js --name netwatch-agent
pm2 save
pm2 startup
```

## 创建监控任务

1. 进入「监控任务」页面
2. 点击「新建任务」
3. 选择监控类型
4. 填写目标地址和配置
5. 选择执行节点
6. 设置告警规则
7. 保存任务

### API 接口监控配置示例

```json
{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer your-token"
  },
  "body": "{\"username\":\"test\",\"password\":\"***\"}",
  "expectedPattern": "success"
}
```

## 钉钉机器人配置

1. 在钉钉群中添加机器人
2. 选择「自定义关键词」机器人
3. 复制 Webhook 地址
4. 在 NetWatch「告警配置」中添加钉钉机器人
5. 配置告警规则

## API 接口

### 节点管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/nodes | 获取节点列表 |
| POST | /api/nodes | 创建节点 |
| PUT | /api/nodes/:id | 更新节点 |
| DELETE | /api/nodes/:id | 删除节点 |
| POST | /api/nodes/:id/heartbeat | 节点心跳 |
| POST | /api/nodes/:id/regenerate-key | 重新生成密钥 |

### 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| POST | /api/tasks | 创建任务 |
| PUT | /api/tasks/:id | 更新任务 |
| DELETE | /api/tasks/:id | 删除任务 |
| POST | /api/tasks/:id/report | 上报检查结果 |

### 告警管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/alerts | 获取告警列表 |
| PUT | /api/alerts/:id/acknowledge | 确认告警 |

## 技术栈

### 前端
- React 18.3
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- React Router

### 后端
- Node.js 20
- Express.js
- Supabase (PostgreSQL)

### Agent
- Node.js 20
- 支持 Docker 部署

## 开发指南

### 本地开发

```bash
# 启动后端
cd backend
npm install
npm run dev

# 启动前端
cd ..
npm install
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 部署架构图

```
                    ┌─────────────────┐
                    │   用户浏览器     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Nginx/CDN     │
                    │   端口 80/443   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │   前端静态文件   │           │   后端 API      │
    │   端口 3001     │           │   端口 3000     │
    └─────────────────┘           └────────┬────────┘
                                            │
                                            ▼
                                  ┌─────────────────┐
                                  │   Supabase      │
                                  │   PostgreSQL    │
                                  └─────────────────┘

              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
              ▼              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │   Agent 节点1   │ │   Agent 节点2   │ │   Agent 节点3   │ │   Agent 节点N   │
    │   (华东)        │ │   (华南)        │ │   (华北)        │ │   (海外)        │
    └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
              │              │              │              │
              └──────────────┴──────────────┴──────────────┘
                                        │
                                        ▼
                              执行监控任务，上报结果
```

## 许可证

MIT License

## 联系方式

- 文档: https://github.com/your-repo/netwatch/wiki
- 问题反馈: https://github.com/your-repo/netwatch/issues
