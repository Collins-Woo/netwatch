/**
 * NetWatch 轻量级后端服务器
 * 使用 JSON 文件存储，无需安装数据库
 */

import express from 'express';
import cors from 'cors';
import jsonDb from './config/database-json.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'json' });
});

// ============ 节点管理 ============

// 获取节点列表
app.get('/api/nodes', (req, res) => {
  try {
    const { search, region, status } = req.query;
    const nodes = jsonDb.getNodes(search, region, status);
    res.json(nodes);
  } catch (error) {
    console.error('获取节点列表失败:', error);
    res.status(500).json({ error: '获取节点列表失败' });
  }
});

// 获取单个节点
app.get('/api/nodes/:id', (req, res) => {
  try {
    const node = jsonDb.getNodeById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: '节点不存在' });
    }
    const tasks = jsonDb.getTasksByNodeId(node.id);
    res.json({ ...node, tasks });
  } catch (error) {
    res.status(500).json({ error: '获取节点详情失败' });
  }
});

// 创建节点
app.post('/api/nodes', (req, res) => {
  try {
    const { name, ip, region, description, enabled } = req.body;
    if (!name || !ip) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const node = jsonDb.createNode({ name, ip, region, description, enabled });
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ error: '创建节点失败' });
  }
});

// 更新节点
app.put('/api/nodes/:id', (req, res) => {
  try {
    const node = jsonDb.updateNode(req.params.id, req.body);
    if (!node) {
      return res.status(404).json({ error: '节点不存在' });
    }
    res.json(node);
  } catch (error) {
    res.status(500).json({ error: '更新节点失败' });
  }
});

// 删除节点
app.delete('/api/nodes/:id', (req, res) => {
  try {
    jsonDb.deleteNode(req.params.id);
    res.json({ success: true, message: '节点已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除节点失败' });
  }
});

// Agent 注册
app.post('/api/nodes/register', (req, res) => {
  try {
    const { register_key, ip, hostname } = req.body;
    if (!register_key) {
      return res.status(400).json({ error: '缺少注册密钥' });
    }

    const node = jsonDb.getNodeByRegisterKey(register_key);
    if (!node) {
      return res.status(404).json({ error: '注册密钥无效' });
    }

    const updatedNode = jsonDb.updateNode(node.id, {
      status: 'online',
      ip: ip || node.ip,
    });

    const tasks = jsonDb.getTasksByNodeId(node.id);
    res.json({ node_id: updatedNode.id, name: updatedNode.name, tasks });
  } catch (error) {
    res.status(500).json({ error: '节点注册失败' });
  }
});

// 节点心跳
app.post('/api/nodes/:id/heartbeat', (req, res) => {
  try {
    const { cpu_usage, memory_usage, task_count } = req.body;
    const node = jsonDb.updateNodeHeartbeat(req.params.id, { cpu_usage, memory_usage, task_count });

    if (!node) {
      return res.status(404).json({ error: '节点不存在' });
    }

    const tasks = jsonDb.getTasksByNodeId(node.id);
    res.json({ status: 'ok', tasks });
  } catch (error) {
    res.status(500).json({ error: '心跳处理失败' });
  }
});

// 重新生成密钥
app.post('/api/nodes/:id/regenerate-key', (req, res) => {
  try {
    const node = jsonDb.getNodeById(req.params.id);
    if (!node) {
      return res.status(404).json({ error: '节点不存在' });
    }
    const newKey = `sk_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 10)}`;
    jsonDb.updateNode(node.id, { register_key: newKey });
    res.json({ register_key: newKey });
  } catch (error) {
    res.status(500).json({ error: '重新生成密钥失败' });
  }
});

// ============ 任务管理 ============

// 获取任务列表
app.get('/api/tasks', (req, res) => {
  try {
    const { search, type, status, nodeId } = req.query;
    const tasks = jsonDb.getTasks(search, type, status, nodeId);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

// 获取单个任务
app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = jsonDb.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: '获取任务详情失败' });
  }
});

// 创建任务
app.post('/api/tasks', (req, res) => {
  try {
    const { name, type, target, interval, timeout, status_code, alert_threshold, node_id, enabled, config } = req.body;
    if (!name || !type || !target) {
      return res.status(400).json({ error: '缺少必填字段' });
    }
    const task = jsonDb.createTask({ name, type, target, interval, timeout, status_code, alert_threshold, node_id, enabled, config });
    res.status(201).json(task);
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

// 更新任务
app.put('/api/tasks/:id', (req, res) => {
  try {
    const task = jsonDb.updateTask(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: '更新任务失败' });
  }
});

// 删除任务
app.delete('/api/tasks/:id', (req, res) => {
  try {
    jsonDb.deleteTask(req.params.id);
    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    res.status(500).json({ error: '删除任务失败' });
  }
});

// Agent 上报结果
app.post('/api/tasks/:id/report', (req, res) => {
  try {
    const { success, responseTime, statusCode, error } = req.body;
    jsonDb.reportTaskResult(req.params.id, { success, responseTime, statusCode, error });

    // 如果失败，生成告警
    if (!success) {
      const task = jsonDb.getTaskById(req.params.id);
      if (task) {
        jsonDb.createAlert({
          task_id: task.id,
          task_name: task.name,
          level: 'critical',
          message: error || '监控检测失败',
          response_time: responseTime,
          status_code: statusCode,
        });
      }
    }

    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: '上报结果失败' });
  }
});

// ============ 告警管理 ============

// 获取告警列表
app.get('/api/alerts', (req, res) => {
  try {
    const { taskId, level, acknowledged } = req.query;
    const alerts = jsonDb.getAlerts(taskId, level, acknowledged);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: '获取告警列表失败' });
  }
});

// 确认告警
app.put('/api/alerts/:id/acknowledge', (req, res) => {
  try {
    const alert = jsonDb.acknowledgeAlert(req.params.id);
    if (!alert) {
      return res.status(404).json({ error: '告警不存在' });
    }
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: '确认告警失败' });
  }
});

// ============ 状态与历史 ============

// 状态概览
app.get('/api/status', (req, res) => {
  try {
    const tasks = jsonDb.getTasks(null, null, null, null);
    const stats = jsonDb.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取状态失败' });
  }
});

// 历史数据
app.get('/api/history', (req, res) => {
  try {
    const { taskId, limit } = req.query;
    if (!taskId) {
      return res.status(400).json({ error: '缺少taskId参数' });
    }
    const history = jsonDb.getHistory(taskId, parseInt(limit) || 100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: '获取历史数据失败' });
  }
});

// Dashboard 统计
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = jsonDb.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

// ============ 初始化与启动 ============

// 初始化数据库
jsonDb.seed();

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器错误' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║    NetWatch 轻量级后端服务器                   ║
║    端口: ${PORT}                                  ║
║    数据库: JSON 文件                            ║
║    数据目录: ${process.env.DATA_DIR || './data'}     ║
╚════════════════════════════════════════════════╝
  `);
});

export default app;
