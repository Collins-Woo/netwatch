---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3046022100dc299fbd3ffba893ec8bef84f3d64aa2d43b837690da696ac713cd0309cf6962022100f9b42cbbc9ec0caab9e5c458c41d76550fa368ac28d096b0ad9ad8c4b0cb2297
    ReservedCode2: 30450220255fe66e8f0f0cfc674ada56f2ce90e00061eec4c18cf9ae3e3d1b1d92388fef02210081fae5c8b5c897d15256d4a039afa05e79c4574396203523d175aeef8ca3fa09
---

# NetWatch 监控平台 Rocky Linux 10 部署指南

## 目录

1. [系统要求](#系统要求)
2. [方式一：Docker 部署（推荐）](#方式一docker-部署推荐)
3. [方式二：直接部署](#方式二直接部署)
4. [Agent 节点部署](#agent-节点部署)
5. [反向代理配置](#反向代理配置)
6. [防火墙配置](#防火墙配置)
7. [SSL 证书配置](#ssl-证书配置)
8. [运维命令](#运维命令)
9. [常见问题](#常见问题)

---

## 系统要求

### 硬件要求
- CPU: 2 核心及以上
- 内存: 4GB 及以上
- 磁盘: 20GB 及以上

### 软件要求
- Rocky Linux 10
- Node.js 20.x
- PostgreSQL 15+ (使用 Supabase 云服务可跳过)
- Docker & Docker Compose (可选，用于容器部署)

---

## 方式一：Docker 部署（推荐）

### 1. 安装 Docker

```bash
# 更新系统
sudo dnf update -y

# 安装依赖
sudo dnf install -y dnf-plugins-core

# 添加 Docker 仓库
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 配置环境变量

```bash
cd /opt/netwatch

# 创建环境变量文件
cat > .env << 'EOF'
# Supabase 配置（从 Supabase 控制台获取）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 服务端口
PORT=3000
NODE_ENV=production

# 前端配置
VITE_API_BASE_URL=https://your-domain.com
EOF
```

### 3. 启动服务

```bash
# 构建并启动所有服务
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 4. 访问服务

- 前端地址: http://your-server-ip:3001
- 后端API: http://your-server-ip:3000

---

## 方式二：直接部署

### 1. 安装 Node.js 20

```bash
# 添加 Node.js 仓库
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -

# 安装 Node.js
sudo dnf install -y nodejs

# 验证安装
node --version
npm --version
```

### 2. 安装 PM2 进程管理器

```bash
sudo npm install -g pm2
```

### 3. 创建安装目录

```bash
sudo mkdir -p /opt/netwatch
sudo chown $USER:$USER /opt/netwatch
cd /opt/netwatch
```

### 4. 上传代码

```bash
# 使用 git 克隆
git clone https://github.com/your-repo/netwatch.git .

# 或使用 scp 上传
scp -r ./netwatch/* user@your-server:/opt/netwatch/
```

### 5. 配置后端

```bash
cd /opt/netwatch/backend

# 安装依赖
npm install

# 创建环境变量文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EOF
```

### 6. 启动后端服务

```bash
# 使用 PM2 启动
pm2 start src/server.js --name netwatch-backend

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 7. 配置前端

```bash
cd /opt/netwatch

# 安装依赖
npm install

# 构建生产版本
VITE_API_BASE_URL=http://localhost:3000 npm run build
```

### 8. 配置 Nginx

```bash
# 安装 Nginx
sudo dnf install -y nginx

# 创建 Nginx 配置
sudo cat > /etc/nginx/conf.d/netwatch.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    root /opt/netwatch/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# 测试配置
sudo nginx -t

# 启动 Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Agent 节点部署

### 方式一：使用安装脚本（推荐）

```bash
# 下载 Agent
cd /tmp
curl -LO https://raw.githubusercontent.com/your-repo/netwatch/main/backend/src/agent/agent-init.sh

# 添加执行权限
chmod +x agent-init.sh

# 运行安装脚本
sudo ./agent-init.sh
```

### 方式二：手动安装

```bash
# 安装 Node.js
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 创建安装目录
sudo mkdir -p /opt/netwatch-agent
sudo chown $USER:$USER /opt/netwatch-agent

# 复制 Agent 文件
cd /opt/netwatch-agent
scp user@your-server:/opt/netwatch/backend/src/agent/* ./

# 安装依赖
npm install

# 创建环境变量
cat > .env << 'EOF'
NODE_ENV=production
CENTER_SERVER=http://your-server-ip:3000
REGISTER_KEY=sk_your_register_key_here
EOF

# 使用 PM2 启动
pm2 start agent.js --name netwatch-agent
pm2 save
pm2 startup
```

### 方式三：Docker 部署 Agent

```bash
cd /opt/netwatch-agent

# 创建环境变量
cat > .env << 'EOF'
CENTER_SERVER=http://your-server-ip:3000
REGISTER_KEY=sk_your_register_key_here
EOF

# 启动 Agent
docker compose -f docker-compose.agent.yml up -d
```

### 从 Web 界面获取注册密钥

1. 登录 NetWatch Web 控制台
2. 进入「监控节点」页面
3. 点击「新建节点」创建新节点
4. 复制生成的 `注册密钥`
5. 在 Agent 服务器上使用该密钥

---

## 反向代理配置

### Nginx + SSL

```bash
# 安装 Certbot
sudo dnf install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期测试
sudo certbot renew --dry-run
```

### 使用 Caddy (更简单)

```bash
# 安装 Caddy
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy -y
sudo dnf install -y caddy

# 配置 Caddyfile
sudo cat > /etc/caddy/Caddyfile << 'EOF'
your-domain.com {
    reverse_proxy /api/* localhost:3000
    reverse_proxy /* localhost:3001
}
EOF

# 启动 Caddy
sudo systemctl start caddy
sudo systemctl enable caddy
```

---

## 防火墙配置

```bash
# 使用 firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp

# 重新加载防火墙
sudo firewall-cmd --reload

# 查看规则
sudo firewall-cmd --list-all
```

---

## SSL 证书配置

### Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo dnf install -y certbot

# 获取证书（Nginx）
sudo certbot certonly --nginx -d your-domain.com

# 证书位置
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 证书自动续期

```bash
# 编辑 crontab
sudo crontab -e

# 添加自动续期任务（每天凌晨2点检查）
0 2 * * * /usr/bin/certbot renew --quiet
```

---

## 运维命令

### 后端服务

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs netwatch-backend

# 重启服务
pm2 restart netwatch-backend

# 停止服务
pm2 stop netwatch-backend
```

### Agent 服务

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs netwatch-agent

# 重启服务
pm2 restart netwatch-agent
```

### Nginx 服务

```bash
# 测试配置
sudo nginx -t

# 重启服务
sudo systemctl restart nginx

# 查看日志
sudo tail -f /var/log/nginx/error.log
```

### Docker 服务

```bash
# 查看所有服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启所有服务
docker compose restart

# 停止所有服务
docker compose down

# 重新构建并启动
docker compose up -d --build
```

### 数据库迁移

```bash
cd /opt/netwatch/backend

# 运行数据库迁移
npm run db:migrate

# 填充示例数据
npm run db:seed
```

---

## 常见问题

### 1. Agent 无法连接中心服务器

检查项：
- [ ] 中心服务器地址是否正确
- [ ] 注册密钥是否正确
- [ ] 防火墙是否放行 3000 端口
- [ ] 网络是否可达

```bash
# 测试连接
curl -v http://your-server:3000/api/health
```

### 2. 后端启动失败

检查项：
- [ ] .env 文件是否正确配置
- [ ] Supabase 凭证是否正确
- [ ] 端口是否被占用

```bash
# 检查端口占用
sudo netstat -tlnp | grep 3000

# 查看详细错误日志
pm2 logs netwatch-backend --err
```

### 3. 前端显示空白页

检查项：
- [ ] Nginx 配置是否正确
- [ ] 前端构建是否成功
- [ ] API 地址是否正确

```bash
# 检查构建产物
ls -la /opt/netwatch/dist/

# 检查 Nginx 日志
sudo tail -f /var/log/nginx/access.log
```

### 4. SSL 证书问题

```bash
# 检查证书有效期
sudo certbot certificates

# 手动续期
sudo certbot renew

# 查看 Certbot 日志
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### 5. 数据库连接问题

```bash
# 测试 Supabase 连接
curl -X GET \
  -H "apikey: your-anon-key" \
  -H "Authorization: Bearer your-anon-key" \
  https://your-project.supabase.co/rest/v1/nodes?select=*
```

---

## 快速命令参考

```bash
# 一键安装 Docker
curl -fsSL https://get.docker.com | sudo sh

# 一键部署后端
cd /opt/netwatch/backend && npm install && pm2 start src/server.js --name netwatch-backend

# 一键部署前端
cd /opt/netwatch && npm install && npm run build

# 查看所有服务状态
pm2 status && systemctl status nginx

# 重启所有服务
pm2 restart all && sudo systemctl restart nginx
```

---

## 技术支持

- 文档: https://github.com/your-repo/netwatch/wiki
- 问题反馈: https://github.com/your-repo/netwatch/issues
- 邮件支持: support@your-domain.com
