import express from 'express';

const router = express.Router();

/**
 * 获取响应时间历史数据
 * GET /api/history/response-time
 */
router.get('/response-time', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { task_id, start_date, end_date, interval = 'hour' } = req.query;

    // 默认查询最近24小时
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date
      ? new Date(start_date)
      : new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('response_time_history')
      .select('*')
      .gte('recorded_at', startDate.toISOString())
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (task_id && task_id !== 'all') {
      query = query.eq('task_id', task_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 按指定间隔聚合数据
    const aggregatedData = aggregateByInterval(data || [], interval);

    res.json(aggregatedData);
  } catch (error) {
    console.error('获取响应时间历史失败:', error);
    res.status(500).json({ error: '获取响应时间历史失败' });
  }
});

/**
 * 聚合数据辅助函数
 */
function aggregateByInterval(data, interval) {
  if (!data || data.length === 0) return [];

  const groups = {};

  data.forEach(item => {
    const date = new Date(item.recorded_at);
    let key;

    switch (interval) {
      case '5min':
        date.setMinutes(Math.floor(date.getMinutes() / 5) * 5, 0, 0);
        key = date.toISOString();
        break;
      case 'hour':
        date.setMinutes(0, 0, 0);
        key = date.toISOString();
        break;
      case 'day':
        date.setHours(0, 0, 0, 0);
        key = date.toISOString();
        break;
      default:
        key = item.recorded_at;
    }

    if (!groups[key]) {
      groups[key] = {
        time: new Date(key).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        values: []
      };
    }
    groups[key].values.push(item.response_time);
  });

  // 计算平均值
  return Object.values(groups).map(group => ({
    time: group.time,
    value: Math.round(
      group.values.reduce((sum, v) => sum + v, 0) / group.values.length
    )
  }));
}

/**
 * 获取可用率统计
 * GET /api/history/availability
 */
router.get('/availability', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { task_id, period = '7d' } = req.query;

    let daysBack = 7;
    switch (period) {
      case '24h': daysBack = 1; break;
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let query = supabaseAdmin
      .from('tasks')
      .select('id, name, availability')
      .gte('created_at', startDate.toISOString())
      .not('availability', 'is', null);

    if (task_id && task_id !== 'all') {
      query = query.eq('id', task_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 计算总体可用率
    const avgAvailability = data.length > 0
      ? Math.round(data.reduce((sum, t) => sum + (t.availability || 0), 0) / data.length * 100) / 100
      : 0;

    res.json({
      period,
      tasks: data || [],
      average: avgAvailability
    });
  } catch (error) {
    console.error('获取可用率统计失败:', error);
    res.status(500).json({ error: '获取可用率统计失败' });
  }
});

/**
 * 获取告警统计
 * GET /api/history/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { task_id, start_date, end_date, period = '7d' } = req.query;

    // 默认查询最近7天
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date
      ? new Date(start_date)
      : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('alerts')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (task_id && task_id !== 'all') {
      query = query.eq('task_id', task_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    // 统计各级别告警数量
    const stats = {
      critical: 0,
      warning: 0,
      info: 0,
      total: data?.length || 0,
      unacknowledged: 0
    };

    if (data) {
      data.forEach(alert => {
        if (stats.hasOwnProperty(alert.level)) {
          stats[alert.level]++;
        }
        if (!alert.acknowledged) {
          stats.unacknowledged++;
        }
      });
    }

    res.json({
      stats,
      alerts: data || []
    });
  } catch (error) {
    console.error('获取告警统计失败:', error);
    res.status(500).json({ error: '获取告警统计失败' });
  }
});

/**
 * 获取检测统计
 * GET /api/history/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { period = '24h' } = req.query;

    let hoursBack = 24;
    switch (period) {
      case '24h': hoursBack = 24; break;
      case '7d': hoursBack = 24 * 7; break;
      case '30d': hoursBack = 24 * 30; break;
    }

    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hoursBack);

    const { data, error } = await supabaseAdmin
      .from('response_time_history')
      .select('response_time')
      .gte('recorded_at', startDate.toISOString());

    if (error) throw error;

    const values = (data || []).map(d => d.response_time);
    const stats = {
      totalChecks: values.length,
      avgResponseTime: values.length > 0
        ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
        : 0,
      maxResponseTime: values.length > 0 ? Math.max(...values) : 0,
      minResponseTime: values.length > 0 ? Math.min(...values) : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('获取检测统计失败:', error);
    res.status(500).json({ error: '获取检测统计失败' });
  }
});

export default router;
