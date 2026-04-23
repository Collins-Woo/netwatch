/**
 * JSON 文件数据库 - 最轻量级方案
 * 无需安装任何依赖，直接使用文件系统存储
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 数据文件路径
const files = {
  nodes: path.join(DATA_DIR, 'nodes.json'),
  tasks: path.join(DATA_DIR, 'tasks.json'),
  alerts: path.join(DATA_DIR, 'alerts.json'),
  alertConfigs: path.join(DATA_DIR, 'alert_configs.json'),
  alertRules: path.join(DATA_DIR, 'alert_rules.json'),
  history: path.join(DATA_DIR, 'history.json'),
};

/**
 * 读取JSON文件
 */
function readJSON(filename) {
  const filepath = files[filename];
  if (!fs.existsSync(filepath)) {
    return [];
  }
  try {
    const data = fs.readFileSync(filepath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`读取 ${filename} 失败:`, e);
    return [];
  }
}

/**
 * 写入JSON文件
 */
function writeJSON(filename, data) {
  const filepath = files[filename];
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 生成UUID
 */
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 数据库类
 */
class JsonDatabase {
  // 节点操作
  getNodes(search, region, status) {
    let nodes = readJSON('nodes');
    if (search) {
      const s = search.toLowerCase();
      nodes = nodes.filter(n =>
        n.name.toLowerCase().includes(s) || (n.ip && n.ip.includes(search))
      );
    }
    if (region && region !== 'all') {
      nodes = nodes.filter(n => n.region === region);
    }
    if (status && status !== 'all') {
      nodes = nodes.filter(n => n.status === status);
    }
    return nodes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getNodeById(id) {
    const nodes = readJSON('nodes');
    return nodes.find(n => n.id === id);
  }

  getNodeByRegisterKey(key) {
    const nodes = readJSON('nodes');
    return nodes.find(n => n.register_key === key);
  }

  createNode(data) {
    const nodes = readJSON('nodes');
    const newNode = {
      id: uuid(),
      name: data.name,
      ip: data.ip || '',
      region: data.region || 'east',
      description: data.description || '',
      register_key: data.register_key || `sk_${uuid().replace(/-/g, '').substring(0, 16)}`,
      enabled: data.enabled !== false,
      status: 'offline',
      last_heartbeat: null,
      cpu_usage: 0,
      memory_usage: 0,
      task_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    nodes.push(newNode);
    writeJSON('nodes', nodes);
    return newNode;
  }

  updateNode(id, data) {
    const nodes = readJSON('nodes');
    const index = nodes.findIndex(n => n.id === id);
    if (index === -1) return null;

    nodes[index] = {
      ...nodes[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    writeJSON('nodes', nodes);
    return nodes[index];
  }

  deleteNode(id) {
    const nodes = readJSON('nodes');
    const filtered = nodes.filter(n => n.id !== id);
    writeJSON('nodes', filtered);

    // 清除任务的node_id
    const tasks = readJSON('tasks');
    tasks.forEach(t => {
      if (t.node_id === id) t.node_id = null;
    });
    writeJSON('tasks', tasks);
    return true;
  }

  updateNodeHeartbeat(id, data) {
    return this.updateNode(id, {
      status: 'online',
      last_heartbeat: new Date().toISOString(),
      ...data
    });
  }

  // 任务操作
  getTasks(search, type, status, nodeId) {
    let tasks = readJSON('tasks');
    if (search) {
      const s = search.toLowerCase();
      tasks = tasks.filter(t =>
        t.name.toLowerCase().includes(s) || t.target.toLowerCase().includes(s)
      );
    }
    if (type && type !== 'all') {
      tasks = tasks.filter(t => t.type === type);
    }
    if (status && status !== 'all') {
      tasks = tasks.filter(t => t.status === status);
    }
    if (nodeId) {
      tasks = tasks.filter(t => t.node_id === nodeId);
    }
    return tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  getTaskById(id) {
    const tasks = readJSON('tasks');
    return tasks.find(t => t.id === id);
  }

  getTasksByNodeId(nodeId) {
    const tasks = readJSON('tasks');
    return tasks.filter(t => t.node_id === nodeId && t.enabled);
  }

  createTask(data) {
    const tasks = readJSON('tasks');
    const newTask = {
      id: uuid(),
      name: data.name,
      type: data.type,
      target: data.target,
      interval: data.interval || 5,
      timeout: data.timeout || 10,
      status_code: data.status_code || null,
      alert_threshold: data.alert_threshold || 3,
      node_id: data.node_id || null,
      enabled: data.enabled !== false,
      status: 'normal',
      last_response_time: null,
      last_check_time: null,
      availability: null,
      config: data.config || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tasks.push(newTask);
    writeJSON('tasks', tasks);
    return newTask;
  }

  updateTask(id, data) {
    const tasks = readJSON('tasks');
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) return null;

    tasks[index] = {
      ...tasks[index],
      ...data,
      updated_at: new Date().toISOString()
    };
    writeJSON('tasks', tasks);
    return tasks[index];
  }

  deleteTask(id) {
    const tasks = readJSON('tasks');
    writeJSON('tasks', tasks.filter(t => t.id !== id));

    // 删除相关告警和历史
    const alerts = readJSON('alerts');
    writeJSON('alerts', alerts.filter(a => a.task_id !== id));

    const history = readJSON('history');
    writeJSON('history', history.filter(h => h.task_id !== id));

    return true;
  }

  reportTaskResult(id, result) {
    return this.updateTask(id, {
      status: result.success ? 'normal' : 'error',
      last_response_time: result.responseTime,
      last_check_time: new Date().toISOString(),
    });
  }

  // 告警操作
  getAlerts(taskId, level, acknowledged) {
    let alerts = readJSON('alerts');
    if (taskId) {
      alerts = alerts.filter(a => a.task_id === taskId);
    }
    if (level && level !== 'all') {
      alerts = alerts.filter(a => a.level === level);
    }
    if (acknowledged !== undefined && acknowledged !== 'all') {
      const ack = acknowledged === 'true' || acknowledged === true;
      alerts = alerts.filter(a => a.acknowledged === ack);
    }
    return alerts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  createAlert(data) {
    const alerts = readJSON('alerts');
    const newAlert = {
      id: uuid(),
      task_id: data.task_id || null,
      task_name: data.task_name,
      level: data.level || 'warning',
      message: data.message || '',
      response_time: data.response_time || null,
      status_code: data.status_code || null,
      acknowledged: false,
      created_at: new Date().toISOString(),
    };
    alerts.unshift(newAlert); // 新告警放在前面

    // 只保留最近1000条告警
    if (alerts.length > 1000) {
      alerts = alerts.slice(0, 1000);
    }

    writeJSON('alerts', alerts);
    return newAlert;
  }

acknowledgeAlert(id) {
    const alerts = readJSON('alerts');
    const index = alerts.findIndex(a => a.id === id);
    if (index === -1) return null;

    alerts[index].acknowledged = true;
    writeJSON('alerts', alerts);
    return alerts[index];
  }

  // ============ 告警规则匹配引擎 ============

  /**
   * 评估告警规则
   * @param {Object} taskResult - 任务执行结果 { taskId, success, responseTime, statusCode }
   * @returns {Array} 匹配的告警规则及其级别
   */
  evaluateAlertRules(taskResult) {
    const config = this.getAlertConfig();
    if (!config.enabled || !config.rules || config.rules.length === 0) {
      return [];
    }

    const enabledRules = config.rules.filter(r => r.enabled);
    if (enabledRules.length === 0) {
      return [];
    }

    const matchedAlerts = [];

    for (const rule of enabledRules) {
      let isTriggered = false;

      switch (rule.condition) {
        case 'failure_count':
          // 获取该任务的连续失败次数
          const consecutiveFailures = this.getConsecutiveFailures(taskResult.taskId);
          // 如果当前执行失败，增加计数
          if (!taskResult.success) {
            this.incrementFailureCount(taskResult.taskId);
          } else {
            // 成功后重置计数
            this.resetFailureCount(taskResult.taskId);
          }
          // 检查是否超过阈值
          isTriggered = consecutiveFailures >= rule.threshold;
          break;

        case 'response_time':
          // 检查响应时间是否超过阈值
          if (taskResult.responseTime !== undefined && taskResult.responseTime !== null) {
            isTriggered = taskResult.responseTime > rule.threshold;
          }
          break;

        case 'availability':
          // 获取任务可用率
          const task = this.getTaskById(taskResult.taskId);
          if (task && task.availability !== undefined && task.availability !== null) {
            isTriggered = task.availability < rule.threshold;
          }
          break;

        case 'status_code':
          // 检查状态码是否匹配（用于HTTP监控）
          if (taskResult.statusCode !== undefined && taskResult.statusCode !== null) {
            isTriggered = taskResult.statusCode !== rule.threshold;
          }
          break;
      }

      if (isTriggered) {
        matchedAlerts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          condition: rule.condition,
          threshold: rule.threshold,
        });
      }
    }

    return matchedAlerts;
  }

  /**
   * 获取任务连续失败次数
   */
  getConsecutiveFailures(taskId) {
    const executionData = this.getTaskExecutionData(taskId);
    return executionData.consecutiveFailures || 0;
  }

  /**
   * 增加任务失败计数
   */
  incrementFailureCount(taskId) {
    const executions = this.readJSON('task_executions') || [];
    const index = executions.findIndex(e => e.task_id === taskId);

    if (index >= 0) {
      executions[index].consecutiveFailures = (executions[index].consecutiveFailures || 0) + 1;
      executions[index].lastFailureTime = new Date().toISOString();
    } else {
      executions.push({
        task_id: taskId,
        consecutiveFailures: 1,
        lastFailureTime: new Date().toISOString(),
        lastSuccessTime: null,
      });
    }

    this.writeJSON('task_executions', executions);
  }

  /**
   * 重置任务失败计数（成功后调用）
   */
  resetFailureCount(taskId) {
    const executions = this.readJSON('task_executions') || [];
    const index = executions.findIndex(e => e.task_id === taskId);

    if (index >= 0) {
      executions[index].consecutiveFailures = 0;
      executions[index].lastSuccessTime = new Date().toISOString();
    } else {
      executions.push({
        task_id: taskId,
        consecutiveFailures: 0,
        lastFailureTime: null,
        lastSuccessTime: new Date().toISOString(),
      });
    }

    this.writeJSON('task_executions', executions);
  }

  /**
   * 获取任务执行数据
   */
  getTaskExecutionData(taskId) {
    const executions = this.readJSON('task_executions') || [];
    return executions.find(e => e.task_id === taskId) || {
      consecutiveFailures: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
    };
  }

  /**
   * 处理任务结果并评估告警规则
   * @returns {Object} { alerts: [], matchedRules: [] }
   */
  processTaskResultWithRules(taskId, result) {
    const matchedRules = this.evaluateAlertRules({ taskId, ...result });
    const alerts = [];

    for (const rule of matchedRules) {
      const task = this.getTaskById(taskId);
      const alert = this.createAlert({
        task_id: taskId,
        task_name: task?.name || '未知任务',
        level: rule.level,
        message: this.buildAlertMessage(rule, result, task),
        response_time: result.responseTime,
        status_code: result.statusCode,
        rule_id: rule.ruleId,
        rule_name: rule.ruleName,
      });
      alerts.push(alert);
    }

    return { alerts, matchedRules };
  }

  /**
   * 构建告警消息
   */
  buildAlertMessage(rule, result, task) {
    const messages = {
      failure_count: `连续失败 ${rule.threshold} 次后触发告警`,
      response_time: `响应时间 ${result.responseTime}ms 超过阈值 ${rule.threshold}ms`,
      availability: `可用率 ${task?.availability || 0}% 低于阈值 ${rule.threshold}%`,
      status_code: `HTTP状态码 ${result.statusCode} 与预期不符`,
    };
    return messages[rule.condition] || `触发告警规则: ${rule.ruleName}`;
  }

  // ============ 钉钉告警配置 ============

  /**
   * 获取告警配置
   */
  getAlertConfig() {
    const configs = readJSON('alertConfigs');
    if (configs.length === 0) {
      // 返回默认配置
      return {
        id: 'default',
        type: 'dingtalk',
        webhookUrl: '',
        secret: '',
        enabled: false,
        rules: []
      };
    }
    return configs[0];
  }

  /**
   * 保存告警配置
   * 同时支持 webhookUrl (camelCase) 和 webhook_url (snake_case)
   */
  saveAlertConfig(data) {
    const configs = readJSON('alertConfigs');

    // 规范化字段名
    const normalized = {
      id: data.id || 'default',
      type: data.type || 'dingtalk',
      webhookUrl: data.webhookUrl || data.webhook_url || '',
      secret: data.secret || '',
      enabled: data.enabled || false,
      rules: data.rules || [],
      updated_at: new Date().toISOString()
    };

    // 保留现有ID
    if (configs.length > 0) {
      normalized.id = configs[0].id;
      normalized.created_at = configs[0].created_at;
    } else {
      normalized.created_at = new Date().toISOString();
    }

    writeJSON('alertConfigs', [normalized]);
    return normalized;
  }

  /**
   * 测试钉钉告警
   */
  async testDingtalkAlert(config) {
    const webhookUrl = config.webhookUrl || config.webhook_url;
    if (!webhookUrl) {
      throw new Error('请先配置钉钉Webhook地址');
    }

    const message = {
      msgtype: 'text',
      text: {
        content: `【NetWatch 告警测试】\n这是一条测试消息，收到此消息说明告警配置成功！\n时间: ${new Date().toLocaleString('zh-CN')}`
      }
    };

    // 如果配置了加签密钥
    if (config.secret) {
      const crypto = await import('crypto');
      const timestamp = Date.now();
      const sign = crypto.createHmac('sha256', config.secret)
        .update(`${timestamp}\n${config.secret}`)
        .digest('base64');

      const url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      const result = await response.json();
      if (result.errcode !== 0) {
        throw new Error(`钉钉返回错误: ${result.errmsg}`);
      }
      return { success: true, message: '测试消息发送成功' };
    } else {
      // 不需要加签
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      const result = await response.json();
      if (result.errcode !== 0) {
        throw new Error(`钉钉返回错误: ${result.errmsg}`);
      }
      return { success: true, message: '测试消息发送成功' };
    }
  }

  /**
   * 发送告警到钉钉
   */
  async sendDingtalkAlert(alert) {
    const config = this.getAlertConfig();
    if (!config.enabled || !config.webhookUrl) {
      return { skipped: true, reason: '告警未启用或未配置Webhook' };
    }

    const webhookUrl = config.webhookUrl;

    // 构建消息内容
    const levelEmoji = {
      critical: '🔴 严重',
      warning: '🟡 警告',
      info: '🔵 提示'
    };

    const message = {
      msgtype: 'markdown',
      markdown: {
        title: `【${levelEmoji[alert.level] || '📢'}】${alert.task_name}`,
        text: `## ${levelEmoji[alert.level] || '📢'} ${alert.task_name}\n\n` +
              `**告警级别**: ${alert.level === 'critical' ? '严重' : alert.level === 'warning' ? '警告' : '提示'}\n\n` +
              `**告警信息**: ${alert.message}\n\n` +
              `**响应时间**: ${alert.response_time ? alert.response_time + 'ms' : 'N/A'}\n\n` +
              `**时间**: ${new Date(alert.created_at).toLocaleString('zh-CN')}\n\n` +
              `---\n> 由 NetWatch 监控平台自动发送`
      }
    };

    try {
      if (config.secret) {
        // 需要加签
        const { createHmac } = await import('crypto');
        const timestamp = Date.now();
        const sign = createHmac('sha256', config.secret)
          .update(`${timestamp}\n${config.secret}`)
          .digest('base64');

        const url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });

        const result = await response.json();
        if (result.errcode !== 0) {
          throw new Error(result.errmsg);
        }
      } else {
        // 不需要加签
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });

        const result = await response.json();
        if (result.errcode !== 0) {
          throw new Error(result.errmsg);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // 历史记录操作
  addHistory(taskId, responseTime) {
    const history = readJSON('history');
    history.push({
      id: uuid(),
      task_id: taskId,
      response_time: responseTime,
      recorded_at: new Date().toISOString(),
    });

    // 只保留最近10000条历史记录
    if (history.length > 10000) {
      writeJSON('history', history.slice(-10000));
    } else {
      writeJSON('history', history);
    }
  }

  getHistory(taskId, limit = 100, startTime = null) {
    const history = readJSON('history');
    let filtered = history.filter(h => h.task_id === taskId);

    // 如果指定了开始时间，则过滤
    if (startTime) {
      filtered = filtered.filter(h => new Date(h.recorded_at) >= startTime);
    }

    return filtered.slice(-limit).sort((a, b) => new Date(a.recorded_at) - new Date(b.recorded_at));
  }

  // 统计
  getStats() {
    const nodes = readJSON('nodes');
    const tasks = readJSON('tasks');
    const alerts = readJSON('alerts');

    const onlineNodes = nodes.filter(n => n.status === 'online' && n.enabled).length;
    const unackAlerts = alerts.filter(a => !a.acknowledged).length;

    const activeTasks = tasks.filter(t => t.enabled && t.availability !== null);
    const avgAvail = activeTasks.length > 0
      ? Math.round(activeTasks.reduce((sum, t) => sum + (t.availability || 0), 0) / activeTasks.length)
      : 0;

    return {
      totalTasks: tasks.length,
      onlineNodes,
      totalNodes: nodes.length,
      currentAlerts: unackAlerts,
      avgAvailability: avgAvail,
    };
  }

  // 初始化示例数据
  seed() {
    if (this.getNodes().length > 0) {
      console.log('数据库已有数据，跳过初始化');
      return;
    }

    // 创建示例节点
    const node1 = this.createNode({
      name: '华东节点-01',
      ip: '10.0.1.101',
      region: 'east',
      description: '位于上海的数据中心节点',
      register_key: 'sk_a1b2c3d4e5f6g7h8',
    });

    const node2 = this.createNode({
      name: '华南节点-01',
      ip: '10.0.2.102',
      region: 'south',
      description: '位于深圳的数据中心节点',
      register_key: 'sk_i9j0k1l2m3n4o5p6',
    });

    const node3 = this.createNode({
      name: '华北节点-01',
      ip: '10.0.3.103',
      region: 'north',
      description: '位于北京的数据中心节点',
      register_key: 'sk_q7r8s9t0u1v2w3x4',
    });

    // 更新节点状态
    this.updateNode(node1.id, { status: 'online', cpu_usage: 23, memory_usage: 45, task_count: 4 });
    this.updateNode(node2.id, { status: 'online', cpu_usage: 35, memory_usage: 52, task_count: 3 });
    this.updateNode(node3.id, { status: 'offline', task_count: 2 });

    // 创建示例任务
    const tasks = [
      { name: '携程官网监控', type: 'http', target: 'http://www.tuniu.com', interval: 5, timeout: 10, status_code: 200, node_id: node1.id, status: 'normal', last_response_time: 245, availability: 99.8 },
      { name: 'GitHub官网监控', type: 'https', target: 'https://github.com', interval: 5, timeout: 10, status_code: 200, node_id: node3.id, status: 'error', last_response_time: 0, availability: 0 },
      { name: 'GitHub API监控', type: 'api', target: 'https://api.github.com', interval: 5, timeout: 15, status_code: 200, node_id: node1.id, status: 'slow', last_response_time: 1250, availability: 97.2, config: { method: 'GET' } },
      { name: '用户登录API监控', type: 'api', target: 'https://api.example.com/auth/login', interval: 3, timeout: 10, status_code: 200, node_id: node2.id, status: 'normal', last_response_time: 180, availability: 99.5, config: { method: 'POST' } },
      { name: '阿里云DNS监控', type: 'ping', target: '180.97.1.16', interval: 1, timeout: 5, node_id: node2.id, status: 'normal', last_response_time: 12, availability: 100 },
      { name: 'SSH服务监控', type: 'tcp', target: 'ssh.example.com', interval: 5, timeout: 5, node_id: node1.id, status: 'normal', last_response_time: 45, availability: 99.9, config: { port: 22 } },
      { name: 'SSL证书到期监控', type: 'ssl', target: 'https://github.com', interval: 1440, timeout: 30, node_id: node1.id, status: 'normal', last_response_time: 850, availability: 99.9, config: { sslExpiryWarning: 30 } },
    ];

    tasks.forEach(t => this.createTask(t));

    console.log('JSON数据库示例数据初始化完成');
  }
}

// 导出单例
const jsonDb = new JsonDatabase();
export default jsonDb;
