#!/bin/bash
# NetWatch Agent 安装脚本
# 适用于 Rocky Linux 9 / CentOS 9 / RHEL 9

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    NetWatch Agent 安装脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用root用户运行此脚本${NC}"
    exit 1
fi

# 配置变量
INSTALL_DIR="/opt/netwatch-agent"
SERVICE_NAME="netwatch-agent"

# 获取配置信息
echo ""
echo -e "${YELLOW}请配置Agent连接信息:${NC}"
read -p "中心服务器地址 (例如: http://192.168.1.100:3000): " CENTER_SERVER
read -p "注册密钥 (从Web界面获取): " REGISTER_KEY

if [ -z "$CENTER_SERVER" ] || [ -z "$REGISTER_KEY" ]; then
    echo -e "${RED}配置信息不能为空${NC}"
    exit 1
fi

# 创建安装目录
echo ""
echo -e "${YELLOW}正在创建安装目录...${NC}"
mkdir -p $INSTALL_DIR

# 安装Node.js
echo ""
echo -e "${YELLOW}正在安装Node.js 20...${NC}"
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# 复制安装文件
echo ""
echo -e "${YELLOW}正在复制Agent文件...${NC}"
cp -r $(dirname "$0")/* $INSTALL_DIR/

# 安装依赖
echo ""
echo -e "${YELLOW}正在安装依赖...${NC}"
cd $INSTALL_DIR
npm ci --only=production

# 创建环境配置文件
echo ""
echo -e "${YELLOW}正在创建配置文件...${NC}"
cat > $INSTALL_DIR/.env << EOF
NODE_ENV=production
CENTER_SERVER=$CENTER_SERVER
REGISTER_KEY=$REGISTER_KEY
EOF

# 创建systemd服务
echo ""
echo -e "${YELLOW}正在创建系统服务...${NC}"
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=NetWatch Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
Restart=always
RestartSec=10

# 日志配置
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

# 重新加载systemd
systemctl daemon-reload

# 询问是否启动服务
echo ""
read -p "是否立即启动Agent服务? (y/n): " START_NOW
if [ "$START_NOW" = "y" ]; then
    systemctl enable ${SERVICE_NAME}
    systemctl start ${SERVICE_NAME}
    echo ""
    echo -e "${GREEN}Agent服务已启动!${NC}"
    systemctl status ${SERVICE_NAME}
else
    echo ""
    echo -e "${YELLOW}安装完成。请使用以下命令启动Agent:${NC}"
    echo -e "  systemctl enable ${SERVICE_NAME}"
    echo -e "  systemctl start ${SERVICE_NAME}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}    安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Agent配置信息:"
echo -e "  安装目录: ${INSTALL_DIR}"
echo -e "  日志查看: journalctl -u ${SERVICE_NAME} -f"
echo -e "  状态查看: systemctl status ${SERVICE_NAME}"
echo ""
