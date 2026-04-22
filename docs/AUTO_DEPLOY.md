#!/bin/bash
# NetWatch 监控平台一键自动化部署脚本
# 使用 SQLite 数据库，支持监控平台和监控节点部署
# 适用于 Rocky Linux 9 / CentOS 9 / RHEL 9

set -e

# ============ 配置区域 ============
# 可以通过环境变量覆盖
NETWATCH_DIR="${NETWATCH_DIR:-/opt/netwatch}"
NETWATCH_PORT="${NETWATCH_PORT:-3000}"
NETWATCH_FRONTEND_PORT="${NETWATCH_FRONTEND_PORT:-3001}"
NETWATCH_DOMAIN="${NETWATCH_DOMAIN:-}"
AGENT_ENABLED="${AGENT_ENABLED:-false}"
AGENT_REGISTER_KEY="${AGENT_REGISTER_KEY:-}"

# ============ 颜色定义 ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============ 打印函数 ============
print_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ============ 检查root权限 ============
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用 root 权限运行此脚本"
        echo "Usage: sudo $0 [options]"
        exit 1
    fi
}

# ============ 检测操作系统 ============
detect_os() {
    print_step "检测操作系统"

    if [[ -f /etc/rocky-release ]] || [[ -f /etc/almalinux-release ]]; then
        OS_NAME="Rocky Linux"
        PKG_MANAGER="dnf"
        print_success "检测到 ${OS_NAME}"
    elif [[ -f /etc/centos-release ]]; then
        OS_NAME="CentOS"
        PKG_MANAGER="dnf"
        print_success "检测到 ${OS_NAME}"
    elif [[ -f /etc/redhat-release ]]; then
        OS_NAME="RHEL"
        PKG_MANAGER="dnf"
        print_success "检测到 ${OS_NAME}"
    elif [[ -f /etc/debian_version ]]; then
        OS_NAME="Debian/Ubuntu"
        PKG_MANAGER="apt"
        print_success "检测到 ${OS_NAME}"
    else
        print_error "不支持的操作系统"
        exit 1
    fi
}

# ============ 安装依赖 ============
install_dependencies() {
    print_step "安装系统依赖"

    if [[ "$PKG_MANAGER" == "dnf" ]]; then
        # 安装 Node.js 20.x
        print_info "安装 Node.js 20.x..."
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs

        # 安装必要工具
        print_info "安装必要工具..."
        dnf install -y curl wget git nginx firewalld

        # 安装 PM2
        print_info "安装 PM2..."
        npm install -g pm2

    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        # 安装 Node.js 20.x
        print_info "安装 Node.js 20.x..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs

        # 安装必要工具
        print_info "安装必要工具..."
        apt-get install -y curl wget git nginx firewalld

        # 安装 PM2
        print_info "安装 PM2..."
        npm install -g pm2
    fi

    # 验证安装
    node_version=$(node --version)
    npm_version=$(npm --version)
    pm2_version=$(pm2 --version)

    print_success "Node.js: ${node_version}"
    print_success "npm: ${npm_version}"
    print_success "PM2: ${pm2_version}"
}

# ============ 创建目录结构 ============
create_directories() {
    print_step "创建目录结构"

    mkdir -p ${NETWATCH_DIR}/{frontend,backend,data,logs}
    mkdir -p ${NETWATCH_DIR}/backend/{src,data}
    mkdir -p ${NETWATCH_DIR}/agent

    print_success "目录创建完成: ${NETWATCH_DIR}"
    ls -la ${NETWATCH_DIR}
}

# ============ 安装监控平台后端 ============
install_backend() {
    print_step "安装监控平台后端 (SQLite)"

    cd ${NETWATCH_DIR}/backend

    # 创建 package.json
    cat > package.json << 'EOF'
{
  "name": "netwatch-backend",
  "version": "1.1.0",
  "description": "NetWatch Monitoring Platform Backend",
  "type": "module",
  "main": "src/server-json.js",
  "scripts": {
    "start": "node src/server-json.js",
    "dev": "node --watch src/server-json.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "uuid": "^9.0.0"
  }
}
EOF

    # 安装依赖
    print_info "安装后端依赖..."
    npm install

    # 创建环境变量文件
    cat > .env << EOF
# 数据库配置
DATABASE_TYPE=sqlite
DB_PATH=${NETWATCH_DIR}/data/netwatch.db

# 服务配置
PORT=${NETWATCH_PORT}
NODE_ENV=production

# 前端配置
VITE_API_BASE_URL=http://localhost:${NETWATCH_PORT}
EOF

    # 复制数据库文件
    if [[ -f ${NETWATCH_DIR}/backend/src/config/database-sqlite.js ]]; then
        print_info "SQLite 数据库配置已就绪"
    fi

    print_success "后端安装完成"
}

