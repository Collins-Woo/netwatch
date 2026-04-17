/**
 * NetWatch Agent 完整实现
 * 支持所有监控类型：HTTP/HTTPS, API, Ping, TCP, DNS, SSL, Traceroute, MySQL, Redis
 */

import https from 'https';
import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as net from 'net';
import * as dns from 'dns';
import * as tls from 'tls';
import * as mysql from 'mysql2/promise';
import { createClient } from 'redis';

const execAsync = promisify(exec);

// 配置
const CONFIG = {
  CENTER_SERVER: process.env.CENTER_SERVER || 'http://localhost:3000',
  REGISTER_KEY: process.env.REGISTER_KEY || 'sk_a1b2c3d4e5f6g7h8',
  HEARTBEAT_INTERVAL: 30000,
  CHECK_INTERVAL: 60000,
};

interface TaskConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';
  headers?: Record<string, string>;
  body?: string;
  port?: number;
  dnsServer?: string;
  recordType?: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS';
  sslExpiryWarning?: number;
  sslExpiryCritical?: number;
  database?: string;
  username?: string;
  password?: string;
  maxHops?: number;
  maxTimeout?: number;
}

interface Task {
  id: string;
  name: string;
  type: string;
  target: string;
  interval: number;
  timeout: number;
  status_code?: number;
  config?: TaskConfig;
}

interface CheckResult {
  success: boolean;
  responseTime: number;
  statusCode: number | null;
  error: string | null;
  details?: Record<string, any>;
}

class NetWatchAgent {
  private nodeId: string | null = null;
  private tasks: Task[] = [];
  private lastHeartbeat: Date | null = null;
  private redisClients: Map<string, any> = new Map();

