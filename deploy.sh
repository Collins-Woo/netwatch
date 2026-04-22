#!/bin/bash
# NetWatch 监控平台一键自动化部署脚本
# 使用 SQLite 数据库，支持监控平台和监控节点部署
# 适用于 Rocky Linux 9 / CentOS 9 / RHEL 9 / Debian/Ubuntu

set -e

# ============ 配置区域 ============
NETWATCH_DIR="${NETWATCH_DIR:-/opt/netwatch}"
NETWATCH_PORT="${NETWATCH_PORT:-3000}"
NETWATCH_FRONTEND_PORT="${NETWATCH_FRONTEND_PORT:-3001}"
AGENT_ENABLED="${AGENT_ENABLED:-false}"
AGENT_REGISTER_KEY="${AGENT_REGISTER_KEY:-}"
AGENT_NODE_NAME="${AGENT_NODE_NAME:-}"
AGENT_REGION="${AGENT_REGION:-east}"

# ============ 颜色定义 ============
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ $1${NC}"; }

# ============ 检查 ============
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "请使用 root 权限运行此脚本"
        echo "Usage: sudo $0 [options]"
        exit 1
    fi
}

detect_os() {
    print_step "检测操作系统"
    if [[ -f /etc/rocky-release ]] || [[ -f /etc/almalinux-release ]]; then
        OS_NAME="Rocky Linux"; PKG_MANAGER="dnf"
    elif [[ -f /etc/centos-release ]]; then
        OS_NAME="CentOS"; PKG_MANAGER="dnf"
    elif [[ -f /etc/redhat-release ]]; then
        OS_NAME="RHEL"; PKG_MANAGER="dnf"
    elif [[ -f /etc/debian_version ]]; then
        OS_NAME="Debian/Ubuntu"; PKG_MANAGER="apt"
    else
        print_error "不支持的操作系统"; exit 1
    fi
    print_success "检测到 ${OS_NAME}"
}

# ============ 安装依赖 ============
install_dependencies() {
    print_step "安装系统依赖"

    if [[ "$PKG_MANAGER" == "dnf" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        dnf install -y nodejs npm
        dnf install -y curl wget git nginx
        npm install -g pm2
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs npm
        apt-get install -y curl wget git nginx
        npm install -g pm2
    fi

    print_success "Node.js: $(node --version)"
    print_success "PM2: $(pm2 --version)"
}

# ============ 创建目录 ============
create_directories() {
    print_step "创建目录结构"
    mkdir -p ${NETWATCH_DIR}/{frontend/dist,backend/src,data,logs,agent}
    mkdir -p ${NETWATCH_DIR}/backend/src/config
    mkdir -p ${NETWATCH_DIR}/agent/data
    mkdir -p ${NETWATCH_DIR}/logs
    print_success "目录创建完成: ${NETWATCH_DIR}"
}

# ============ 安装后端 ============
install_backend() {
    print_step "安装监控平台后端 (SQLite)"

    cd ${NETWATCH_DIR}/backend

    cat > package.json << 'EOF'
{
  "name": "netwatch-backend",
  "version": "1.1.0",
  "type": "module",
  "main": "src/server-json.js",
  "scripts": {
    "start": "node src/server-json.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "uuid": "^9.0.0"
  }
}
EOF

    npm install

    cat > .env << EOF
DATABASE_TYPE=sqlite
DB_PATH=${NETWATCH_DIR}/data/netwatch.db
PORT=${NETWATCH_PORT}
NODE_ENV=production
EOF

    print_success "后端安装完成"
}

# ============ 安装前端 ============
install_frontend() {
    print_step "安装前端"

    if [[ -d "${NETWATCH_DIR}/frontend/dist" ]] && [[ -n "$(ls -A ${NETWATCH_DIR}/frontend/dist 2>/dev/null)" ]]; then
        print_info "前端已存在，跳过"
        return
    fi

    print_warning "请将前端构建文件复制到: ${NETWATCH_DIR}/frontend/dist"
    print_info "或使用 Docker 方式部署: docker-compose up -d"
}

# ============ 配置 PM2 ============
configure_pm2() {
    print_step "配置 PM2 服务"

    cd ${NETWATCH_DIR}

    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
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
    out_file: 'logs/backend-out.log'
  }]
};
EOF

    NETWATCH_DIR=${NETWATCH_DIR} pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u root --hp /home/root 2>/dev/null || true

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

    systemctl daemon-reload
    systemctl enable netwatch-backend 2>/dev/null || true

    print_success "PM2 配置完成"
    pm2 list
}

