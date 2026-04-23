import { useState, useEffect } from 'react';
import {
  Bell,
  Webhook,
  Key,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
  Send,
  Power,
  PowerOff,
  AlertTriangle,
  Info,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { alertsApi } from '../services/api';
import { AlertConfig, AlertRule, AlertLevel } from '../types';

export default function AlertsPage() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    id: 'default',
    type: 'dingtalk',
    webhookUrl: '',
    secret: '',
    enabled: false,
    rules: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // 加载告警配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const config = await alertsApi.getConfig();
      setAlertConfig(config);
    } catch (error) {
      console.error('加载告警配置失败:', error);
      showMessage('error', '加载告警配置失败');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Toggle alert config enabled
  const toggleEnabled = async () => {
    try {
      setSaving(true);
      const newEnabled = !alertConfig.enabled;
      await alertsApi.saveConfig({ ...alertConfig, enabled: newEnabled });
      setAlertConfig((prev) => ({ ...prev, enabled: newEnabled }));
      showMessage('success', newEnabled ? '告警已启用' : '告警已禁用');
    } catch (error) {
      console.error('切换告警状态失败:', error);
      showMessage('error', '切换告警状态失败');
    } finally {
      setSaving(false);
    }
  };

  // Save webhook settings
  const saveWebhook = async () => {
    try {
      setSaving(true);
      await alertsApi.saveConfig(alertConfig);
      showMessage('success', 'Webhook配置已保存');
    } catch (error) {
      console.error('保存Webhook配置失败:', error);
      showMessage('error', '保存Webhook配置失败');
    } finally {
      setSaving(false);
    }
  };

  // Test webhook
  const testWebhook = async () => {
    try {
      setTesting(true);
      const result = await alertsApi.testDingtalk(alertConfig);
      if (result.success) {
        showMessage('success', '测试消息发送成功，请检查钉钉群');
      } else {
        showMessage('error', result.error || '测试消息发送失败');
      }
    } catch (error: any) {
      console.error('测试钉钉告警失败:', error);
      showMessage('error', error.message || '测试消息发送失败');
    } finally {
      setTesting(false);
    }
  };

  // Delete rule
  const deleteRule = async (ruleId: string) => {
    if (!confirm('确定要删除这条告警规则吗？')) return;

    try {
      const newRules = alertConfig.rules.filter((r) => r.id !== ruleId);
      await alertsApi.saveConfig({ ...alertConfig, rules: newRules });
      setAlertConfig((prev) => ({ ...prev, rules: newRules }));
      showMessage('success', '规则已删除');
    } catch (error) {
      console.error('删除规则失败:', error);
      showMessage('error', '删除规则失败');
    }
  };

  // Open rule modal
  const openRuleModal = (rule?: AlertRule) => {
    setEditingRule(rule || null);
    setShowRuleModal(true);
  };

  // Save rule
  const saveRule = async (ruleData: Partial<AlertRule>) => {
    try {
      let newRules: AlertRule[];

      if (editingRule) {
        // Edit mode
        newRules = alertConfig.rules.map((r) =>
          r.id === editingRule.id ? { ...r, ...ruleData } as AlertRule : r
        );
      } else {
        // Create mode
        const newRule: AlertRule = {
          ...ruleData,
          id: `rule-${Date.now()}`,
          enabled: true,
        } as AlertRule;
        newRules = [...alertConfig.rules, newRule];
      }

      await alertsApi.saveConfig({ ...alertConfig, rules: newRules });
      setAlertConfig((prev) => ({ ...prev, rules: newRules }));
      setShowRuleModal(false);
      setEditingRule(null);
      showMessage('success', editingRule ? '规则已更新' : '规则已创建');
    } catch (error) {
      console.error('保存规则失败:', error);
      showMessage('error', '保存规则失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#2B5D3A] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">告警配置</h1>
        <p className="text-gray-500 mt-1">配置钉钉机器人告警渠道和告警规则</p>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white flex items-center gap-2`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* DingTalk Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">钉钉机器人</h2>
              <p className="text-sm text-gray-500">配置钉钉群机器人Webhook</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              {alertConfig.enabled ? '已启用' : '已禁用'}
            </span>
            <button
              onClick={toggleEnabled}
              disabled={saving}
              className={`p-2 rounded-lg transition-colors ${
                alertConfig.enabled
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : alertConfig.enabled ? (
                <Power className="w-5 h-5" />
              ) : (
                <PowerOff className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhook URL <span className="text-red-500">*</span>
              </span>
            </label>
            <input
              type="text"
              value={alertConfig.webhookUrl}
              onChange={(e) => setAlertConfig((prev) => ({ ...prev, webhookUrl: e.target.value }))}
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxxxxx"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
            />
          </div>

          {/* Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                加签密钥 (可选)
              </span>
            </label>
            <input
              type="text"
              value={alertConfig.secret || ''}
              onChange={(e) => setAlertConfig((prev) => ({ ...prev, secret: e.target.value }))}
              placeholder="SECxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A] font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              如果钉钉机器人启用了加签功能，请填写密钥
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={saveWebhook}
              disabled={saving}
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              保存配置
            </button>
            <button
              onClick={testWebhook}
              disabled={testing || !alertConfig.webhookUrl}
              className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发送测试消息
            </button>
          </div>
        </div>
      </div>

      {/* Alert Rules */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">告警规则</h2>
            <p className="text-sm text-gray-500">配置触发告警的条件和级别，规则将自动与监控任务匹配</p>
          </div>
          <button
            onClick={() => openRuleModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建规则
          </button>
        </div>

        {/* Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  规则名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  告警级别
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  触发条件
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  阈值
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alertConfig.rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{rule.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <LevelBadge level={rule.level} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {getConditionLabel(rule.condition)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {getThresholdLabel(rule.condition, rule.threshold)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {rule.enabled ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        禁用
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openRuleModal(rule)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {alertConfig.rules.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无告警规则</p>
            <p className="text-sm mt-1">点击"新建规则"添加告警规则</p>
          </div>
        )}

        {/* Rule Matching Explanation */}
        {alertConfig.rules.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">告警规则匹配说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>连续失败次数</strong>：监控任务连续失败达到阈值时触发</li>
              <li>• <strong>响应时间</strong>：任何任务响应时间超过阈值时触发</li>
              <li>• <strong>可用率</strong>：任务可用率低于阈值时触发</li>
              <li>• <strong>状态码</strong>：HTTP任务返回非预期状态码时触发</li>
            </ul>
          </div>
        )}
      </div>

      {/* Rule Modal */}
      {showRuleModal && (
        <RuleModal
          rule={editingRule}
          onClose={() => {
            setShowRuleModal(false);
            setEditingRule(null);
          }}
          onSave={saveRule}
        />
      )}
    </div>
  );
}

// Level Badge Component
function LevelBadge({ level }: { level: AlertLevel }) {
  const config = {
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: AlertTriangle,
      label: '严重',
    },
    warning: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      icon: AlertCircle,
      label: '警告',
    },
    info: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      icon: Info,
      label: '提示',
    },
  };

  const { bg, text, icon: Icon, label } = config[level];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// Get condition label
function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    failure_count: '连续失败次数',
    response_time: '响应时间',
    availability: '可用率',
    status_code: '状态码',
  };
  return labels[condition] || condition;
}

// Get threshold label
function getThresholdLabel(condition: string, threshold: number): string {
  switch (condition) {
    case 'failure_count':
      return `>= ${threshold} 次`;
    case 'response_time':
      return `> ${threshold}ms`;
    case 'availability':
      return `< ${threshold}%`;
    case 'status_code':
      return `!= ${threshold}`;
    default:
      return String(threshold);
  }
}

// Rule Modal Component
interface RuleModalProps {
  rule: AlertRule | null;
  onClose: () => void;
  onSave: (rule: Partial<AlertRule>) => void;
}

function RuleModal({ rule, onClose, onSave }: RuleModalProps) {
  const [formData, setFormData] = useState<Partial<AlertRule>>(
    rule || {
      name: '',
      level: 'warning',
      condition: 'failure_count',
      threshold: 3,
      enabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.condition || formData.threshold === undefined) {
      alert('请填写完整信息');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {rule ? '编辑告警规则' : '新建告警规则'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="space-y-4">
            {/* Rule Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                规则名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：响应超时告警"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                required
              />
            </div>

            {/* Alert Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                告警级别 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['critical', 'warning', 'info'] as AlertLevel[]).map((level) => (
                  <label
                    key={level}
                    className={`flex flex-col items-center gap-1 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.level === level
                        ? 'border-[#2B5D3A] bg-[#2B5D3A]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={level}
                      checked={formData.level === level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as AlertLevel })}
                      className="sr-only"
                    />
                    <LevelBadge level={level} />
                  </label>
                ))}
              </div>
            </div>

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                触发条件 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.condition || 'failure_count'}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value as AlertRule['condition'] })
                }
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
              >
                <option value="failure_count">连续失败次数</option>
                <option value="response_time">响应时间超过</option>
                <option value="availability">可用率低于</option>
                <option value="status_code">状态码不匹配</option>
              </select>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                阈值 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.threshold ?? 3}
                  onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
                  min={1}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                />
                <span className="text-sm text-gray-500">
                  {formData.condition === 'failure_count'
                    ? '次'
                    : formData.condition === 'response_time'
                    ? 'ms'
                    : formData.condition === 'availability'
                    ? '%'
                    : ''}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.condition === 'failure_count'
                  ? '连续失败达到此次数时触发告警'
                  : formData.condition === 'response_time'
                  ? '响应时间超过此值时触发告警'
                  : formData.condition === 'availability'
                  ? '可用率低于此值时触发告警'
                  : 'HTTP状态码不等于此值时触发告警'}
              </p>
            </div>

            {/* Enable Status */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.enabled ?? true}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="w-5 h-5 rounded border-gray-300 text-[#2B5D3A] focus:ring-[#2B5D3A]"
                />
                <span className="text-sm text-gray-700">启用此规则</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {rule ? '保存修改' : '创建规则'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
