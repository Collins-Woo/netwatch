---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 304502206db3a7e1358d2db1f2a580085c18fb148056b963921351e718a665a7b9675243022100ae1b29b1b0e2283daafcf248c43ece636457658a7f71e4867dbb4af5a78793bc
    ReservedCode2: 3045022100f5f2939591e4b2b54d3220be2593f7ad6d3a17c0eb64b0891fda0bad2f7f9e2c022000cd4a85e19dacb75d001e0303ac8fca51a45a8f3854abb17c49e273ed427c85
---

# NetWatch 监控平台 - 项目文档

> 版本: 1.0.0
> 更新日期: 2024年

---

## 目录

1. [项目概述](#项目概述)
2. [功能特性](#功能特性)
3. [技术架构](#技术架构)
4. [目录结构](#目录结构)
5. [快速开始](#快速开始)
6. [部署指南](#部署指南)
7. [配置说明](#配置说明)
8. [API接口文档](#api接口文档)
9. [常见问题](#常见问题)

---

## 项目概述

NetWatch 是一款企业级网站与服务监控系统，参考监控宝设计，支持多种监控类型和分布式 Agent 节点架构。

### 主要特点

- 🖥️ **多类型监控** - HTTP/HTTPS/API/Ping/TCP/DNS/SSL/路由追踪/数据库
- 📡 **分布式架构** - 中心服务 + Agent 节点，支持多地域部署
- 🔔 **实时告警** - 支持钉钉机器人、Webhook 等告警方式
- 📊 **数据可视化** - 实时监控图表、历史数据分析
- 🚀 **轻量部署** - 支持 JSON 文件存储，零配置运行

---

## 功能特性

### 支持的监控类型

| 类型 | 说明 | 配置项 |
|------|------|--------|
| HTTP | 网站 HTTP 监控 | 期望状态码 |
| HTTPS | 网站 HTTPS 监控 | SSL 证书检查 |
| API | RESTful API 监控 | Method/Headers/Body |
| Ping | ICMP 主机可达性 | 超时时间 |
| TCP | TCP 端口连通性 | 端口号 |
| DNS | DNS 解析验证 | 记录类型、服务器 |
| SSL | SSL 证书监控 | 到期预警天数 |
| Traceroute | 网络路由追踪 | 最大跳数 |
| MySQL | MySQL 数据库检测 | 连接认证 |
| Redis | Redis 缓存服务检测 | 连接认证 |

### 核心功能

- ✅ 监控任务 CRUD
- ✅ 监控节点管理
- ✅ 自动任务分配
- ✅ 告警规则配置
- ✅ 响应时间图表
- ✅ 历史数据查询
- ✅ 钉钉机器人集成

---

## 技术架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                           │
│                    端口: 80/443                              │
└─────────────────────────────────────────────────────────────┘
              │                                      │
              ▼                                      ▼
┌─────────────────────────┐          ┌─────────────────────────┐
│      前端 (React)       │          │    后端 (Express)       │
│      端口: 3001         │          │    端口: 3000           │
└─────────────────────────┘          └───────────┬─────────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              │                 │                 │
                              ▼                 ▼                 ▼
                    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
                    │  Supabase    │   │  JSON文件    │   │  SQLite      │
                    │  (云数据库)   │   │  (轻量级)    │   │  (可选)      │
                    └──────────────┘   └──────────────┘   └──────────────┘

              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
              ▼              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Agent 1  │  │ Agent 2  │  │ Agent 3  │  │ Agent N  │
        │ (华东)   │  │ (华南)   │  │ (华北)   │  │ (海外)   │
        └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

### 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | React 18.3 | 现代化 UI 框架 |
| 构建工具 | Vite 6 | 快速构建工具 |
| 样式 | Tailwind CSS | 原子化 CSS |
| 图表 | Recharts | 数据可视化 |
| 后端框架 | Express.js | Node.js Web 框架 |
| 数据库 | Supabase/JSON | 灵活的数据存储 |
| 进程管理 | PM2 | Node.js 进程管理器 |
| 容器化 | Docker | 应用容器化 |

---

## 目录结构

```
netwatch/
├── frontend/                    # 前端代码 (已构建)
├── backend/                     # 后端代码
│   ├── src/
│   │   ├── agent/              # Agent 节点
│   │   │   ├── agent.js        # Agent 主程序
│   │   │   ├── agent-init.sh   # Linux 安装脚本
│   │   │   ├── Dockerfile.agent # Agent Docker 镜像
│   │   │   └── docker-compose.agent.yml
│   │   ├── config/
│   │   │   ├── database.js     # Supabase 数据库配置
│   │   │   ├── database-json.js # JSON 文件数据库
│   │   │   └── database-sqlite.js # SQLite 数据库
│   │   ├── routes/             # API 路由
│   │   │   ├── nodes.js        # 节点管理
│   │   │   ├── tasks.js        # 任务管理
│   │   │   ├── alerts.js       # 告警管理
│   │   │   ├── status.js       # 状态查询
│   │   │   └── history.js      # 历史数据
│   │   ├── server.js           # 主服务器 (Supabase)
│   │   └── server-json.js      # 轻量服务器 (JSON)
│   ├── supabase/
│   │   └── schema.sql          # 数据库 Schema
│   ├── package.json
│   └── Dockerfile
├── docs/                        # 文档
│   ├── DEPLOY_ROCKY_LINUX.md   # Rocky Linux 部署指南
│   └── PROJECT_GUIDE.md         # 项目文档
├── src/                         # React 前端源码
│   ├── pages/                   # 页面组件
│   ├── services/                # API 服务
│   ├── types/                   # TypeScript 类型
│   └── data/                    # Mock 数据
├── dist/                        # 前端构建产物
├── docker-compose.yml           # Docker 编排配置
├── Dockerfile.frontend          # 前端 Docker 镜像
├── nginx.conf                   # Nginx 配置
├── .env.example                 # 环境变量示例
└── README.md                    # 项目说明
```

---

## 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-repo/netwatch.git
cd netwatch

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 3. 启动服务
docker compose up -d --build

# 4. 访问 http://localhost:3001
```

### 方式二：轻量级部署（JSON 数据库）

```bash
# 1. 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 2. 创建目录
sudo mkdir -p /opt/netwatch
cd /opt/netwatch

# 3. 上传项目文件
git clone https://github.com/your-repo/netwatch.git .

# 4. 启动后端（轻量版）
cd backend
npm install
npm run start:lite &

# 5. 构建前端
cd ..
npm install
npm run build

# 6. 配置 Nginx
sudo dnf install -y nginx
sudo cp nginx.conf /etc/nginx/conf.d/netwatch.conf
sudo nginx -t && sudo systemctl start nginx
```

### 方式三：Supabase 数据库部署

```bash
# 1. 配置 Supabase
# - 登录 supabase.com 创建项目
# - 运行 backend/supabase/schema.sql
# - 获取 API URL 和密钥

# 2. 配置环境变量
cd backend
cat > .env << 'EOF'
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
EOF

# 3. 启动服务
npm install
npm start
```

---

## 部署指南

### 服务器要求

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1 GB | 2 GB+ |
| 磁盘 | 10 GB | 20 GB+ |
| 系统 | Rocky Linux 9+ | Rocky Linux 10 |

### 防火墙配置

```bash
# 放行 HTTP/HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### SSL 证书配置

```bash
# 使用 Let's Encrypt
sudo dnf install -y certbot
sudo certbot --nginx -d your-domain.com
sudo certbot renew --dry-run
```

---

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `SUPABASE_URL` | Supabase 项目 URL | - |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务密钥 | - |
| `PORT` | 后端服务端口 | 3000 |
| `NODE_ENV` | 运行环境 | development |
| `DATA_DIR` | JSON 数据库目录 | ./data |

### 前端配置

编辑 `src/services/api.ts`:

```typescript
const api = axios.create({
  baseURL: 'http://your-server:3000', // 修改为你的服务器地址
  timeout: 10000,
});
```

构建时指定:

```bash
VITE_API_BASE_URL=http://your-server:3000 npm run build
```

---

## API接口文档

### 节点管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/nodes | 获取节点列表 |
| GET | /api/nodes/:id | 获取节点详情 |
| POST | /api/nodes | 创建节点 |
| PUT | /api/nodes/:id | 更新节点 |
| DELETE | /api/nodes/:id | 删除节点 |
| POST | /api/nodes/register | Agent 注册 |
| POST | /api/nodes/:id/heartbeat | 节点心跳 |
| POST | /api/nodes/:id/regenerate-key | 重新生成密钥 |

### 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/tasks | 获取任务列表 |
| GET | /api/tasks/:id | 获取任务详情 |
| POST | /api/tasks | 创建任务 |
| PUT | /api/tasks/:id | 更新任务 |
| DELETE | /api/tasks/:id | 删除任务 |
| POST | /api/tasks/:id/report | 上报检查结果 |

### 告警管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/alerts | 获取告警列表 |
| PUT | /api/alerts/:id/acknowledge | 确认告警 |

### 其他接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/dashboard/stats | Dashboard 统计 |
| GET | /api/status | 系统状态 |
| GET | /api/history | 历史数据 |

---

## Agent 节点部署

### 从 Web 界面获取注册密钥

1. 登录 NetWatch 控制台
2. 进入「监控节点」页面
3. 点击「新建节点」
4. 复制「注册密钥」

### 安装 Agent

```bash
# 方式一：安装脚本
curl -LO https://your-server/backend/src/agent/agent-init.sh
chmod +x agent-init.sh
sudo ./agent-init.sh

# 方式二：Docker
cd /opt/netwatch-agent
docker compose -f docker-compose.agent.yml up -d

# 方式三：手动安装
mkdir -p /opt/netwatch-agent
cd /opt/netwatch-agent
scp user@your-server:/opt/netwatch/backend/src/agent/* ./
npm install
cat > .env << 'EOF'
CENTER_SERVER=http://your-server:3000
REGISTER_KEY=sk_your_key
EOF
pm2 start agent.js --name netwatch-agent
```

---

## 常见问题

### Q: 如何添加监控任务？

1. 进入「监控任务」页面
2. 点击「新建任务」
3. 选择监控类型
4. 填写目标地址和配置
5. 选择执行节点
6. 保存

### Q: 如何配置钉钉告警？

1. 在钉钉群添加「自定义关键词」机器人
2. 复制 Webhook URL
3. 在 NetWatch「告警配置」中添加

### Q: Agent 无法连接中心服务器？

检查：
- 中心服务器地址是否正确
- 注册密钥是否有效
- 防火墙是否放行 3000 端口
- 网络是否可达

### Q: 数据如何备份？

**JSON 数据库:**
```bash
# 备份数据目录
tar -czvf backup.tar.gz /opt/netwatch/data/
```

**Supabase:**
- 在 Supabase 控制台使用内置备份功能
- 或导出 SQL 文件

---

## 许可证

MIT License

---

## 更新日志

### v1.0.0 (2024)
- ✅ 初始版本发布
- ✅ 支持 10 种监控类型
- ✅ 支持分布式 Agent 架构
- ✅ 支持钉钉机器人告警
- ✅ 支持 JSON 文件数据库