# ============ 配置 Nginx ============
configure_nginx() {
    print_step "配置 Nginx 反向代理"

    cat > /etc/nginx/conf.d/netwatch.conf << EOF
server {
    listen ${NETWATCH_PORT};
    server_name localhost;

    location /api/ {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /ws {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /health {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/health;
        access_log off;
    }
}

server {
    listen ${NETWATCH_FRONTEND_PORT};
    server_name localhost;
    root ${NETWATCH_DIR}/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /ws {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

    nginx -t
    systemctl enable nginx
    systemctl restart nginx

    print_success "Nginx 配置完成"
}

# ============ 配置防火墙 ============
configure_firewall() {
    print_step "配置防火墙"
    if systemctl is-active --quiet firewalld; then
        firewall-cmd --permanent --add-port=${NETWATCH_PORT}/tcp
        firewall-cmd --permanent --add-port=${NETWATCH_FRONTEND_PORT}/tcp
        firewall-cmd --reload
        print_success "防火墙端口已开放"
    else
        print_info "防火墙未启用，跳过"
    fi
}

# ============ 初始化数据库 ============
init_database() {
    print_step "初始化数据库"

    cd ${NETWATCH_DIR}/backend

    cat > init-db.js << 'EOF'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const files = {
    nodes: path.join(DATA_DIR, 'nodes.json'),
    tasks: path.join(DATA_DIR, 'tasks.json'),
    alerts: path.join(DATA_DIR, 'alerts.json'),
    alertConfigs: path.join(DATA_DIR, 'alert_configs.json'),
};

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function readJSON(filename) {
    const filepath = files[filename];
    if (!fs.existsSync(filepath)) return [];
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function writeJSON(filename, data) {
    fs.writeFileSync(files[filename], JSON.stringify(data, null, 2));
}

function init() {
    // Nodes
    if (!fs.existsSync(files.nodes)) {
        const node1 = { id: uuid(), name: '华东节点-01', ip: '10.0.1.101', region: 'east', description: '位于上海的数据中心', register_key: 'sk_a1b2c3d4e5f6g7h8', enabled: true, status: 'offline', last_heartbeat: null, cpu_usage: 0, memory_usage: 0, task_count: 0, created_at: new Date().toISOString() };
        const node2 = { id: uuid(), name: '华南节点-01', ip: '10.0.2.102', region: 'south', description: '位于深圳的数据中心', register_key: 'sk_i9j0k1l2m3n4o5p6', enabled: true, status: 'offline', last_heartbeat: null, cpu_usage: 0, memory_usage: 0, task_count: 0, created_at: new Date().toISOString() };
        writeJSON('nodes', [node1, node2]);
        console.log('✓ 节点数据已初始化');
    }

    // Tasks
    if (!fs.existsSync(files.tasks)) {
        const nodes = readJSON('nodes');
        const tasks = [
            { id: uuid(), name: '携程官网监控', type: 'http', target: 'http://www.tuniu.com', interval: 5, timeout: 10, status_code: 200, alert_threshold: 3, node_id: nodes[0]?.id, enabled: true, status: 'normal', last_response_time: 245, last_check_time: new Date().toISOString(), availability: 99.8, config: {} },
            { id: uuid(), name: 'GitHub官网监控', type: 'https', target: 'https://github.com', interval: 5, timeout: 10, status_code: 200, alert_threshold: 3, node_id: nodes[1]?.id, enabled: true, status: 'error', last_response_time: 0, last_check_time: new Date().toISOString(), availability: 0, config: {} },
            { id: uuid(), name: 'GitHub API监控', type: 'api', target: 'https://api.github.com', interval: 5, timeout: 15, status_code: 200, alert_threshold: 3, node_id: nodes[0]?.id, enabled: true, status: 'slow', last_response_time: 1250, last_check_time: new Date().toISOString(), availability: 97.2, config: { method: 'GET' } },
            { id: uuid(), name: '用户登录API监控', type: 'api', target: 'https://api.example.com/auth/login', interval: 3, timeout: 10, status_code: 200, alert_threshold: 3, node_id: nodes[1]?.id, enabled: true, status: 'normal', last_response_time: 180, last_check_time: new Date().toISOString(), availability: 99.5, config: { method: 'POST' } },
            { id: uuid(), name: '阿里云DNS监控', type: 'ping', target: '180.97.1.16', interval: 1, timeout: 5, alert_threshold: 3, node_id: nodes[1]?.id, enabled: true, status: 'normal', last_response_time: 12, last_check_time: new Date().toISOString(), availability: 100, config: {} },
        ];
        tasks.forEach(t => { t.created_at = new Date().toISOString(); t.updated_at = new Date().toISOString(); });
        writeJSON('tasks', tasks);
        console.log('✓ 任务数据已初始化');
    }

    console.log('数据库初始化完成:', DATA_DIR);
}

init();
EOF

    DATA_DIR=${NETWATCH_DIR}/data node init-db.js
    print_success "数据库初始化完成"
}

# ============ 部署 Agent ============
install_agent() {
    if [[ "$AGENT_ENABLED" != "true" ]]; then
        print_info "Agent 部署未启用，跳过"
        return
    fi

    if [[ -z "$AGENT_REGISTER_KEY" ]]; then
        print_warning "未提供 AGENT_REGISTER_KEY，跳过 Agent 部署"
        print_info "使用: sudo AGENT_ENABLED=true AGENT_REGISTER_KEY=your_key ./deploy.sh"
        return
    fi

    print_step "部署监控节点 Agent"

    cd ${NETWATCH_DIR}/agent

    cat > agent.js << 'EOF'
import http from 'http';
import https from 'https';
import net from 'net';
import tls from 'tls';
import dns from 'dns';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CONFIG = {
  CENTER_SERVER: process.env.CENTER_SERVER || 'http://localhost:3000',
  REGISTER_KEY: process.env.REGISTER_KEY || '',
  NODE_NAME: process.env.NODE_NAME || 'Agent-' + Math.random().toString(36).substring(7),
  REGION: process.env.REGION || 'east',
  HEARTBEAT_INTERVAL: 30000,
};

class Agent {
  constructor() { this.nodeId = null; this.tasks = []; }

  async start() {
    console.log('========================================');
    console.log('       NetWatch Agent 启动中...');
    console.log('========================================');
    console.log(`中心服务器: ${CONFIG.CENTER_SERVER}`);
    console.log(`节点名称: ${CONFIG.NODE_NAME}`);
    await this.register();
    this.startHeartbeat();
    setInterval(() => this.syncTasks(), 60000);
    await this.syncTasks();
  }

  async register() {
    try {
      const res = await this.request(`${CONFIG.CENTER_SERVER}/api/nodes/register`, {
        method: 'POST', body: { register_key: CONFIG.REGISTER_KEY, name: CONFIG.NODE_NAME, region: CONFIG.REGION }
      });
      if (res.success) {
        this.nodeId = res.node_id;
        this.tasks = res.tasks || [];
        console.log(`✓ 节点注册成功，ID: ${this.nodeId}, 任务数: ${this.tasks.length}`);
      } else {
        console.error('✗ 注册失败:', res.message);
      }
    } catch (e) { console.error('✗ 注册异常:', e.message); }
  }

  async heartbeat() {
    try {
      const info = this.getSystemInfo();
      const res = await this.request(`${CONFIG.CENTER_SERVER}/api/nodes/${this.nodeId}/heartbeat`, {
        method: 'POST', body: { cpu_usage: info.cpu, memory_usage: info.memory }
      });
      if (res.success) {
        this.tasks = res.tasks || [];
        console.log(`✓ 心跳成功，任务数: ${this.tasks.length}`);
      }
    } catch (e) { console.error('✗ 心跳失败:', e.message); }
  }

  startHeartbeat() {
    this.heartbeat();
    setInterval(() => this.heartbeat(), CONFIG.HEARTBEAT_INTERVAL);
  }

  async syncTasks() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 同步任务...`);
    for (const task of this.tasks) await this.executeTask(task);
  }

  async executeTask(task) {
    console.log(`\n▶ ${task.name} (${task.type}) -> ${task.target}`);
    const start = Date.now();
    let result = { success: false, responseTime: 0, statusCode: null, error: null };

    try {
      switch (task.type) {
        case 'http': case 'https': result = await this.checkHttp(task); break;
        case 'api': result = await this.checkApi(task); break;
        case 'ping': result = await this.checkPing(task); break;
        case 'tcp': result = await this.checkTcp(task); break;
        case 'dns': result = await this.checkDns(task); break;
        case 'ssl': result = await this.checkSsl(task); break;
        default: result.error = `不支持的类型: ${task.type}`;
      }
    } catch (e) { result.error = e.message; }

    result.responseTime = Date.now() - start;
    console.log(result.success ? `  ✓ ${result.responseTime}ms` : `  ✗ ${result.error}`);
    await this.report(task.id, result);
  }

  async checkHttp(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const proto = url.protocol === 'https:' ? https : http;
      const req = proto.request(url, { method: 'GET', timeout: (task.timeout || 10) * 1000, rejectUnauthorized: false }, (res) => {
        res.resume();
        resolve({ success: res.statusCode === (task.status_code || 200), statusCode: res.statusCode });
      });
      req.on('error', e => resolve({ success: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '超时' }); });
      req.end();
    });
  }

  async checkApi(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const proto = url.protocol === 'https:' ? https : http;
      const method = task.config?.method || 'GET';
      const req = proto.request(url, { method, timeout: (task.timeout || 10) * 1000 }, (res) => {
        res.resume();
        resolve({ success: res.statusCode === (task.status_code || 200), statusCode: res.statusCode });
      });
      req.on('error', e => resolve({ success: false, error: e.message }));
      req.on('timeout', () => { req.destroy(); resolve({ success: false, error: '超时' }); });
      if (task.config?.body && ['POST','PUT','PATCH'].includes(method)) req.write(task.config.body);
      req.end();
    });
  }

  async checkPing(task) {
    try {
      const target = task.target.replace(/^https?:\/\//, '');
      const { stdout } = await execAsync(`ping -c 1 -W ${task.timeout || 5} ${target}`);
      const match = stdout.match(/time[=<](\d+\.?\d*)\s*ms/i);
      const time = match ? Math.round(parseFloat(match[1])) : 0;
      return { success: time > 0, responseTime: time };
    } catch { return { success: false, error: '无法到达' }; }
  }

  async checkTcp(task) {
    return new Promise((resolve) => {
      const start = Date.now();
      const url = new URL(task.target.startsWith('http') ? task.target : `tcp://${task.target}`);
      const port = task.config?.port || parseInt(url.port) || 80;
      const socket = new net.Socket();
      socket.setTimeout((task.timeout || 5) * 1000);
      socket.on('connect', () => { socket.destroy(); resolve({ success: true, responseTime: Date.now() - start }); });
      socket.on('error', e => resolve({ success: false, error: e.message }));
      socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: '超时' }); });
      socket.connect(port, url.hostname);
    });
  }

  async checkDns(task) {
    return new Promise((resolve) => {
      dns.resolve4(task.target, (err, addr) => resolve(err ? { success: false, error: err.message } : { success: addr.length > 0 }));
    });
  }

  async checkSsl(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const socket = new net.Socket();
      socket.setTimeout((task.timeout || 30) * 1000);
      socket.connect(443, url.hostname, () => {
        const tlsSocket = new tls.TLSSocket(socket);
        const cert = tlsSocket.getPeerCertificate();
        if (cert && cert.valid_to) {
          const days = Math.ceil((new Date(cert.valid_to) - new Date()) / 86400000);
          resolve({ success: days > 0, details: { daysLeft: days } });
        } else resolve({ success: false, error: '无法获取证书' });
        socket.destroy();
      });
      socket.on('error', e => resolve({ success: false, error: e.message }));
      socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: '超时' }); });
    });
  }

  async report(taskId, result) {
    try {
      await this.request(`${CONFIG.CENTER_SERVER}/api/tasks/${taskId}/report`, { method: 'POST', body: result });
    } catch (e) { console.error(`  ! 上报失败: ${e.message}`); }
  }

  request(url, opts = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const proto = urlObj.protocol === 'https:' ? https : http;
      const req = proto.request(url, { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ success: false }); } });
      });
      req.on('error', reject);
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('超时')); });
      if (opts.body) req.write(JSON.stringify(opts.body));
      req.end();
    });
  }

  getSystemInfo() {
    const os = require('os');
    const cpus = os.cpus();
    let idle = 0, total = 0;
    cpus.forEach(c => { for (const t in c.times) total += c.times[t]; idle += c.times.idle; });
    return { cpu: Math.round((1 - idle / total) * 100), memory: Math.round((1 - os.freemem() / os.totalmem()) * 100) };
  }
}

