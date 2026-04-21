/**
 * NetWatch 后端服务器 - WebSocket 支持版本
 * 支持实时任务状态推送和Agent节点通信
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import tasksRouter from './routes/tasks.js';
import nodesRouter from './routes/nodes.js';
import alertsRouter from './routes/alerts.js';
import statusRouter from './routes/status.js';
import historyRouter from './routes/history.js';
import usersRouter from './routes/users.js';
import { requestLogger } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/nodes', nodesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/status', statusRouter);
app.use('/api/history', historyRouter);

// User management & Auth routes
app.use('/api/auth', usersRouter);
app.use('/api/users', usersRouter);
app.use('/api/audit', usersRouter);

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('./config/database.js');

    const [tasksResult, nodesResult, alertsResult] = await Promise.all([
      supabaseAdmin.from('tasks').select('*', { count: 'exact' }),
      supabaseAdmin.from('nodes').select('*', { count: 'exact' }),
      supabaseAdmin.from('alerts').select('*').eq('acknowledged', false)
    ]);

    const onlineNodes = await supabaseAdmin
      .from('nodes')
      .select('*')
      .eq('status', 'online')
      .eq('enabled', true);

    const activeTasks = await supabaseAdmin
      .from('tasks')
      .select('availability')
      .eq('enabled', true)
      .not('availability', 'is', null);

    const avgAvailability = activeTasks.data.length > 0
      ? Math.round(activeTasks.data.reduce((sum, t) => sum + (t.availability || 0), 0) / activeTasks.data.length)
      : 0;

    res.json({
      totalTasks: tasksResult.count || 0,
      onlineNodes: onlineNodes.data?.length || 0,
      totalNodes: nodesResult.count || 0,
      currentAlerts: alertsResult.data?.length || 0,
      avgAvailability
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// ============ WebSocket Server ============

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// 连接管理
const agentConnections = new Map(); // registerKey -> WebSocket
const adminConnections = new Set(); // 管理后台连接

// 心跳检测
const heartbeats = new Map(); // registerKey -> lastHeartbeat

function broadcastToAdmins(message) {
  const data = JSON.stringify(message);
  adminConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendToAgent(registerKey, message) {
  const ws = agentConnections.get(registerKey);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

// 检查Agent心跳
function checkAgentHeartbeats() {
  const now = Date.now();
  const timeout = 60000; // 60秒超时

  heartbeats.forEach((lastHeartbeat, registerKey) => {
    if (now - lastHeartbeat > timeout) {
      console.log(`Agent ${registerKey} heartbeat timeout`);
      heartbeats.delete(registerKey);

      // 广播节点离线
      broadcastToAdmins({
        type: 'node_offline',
        registerKey
      });
    }
  });
}

// WebSocket连接处理
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection established');

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received:', message.type);

      switch (message.type) {
        // ============ Agent 注册 ============
        case 'agent_register': {
          const { registerKey, hostname, version } = message;

          // 验证registerKey
          const { supabaseAdmin } = await import('./config/database.js');
          const { data: node } = await supabaseAdmin
            .from('nodes')
            .select('*')
            .eq('register_key', registerKey)
            .single();

          if (!node) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid register key' }));
            return;
          }

          // 保存连接
          agentConnections.set(registerKey, ws);
          heartbeats.set(registerKey, Date.now());
          ws.nodeId = node.id;
          ws.registerKey = registerKey;

          // 更新节点状态
          await supabaseAdmin
            .from('nodes')
            .update({ status: 'online', last_heartbeat: new Date().toISOString() })
            .eq('id', node.id);

          // 发送注册成功和分配的任务
          const tasks = await supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('node_id', node.id)
            .eq('enabled', true);

          ws.send(JSON.stringify({
            type: 'register_success',
            nodeId: node.id,
            tasks: tasks.data
          }));

          // 广播节点上线
          broadcastToAdmins({
            type: 'node_online',
            node: {
              id: node.id,
              name: node.name,
              ip: message.ip || 'unknown'
            }
          });

          console.log(`Agent registered: ${registerKey}`);
          break;
        }

        // ============ Agent 心跳 ============
        case 'agent_heartbeat': {
          const { registerKey, cpuUsage, memoryUsage } = message;
          heartbeats.set(registerKey, Date.now());

          // 更新节点信息
          const { supabaseAdmin } = await import('./config/database.js');
          await supabaseAdmin
            .from('nodes')
            .update({
              status: 'online',
              last_heartbeat: new Date().toISOString(),
              cpu_usage: cpuUsage,
              memory_usage: memoryUsage
            })
            .eq('register_key', registerKey);

          ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
          break;
        }

        // ============ 任务执行结果上报 ============
        case 'task_result': {
          const { taskId, success, responseTime, statusCode, error, sslInfo } = message;

          const { supabaseAdmin } = await import('./config/database.js');

          // 更新任务状态
          const updateData = {
            status: success ? 'normal' : 'error',
            last_response_time: responseTime,
            last_check_time: new Date().toISOString()
          };

          if (success && responseTime) {
            updateData.availability = 100;
          } else if (!success) {
            updateData.availability = 0;
          }

          await supabaseAdmin
            .from('tasks')
            .update(updateData)
            .eq('id', taskId);

          // 记录历史
          await supabaseAdmin
            .from('response_time_history')
            .insert({
              id: crypto.randomUUID(),
              task_id: taskId,
              response_time: responseTime || 0
            });

          // 如果失败且配置了告警，发送告警
          if (!success) {
            const task = await supabaseAdmin
              .from('tasks')
              .select('*, nodes(name)')
              .eq('id', taskId)
              .single();

            if (task.data) {
              await supabaseAdmin
                .from('alerts')
                .insert({
                  id: crypto.randomUUID(),
                  task_id: taskId,
                  task_name: task.data.name,
                  level: 'warning',
                  message: `监控失败: ${error || 'Unknown error'}`,
                  response_time: responseTime,
                  status_code: statusCode
                });

              // 广播新告警
              broadcastToAdmins({
                type: 'new_alert',
                alert: {
                  taskId,
                  taskName: task.data.name,
                  level: 'warning',
                  message: error || 'Task failed'
                }
              });
            }
          }

          // 广播任务状态更新
          broadcastToAdmins({
            type: 'task_status_update',
            task: {
              id: taskId,
              status: success ? 'normal' : 'error',
              lastResponseTime: responseTime,
              lastCheckTime: new Date().toISOString()
            }
          });

          break;
        }

        // ============ Admin 连接 ============
        case 'admin_register': {
          adminConnections.add(ws);
          console.log('Admin connected. Total:', adminConnections.size);

          // 发送当前状态
          const { supabaseAdmin } = await import('./config/database.js');

          const [tasks, nodes, alerts] = await Promise.all([
            supabaseAdmin.from('tasks').select('*'),
            supabaseAdmin.from('nodes').select('*'),
            supabaseAdmin.from('alerts').select('*').order('created_at', { ascending: false }).limit(10)
          ]);

          ws.send(JSON.stringify({
            type: 'initial_state',
            tasks: tasks.data,
            nodes: nodes.data,
            recentAlerts: alerts.data
          }));

          break;
        }

        // ============ 手动触发任务 ============
        case 'trigger_task': {
          const { taskId } = message;
          const { registerKey } = ws;

          // 查找任务对应的节点
          const { supabaseAdmin } = await import('./config/database.js');
          const { data: task } = await supabaseAdmin
            .from('tasks')
            .select('*, nodes(register_key)')
            .eq('id', taskId)
            .single();

          if (!task || !task.nodes) {
            ws.send(JSON.stringify({ type: 'error', message: 'Task not found' }));
            return;
          }

          // 发送任务给Agent
          const sent = sendToAgent(task.nodes.register_key, {
            type: 'execute_task',
            task
          });

          if (!sent) {
            ws.send(JSON.stringify({ type: 'error', message: 'Agent not connected' }));
          } else {
            ws.send(JSON.stringify({ type: 'task_triggered', taskId }));
          }
          break;
        }

        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');

    // 如果是Agent断开，标记离线
    if (ws.registerKey) {
      agentConnections.delete(ws.registerKey);
      heartbeats.delete(ws.registerKey);

      // 更新节点状态
      import('./config/database.js').then(async ({ supabaseAdmin }) => {
        await supabaseAdmin
          .from('nodes')
          .update({ status: 'offline' })
          .eq('register_key', ws.registerKey);

        broadcastToAdmins({
          type: 'node_offline',
          registerKey: ws.registerKey
        });
      });
    }

    // 如果是Admin断开
    if (adminConnections.has(ws)) {
      adminConnections.delete(ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// 心跳检测定时器
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });

  // 检查Agent心跳
  checkAgentHeartbeats();
}, 30000); // 30秒

// 启动服务器
server.listen(PORT, () => {
  console.log(`NetWatch Backend API running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}/ws`);
});

export default app;