# ============ 安装监控平台前端 ============
install_frontend() {
    print_step "安装监控平台前端"

    # 检查是否已有构建好的前端
    if [[ -d "${NETWATCH_DIR}/frontend/dist" ]]; then
        print_info "使用已有的前端构建"
        return
    fi

    print_warning "前端需要从源码构建，请确保已将项目文件复制到 ${NETWATCH_DIR}/frontend"
    print_info "或使用 Docker 方式部署前端"
}

# ============ 配置 PM2 服务 ============
configure_pm2() {
    print_step "配置 PM2 服务"

    cd ${NETWATCH_DIR}

    # 创建 PM2 配置文件
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'netwatch-backend',
      script: 'backend/src/server-json.js',
      cwd: process.cwd(),
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        DATABASE_TYPE: 'sqlite',
        DB_PATH: process.env.NETWATCH_DIR + '/data/netwatch.db'
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
EOF

    # 启动后端服务
    print_info "启动后端服务..."
    cd ${NETWATCH_DIR}
    NETWATCH_DIR=${NETWATCH_DIR} pm2 start ecosystem.config.js

    # 保存 PM2 进程列表
    pm2 save

    # 设置开机自启
    print_info "配置开机自启..."
    env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /home/root 2>/dev/null || \
    pm2 startup systemd -u root --hp /home/root 2>/dev/null || true

    # 创建 systemd 服务文件（备用方案）
    cat > /etc/systemd/system/netwatch-backend.service << EOF
[Unit]
Description=NetWatch Backend Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${NETWATCH_DIR}
Environment=NODE_ENV=production
Environment=DATABASE_TYPE=sqlite
Environment=DB_PATH=${NETWATCH_DIR}/data/netwatch.db
ExecStart=/usr/bin/node ${NETWATCH_DIR}/backend/src/server-json.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # 启用服务
    systemctl daemon-reload
    systemctl enable netwatch-backend 2>/dev/null || true

    print_success "PM2 配置完成"
    pm2 list
}