  /**
   * 启动Agent
   */
  async start() {
    console.log('========================================');
    console.log('       NetWatch Agent 启动中...');
    console.log('========================================');
    console.log(`中心服务器: ${CONFIG.CENTER_SERVER}`);
    console.log(`注册密钥: ${CONFIG.REGISTER_KEY.substring(0, 10)}...`);

    // 注册节点
    await this.register();

    // 启动心跳
    this.startHeartbeat();

    // 定期检查任务更新
    setInterval(() => this.syncTasks(), CONFIG.CHECK_INTERVAL);

    // 立即执行一次同步
    await this.syncTasks();
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
          ip: this.getLocalIP(),
          hostname: require('os').hostname()
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.nodeId = data.node_id;
        this.tasks = data.tasks || [];
        console.log(`✓ 节点注册成功，节点ID: ${this.nodeId}`);
        console.log(`✓ 分配任务数: ${this.tasks.length}`);
      } else {
        const errorText = await response.text();
        console.error('✗ 节点注册失败:', response.status, errorText);
      }
    } catch (error: any) {
      console.error('✗ 节点注册异常:', error.message);
      console.log('  将使用离线模式运行...');
    }
  }

  /**
   * 发送心跳
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
        console.log(`✓ 心跳发送成功，任务数: ${this.tasks.length}`);
      }
    } catch (error: any) {
      console.error('✗ 心跳发送失败:', error.message);
    }
  }

  /**
   * 启动心跳定时器
   */
  startHeartbeat() {
    this.heartbeat();
    setInterval(() => this.heartbeat(), CONFIG.HEARTBEAT_INTERVAL);
  }

  /**
   * 同步任务列表
   */
  async syncTasks() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 检查任务更新...`);

    for (const task of this.tasks) {
      await this.executeTask(task);
    }
  }

  /**
   * 执行单个监控任务
   */
  async executeTask(task: Task) {
    console.log(`\n▶ 执行任务: ${task.name} (${task.type}) -> ${task.target}`);

    const startTime = Date.now();
    let result: CheckResult = {
      success: false,
      responseTime: 0,
      statusCode: null,
      error: null
    };

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
        case 'traceroute':
          result = await this.checkTraceroute(task);
          break;
        case 'mysql':
          result = await this.checkMysql(task);
          break;
        case 'redis':
          result = await this.checkRedis(task);
          break;
        default:
          result.error = `不支持的监控类型: ${task.type}`;
      }
    } catch (error: any) {
      result.error = error.message;
    }

    result.responseTime = Date.now() - startTime;

    // 输出结果
    if (result.success) {
      console.log(`  ✓ 成功 | 响应时间: ${result.responseTime}ms | 状态码: ${result.statusCode || 'N/A'}`);
    } else {
      console.log(`  ✗ 失败 | ${result.error}`);
    }

    // 上报结果
    await this.reportResult(task.id, result);
  }

  /**
   * HTTP/HTTPS 检查
   */
  async checkHttp(task: Task): Promise<CheckResult> {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(url, {
        method: 'GET',
        timeout: (task.timeout || 10) * 1000
      }, (res) => {
        const success = res.statusCode === (task.status_code || 200);
        res.resume();
        resolve({
          success,
          responseTime: 0,
          statusCode: res.statusCode || null,
          error: success ? null : `状态码不匹配: ${res.statusCode}`
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          responseTime: 0,
          statusCode: null,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          responseTime: 0,
          statusCode: null,
          error: '连接超时'
        });
      });

      req.end();
    });
  }

  /**
   * API 接口检查（支持多种HTTP方法）
   */
  async checkApi(task: Task): Promise<CheckResult> {
    return new Promise((resolve) => {
      const url = new URL(task.target);
      const protocol = url.protocol === 'https:' ? https : http;
      const method = task.config?.method || 'GET';
      const headers = task.config?.headers || {};
      const body = task.config?.body;

      const options: any = {
        method,
        timeout: (task.timeout || 10) * 1000,
        headers: {
          'User-Agent': 'NetWatch-Agent/1.0',
          ...headers
        }
      };

      // 如果有请求体但没有Content-Type，自动添加
      if (body && !headers['Content-Type'] && !headers['content-type']) {
        options.headers['Content-Type'] = 'application/json';
      }

      const req = protocol.request(url, options, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
          responseBody += chunk;
        });

        res.on('end', () => {
          const success = res.statusCode === (task.status_code || 200);
          resolve({
            success,
            responseTime: 0,
            statusCode: res.statusCode || null,
            error: success ? null : `状态码不匹配: ${res.statusCode}`,
            details: {
              responseBody: responseBody.substring(0, 500),
              contentLength: responseBody.length
            }
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          responseTime: 0,
          statusCode: null,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          responseTime: 0,
          statusCode: null,
          error: '请求超时'
        });
      });

      // 发送请求体
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        req.write(body);
      }

      req.end();
    });
  }

  /**
   * Ping 检查
   */
  async checkPing(task: Task): Promise<CheckResult> {
    try {
      const target = task.target.replace(/^https?:\/\//, '');
      const timeout = task.timeout || 5;

      const { stdout } = await execAsync(`ping -c 1 -W ${timeout} ${target}`);

      const match = stdout.match(/time[=<](\d+\.?\d*)\s*ms/i);
      const responseTime = match ? Math.round(parseFloat(match[1])) : 0;

      return {
        success: responseTime > 0,
        responseTime,
        statusCode: null,
        error: responseTime > 0 ? null : '无法解析响应时间'
      };
    } catch (error: any) {
      return {
        success: false,
        responseTime: 0,
        statusCode: null,
        error: '无法到达目标主机'
      };
    }
  }

  /**
   * TCP 端口检查
   */
  async checkTcp(task: Task): Promise<CheckResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = new URL(task.target.startsWith('http') ? task.target : `tcp://${task.target}`);
      const host = url.hostname;
      const port = task.config?.port || parseInt(url.port) || (task.target.includes(':') ? parseInt(task.target.split(':')[1]) : 80);
      const timeout = (task.timeout || 5) * 1000;

      const socket = new net.Socket();

      socket.setTimeout(timeout);

      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        resolve({
          success: true,
          responseTime,
          statusCode: null,
          error: null
        });
      });

      socket.on('error', (error) => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          statusCode: null,
          error: `端口 ${port} 无法连接: ${error.message}`
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: timeout,
          statusCode: null,
          error: `连接超时 (${timeout}ms)`
        });
      });

      socket.connect(port, host);
    });
  }

  /**
   * DNS 解析检查
   */
  async checkDns(task: Task): Promise<CheckResult> {
    const startTime = Date.now();
    const domain = task.target;
    const recordType = task.config?.recordType || 'A';
    const dnsServer = task.config?.dnsServer;

    try {
      const options: dns.LookupOptions = {};
      if (dnsServer) {
        options.server = { address: dnsServer, port: 53 };
      }

      const resolve4Async = promisify(dns.resolve4);
      const resolve6Async = promisify(dns.resolve6);
      const resolveCnameAsync = promisify(dns.resolveCname);
      const resolveMxAsync = promisify(dns.resolveMx);
      const resolveTxtAsync = promisify(dns.resolveTxt);
      const resolveNsAsync = promisify(dns.resolveNs);

      let records: string[] = [];

      switch (recordType) {
        case 'A':
          records = await resolve4Async(domain);
          break;
        case 'AAAA':
          records = await resolve6Async(domain);
          break;
        case 'CNAME':
          records = await resolveCnameAsync(domain);
          break;
        case 'MX':
          const mxRecords = await resolveMxAsync(domain);
          records = mxRecords.map(r => `${r.priority} ${r.exchange}`);
          break;
        case 'TXT':
          records = await resolveTxtAsync(domain);
          break;
        case 'NS':
          records = await resolveNsAsync(domain);
          break;
      }

      return {
        success: records.length > 0,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: records.length > 0 ? null : '未找到DNS记录',
        details: {
          records,
          recordType,
          dnsServer: dnsServer || '系统默认'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: `DNS解析失败: ${error.message}`
      };
    }
  }

  /**
   * SSL 证书检查
   */
  async checkSsl(task: Task): Promise<CheckResult> {
    const startTime = Date.now();
    const url = new URL(task.target);
    const host = url.hostname;
    const port = url.port || 443;
    const warningDays = task.config?.sslExpiryWarning || 30;
    const criticalDays = task.config?.sslExpiryCritical || 7;

    return new Promise((resolve) => {
      const socket = new tls.TLSSocket(new net.Socket());

      socket.setTimeout((task.timeout || 30) * 1000);

      socket.connect({
        host,
        port: parseInt(port.toString()),
        servername: host,
        rejectUnauthorized: false
      }, () => {
        const cert = socket.getPeerCertificate();
        const responseTime = Date.now() - startTime;

        if (!cert || !cert.valid_to) {
          socket.destroy();
          resolve({
            success: false,
            responseTime,
            statusCode: null,
            error: '无法获取SSL证书'
          });
          return;
        }

        const validUntil = new Date(cert.valid_to);
        const daysUntilExpiry = Math.ceil((validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        let success = true;
        let error: string | null = null;

        if (daysUntilExpiry <= 0) {
          success = false;
          error = `SSL证书已过期 (${cert.valid_to})`;
        } else if (daysUntilExpiry <= criticalDays) {
          success = false;
          error = `SSL证书即将过期: ${daysUntilExpiry}天后到期`;
        } else if (daysUntilExpiry <= warningDays) {
          error = `SSL证书即将到期: ${daysUntilExpiry}天后到期`;
        }

        socket.destroy();

        resolve({
          success,
          responseTime,
          statusCode: null,
          error,
          details: {
            issuer: cert.issuer?.O || '未知',
            subject: cert.subject?.CN || host,
            validFrom: cert.valid_from,
            validUntil: cert.valid_to,
            daysUntilExpiry,
            serialNumber: cert.serialNumber
          }
        });
      });

      socket.on('error', (error) => {
        resolve({
          success: false,
          responseTime: Date.now() - startTime,
          statusCode: null,
          error: `SSL连接失败: ${error.message}`
        });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({
          success: false,
          responseTime: (task.timeout || 30) * 1000,
          statusCode: null,
          error: 'SSL连接超时'
        });
      });
    });
  }

  /**
   * Traceroute 检查
   */
  async checkTraceroute(task: Task): Promise<CheckResult> {
    const startTime = Date.now();
    const target = task.target.replace(/^https?:\/\//, '');
    const maxHops = task.config?.maxHops || 30;
    const maxTimeout = task.config?.maxTimeout || 5000;

    try {
      // 使用 traceroute 命令（Linux）
      const { stdout } = await execAsync(
        `traceroute -m ${maxHops} -w ${maxTimeout / 1000} ${target}`,
        { timeout: (task.timeout || 60) * 1000 }
      );

      const lines = stdout.split('\n').filter(line => line.trim());
      const hops = lines.map(line => {
        const match = line.match(/^\s*(\d+)\s+(.+)/);
        return match ? { hop: parseInt(match[1]), route: match[2].trim() } : null;
      }).filter(Boolean);

      return {
        success: hops.length > 0,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: null,
        details: {
          hops,
          totalHops: hops.length,
          route: stdout.substring(0, 1000)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: `路由追踪失败: ${error.message}`
      };
    }
  }

  /**
   * MySQL 数据库检查
   */
  async checkMysql(task: Task): Promise<CheckResult> {
    const startTime = Date.now();
    const url = new URL(task.target.startsWith('http') ? task.target : `mysql://${task.target}`);
    const host = url.hostname;
    const port = task.config?.port || parseInt(url.port) || 3306;
    const database = task.config?.database;
    const username = task.config?.username || 'root';
    const password = task.config?.password || '';

    let connection: any = null;

    try {
      connection = await mysql.createConnection({
        host,
        port,
        user: username,
        password,
        database,
        connectTimeout: (task.timeout || 10) * 1000
      });

      // 执行简单查询测试连接
      const [rows] = await connection.execute('SELECT 1 as test');

      await connection.end();

      return {
        success: true,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: null,
        details: {
          host,
          port,
          database: database || 'default',
          connected: true
        }
      };
    } catch (error: any) {
      if (connection) {
        try { await connection.end(); } catch (e) {}
      }

      return {
        success: false,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: `MySQL连接失败: ${error.message}`
      };
    }
  }

  /**
   * Redis 服务检查
   */
  async checkRedis(task: Task): Promise<CheckResult> {
    const startTime = Date.now();
    const url = new URL(task.target.startsWith('http') ? task.target : `redis://${task.target}`);
    const host = url.hostname;
    const port = task.config?.port || parseInt(url.port) || 6379;
    const username = task.config?.username;
    const password = task.config?.password;

    const clientKey = `${host}:${port}`;
    let client = this.redisClients.get(clientKey);

    try {
      if (!client) {
        client = createClient({
          socket: {
            host,
            port,
            connectTimeout: (task.timeout || 5) * 1000
          },
          username,
          password
        });

        client.on('error', () => {});
        await client.connect();
      }

      // PING 命令测试
      const result = await client.ping();
      const responseTime = Date.now() - startTime;

      return {
        success: result === 'PONG',
        responseTime,
        statusCode: null,
        error: result === 'PONG' ? null : 'Redis PING失败',
        details: {
          host,
          port,
          connected: true
        }
      };
    } catch (error: any) {
      // 连接失败，删除缓存的客户端
      if (client) {
        try { await client.quit(); } catch (e) {}
        this.redisClients.delete(clientKey);
      }

      return {
        success: false,
        responseTime: Date.now() - startTime,
        statusCode: null,
        error: `Redis连接失败: ${error.message}`
      };
    }
  }

  /**
   * 上报监控结果
   */
  async reportResult(taskId: string, result: CheckResult) {
    try {
      await fetch(`${CONFIG.CENTER_SERVER}/api/tasks/${taskId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
    } catch (error: any) {
      console.error(`  ! 上报结果失败: ${error.message}`);
    }
  }

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    const os = require('os');
    const cpus = os.cpus();
    let idle = 0, total = 0;

    cpus.forEach((cpu: any) => {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    });

    const cpu = Math.round((1 - idle / total) * 100);
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memory = Math.round((1 - freeMem / totalMem) * 100);

    return { cpu, memory };
  }

  /**
   * 获取本地IP
   */
  getLocalIP() {
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

  /**
   * 优雅退出
   */
  async shutdown() {
    console.log('\nAgent 正在关闭...');

    // 关闭所有Redis连接
    for (const [key, client] of this.redisClients) {
      try { await client.quit(); } catch (e) {}
    }

    process.exit(0);
  }
}

// 启动Agent
const agent = new NetWatchAgent();
agent.start();

// 优雅退出
process.on('SIGINT', () => agent.shutdown());
process.on('SIGTERM', () => agent.shutdown());

export default NetWatchAgent;
