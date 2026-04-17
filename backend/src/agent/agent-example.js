/**
 * NetWatch Agent 示例代码
 *
 * 这是一个监控节点Agent的实现示例
 * 实际部署时需要在目标服务器上安装运行
 */

import https from 'https';
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 配置
const CONFIG = {
  // 中心服务器地址
  CENTER_SERVER: process.env.CENTER_SERVER || 'http://localhost:3000',
  // Agent注册密钥（从节点详情页面获取）
  REGISTER_KEY: process.env.REGISTER_KEY || 'sk_a1b2c3d4e5f6g7h8',
  // 心跳间隔（毫秒）
  HEARTBEAT_INTERVAL: 30000, // 30秒
  // 监控检查间隔（毫秒）
  CHECK_INTERVAL: 60000, // 1分钟
};

class NetWatchAgent {
  constructor() {
    this.nodeId = null;
    this.tasks = [];
    this.lastHeartbeat = null;
  }

  /**
   * 启动Agent
   */
  async start() {
    console.log('NetWatch Agent 启动中...');
    console.log(`中心服务器: ${CONFIG.CENTER_SERVER}`);

    // 注册节点
    await this.register();

    // 启动心跳
    this.startHeartbeat();

    // 定期检查任务更新
    setInterval(() => this.syncTasks(), CONFIG.CHECK_INTERVAL);
  }

  /**
   * 注册节点到中心服务器
   */
  async register() {
    try {
      const response = await fetch(`${CONFIG.CENTER_SERVER}/api/nodes/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          register_key: CONFIG.REGISTER_KEY,
          ip: await this.getLocalIP(),
          hostname: require('os').hostname()
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.nodeId = data.node_id;
        this.tasks = data.tasks || [];
        console.log(`节点注册成功，节点ID: ${this.nodeId}`);
        console.log(`分配任务数: ${this.tasks.length}`);
      } else {
        console.error('节点注册失败:', response.status);
      }
    } catch (error) {
      console.error('节点注册异常:', error);
    }
  }

  /**
   * 发送心跳并获取任务更新
   */
  async heartbeat() {
    try {
      const systemInfo = this.getSystemInfo();

      const response = await fetch(`${CONFIG.CENTER_SERVER}/api/nodes/${this.nodeId}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu_usage: systemInfo.cpu,
          memory_usage: systemInfo.memory,
          task_count: this.tasks.length
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.tasks = data.tasks || [];
        this.lastHeartbeat = new Date();
        console.log(`心跳发送成功，下次检查时间: ${new Date(Date.now() + CONFIG.CHECK_INTERVAL).toLocaleTimeString()}`);
      }
    } catch (error) {
      console.error('心跳发送失败:', error);
    }
  }

  /**
   * 启动心跳定时器
   */
  startHeartbeat() {
    // 立即发送一次心跳
    this.heartbeat();

    // 定时发送心跳
    setInterval(() => this.heartbeat(), CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * 同步任务列表
   */
  async syncTasks() {
    console.log('检查任务更新...');

    // 执行所有分配的任务
    for (const task of this.tasks) {
      await this.executeTask(task);
    }
  }

  /**
   * 执行单个监控任务
   */
  async executeTask(task) {
    console.log(`执行任务: ${task.name} (${task.target})`);

    const startTime = Date.now();
    let result = {
      success: false,
      responseTime: 0,
      statusCode: null,
      error: null
    };

    try {
      switch (task.type) {
        case 'http':
        case 'https':
        case 'api':
          result = await this.checkHttp(task);
          break;
        case 'ping':
          result = await this.checkPing(task);
          break;
        case 'port':
          result = await this.checkPort(task);
          break;
      }
    } catch (error) {
      result.error = error.message;
    }

    result.responseTime = Date.now() - startTime;

    // 上报结果到中心服务器
    await this.reportResult(task.id, result);
  }

  /**
   * HTTP/HTTPS 检查
   */
  async checkHttp(task) {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(url, {
        method: 'GET',
        timeout: (task.timeout || 10) * 1000
      }, (res) => {
        resolve({
          success: res.statusCode === (task.status_code || 200),
          statusCode: res.statusCode,
          responseTime: 0,
          error: null
        });
        res.resume();
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          statusCode: null,
          responseTime: 0,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          statusCode: null,
          responseTime: 0,
          error: '超时'
        });
      });

      req.end();
    });
  }

  /**
   * Ping 检查
   */
  async checkPing(task) {
    try {
      const target = task.target.replace(/^https?:\/\//, '');
      const { stdout } = await execAsync(`ping -c 1 -W ${task.timeout || 5} ${target}`);

      // 解析响应时间
      const match = stdout.match(/time[=<](\d+\.?\d*)\s*ms/i);
      const responseTime = match ? parseFloat(match[1]) : 0;

      return {
        success: true,
        responseTime,
        statusCode: null,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        responseTime: 0,
        statusCode: null,
        error: '无法到达'
      };
    }
  }

  /**
   * 端口检查
   */
  async checkPort(task) {
    return new Promise((resolve) => {
      const [host, port] = task.target.split(':');
      const socket = new (require('net').Socket)();

      socket.setTimeout((task.timeout || 5) * 1000);

      socket.on('connect', () => {
        socket.destroy();
        resolve({
          success: true,
          responseTime: 0,
          statusCode: null,
          error: null
        });
      });

      socket.on('error', (error) => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: 0,
          statusCode: null,
          error: error.message
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: 0,
          statusCode: null,
          error: '超时'
        });
      });

      socket.connect(parseInt(port) || 80, host);
    });
  }

  /**
   * 上报监控结果
   */
  async reportResult(taskId, result) {
    try {
      await fetch(`${CONFIG.CENTER_SERVER}/api/tasks/${taskId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    } catch (error) {
      console.error('上报结果失败:', error);
    }
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    const os = require('os');

    // CPU使用率（简化计算）
    const cpus = os.cpus();
    let idle = 0, total = 0;
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    });

    const cpu = Math.round((1 - idle / total) * 100);

    // 内存使用率
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memory = Math.round((1 - freeMem / totalMem) * 100);

    return { cpu, memory };
  }

  /**
   * 获取本地IP
   */
  async getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }
}

// 启动Agent
const agent = new NetWatchAgent();
agent.start();

// 优雅退出
process.on('SIGINT', () => {
  console.log('Agent 正在关闭...');
  process.exit(0);
});

export default NetWatchAgent;