# ============ 配置 Nginx ============
configure_nginx() {
    print_step "配置 Nginx 反向代理"

    # 创建 Nginx 配置文件
    cat > /etc/nginx/conf.d/netwatch.conf << EOF
# 后端 API 服务
server {
    listen ${NETWATCH_PORT};
    server_name localhost;

    # API 请求代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 支持
    location /ws {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/health;
        access_log off;
    }
}

# 前端静态文件服务
server {
    listen ${NETWATCH_FRONTEND_PORT};
    server_name localhost;
    root ${NETWATCH_DIR}/frontend/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # WebSocket 代理
    location /ws {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

    # 测试 Nginx 配置
    nginx -t

    # 启动/重启 Nginx
    systemctl enable nginx
    systemctl restart nginx

    print_success "Nginx 配置完成"
}

# ============ 配置防火墙 ============
configure_firewall() {
    print_step "配置防火墙"

    # 停止 firewalld（如果不需要）
    if systemctl is-active --quiet firewalld; then
        # 开放端口
        firewall-cmd --permanent --add-port=${NETWATCH_PORT}/tcp
        firewall-cmd --permanent --add-port=${NETWATCH_FRONTEND_PORT}/tcp
        firewall-cmd --reload
        print_success "防火墙端口已开放: ${NETWATCH_PORT}, ${NETWATCH_FRONTEND_PORT}"
    else
        print_info "防火墙未启用，跳过配置"
    fi
}

# ============ 部署监控节点 Agent ============
install_agent() {
    if [[ "$AGENT_ENABLED" != "true" ]]; then
        print_info "Agent 部署未启用，跳过"
        return
    fi

    print_step "部署监控节点 Agent"

    if [[ -z "$AGENT_REGISTER_KEY" ]]; then
        print_warning "未提供 AGENT_REGISTER_KEY，跳过 Agent 部署"
        print_info "如需部署 Agent，请设置 AGENT_REGISTER_KEY 环境变量"
        return
    fi

    cd ${NETWATCH_DIR}/agent

    # 创建 Agent package.json
    cat > package.json << EOF
{
  "name": "netwatch-agent",
  "version": "1.0.0",
  "type": "module",
  "main": "agent.js",
  "scripts": {
    "start": "node agent.js",
    "dev": "node --watch agent.js"
  },
  "dependencies": {
    "mysql2": "^3.9.0",
    "redis": "^4.6.13"
  }
}
EOF

    # 复制 Agent 代码
    print_info "创建 Agent 代码..."
    cat > agent.js << 'AGENT_EOF'
/**
 * NetWatch Agent 监控节点
 * 使用 SQLite 后端时的心跳和任务同步
 */

import http from 'http';
import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as dns from 'dns';
import * as tls from 'tls';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  CENTER_SERVER: process.env.CENTER_SERVER || 'http://localhost:3000',
  REGISTER_KEY: process.env.REGISTER_KEY || '',
  NODE_NAME: process.env.NODE_NAME || 'Agent-' + Math.random().toString(36).substring(7),
  REGION: process.env.REGION || 'east',
  HEARTBEAT_INTERVAL: 30000,
  TASK_CHECK_INTERVAL: 60000,
};

// 简化版数据库（JSON文件）
const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

class SimpleAgent {
  constructor() {
    this.nodeId = null;
    this.tasks = [];
    this.lastHeartbeat = null;
    this.isOnline = true;
  }

  async start() {
    console.log('========================================');
    console.log('       NetWatch Agent 启动中...');
    console.log('========================================');
    console.log(`中心服务器: ${CONFIG.CENTER_SERVER}`);
    console.log(`节点名称: ${CONFIG.NODE_NAME}`);
    console.log(`注册密钥: ${CONFIG.REGISTER_KEY.substring(0, 10)}...`);

    // 注册节点
    await this.register();

    // 启动心跳
    this.startHeartbeat();

    // 定期同步任务
    setInterval(() => this.syncTasks(), CONFIG.TASK_CHECK_INTERVAL);

    // 立即执行一次同步
    await this.syncTasks();
  }

  async register() {
    try {
      const localIP = this.getLocalIP();

      const response = await this.httpRequest(`${CONFIG.CENTER_SERVER}/api/nodes/register`, {
        method: 'POST',
        body: {
          register_key: CONFIG.REGISTER_KEY,
          name: CONFIG.NODE_NAME,
          region: CONFIG.REGION,
          ip: localIP,
          hostname: require('os').hostname()
        }
      });

      if (response.success) {
        this.nodeId = response.node_id;
        this.tasks = response.tasks || [];
        console.log(`✓ 节点注册成功，节点ID: ${this.nodeId}`);
        console.log(`✓ 分配任务数: ${this.tasks.length}`);
      } else {
        console.error('✗ 节点注册失败:', response.message);
      }
    } catch (error) {
      console.error('✗ 节点注册异常:', error.message);
      console.log('  将使用离线模式运行...');
    }
  }

  async heartbeat() {
    try {
      const systemInfo = this.getSystemInfo();

      const response = await this.httpRequest(
        `${CONFIG.CENTER_SERVER}/api/nodes/${this.nodeId}/heartbeat`,
        {
          method: 'POST',
          body: {
            cpu_usage: systemInfo.cpu,
            memory_usage: systemInfo.memory,
            task_count: this.tasks.length
          }
        }
      );

      if (response.success) {
        this.tasks = response.tasks || [];
        this.lastHeartbeat = new Date();
        console.log(`✓ 心跳发送成功，任务数: ${this.tasks.length}`);
      }
    } catch (error) {
      console.error('✗ 心跳发送失败:', error.message);
    }
  }

  startHeartbeat() {
    this.heartbeat();
    setInterval(() => this.heartbeat(), CONFIG.HEARTBEAT_INTERVAL);
  }

  async syncTasks() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 同步任务...`);

    for (const task of this.tasks) {
      await this.executeTask(task);
    }
  }

  async executeTask(task) {
    console.log(`\n▶ 执行任务: ${task.name} (${task.type}) -> ${task.target}`);

    const startTime = Date.now();
    let result = { success: false, responseTime: 0, statusCode: null, error: null };

    try {
      switch (task.type) {
        case 'http':
        case 'https':
          result = await this.checkHttp(task);
          break;
        case 'api':
          result = await this.checkApi(task);
          break;
        case 'ping':
          result = await this.checkPing(task);
          break;
        case 'tcp':
          result = await this.checkTcp(task);
          break;
        case 'dns':
          result = await this.checkDns(task);
          break;
        case 'ssl':
          result = await this.checkSsl(task);
          break;
        default:
          result.error = `不支持的监控类型: ${task.type}`;
      }
    } catch (error) {
      result.error = error.message;
    }

    result.responseTime = Date.now() - startTime;

    if (result.success) {
      console.log(`  ✓ 成功 | 响应时间: ${result.responseTime}ms`);
    } else {
      console.log(`  ✗ 失败 | ${result.error}`);
    }

    await this.reportResult(task.id, result);
  }

  async checkHttp(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(url, {
        method: 'GET',
        timeout: (task.timeout || 10) * 1000,
        rejectUnauthorized: false
      }, (res) => {
        const success = res.statusCode === (task.status_code || 200);
        res.resume();
        resolve({
          success,
          statusCode: res.statusCode,
          error: success ? null : `状态码不匹配: ${res.statusCode}`
        });
      });

      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '超时' }); });
      req.end();
    });
  }

  async checkApi(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const protocol = url.protocol === 'https:' ? https : http;
      const method = task.config?.method || 'GET';
      const body = task.config?.body;

      const options = {
        method,
        timeout: (task.timeout || 10) * 1000,
        headers: { 'User-Agent': 'NetWatch-Agent/1.0' }
      };

      const req = protocol.request(url, options, (res) => {
        res.resume();
        const success = res.statusCode === (task.status_code || 200);
        resolve({
          success,
          statusCode: res.statusCode,
          error: success ? null : `状态码不匹配: ${res.statusCode}`
        });
      });

      req.on('error', (e) => resolve({ success: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '超时' }); });

      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        req.write(body);
      }
      req.end();
    });
  }

  async checkPing(task) {
    try {
      const target = task.target.replace(/^https?:\/\//, '');
      const { stdout } = await execAsync(`ping -c 1 -W ${task.timeout || 5} ${target}`);
      const match = stdout.match(/time[=<](\d+\.?\d*)\s*ms/i);
      const responseTime = match ? Math.round(parseFloat(match[1])) : 0;
      return { success: responseTime > 0, responseTime, error: responseTime > 0 ? null : '无法解析' };
    } catch {
      return { success: false, error: '无法到达' };
    }
  }

  async checkTcp(task) {
    return new Promise((resolve) => {
      const start = Date.now();
      const url = new URL(task.target.startsWith('http') ? task.target : `tcp://${task.target}`);
      const port = task.config?.port || parseInt(url.port) || 80;
      const timeout = (task.timeout || 5) * 1000;

      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
        socket.destroy();
        resolve({ success: true, responseTime: Date.now() - start });
      });
      socket.on('error', (e) => resolve({ success: false, error: e.message }));
      socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: '超时' }); });
      socket.connect(port, url.hostname);
    });
  }

  async checkDns(task) {
    return new Promise((resolve) => {
      dns.resolve4(task.target, (err, addresses) => {
        if (err) {
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: addresses.length > 0, addresses });
        }
      });
    });
  }

  async checkSsl(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const socket = new net.Socket();
      const timeout = (task.timeout || 30) * 1000;

      socket.setTimeout(timeout);
      socket.connect(443, url.hostname, () => {
        const tlsSocket = new tls.TLSSocket(socket);
        const cert = tlsSocket.getPeerCertificate();

        if (cert && cert.valid_to) {
          const daysLeft = Math.ceil((new Date(cert.valid_to) - new Date()) / (1000 * 60 * 60 * 24));
          resolve({
            success: daysLeft > 0,
            details: { validUntil: cert.valid_to, daysLeft }
          });
        } else {
          resolve({ success: false, error: '无法获取证书' });
        }
        socket.destroy();
      });

      socket.on('error', (e) => resolve({ success: false, error: e.message }));
      socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: '超时' }); });
    });
  }

  async reportResult(taskId, result) {
    try {
      await this.httpRequest(`${CONFIG.CENTER_SERVER}/api/tasks/${taskId}/report`, {
        method: 'POST',
        body: result
      });
    } catch (error) {
      console.error(`  ! 上报失败: ${error.message}`);
    }
  }

  async httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      const req = protocol.request(url, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({ success: false, message: data });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('请求超时')); });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
  }

  getSystemInfo() {
    const os = require('os');
    const cpus = os.cpus();
    let idle = 0, total = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) total += cpu.times[type];
      idle += cpu.times.idle;
    });
    const cpu = Math.round((1 - idle / total) * 100);
    const memory = Math.round((1 - os.freemem() / os.totalmem()) * 100);
    return { cpu, memory };
  }

  getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
    return '127.0.0.1';
  }

  async shutdown() {
    console.log('\nAgent 正在关闭...');
    process.exit(0);
  }
}

