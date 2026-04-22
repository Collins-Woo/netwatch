#!/bin/bash
# NetWatch 监控平台一键自动化部署脚本
# 默认使用 JSON 文件存储（无需安装数据库），支持前后端自动对接
# 适用于 Rocky Linux 9 / CentOS 9 / RHEL 9 / Debian/Ubuntu
#
# 使用方法:
#   sudo ./deploy.sh                      # 完整部署
#   sudo ./deploy.sh --only-backend        # 仅部署后端
#   sudo ./deploy.sh --skip-frontend       # 跳过前端构建
#   sudo ./deploy.sh --reinstall          # 重新安装

set -e

# ============ 配置区域 ============
NETWATCH_DIR="${NETWATCH_DIR:-/opt/netwatch}"
NETWATCH_PORT="${NETWATCH_PORT:-3000}"
GITHUB_REPO="${GITHUB_REPO:-https://github.com/Collins-Woo/netwatch.git}"
AGENT_ENABLED="${AGENT_ENABLED:-false}"
AGENT_REGISTER_KEY="${AGENT_REGISTER_KEY:-}"
AGENT_NODE_NAME="${AGENT_NODE_NAME:-}"
AGENT_REGION="${AGENT_REGION:-east}"

# ============ 命令行参数 ============
ONLY_BACKEND=false
SKIP_FRONTEND=false
REINSTALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --only-backend) ONLY_BACKEND=true; shift ;;
        --skip-frontend) SKIP_FRONTEND=true; shift ;;
        --reinstall) REINSTALL=true; shift ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
done

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
        apt-get update && apt-get install -y nodejs npm
        apt-get install -y curl wget git nginx
        npm install -g pm2
    fi

    print_success "Node.js: $(node --version)"
    print_success "PM2: $(pm2 --version)"
}

# ============ 创建目录 ============
create_directories() {
    print_step "创建目录结构"
    mkdir -p ${NETWATCH_DIR}/{frontend/dist,backend/src,data,logs}
    mkdir -p ${NETWATCH_DIR}/logs
    chmod 755 ${NETWATCH_DIR}
    print_success "目录创建完成: ${NETWATCH_DIR}"
}

# ============ 下载源码 ============
download_source() {
    print_step "下载源码"

    if [[ -d "${NETWATCH_DIR}/.git" ]]; then
        print_info "代码已存在，更新中..."
        cd ${NETWATCH_DIR} && git pull origin main
    else
        git clone --depth 1 ${GITHUB_REPO} ${NETWATCH_DIR}
    fi

    print_success "源码下载完成"
}

# ============ 安装后端 ============
install_backend() {
    print_step "安装后端服务 (JSON文件存储)"

    cd ${NETWATCH_DIR}/backend

    # 安装依赖
    npm install --production 2>/dev/null || npm install

    # 创建环境配置
    cat > .env << EOF
PORT=${NETWATCH_PORT}
NODE_ENV=production
DATA_DIR=${NETWATCH_DIR}/data
EOF

    print_success "后端安装完成"
}

# ============ 安装前端 ============
install_frontend() {
    if [[ "$SKIP_FRONTEND" == "true" ]]; then
        print_info "跳过前端构建"
        return
    fi

    print_step "构建前端"

    # 安装前端依赖
    cd ${NETWATCH_DIR}
    npm install --prefer-offline 2>/dev/null || npm install

    # 构建前端（默认使用真实API，无需额外配置）
    print_info "正在构建前端..."
    npm run build

    print_success "前端构建完成"
}

# ============ 初始化数据库 ============
init_database() {
    print_step "初始化数据库"

    cd ${NETWATCH_DIR}/backend

    # 创建数据目录
    mkdir -p ${NETWATCH_DIR}/data

    # 初始化示例数据
    cat > init-db.js << 'INITEOF'
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function init() {
    // Nodes
    const nodesFile = path.join(DATA_DIR, 'nodes.json');
    if (!fs.existsSync(nodesFile)) {
        const node1 = { id: uuid(), name: '华东节点-01', ip: '10.0.1.101', region: 'east', description: '位于上海的数据中心', register_key: 'sk_a1b2c3d4e5f6g7h8', enabled: true, status: 'offline', last_heartbeat: null, cpu_usage: 0, memory_usage: 0, task_count: 0, created_at: new Date().toISOString() };
        const node2 = { id: uuid(), name: '华南节点-01', ip: '10.0.2.102', region: 'south', description: '位于深圳的数据中心', register_key: 'sk_i9j0k1l2m3n4o5p6', enabled: true, status: 'offline', last_heartbeat: null, cpu_usage: 0, memory_usage: 0, task_count: 0, created_at: new Date().toISOString() };
        fs.writeFileSync(nodesFile, JSON.stringify([node1, node2], null, 2));
        console.log('✓ 节点数据已初始化');
    }

    // Tasks
    const tasksFile = path.join(DATA_DIR, 'tasks.json');
    if (!fs.existsSync(tasksFile)) {
        const nodes = JSON.parse(fs.readFileSync(nodesFile, 'utf-8'));
        const tasks = [
            { id: uuid(), name: '携程官网监控', type: 'http', target: 'http://www.tuniu.com', interval: 5, timeout: 10, status_code: 200, alert_threshold: 3, node_id: nodes[0]?.id, enabled: true, status: 'normal', last_response_time: 245, last_check_time: new Date().toISOString(), availability: 99.8, config: {} },
            { id: uuid(), name: 'GitHub官网监控', type: 'https', target: 'https://github.com', interval: 5, timeout: 10, status_code: 200, alert_threshold: 3, node_id: nodes[1]?.id, enabled: true, status: 'normal', last_response_time: 156, last_check_time: new Date().toISOString(), availability: 99.5, config: {} },
            { id: uuid(), name: 'GitHub API监控', type: 'api', target: 'https://api.github.com', interval: 5, timeout: 15, status_code: 200, alert_threshold: 3, node_id: nodes[0]?.id, enabled: true, status: 'normal', last_response_time: 320, last_check_time: new Date().toISOString(), availability: 98.2, config: { method: 'GET' } },
            { id: uuid(), name: '阿里云DNS监控', type: 'ping', target: '223.5.5.5', interval: 1, timeout: 5, alert_threshold: 3, node_id: nodes[1]?.id, enabled: true, status: 'normal', last_response_time: 12, last_check_time: new Date().toISOString(), availability: 100, config: {} },
        ];
        tasks.forEach(t => { t.created_at = new Date().toISOString(); t.updated_at = new Date().toISOString(); });
        fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
        console.log('✓ 任务数据已初始化');
    }

    // Alerts
    const alertsFile = path.join(DATA_DIR, 'alerts.json');
    if (!fs.existsSync(alertsFile)) {
        fs.writeFileSync(alertsFile, JSON.stringify([], null, 2));
    }

    console.log('✓ 数据库初始化完成:', DATA_DIR);
}

init();
INITEOF

    DATA_DIR=${NETWATCH_DIR}/data node init-db.js
    print_success "数据库初始化完成"
}

