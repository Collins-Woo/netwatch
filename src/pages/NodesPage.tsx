import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Copy,
  X,
  Check,
  Server,
  Cpu,
  HardDrive,
  Activity,
  Key,
} from 'lucide-react';
import {
  mockAgents,
  mockTasks,
  regionMap,
} from '../data/mockData';
import { Agent, NodeRegion, NodeStatus } from '../types';

export default function NodesPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.ip.includes(searchQuery);
    const matchesRegion = regionFilter === 'all' || agent.region === regionFilter;
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesRegion && matchesStatus;
  });

  // Toggle agent enabled status
  const toggleAgent = (agentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? {
              ...a,
              enabled: !a.enabled,
            }
          : a
      )
    );
  };

  // Delete agent
  const deleteAgent = (agentId: string) => {
    if (confirm('确定要删除这个监控节点吗？')) {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
    }
  };

  // Open new/edit modal
  const openModal = (agent?: Agent) => {
    setEditingAgent(agent || null);
    setShowModal(true);
  };

  // Open detail modal
  const openDetailModal = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowDetailModal(true);
  };

  // Copy register key
  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    alert('注册密钥已复制到剪贴板');
  };

  // Get agent tasks
  const getAgentTasks = (agentId: string) => {
    return mockTasks.filter((t) => t.nodeId === agentId);
  };

  // Generate random register key
  const generateKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_';
    for (let i = 0; i < 16; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">监控节点</h1>
          <p className="text-gray-500 mt-1">管理所有监控Agent节点</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建节点
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索节点名称或IP地址..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
            />
          </div>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
          >
            <option value="all">全部地区</option>
            <option value="east">华东</option>
            <option value="south">华南</option>
            <option value="north">华北</option>
            <option value="overseas">海外</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
          >
            <option value="all">全部状态</option>
            <option value="online">在线</option>
            <option value="offline">离线</option>
          </select>
        </div>
      </div>

      {/* Node Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  agent.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Server className={`w-5 h-5 ${agent.status === 'online' ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                  <p className="text-sm text-gray-500">{regionMap[agent.region]}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                agent.status === 'online'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {agent.status === 'online' ? '在线' : '离线'}
              </span>
            </div>

            {/* Info */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">IP地址</span>
                <span className="font-mono text-gray-900">{agent.ip}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">监控任务</span>
                <span className="text-gray-900">{agent.taskCount} 个</span>
              </div>
              {agent.status === 'online' && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      <Cpu className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">CPU</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${agent.cpuUsage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{agent.cpuUsage}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 flex-1">
                      <HardDrive className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">内存</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all"
                          style={{ width: `${agent.memoryUsage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-700">{agent.memoryUsage}%</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Last Heartbeat */}
            {agent.lastHeartbeat && (
              <div className="text-xs text-gray-400 mb-4">
                最后心跳: {new Date(agent.lastHeartbeat).toLocaleString('zh-CN')}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
              <button
                onClick={() => openDetailModal(agent)}
                className="flex-1 px-3 py-2 text-sm text-[#2B5D3A] hover:bg-[#2B5D3A]/5 rounded-lg transition-colors"
              >
                查看详情
              </button>
              <button
                onClick={() => openModal(agent)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="编辑"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => toggleAgent(agent.id)}
                className={`p-2 rounded-lg transition-colors ${
                  agent.enabled
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={agent.enabled ? '禁用' : '启用'}
              >
                {agent.enabled ? (
                  <Power className="w-4 h-4" />
                ) : (
                  <PowerOff className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => deleteAgent(agent.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>未找到匹配的节点</p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <AgentModal
          agent={editingAgent}
          onClose={() => {
            setShowModal(false);
            setEditingAgent(null);
          }}
          onSave={(agentData) => {
            if (editingAgent) {
              // Edit mode
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === editingAgent.id ? { ...a, ...agentData } : a
                )
              );
            } else {
              // Create mode
              const newAgent: Agent = {
                ...agentData,
                id: `agent-${Date.now()}`,
                status: 'offline',
                taskCount: 0,
                createdAt: new Date().toISOString(),
              };
              setAgents((prev) => [...prev, newAgent]);
            }
            setShowModal(false);
            setEditingAgent(null);
          }}
          generateKey={generateKey}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          tasks={getAgentTasks(selectedAgent.id)}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
}

// Agent Modal Component
interface AgentModalProps {
  agent: Agent | null;
  onClose: () => void;
  onSave: (agent: Partial<Agent>) => void;
  generateKey: () => string;
}

function AgentModal({ agent, onClose, onSave, generateKey }: AgentModalProps) {
  const [formData, setFormData] = useState<Partial<Agent>>(
    agent || {
      name: '',
      ip: '',
      region: 'east',
      description: '',
      registerKey: generateKey(),
      enabled: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {agent ? '编辑监控节点' : '新建监控节点'}
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
            {/* Node Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                节点名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：华东节点-01"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                required
              />
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IP地址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ip || ''}
                onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                placeholder="例如：10.0.1.101"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                required
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                所属地区 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.region || 'east'}
                onChange={(e) => setFormData({ ...formData, region: e.target.value as NodeRegion })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
              >
                <option value="east">华东</option>
                <option value="south">华南</option>
                <option value="north">华北</option>
                <option value="overseas">海外</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                节点描述
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：位于上海的数据中心节点"
                rows={3}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A] resize-none"
              />
            </div>

            {/* Register Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                注册密钥
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.registerKey || ''}
                  onChange={(e) => setFormData({ ...formData, registerKey: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A] font-mono text-sm"
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, registerKey: generateKey() })}
                  className="px-4 py-2 text-sm text-[#2B5D3A] border border-[#2B5D3A] rounded-lg hover:bg-[#2B5D3A]/5 transition-colors"
                >
                  重新生成
                </button>
                <button
                  type="button"
                  onClick={() => formData.registerKey && copyKey(formData.registerKey)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Agent注册时需要使用此密钥，请妥善保管
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
                <span className="text-sm text-gray-700">启用节点</span>
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
              {agent ? '保存修改' : '创建节点'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Agent Detail Modal
interface AgentDetailModalProps {
  agent: Agent;
  tasks: typeof mockTasks;
  onClose: () => void;
}

function AgentDetailModal({ agent, tasks, onClose }: AgentDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              agent.status === 'online' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Server className={`w-5 h-5 ${agent.status === 'online' ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{agent.name}</h2>
              <p className="text-sm text-gray-500">{regionMap[agent.region]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">IP地址</p>
                <p className="font-mono text-gray-900">{agent.ip}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">状态</p>
                <p className={`font-medium ${agent.status === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
                  {agent.status === 'online' ? '在线' : '离线'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500 mb-1">描述</p>
                <p className="text-gray-900">{agent.description || '暂无描述'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Key className="w-3 h-3" /> 注册密钥
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-gray-900">{agent.registerKey}</p>
                  <button
                    onClick={() => copyKey(agent.registerKey)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Performance */}
          {agent.status === 'online' && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-3">性能指标</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> CPU使用率
                    </span>
                    <span className="text-sm font-medium text-gray-900">{agent.cpuUsage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${agent.cpuUsage}%` }}
                    />
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> 内存使用率
                    </span>
                    <span className="text-sm font-medium text-gray-900">{agent.memoryUsage}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${agent.memoryUsage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tasks */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              分配的监控任务 ({tasks.length})
            </h3>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>暂无分配的任务</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{task.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{task.target}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      task.status === 'normal'
                        ? 'bg-green-100 text-green-700'
                        : task.status === 'slow'
                        ? 'bg-yellow-100 text-yellow-700'
                        : task.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status === 'normal' ? '正常' : task.status === 'slow' ? '缓慢' : task.status === 'error' ? '异常' : '已禁用'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Copy key helper
function copyKey(key: string) {
  navigator.clipboard.writeText(key);
  alert('注册密钥已复制到剪贴板');
}
