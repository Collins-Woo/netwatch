import { useState } from 'react';
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
} from 'lucide-react';
import { mockAlertConfig, alertLevelMap } from '../data/mockData';
import { AlertConfig, AlertRule, AlertLevel } from '../types';

export default function AlertsPage() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(mockAlertConfig);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [webhookUrl, setWebhookUrl] = useState(mockAlertConfig.webhookUrl);
  const [secret, setSecret] = useState(mockAlertConfig.secret || '');

  // Toggle alert config enabled
  const toggleEnabled = () => {
    setAlertConfig((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  // Save webhook settings
  const saveWebhook = () => {
    setAlertConfig((prev) => ({
      ...prev,
      webhookUrl,
      secret,
    }));
    alert('Webhook配置已保存');
  };

  // Test webhook
  const testWebhook = () => {
    alert('测试消息已发送，请检查钉钉群');
  };

  // Delete rule
  const deleteRule = (ruleId: string) => {
    if (confirm('确定要删除这条告警规则吗？')) {
      setAlertConfig((prev) => ({
        ...prev,
        rules: prev.rules.filter((r) => r.id !== ruleId),
      }));
    }
  };

  // Open rule modal
  const openRuleModal = (rule?: AlertRule) => {
    setEditingRule(rule || null);
    setShowRuleModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">告警配置</h1>
        <p className="text-gray-500 mt-1">配置钉钉机器人告警渠道和告警规则</p>
      </div>

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
              className={`p-2 rounded-lg transition-colors ${
                alertConfig.enabled
                  ? 'text-green-600 bg-green-50 hover:bg-green-100'
                  : 'text-gray-400 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {alertConfig.enabled ? (
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
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
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
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
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
              className="px-4 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              保存配置
            </button>
            <button
              onClick={testWebhook}
              className="px-4 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
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
            <p className="text-sm text-gray-500">配置触发告警的条件和级别</p>
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
          onSave={(ruleData) => {
            if (editingRule) {
              // Edit mode
              setAlertConfig((prev) => ({
                ...prev,
                rules: prev.rules.map((r) =>
                  r.id === editingRule.id ? { ...r, ...ruleData } : r
                ),
              }));
            } else {
              // Create mode
              const newRule: AlertRule = {
                ...ruleData,
                id: `rule-${Date.now()}`,
              };
              setAlertConfig((prev) => ({
                ...prev,
                rules: [...prev.rules, newRule],
              }));
            }
            setShowRuleModal(false);
            setEditingRule(null);
          }}
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
  };
  return labels[condition] || condition;
}

// Get threshold label
function getThresholdLabel(condition: string, threshold: number): string {
  switch (condition) {
    case 'failure_count':
      return `${threshold} 次`;
    case 'response_time':
      return `> ${threshold}ms`;
    case 'availability':
      return `< ${threshold}%`;
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
                  value={formData.threshold || 3}
                  onChange={(e) => setFormData({ ...formData, threshold: Number(e.target.value) })}
                  min={1}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                />
                <span className="text-sm text-gray-500">
                  {formData.condition === 'failure_count'
                    ? '次'
                    : formData.condition === 'response_time'
                    ? 'ms'
                    : '%'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.condition === 'failure_count'
                  ? '连续失败达到此次数时触发告警'
                  : formData.condition === 'response_time'
                  ? '响应时间超过此值时触发告警'
                  : '可用率低于此值时触发告警'}
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