// 启动
const agent = new SimpleAgent();
agent.start();

process.on('SIGINT', () => agent.shutdown());
process.on('SIGTERM', () => agent.shutdown());
AGENT_EOF

    # 安装依赖
    npm install

    # 创建数据目录
    mkdir -p ${NETWATCH_DIR}/agent/data

    # 创建环境变量
    cat > .env << EOF
CENTER_SERVER=http://localhost:${NETWATCH_PORT}
REGISTER_KEY=${AGENT_REGISTER_KEY}
NODE_NAME=${CONFIG.NODE_NAME}
REGION=${CONFIG.REGION}
EOF

    # 创建 PM2 配置
    cat > ecosystem.agent.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'netwatch-agent',
    script: 'agent.js',
    cwd: process.cwd(),
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/agent-error.log',
    out_file: 'logs/agent-out.log'
  }]
};
EOF

    # 启动 Agent
    mkdir -p logs
    pm2 start ecosystem.agent.config.js
    pm2 save

    print_success "Agent 部署完成"
}

# ============ 初始化数据库 ============
init_database() {
    print_step "初始化数据库"

    cd ${NETWATCH_DIR}/backend

    # 初始化 SQLite 数据库
    cat > init-db.js << 'EOF'
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/netwatch.db');

// 确保目录存在
import fs from 'fs';
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    ip TEXT,
    region TEXT DEFAULT 'east',
    description TEXT,
    register_key TEXT UNIQUE NOT NULL,
    enabled INTEGER DEFAULT 1,
    status TEXT DEFAULT 'offline',
    last_heartbeat TEXT,
    cpu_usage INTEGER DEFAULT 0,
    memory_usage INTEGER DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    target TEXT NOT NULL,
    interval INTEGER DEFAULT 5,
    timeout INTEGER DEFAULT 10,
    status_code INTEGER,
    alert_threshold INTEGER DEFAULT 3,
    node_id TEXT,
    enabled INTEGER DEFAULT 1,
    status TEXT DEFAULT 'normal',
    last_response_time INTEGER,
    last_check_time TEXT,
    availability REAL,
    config TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS alert_configs (
    id TEXT PRIMARY KEY,
    type TEXT DEFAULT 'dingtalk',
    webhook_url TEXT NOT NULL,
    secret TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    task_name TEXT NOT NULL,
    level TEXT DEFAULT 'warning',
    message TEXT,
    response_time INTEGER,
    status_code INTEGER,
    acknowledged INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// 插入示例数据
const nodeCount = db.prepare('SELECT COUNT(*) as count FROM nodes').get();
if (nodeCount.count === 0) {
  console.log('插入示例数据...');

  const node1Id = uuidv4();
  const node2Id = uuidv4();

  db.prepare(`INSERT INTO nodes (id, name, ip, region, description, register_key, enabled, status, cpu_usage, memory_usage, task_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(node1Id, '华东节点-01', '10.0.1.101', 'east', '位于上海的数据中心', 'sk_a1b2c3d4e5f6g7h8', 1, 'online', 23, 45, 4);

  db.prepare(`INSERT INTO nodes (id, name, ip, region, description, register_key, enabled, status, cpu_usage, memory_usage, task_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(node2Id, '华南节点-01', '10.0.2.102', 'south', '位于深圳的数据中心', 'sk_i9j0k1l2m3n4o5p6', 1, 'online', 35, 52, 3);

  const tasks = [
    { name: '携程官网监控', type: 'http', target: 'http://www.tuniu.com', interval: 5, timeout: 10, status_code: 200, nodeId: node1Id, status: 'normal', respTime: 245, avail: 99.8 },
    { name: 'GitHub官网监控', type: 'https', target: 'https://github.com', interval: 5, timeout: 10, status_code: 200, nodeId: node2Id, status: 'error', respTime: 0, avail: 0 },
    { name: 'GitHub API监控', type: 'api', target: 'https://api.github.com', interval: 5, timeout: 15, status_code: 200, nodeId: node1Id, status: 'slow', respTime: 1250, avail: 97.2, config: '{"method":"GET"}' },
    { name: '用户登录API监控', type: 'api', target: 'https://api.example.com/auth/login', interval: 3, timeout: 10, status_code: 200, nodeId: node2Id, status: 'normal', respTime: 180, avail: 99.5, config: '{"method":"POST"}' },
    { name: '阿里云DNS监控', type: 'ping', target: '180.97.1.16', interval: 1, timeout: 5, nodeId: node2Id, status: 'normal', respTime: 12, avail: 100 },
  ];

  const insertTask = db.prepare(`INSERT INTO tasks (id, name, type, target, interval, timeout, status_code, alert_threshold, node_id, enabled, status, last_response_time, last_check_time, availability, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?)`);

  tasks.forEach(t => {
    insertTask.run(uuidv4(), t.name, t.type, t.target, t.interval, t.timeout, t.status_code || null, 3, t.nodeId, 1, t.status, t.respTime, t.avail, t.config || '{}');
  });
}

console.log('数据库初始化完成:', DB_PATH);
db.close();
EOF

    # 运行初始化
    DB_PATH=${NETWATCH_DIR}/data/netwatch.db node init-db.js

    print_success "数据库初始化完成"
}

# ============ 验证安装 ============
verify_installation() {
    print_step "验证安装"

    # 检查服务状态
    print_info "后端服务状态:"
    pm2 list | grep netwatch || true

    print_info "Nginx 状态:"
    systemctl status nginx --no-pager || true

    print_info "防火墙状态:"
    systemctl status firewalld --no-pager 2>/dev/null || true

    # 测试 API
    print_info "测试 API 连接..."
    sleep 2
    curl -s http://localhost:${NETWATCH_PORT}/api/health || echo "API 未响应"

    print_success "验证完成"
}

# ============ 显示使用信息 ============
show_usage() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  NetWatch 监控平台安装完成！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  访问地址:"
    echo -e "    前端: ${CYAN}http://localhost:${NETWATCH_FRONTEND_PORT}${NC}"
    echo -e "    后端: ${CYAN}http://localhost:${NETWATCH_PORT}${NC}"
    echo ""
    echo -e "  数据目录: ${CYAN}${NETWATCH_DIR}/data${NC}"
    echo -e "  日志目录: ${CYAN}${NETWATCH_DIR}/logs${NC}"
    echo ""
    echo -e "  管理命令:"
    echo -e "    ${YELLOW}pm2 status${NC}              - 查看服务状态"
    echo -e "    ${YELLOW}pm2 restart netwatch-backend${NC}  - 重启后端"
    echo -e "    ${YELLOW}pm2 logs netwatch-backend${NC}     - 查看后端日志"
    echo -e "    ${YELLOW}pm2 monit${NC}                 - 监控面板"
    echo ""
    echo -e "  系统命令:"
    echo -e "    ${YELLOW}systemctl status netwatch-backend${NC}  - 服务状态"
    echo -e "    ${YELLOW}systemctl restart nginx${NC}            - 重启 Nginx"
    echo ""
    echo -e "  数据库:"
    echo -e "    ${CYAN}${NETWATCH_DIR}/data/netwatch.db${NC}"
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# ============ 主函数 ============
main() {
    echo -e "${CYAN}"
    echo "================================================"
    echo "    NetWatch 监控平台自动化部署脚本 v1.1.0"
    echo "    使用 SQLite 数据库"
    echo "================================================"
    echo -e "${NC}"

    check_root
    detect_os
    install_dependencies
    create_directories
    install_backend
    init_database
    configure_pm2

    # 仅在需要时配置 Nginx（前端文件存在时）
    if [[ -d "${NETWATCH_DIR}/frontend/dist" ]]; then
        configure_nginx
        configure_firewall
    else
        print_warning "前端文件未找到，跳过 Nginx 配置"
        print_info "请手动配置前端或使用: docker-compose up -d"
    fi

    # 仅在启用时安装 Agent
    if [[ "$AGENT_ENABLED" == "true" ]]; then
        install_agent
    fi

    verify_installation
    show_usage
}

# 运行
main "$@"