const agent = new Agent();
agent.start();
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
EOF

    cat > .env << EOF
CENTER_SERVER=http://localhost:${NETWATCH_PORT}
REGISTER_KEY=${AGENT_REGISTER_KEY}
NODE_NAME=${AGENT_NODE_NAME:-Agent-$(date +%s)}
REGION=${AGENT_REGION}
EOF

    cat > ecosystem.agent.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'netwatch-agent',
    script: 'agent.js',
    instances: 1,
    autorestart: true,
    error_file: 'logs/agent-error.log',
    out_file: 'logs/agent-out.log'
  }]
};
EOF

    pm2 start ecosystem.agent.config.js
    pm2 save

    print_success "Agent 部署完成"
}

# ============ 验证 ============
verify() {
    print_step "验证安装"
    pm2 list | grep -E "netwatch|Name" || true
    systemctl status nginx --no-pager 2>/dev/null | head -3 || true
    sleep 2
    curl -s http://localhost:${NETWATCH_PORT}/api/health 2>/dev/null || echo "API 未响应"
}

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
    echo -e "  管理命令:"
    echo -e "    ${YELLOW}pm2 status${NC}              - 服务状态"
    echo -e "    ${YELLOW}pm2 restart all${NC}         - 重启所有服务"
    echo -e "    ${YELLOW}pm2 logs netwatch-backend${NC} - 查看日志"
    echo ""
    echo -e "  Agent 部署:"
    echo -e "    ${CYAN}sudo AGENT_ENABLED=true AGENT_REGISTER_KEY=your_key ./deploy.sh${NC}"
    echo ""
}

# ============ 主函数 ============
main() {
    echo -e "${CYAN}"
    echo "================================================"
    echo "    NetWatch 监控平台自动化部署脚本 v1.1.0"
    echo "    使用 SQLite (JSON文件) 数据库"
    echo "================================================"
    echo -e "${NC}"

    check_root
    detect_os
    install_dependencies
    create_directories
    install_backend
    init_database
    configure_pm2
    install_frontend

    if [[ -d "${NETWATCH_DIR}/frontend/dist" ]]; then
        configure_nginx
        configure_firewall
    else
        print_warning "前端文件未找到，跳过 Nginx 配置"
    fi

    if [[ "$AGENT_ENABLED" == "true" ]]; then
        install_agent
    fi

    verify
    show_usage
}

main "$@"
