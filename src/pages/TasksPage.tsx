import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  X,
  Check,
  ChevronDown,
  Globe,
  Lock,
  Code,
  Activity,
  Server,
  Shield,
  Route,
  Database,
  Zap,
} from 'lucide-react';
import { mockTasks, mockAgents, taskTypeMap } from '../data/mockData';
import { Task, TaskType, TaskStatus, TaskConfig, HttpMethod, TaskTypeMeta } from '../types';

// Task type icons mapping
const typeIcons: Record<TaskType, React.ReactNode> = {
  http: <Globe className="w-4 h-4" />,
  https: <Lock className="w-4 h-4" />,
  api: <Code className="w-4 h-4" />,
  ping: <Activity className="w-4 h-4" />,
  tcp: <Server className="w-4 h-4" />,
  dns: <Globe className="w-4 h-4" />,
  ssl: <Shield className="w-4 h-4" />,
  traceroute: <Route className="w-4 h-4" />,
  mysql: <Database className="w-4 h-4" />,
  redis: <Zap className="w-4 h-4" />,
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Toggle task enabled status
  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              enabled: !t.enabled,
              status: !t.enabled ? 'normal' : 'disabled',
            }
          : t
      )
    );
  };

  // Delete task
  const deleteTask = (taskId: string) => {
    if (confirm('确定要删除这个监控任务吗？')) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  // Batch delete
  const batchDelete = () => {
    if (selectedTasks.length === 0) return;
    if (confirm(`确定要删除选中的 ${selectedTasks.length} 个任务吗？`)) {
      setTasks((prev) => prev.filter((t) => !selectedTasks.includes(t.id)));
      setSelectedTasks([]);
    }
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedTasks.length === filteredTasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(filteredTasks.map((t) => t.id));
    }
  };

  // Open new/edit modal
  const openModal = (task?: Task) => {
    setEditingTask(task || null);
    setShowModal(true);
  };

  // Get node names for multi-node display
  const getNodeNames = (nodeIds: string[]) => {
    if (!nodeIds || nodeIds.length === 0) return '未分配';
    const names = nodeIds.map(id => {
      const node = mockAgents.find((n) => n.id === id);
      return node?.name || '未知';
    });
    return names.join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">监控任务</h1>
          <p className="text-gray-500 mt-1">管理所有监控任务配置</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors"
        >
          <Plus className="w-5 h-5" />
          新建任务
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
              placeholder="搜索任务名称或目标..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
          >
            <option value="all">全部类型</option>
            <option value="http">HTTP</option>
            <option value="https">HTTPS</option>
            <option value="api">API接口</option>
            <option value="ping">Ping</option>
            <option value="tcp">TCP端口</option>
            <option value="dns">DNS解析</option>
            <option value="ssl">SSL证书</option>
            <option value="traceroute">路由追踪</option>
            <option value="mysql">MySQL</option>
            <option value="redis">Redis</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
          >
            <option value="all">全部状态</option>
            <option value="normal">正常</option>
            <option value="slow">缓慢</option>
            <option value="error">异常</option>
            <option value="disabled">已禁用</option>
          </select>

          {/* Batch Operations */}
          {selectedTasks.length > 0 && (
            <button
              onClick={batchDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              批量删除 ({selectedTasks.length})
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-[#2B5D3A] focus:ring-[#2B5D3A]"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                任务名称
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                类型
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                监控目标
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                响应时间
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                可用率
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                执行节点
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTasks([...selectedTasks, task.id]);
                      } else {
                        setSelectedTasks(selectedTasks.filter((id) => id !== task.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-[#2B5D3A] focus:ring-[#2B5D3A]"
                  />
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-gray-900">{task.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {typeIcons[task.type]}
                    {TaskTypeMeta[task.type]?.label || task.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600 font-mono">{task.target}</span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-6 py-4">
                  {task.lastResponseTime !== undefined ? (
                    <span className="text-sm text-gray-600">
                      {task.lastResponseTime}ms
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {task.availability !== undefined ? (
                    <span
                      className={`text-sm font-medium ${
                        task.availability >= 99
                          ? 'text-green-600'
                          : task.availability >= 95
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {task.availability}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{getNodeNames(task.nodeIds)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        task.enabled
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={task.enabled ? '禁用' : '启用'}
                    >
                      {task.enabled ? (
                        <Power className="w-4 h-4" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openModal(task)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
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

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>未找到匹配的任务</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSave={(taskData) => {
            if (editingTask) {
              // Edit mode
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === editingTask.id ? { ...t, ...taskData, updatedAt: new Date().toISOString() } : t
                )
              );
            } else {
              // Create mode
              const newTask: Task = {
                ...taskData,
                id: `task-${Date.now()}`,
                status: taskData.enabled ? 'normal' : 'disabled',
                lastResponseTime: undefined,
                lastCheckTime: undefined,
                availability: undefined,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setTasks((prev) => [...prev, newTask]);
            }
            setShowModal(false);
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: TaskStatus }) {
  const config = {
    normal: { bg: 'bg-green-100', text: 'text-green-700', label: '正常' },
    slow: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '缓慢' },
    error: { bg: 'bg-red-100', text: 'text-red-700', label: '异常' },
    disabled: { bg: 'bg-gray-100', text: 'text-gray-600', label: '已禁用' },
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

// Task Edit Modal with advanced configuration
interface TaskModalProps {
  task: Task | null;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
}

function TaskModal({ task, onClose, onSave }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [formData, setFormData] = useState<Partial<Task>>(
    task || {
      name: '',
      type: 'api',
      target: '',
      interval: 5,
      timeout: 10,
      statusCode: 200,
      alertThreshold: 3,
      nodeIds: mockAgents.filter((a) => a.status === 'online' && a.enabled).map(a => a.id),
      enabled: true,
      config: {
        method: 'GET',
        headers: {},
        body: '',
      },
    }
  );

  // Handle config change
  const updateConfig = (key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value,
      },
    }));
  };

  // Handle headers change
  const updateHeader = (key: string, value: string) => {
    const headers = { ...(formData.config?.headers || {}), [key]: value };
    updateConfig('headers', headers);
  };

  // Remove header
  const removeHeader = (key: string) => {
    const headers = { ...(formData.config?.headers || {}) };
    delete headers[key];
    updateConfig('headers', headers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Get target placeholder based on type
  const getTargetPlaceholder = () => {
    switch (formData.type) {
      case 'ping':
        return '例如：180.97.1.16';
      case 'tcp':
        return '例如：db.example.com';
      case 'dns':
        return '例如：example.com';
      case 'ssl':
        return '例如：https://github.com';
      case 'traceroute':
        return '例如：8.8.8.8';
      case 'mysql':
        return '例如：mysql.example.com';
      case 'redis':
        return '例如：redis.example.com';
      case 'api':
        return '例如：https://api.example.com/v1/users';
      default:
        return '例如：https://www.example.com';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {task ? '编辑监控任务' : '新建监控任务'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-[#2B5D3A] text-[#2B5D3A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              基本配置
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'advanced'
                  ? 'border-[#2B5D3A] text-[#2B5D3A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              高级配置
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Task Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  任务名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：用户登录API监控"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Monitor Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    监控类型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.type || 'api'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TaskType })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="api">API接口</option>
                    <option value="ping">Ping</option>
                    <option value="tcp">TCP端口</option>
                    <option value="dns">DNS解析</option>
                    <option value="ssl">SSL证书</option>
                    <option value="traceroute">路由追踪</option>
                    <option value="mysql">MySQL</option>
                    <option value="redis">Redis</option>
                  </select>
                </div>

                {/* Monitor Target */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    监控目标 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.target || ''}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    placeholder={getTargetPlaceholder()}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Monitor Interval */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    监控间隔 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.interval || 5}
                    onChange={(e) => setFormData({ ...formData, interval: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                  >
                    <option value={1}>1分钟</option>
                    <option value={5}>5分钟</option>
                    <option value={10}>10分钟</option>
                    <option value={30}>30分钟</option>
                    <option value={60}>1小时</option>
                    <option value={1440}>1天</option>
                  </select>
                </div>

                {/* Timeout */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    超时时间 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.timeout || 10}
                    onChange={(e) => setFormData({ ...formData, timeout: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                  >
                    <option value={5}>5秒</option>
                    <option value={10}>10秒</option>
                    <option value={15}>15秒</option>
                    <option value={30}>30秒</option>
                    <option value={60}>60秒</option>
                  </select>
                </div>
              </div>

              {/* HTTP/API specific options */}
              {(formData.type === 'http' || formData.type === 'https' || formData.type === 'api') && (
                <div className="grid grid-cols-2 gap-6">
                  {/* Expected Status Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      期望状态码
                    </label>
                    <input
                      type="number"
                      value={formData.statusCode || 200}
                      onChange={(e) => setFormData({ ...formData, statusCode: Number(e.target.value) })}
                      placeholder="200"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                    />
                  </div>

                  {/* Alert Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      告警阈值 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={formData.alertThreshold || 3}
                      onChange={(e) => setFormData({ ...formData, alertThreshold: Number(e.target.value) })}
                      placeholder="连续失败次数触发告警"
                      min={1}
                      max={10}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                    />
                  </div>
                </div>
              )}

              {/* Execute Nodes - Multi-select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  执行节点 <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-gray-500 font-normal">（可多选）</span>
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {mockAgents.filter((a) => a.status === 'online' && a.enabled).length === 0 ? (
                    <p className="text-sm text-gray-500">暂无可用节点</p>
                  ) : (
                    mockAgents
                      .filter((a) => a.status === 'online' && a.enabled)
                      .map((agent) => (
                        <label
                          key={agent.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={formData.nodeIds?.includes(agent.id) || false}
                            onChange={(e) => {
                              const currentNodes = formData.nodeIds || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, nodeIds: [...currentNodes, agent.id] });
                              } else {
                                setFormData({ ...formData, nodeIds: currentNodes.filter(id => id !== agent.id) });
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-[#2B5D3A] focus:ring-[#2B5D3A]"
                          />
                          <span className="text-sm text-gray-700">{agent.name}</span>
                          <span className="text-xs text-gray-400">({agent.ip})</span>
                          {agent.region && (
                            <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {agent.region === 'east' ? '华东' : agent.region === 'south' ? '华南' : agent.region === 'north' ? '华北' : '海外'}
                            </span>
                          )}
                        </label>
                      ))
                  )}
                </div>
                {(!formData.nodeIds || formData.nodeIds.length === 0) && (
                  <p className="text-xs text-red-500 mt-1">请至少选择一个监控节点</p>
                )}
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
                  <span className="text-sm text-gray-700">创建后立即启用监控</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* API Method Configuration */}
              {formData.type === 'api' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">API请求配置</h3>

                  {/* HTTP Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请求方法
                    </label>
                    <select
                      value={formData.config?.method || 'GET'}
                      onChange={(e) => updateConfig('method', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                      <option value="HEAD">HEAD</option>
                    </select>
                  </div>

                  {/* Request Headers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请求头
                    </label>
                    <div className="space-y-2">
                      {Object.entries(formData.config?.headers || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={key}
                            onChange={(e) => {
                              const newHeaders = { ...formData.config?.headers };
                              delete newHeaders[key];
                              newHeaders[e.target.value] = value;
                              updateConfig('headers', newHeaders);
                            }}
                            placeholder="Header Name"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 text-sm"
                          />
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateHeader(key, e.target.value)}
                            placeholder="Header Value"
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removeHeader(key)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateHeader(`Header-${Date.now()}`, '')}
                        className="text-sm text-[#2B5D3A] hover:text-[#234830]"
                      >
                        + 添加请求头
                      </button>
                    </div>
                  </div>

                  {/* Request Body */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      请求体
                    </label>
                    <textarea
                      value={formData.config?.body || ''}
                      onChange={(e) => updateConfig('body', e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      支持JSON格式的请求体，仅用于POST/PUT/PATCH请求
                    </p>
                  </div>

                  {/* Expected Response Pattern */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      期望响应内容
                    </label>
                    <input
                      type="text"
                      value={formData.config?.expectedPattern || ''}
                      onChange={(e) => updateConfig('expectedPattern', e.target.value)}
                      placeholder={'例如："success": true'}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      响应内容中需要包含的字符串，用于验证接口返回数据正确性
                    </p>
                  </div>
                </div>
              )}

              {/* TCP Port Configuration */}
              {formData.type === 'tcp' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">TCP端口配置</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      端口号
                    </label>
                    <input
                      type="number"
                      value={formData.config?.port || ''}
                      onChange={(e) => updateConfig('port', Number(e.target.value))}
                      placeholder="例如：3306"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                    />
                  </div>
                </div>
              )}

              {/* DNS Configuration */}
              {formData.type === 'dns' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">DNS解析配置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        DNS服务器
                      </label>
                      <input
                        type="text"
                        value={formData.config?.dnsServer || ''}
                        onChange={(e) => updateConfig('dnsServer', e.target.value)}
                        placeholder="例如：8.8.8.8"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        记录类型
                      </label>
                      <select
                        value={formData.config?.recordType || 'A'}
                        onChange={(e) => updateConfig('recordType', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      >
                        <option value="A">A记录</option>
                        <option value="AAAA">AAAA记录</option>
                        <option value="CNAME">CNAME记录</option>
                        <option value="MX">MX记录</option>
                        <option value="TXT">TXT记录</option>
                        <option value="NS">NS记录</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* SSL Configuration */}
              {formData.type === 'ssl' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">SSL证书配置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        预警天数
                      </label>
                      <input
                        type="number"
                        value={formData.config?.sslExpiryWarning || 30}
                        onChange={(e) => updateConfig('sslExpiryWarning', Number(e.target.value))}
                        placeholder="30"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                      <p className="text-xs text-gray-500 mt-1">提前多少天发送预警</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        严重预警天数
                      </label>
                      <input
                        type="number"
                        value={formData.config?.sslExpiryCritical || 7}
                        onChange={(e) => updateConfig('sslExpiryCritical', Number(e.target.value))}
                        placeholder="7"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                      <p className="text-xs text-gray-500 mt-1">提前多少天发送严重告警</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Traceroute Configuration */}
              {formData.type === 'traceroute' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">路由追踪配置</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大跳数
                      </label>
                      <input
                        type="number"
                        value={formData.config?.maxHops || 30}
                        onChange={(e) => updateConfig('maxHops', Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        最大超时(ms)
                      </label>
                      <input
                        type="number"
                        value={formData.config?.maxTimeout || 5000}
                        onChange={(e) => updateConfig('maxTimeout', Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MySQL/Redis Configuration */}
              {(formData.type === 'mysql' || formData.type === 'redis') && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    {formData.type === 'mysql' ? 'MySQL' : 'Redis'} 数据库配置
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        端口号
                      </label>
                      <input
                        type="number"
                        value={formData.config?.port || (formData.type === 'mysql' ? 3306 : 6379)}
                        onChange={(e) => updateConfig('port', Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                    </div>
                    {formData.type === 'mysql' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            数据库名
                          </label>
                          <input
                            type="text"
                            value={formData.config?.database || ''}
                            onChange={(e) => updateConfig('database', e.target.value)}
                            placeholder="例如：app_db"
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={formData.config?.username || ''}
                        onChange={(e) => updateConfig('username', e.target.value)}
                        placeholder="例如：monitor"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        密码
                      </label>
                      <input
                        type="password"
                        value={formData.config?.password || ''}
                        onChange={(e) => updateConfig('password', e.target.value)}
                        placeholder="数据库密码"
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Default state for types without advanced config */}
              {!['api', 'tcp', 'dns', 'ssl', 'traceroute', 'mysql', 'redis'].includes(formData.type || '') && (
                <div className="text-center py-8 text-gray-500">
                  <p>该监控类型暂无高级配置选项</p>
                </div>
              )}
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
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
              {task ? '保存修改' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
