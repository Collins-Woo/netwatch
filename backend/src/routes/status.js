import express from 'express';

const router = express.Router();

/**
 * 获取所有任务的实时状态
 * GET /api/status
 */
router.get('/', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { status, type, search } = req.query;

    let query = supabaseAdmin
      .from('tasks')
      .select('*')
      .order('last_check_time', { ascending: false, nullsFirst: false });

    // 状态过滤
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // 类型过滤
    if (type && type !== 'all') {
      query = query.eq('type', type);
    }

    // 搜索
    if (search) {
      query = query.or(`name.ilike.%${search}%,target.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('获取监控状态失败:', error);
    res.status(500).json({ error: '获取监控状态失败' });
  }
});

/**
 * 获取状态统计
 * GET /api/status/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');

    const { data: allTasks } = await supabaseAdmin
      .from('tasks')
      .select('status');

    const stats = {
      normal: 0,
      slow: 0,
      error: 0,
      disabled: 0,
      total: allTasks?.length || 0
    };

    if (allTasks) {
      allTasks.forEach(task => {
        if (stats.hasOwnProperty(task.status)) {
          stats[task.status]++;
        }
      });
    }

    res.json(stats);
  } catch (error) {
    console.error('获取状态统计失败:', error);
    res.status(500).json({ error: '获取状态统计失败' });
  }
});

/**
 * 获取单个任务的详细状态
 * GET /api/status/:taskId
 */
router.get('/:taskId', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { taskId } = req.params;

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;
    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 获取关联的节点信息
    let node = null;
    if (task.node_id) {
      const { data: nodeData } = await supabaseAdmin
        .from('nodes')
        .select('name, ip, status')
        .eq('id', task.node_id)
        .single();

      node = nodeData;
    }

    // 获取最近24小时的响应时间历史
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: history } = await supabaseAdmin
      .from('response_time_history')
      .select('response_time, recorded_at')
      .eq('task_id', taskId)
      .gte('recorded_at', oneDayAgo)
      .order('recorded_at', { ascending: true });

    res.json({
      task,
      node,
      history: history || []
    });
  } catch (error) {
    console.error('获取任务状态详情失败:', error);
    res.status(500).json({ error: '获取任务状态详情失败' });
  }
});

export default router;
