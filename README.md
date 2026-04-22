
# NetWatch 监控平台

> 企业级网站与服务监控系统，支持 HTTP/HTTPS/API/TCP/DNS/SSL 等多种监控类型

## 特性亮点 (v1.2.0)

### 开箱即用
- **零配置部署** - 后端默认使用 JSON 文件存储，无需安装数据库
- **前后端自动对接** - 前端默认连接真实后端 API，无需额外配置
- **一键部署脚本** - `./deploy.sh` 即可完成全部部署

### 用户认证与权限管理
- **JWT Token 认证** - 安全的 Token 认证机制
- **四角色权限体系** - 管理员/运维人员/审计员/查看者
- **操作审计日志** - 完整的操作记录追踪

### 实时监控
- **WebSocket 实时通信** - 任务状态实时更新
- **多种监控类型** - HTTP/HTTPS/API/TCP/PING/DNS/SSL
- **即时告警通知** - 支持钉钉机器人告警

### 灵活扩展
- **中心 + Agent 架构** - 支持多节点分布式监控
- **数据导出** - 支持 CSV/JSON 格式导出
- **多种数据库** - JSON 文件 / SQLite / Supabase 自由切换

## 功能特性

### 监控类型
| 类型 | 说明 |
|------|------|
| HTTP/HTTPS | 网站可用性和响应时间监控 |
| API 接口 | 支持 GET/POST/PUT/DELETE，自定义请求头和请求体 |
| Ping | ICMP ping 检测主机可达性 |
| TCP 端口 | 检测端口连通性 |
| DNS 解析 | A/AAAA/CNAME/MX/TXT/NS 记录类型 |
| SSL 证书 | 监控证书到期时间 |

### 核心功能
- **中心服务 + Agent 架构** - Agent 可部署在任意服务器
- **任务分配** - 自动将监控任务分配给在线节点
- **实时告警** - 支持钉钉机器人告警
- **历史数据** - 完整的监控历史记录
- **响应时间图表** - 直观的性能趋势展示
- **数据导出** - CSV/JSON 格式，支持时间范围筛选

## 快速开始

### 方式一：一键部署脚本（推荐）

```bash
# 克隆项目
git clone https://github.com/Collins-Woo/netwatch.git
cd netwatch

# 一键部署（自动安装依赖、构建前端、配置Nginx）
sudo ./deploy.sh

# 访问 http://你的服务器IP:3000
```

### 方式二：Docker 部署

```bash
# 克隆项目
git clone https://github.com/Collins-Woo/netwatch.git
cd netwatch

# 启动服务
docker compose up -d

# 访问 http://localhost:3000
```

### 方式三：手动部署

```bash
# 安装依赖
npm install && cd backend && npm install && cd ..

# 启动后端（使用 JSON 文件存储）
cd backend
npm start

# 启动前端（新终端）
npm run dev
```

## 部署说明

### 默认配置
| 项目 | 默认值 |
|------|--------|
| 服务端口 | 3000 |
| 数据存储 | JSON 文件（`/opt/netwatch/data/`） |
| 前端 API | 自动通过 Nginx 代理 |

### 使用 SQLite 数据库（可选）

```bash
# 设置环境变量后部署
sudo DATABASE_TYPE=sqlite ./deploy.sh
```

### 使用 Supabase（可选）

```bash
# 编辑后端 .env 文件
cd backend
cat > .env << EOF
DATABASE_TYPE=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=3000
EOF

# 启动后端
npm start
```

## 添加监控节点

### 1. 在 Web 界面创建节点

1. 访问 NetWatch 控制台
2. 进入「监控节点」页面
3. 点击「新建节点」
4. 填写节点信息（名称、IP、地区）
5. 复制生成的「注册密钥」

### 2. 在目标服务器安装 Agent

```bash
# 下载 Agent
curl -LO https://raw.githubusercontent.com/Collins-Woo/netwatch/main/backend/src/agent/agent-init.sh
chmod +x agent-init.sh

# 运行安装脚本
sudo ./agent-init.sh

# 配置（编辑 /opt/netwatch-agent/.env）
CENTER_SERVER=http://你的服务器IP:3000
REGISTER_KEY=sk_你的注册密钥
NODE_NAME=你的节点名称
REGION=节点地区

# 启动
pm2 start agent.js --name netwatch-agent
```

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

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 服务健康状态 |
| GET | /health | Nginx 健康检查 |

## 技术栈

### 前端
- React 18.3 + TypeScript
- Vite 构建工具
- Tailwind CSS
- Recharts 图表
- React Router

### 后端
- Node.js 20
- Express.js
- WebSocket (ws)
- JWT 认证

### 数据存储
- JSON 文件（默认）
- SQLite
- Supabase (PostgreSQL)

## 目录结构

```
netwatch/
├── backend/                    # 后端 API 服务
│   ├── src/
│   │   ├── server-json.js     # JSON 文件存储服务器（默认）
│   │   ├── server-websocket.js # WebSocket 服务器
│   │   └── config/            # 配置文件
│   └── package.json
├── src/                       # React 前端
│   ├── pages/                 # 页面组件
│   ├── services/              # API 服务
│   └── hooks/                 # React Hooks
├── docs/                      # 文档
│   ├── DEPLOY_ROCKY_LINUX.md  # 部署指南
│   └── DATABASE_SWITCH.md      # 数据库切换指南
├── deploy.sh                  # 一键部署脚本
├── docker-compose.yml         # Docker Compose 配置
├── nginx.conf                 # Nginx 配置
└── README.md
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
                         │   端口 3000    │
                         └────────┬────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
          ┌─────────────────┐         ┌─────────────────┐
          │   前端静态文件   │         │   后端 API      │
          │   (SPA)        │         │   (Express)     │
          └─────────────────┘         └────────┬────────┘
                                               │
                                  ┌─────────────┴─────────────┐
                                  │                           │
                                  ▼                           ▼
                        ┌─────────────────┐         ┌─────────────────┐
                        │   JSON 文件     │         │   Supabase      │
                        │   (默认)       │         │   (可选)        │
                        └─────────────────┘         └─────────────────┘

              ┌──────────────┬──────────────┬──────────────┐
              │              │              │              │
              ▼              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │   Agent 节点1   │ │   Agent 节点2   │ │   Agent 节点3   │
    │   (华东)        │ │   (华南)        │ │   (华北)        │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
              │              │              │
              └──────────────┴──────────────┘
                          上报监控结果
```

## 管理命令

```bash
# 查看服务状态
pm2 status

# 查看后端日志
pm2 logs netwatch-backend

# 重启服务
pm2 restart netwatch-backend

# 查看数据文件
ls /opt/netwatch/data/
```

## 许可证

MIT License

## 联系方式

- 文档: https://github.com/Collins-Woo/netwatch/wiki
- 问题反馈: https://github.com/Collins-Woo/netwatch/issues
