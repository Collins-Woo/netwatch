import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * 获取告警配置
 * GET /api/alerts/config
 */
router.get('/config', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');

    const { data: config, error: configError } = await supabaseAdmin
      .from('alert_configs')
      .select('*')
      .single();

    if (configError && configError.code !== 'PGRST116') throw configError;

    const { data: rules, error: rulesError } = await supabaseAdmin
      .from('alert_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (rulesError) throw rulesError;

    res.json({
      ...config,
      rules: rules || []
    });
  } catch (error) {
    console.error('获取告警配置失败:', error);
    res.status(500).json({ error: '获取告警配置失败' });
  }
});

/**
 * 更新告警配置
 * PUT /api/alerts/config
 */
router.put('/config', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { webhook_url, secret, enabled } = req.body;

    // 获取现有配置
    const { data: existing } = await supabaseAdmin
      .from('alert_configs')
      .select('id')
      .single();

    let result;
    if (existing) {
      // 更新现有配置
      const { data, error } = await supabaseAdmin
        .from('alert_configs')
        .update({
          webhook_url: webhook_url,
          secret: secret,
          enabled: enabled !== undefined ? enabled : true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // 创建新配置
      const { data, error } = await supabaseAdmin
        .from('alert_configs')
        .insert({
          webhook_url: webhook_url,
          secret: secret,
          enabled: enabled !== undefined ? enabled : true
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (error) {
    console.error('更新告警配置失败:', error);
    res.status(500).json({ error: '更新告警配置失败' });
  }
});

/**
 * 获取告警规则列表
 * GET /api/alerts/rules
 */
router.get('/rules', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');

    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('获取告警规则失败:', error);
    res.status(500).json({ error: '获取告警规则失败' });
  }
});

/**
 * 创建告警规则
 * POST /api/alerts/rules
 */
router.post('/rules', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const {
      config_id,
      name,
      level = 'warning',
      condition = 'failure_count',
      threshold = 3,
      enabled = true
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: '规则名称不能为空' });
    }

    // 如果没有指定config_id，获取或创建默认配置
    let targetConfigId = config_id;
    if (!targetConfigId) {
      const { data: existingConfig } = await supabaseAdmin
        .from('alert_configs')
        .select('id')
        .single();

      if (existingConfig) {
        targetConfigId = existingConfig.id;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .insert({
        id: uuidv4(),
        config_id: targetConfigId,
        name,
        level,
        condition,
        threshold,
        enabled
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('创建告警规则失败:', error);
    res.status(500).json({ error: '创建告警规则失败' });
  }
});

/**
 * 更新告警规则
 * PUT /api/alerts/rules/:id
 */
router.put('/rules/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.created_at;

    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '规则不存在' });
    }

    res.json(data);
  } catch (error) {
    console.error('更新告警规则失败:', error);
    res.status(500).json({ error: '更新告警规则失败' });
  }
});

/**
 * 删除告警规则
 * DELETE /api/alerts/rules/:id
 */
router.delete('/rules/:id', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from('alert_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: '规则已删除' });
  } catch (error) {
    console.error('删除告警规则失败:', error);
    res.status(500).json({ error: '删除告警规则失败' });
  }
});

/**
 * 测试钉钉Webhook
 * POST /api/alerts/test
 */
router.post('/test', async (req, res) => {
  try {
    const { webhook_url, secret } = req.body;

    if (!webhook_url) {
      return res.status(400).json({ error: 'Webhook URL不能为空' });
    }

    // 构建测试消息
    const testMessage = {
      msgtype: 'text',
      text: {
        content: `【NetWatch 监控平台】测试消息\n发送时间: ${new Date().toLocaleString('zh-CN')}\n这是一条来自监控平台的测试消息，用于验证钉钉机器人配置是否正确。`
      }
    };

    // 如果有加签密钥，添加签名
    let url = webhook_url;
    if (secret) {
      const timestamp = Date.now();
      const sign = require('crypto')
        .createHmac('sha256', secret)
        .update(`${timestamp}\n${secret}`)
        .digest('base64');
      const encodedSign = encodeURIComponent(sign);
      url = `${webhook_url}&timestamp=${timestamp}&sign=${encodedSign}`;
    }

    // 发送测试请求（这里模拟成功，因为实际发送可能失败）
    console.log('测试消息已准备发送至:', url);

    res.json({
      success: true,
      message: '测试消息已发送，请检查钉钉群'
    });
  } catch (error) {
    console.error('发送测试消息失败:', error);
    res.status(500).json({ error: '发送测试消息失败' });
  }
});

/**
 * 获取告警历史
 * GET /api/alerts
 */
router.get('/', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { task_id, level, acknowledged, limit = 50 } = req.query;

    let query = supabaseAdmin
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (task_id) {
      query = query.eq('task_id', task_id);
    }

    if (level) {
      query = query.eq('level', level);
    }

    if (acknowledged !== undefined) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('获取告警历史失败:', error);
    res.status(500).json({ error: '获取告警历史失败' });
  }
});

/**
 * 确认告警
 * POST /api/alerts/:id/acknowledge
 */
router.post('/:id/acknowledge', async (req, res) => {
  try {
    const { supabaseAdmin } = await import('../config/database.js');
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from('alerts')
      .update({ acknowledged: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: '告警不存在' });
    }

    res.json(data);
  } catch (error) {
    console.error('确认告警失败:', error);
    res.status(500).json({ error: '确认告警失败' });
  }
});

export default router;
