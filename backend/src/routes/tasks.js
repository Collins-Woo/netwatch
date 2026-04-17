import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * 获取所有监控任务列表
 * GET /api/tasks
 */
router.get('/', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { search, type, status, enabled } = req.query;

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    // 搜索过滤
    if (search) {
      query = query.or(`name.ilike.%${search}%,target.ilike.%${search}%`);
    }

    // 类型过滤
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // 状态过滤
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 启用状态过滤
    if (enabled !== undefined) {
      query = query.eq('enabled', enabled === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({ error: '获取任务列表失败' });
  }
});

/**
 * 获取单个任务详情
 * GET /api/tasks/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json(data);
  } catch (error) {
    console.error('获取任务详情失败:', error);
    res.status(500).json({ error: '获取任务详情失败' });
  }
});

/**
 * 创建新监控任务
 * POST /api/tasks
 */
router.post('/', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const {
      name,
      type,
      target,
      interval = 5,
      timeout = 10,
      status_code: statusCode,
      alert_threshold: alertThreshold = 3,
      node_id: nodeId,
      enabled = true
    } = req.body;

    // 验证必填字段
    if (!name || !type || !target) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        id: uuidv4(),
        name,
        type,
        target,
        interval,
        timeout,
        status_code: statusCode,
        alert_threshold: alertThreshold,
        node_id: nodeId,
        enabled,
        status: enabled ? 'normal' : 'disabled'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({ error: '创建任务失败' });
  }
});

/**
 * 更新监控任务
 * PUT /api/tasks/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;
    const updates = req.body;

    // 移除不允许更新的字段
    delete updates.id;
    delete updates.created_at;

    // 更新时间戳
    updates.updated_at = new Date().toISOString();

    // 如果enabled状态改变，同时更新status
    if ('enabled' in updates) {
      updates.status = updates.enabled ? 'normal' : 'disabled';
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '任务不存在' });
    }

    res.json(data);
  } catch (error) {
    console.error('更新任务失败:', error);
    res.status(500).json({ error: '更新任务失败' });
  }
});

/**
 * 删除监控任务
 * DELETE /api/tasks/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: '任务已删除' });
  } catch (error) {
    console.error('删除任务失败:', error);
    res.status(500).json({ error: '删除任务失败' });
  }
});

/**
 * 批量删除任务
 * POST /api/tasks/batch-delete
 */
router.post('/batch-delete', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供要删除的任务ID列表' });
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .in('id', ids);

    if (error) throw error;
    res.json({ success: true, message: `已删除 ${ids.length} 个任务` });
  } catch (error) {
    console.error('批量删除任务失败:', error);
    res.status(500).json({ error: '批量删除任务失败' });
  }
});

/**
 * 切换任务启用状态
 * POST /api/tasks/:id/toggle
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    // 先获取当前状态
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('enabled')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!current) {
      return res.status(404).json({ error: '任务不存在' });
    }

    const newEnabled = !current.enabled;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({
        enabled: newEnabled,
        status: newEnabled ? 'normal' : 'disabled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('切换任务状态失败:', error);
    res.status(500).json({ error: '切换任务状态失败' });
  }
});

export default router;