# ============ 配置 PM2 ============
configure_pm2() {
    print_step "配置 PM2 服务管理"

    cd ${NETWATCH_DIR}

    # 创建 PM2 配置文件
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
      PORT: process.env.PORT || 3000,
      DATA_DIR: process.env.DATA_DIR || './data'
    },
    error_file: 'logs/backend-error.log',
    out_file: 'logs/backend-out.log',
    time: true
  }]
};
EOF

    # 停止旧进程
    pm2 delete netwatch-backend 2>/dev/null || true

    # 启动服务
    PORT=${NETWATCH_PORT} DATA_DIR=${NETWATCH_DIR}/data pm2 start ecosystem.config.js
    pm2 save

    # 设置开机自启
    pm2 startup systemd -u root --hp /home/root 2>/dev/null || true

    print_success "PM2 配置完成"
    pm2 list
}

# ============ 配置 Nginx ============
configure_nginx() {
    if [[ "$SKIP_FRONTEND" == "true" ]]; then
        print_info "跳过 Nginx 配置"
        return
    fi

    print_step "配置 Nginx 反向代理"

    # 创建统一的 Nginx 配置（单端口同时服务前端和API）
    cat > /etc/nginx/conf.d/netwatch.conf << EOF
server {
    listen ${NETWATCH_PORT};
    server_name _;

    # 前端静态文件
    root ${NETWATCH_DIR}/dist;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;

    # API代理 - 将 /api/* 转发到后端
    location /api/ {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSocket代理
    location /ws {
        proxy_pass http://127.0.0.1:${NETWATCH_PORT}/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "ok\\n";
        add_header Content-Type text/plain;
    }

    # 前端路由 (SPA支持)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

    # 测试并重启 Nginx
    nginx -t && systemctl enable nginx && systemctl restart nginx

    print_success "Nginx 配置完成"
}

# ============ 配置防火墙 ============
configure_firewall() {
    print_step "配置防火墙"
    if systemctl is-active --quiet firewalld; then
        firewall-cmd --permanent --add-port=${NETWATCH_PORT}/tcp
        firewall-cmd --reload
        print_success "防火墙端口 ${NETWATCH_PORT} 已开放"
    else
        print_info "防火墙未启用，跳过"
    fi
}

# ============ 验证安装 ============
verify() {
    print_step "验证安装"

    # 检查后端
    sleep 2
    local backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${NETWATCH_PORT}/api/health 2>/dev/null || echo "000")
    if [[ "$backend_status" == "200" ]]; then
        print_success "后端服务运行正常 (端口 ${NETWATCH_PORT})"
    else
        print_error "后端服务异常 (HTTP ${backend_status})"
    fi

    # 检查 Nginx
    if systemctl is-active --quiet nginx; then
        print_success "Nginx 运行正常"
    else
        print_warning "Nginx 未运行"
    fi

    # 显示服务状态
    echo ""
    pm2 list | grep netwatch || true
}

# ============ 显示使用说明 ============
show_usage() {
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  NetWatch 监控平台安装完成！${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  访问地址: ${CYAN}http://你的服务器IP:${NETWATCH_PORT}${NC}"
    echo ""
    echo -e "  数据目录: ${NETWATCH_DIR}/data"
    echo ""
    echo -e "  管理命令:"
    echo -e "    ${YELLOW}pm2 status${NC}              - 查看服务状态"
    echo -e "    ${YELLOW}pm2 logs netwatch-backend${NC} - 查看后端日志"
    echo -e "    ${YELLOW}pm2 restart netwatch-backend${NC} - 重启后端"
    echo ""
    echo -e "  数据管理:"
    echo -e "    ${YELLOW}ls ${NETWATCH_DIR}/data/${NC} - 查看数据文件"
    echo ""
}

# ============ 主函数 ============
main() {
    echo -e "${CYAN}"
    echo "================================================"
    echo "    NetWatch 监控平台自动化部署脚本 v1.2.0"
    echo "    默认使用 JSON 文件存储 (免数据库)"
    echo "    前端默认使用真实后端 API"
    echo "================================================"
    echo -e "${NC}"

    check_root
    detect_os
    install_dependencies
    create_directories
    download_source
    install_backend
    init_database
    configure_pm2

    if [[ "$ONLY_BACKEND" != "true" ]]; then
        install_frontend
        configure_nginx
        configure_firewall
    fi

    verify
    show_usage
}

main "$@"
