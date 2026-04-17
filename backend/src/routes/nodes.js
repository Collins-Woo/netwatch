import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * 生成随机注册密钥
 */
function generateRegisterKey() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sk_';
  for (let i = 0; i < 16; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Agent注册节点（Agent调用）
 * POST /api/nodes/register
 */
router.post('/register', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { register_key, ip, hostname } = req.body;

    if (!register_key) {
      return res.status(400).json({ error: '缺少注册密钥' });
    }

    // 通过注册密钥查找节点
    const { data: node, error: nodeError } = await supabaseAdmin
      .from('nodes')
      .select('*')
      .eq('register_key', register_key)
      .single();

    if (nodeError || !node) {
      return res.status(404).json({ error: '注册密钥无效或节点不存在' });
    }

    // 更新节点状态
    const { data: updatedNode, error: updateError } = await supabaseAdmin
      .from('nodes')
      .update({
        status: 'online',
        ip: ip || node.ip,
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', node.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 获取分配给该节点的任务
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, name, type, target, interval, timeout, status_code, config, alert_threshold')
      .eq('node_id', node.id)
      .eq('enabled', true);

    res.json({
      node_id: updatedNode.id,
      name: updatedNode.name,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('节点注册失败:', error);
    res.status(500).json({ error: '节点注册失败' });
  }
});

/**
 * 获取所有监控节点列表
 * GET /api/nodes
 */
router.get('/', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { search, region, status } = req.query;

    let query = supabaseAdmin
      .from('nodes')
      .select('*')
      .order('created_at', { ascending: false });

    // 搜索过滤
    if (search) {
      query = query.or(`name.ilike.%${search}%,ip.ilike.%${search}%`);
    }

    // 地区过滤
    if (region && region !== 'all') {
      query = query.eq('region', region);
    }

    // 状态过滤
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('获取节点列表失败:', error);
    res.status(500).json({ error: '获取节点列表失败' });
  }
});

/**
 * 获取单个节点详情
 * GET /api/nodes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    // 获取节点信息
    const { data: node, error: nodeError } = await supabaseAdmin
      .from('nodes')
      .select('*')
      .eq('id', id)
      .single();

    if (nodeError) throw nodeError;
    if (!node) {
      return res.status(404).json({ error: '节点不存在' });
    }

    // 获取该节点分配的任务
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('node_id', id);

    if (tasksError) throw tasksError;

    res.json({
      ...node,
      tasks: tasks || []
    });
  } catch (error) {
    console.error('获取节点详情失败:', error);
    res.status(500).json({ error: '获取节点详情失败' });
  }
});

/**
 * 创建新监控节点
 * POST /api/nodes
 */
router.post('/', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const {
      name,
      ip,
      region = 'east',
      description,
      enabled = true
    } = req.body;

    // 验证必填字段
    if (!name || !ip) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 生成唯一的注册密钥
    let registerKey = generateRegisterKey();
    let keyExists = true;

    // 确保注册密钥唯一
    while (keyExists) {
      const { data: existing } = await supabaseAdmin
        .from('nodes')
        .select('id')
        .eq('register_key', registerKey)
        .single();

      if (existing) {
        registerKey = generateRegisterKey();
      } else {
        keyExists = false;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('nodes')
      .insert({
        id: uuidv4(),
        name,
        ip,
        region,
        description,
        register_key: registerKey,
        enabled,
        status: 'offline',
        task_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('创建节点失败:', error);
    res.status(500).json({ error: '创建节点失败' });
  }
});

/**
 * 更新监控节点
 * PUT /api/nodes/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;
    const {
      name,
      ip,
      region,
      description,
      enabled
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (ip !== undefined) updates.ip = ip;
    if (region !== undefined) updates.region = region;
    if (description !== undefined) updates.description = description;
    if (enabled !== undefined) updates.enabled = enabled;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('nodes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '节点不存在' });
    }

    res.json(data);
  } catch (error) {
    console.error('更新节点失败:', error);
    res.status(500).json({ error: '更新节点失败' });
  }
});

/**
 * 删除监控节点
 * DELETE /api/nodes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('nodes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: '节点已删除' });
  } catch (error) {
    console.error('删除节点失败:', error);
    res.status(500).json({ error: '删除节点失败' });
  }
});

/**
 * 重新生成注册密钥
 * POST /api/nodes/:id/regenerate-key
 */
router.post('/:id/regenerate-key', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const newKey = generateRegisterKey();

    const { data, error } = await supabaseAdmin
      .from('nodes')
      .update({
        register_key: newKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '节点不存在' });
    }

    res.json({ register_key: data.register_key });
  } catch (error) {
    console.error('重新生成密钥失败:', error);
    res.status(500).json({ error: '重新生成密钥失败' });
  }
});

/**
 * 节点心跳（Agent调用）
 * POST /api/nodes/:id/heartbeat
 */
router.post('/:id/heartbeat', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;
    const { cpu_usage, memory_usage, task_count } = req.body;

    const { data, error } = await supabaseAdmin
      .from('nodes')
      .update({
        status: 'online',
        last_heartbeat: new Date().toISOString(),
        cpu_usage: cpu_usage || 0,
        memory_usage: memory_usage || 0,
        task_count: task_count || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '节点不存在' });
    }

    // 获取分配给该节点的任务
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, name, type, target, interval, timeout, status_code, alert_threshold')
      .eq('node_id', id)
      .eq('enabled', true);

    res.json({
      status: 'ok',
      tasks: tasks || []
    });
  } catch (error) {
    console.error('节点心跳失败:', error);
    res.status(500).json({ error: '节点心跳失败' });
  }
});

export default router;
