import { useState } from 'react';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
} from 'lucide-react';
import { mockTasks, mockAgents, taskTypeMap, statusMap } from '../data/mockData';
import { Task, TaskStatus } from '../types';

export default function StatusPage() {
  const [tasks] = useState<Task[]>(mockTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Get status color
  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case 'normal':
        return 'bg-green-500';
      case 'slow':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'disabled':
        return 'bg-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'normal':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'slow':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'disabled':
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  // Get node name
  const getNodeName = (nodeId: string) => {
    const node = mockAgents.find((n) => n.id === nodeId);
    return node?.name || '未知节点';
  };

  // Count by status
  const statusCounts = {
    normal: tasks.filter((t) => t.status === 'normal').length,
    slow: tasks.filter((t) => t.status === 'slow').length,
    error: tasks.filter((t) => t.status === 'error').length,
    disabled: tasks.filter((t) => t.status === 'disabled').length,
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">监控状态</h1>
          <p className="text-gray-500 mt-1">实时监控所有任务状态</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              网格
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              列表
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            刷新
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-4">
        <StatusCard
          label="正常"
          count={statusCounts.normal}
          color="bg-green-500"
          icon={<CheckCircle className="w-5 h-5" />}
          onClick={() => setStatusFilter('normal')}
          active={statusFilter === 'normal'}
        />
        <StatusCard
          label="缓慢"
          count={statusCounts.slow}
          color="bg-yellow-500"
          icon={<AlertTriangle className="w-5 h-5" />}
          onClick={() => setStatusFilter('slow')}
          active={statusFilter === 'slow'}
        />
        <StatusCard
          label="异常"
          count={statusCounts.error}
          color="bg-red-500"
          icon={<XCircle className="w-5 h-5" />}
          onClick={() => setStatusFilter('error')}
          active={statusFilter === 'error'}
        />
        <StatusCard
          label="已禁用"
          count={statusCounts.disabled}
          color="bg-gray-400"
          icon={<Clock className="w-5 h-5" />}
          onClick={() => setStatusFilter('disabled')}
          active={statusFilter === 'disabled'}
        />
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索任务名称或目标..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
          />
        </div>
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            清除筛选
          </button>
        )}
      </div>

      {/* Task Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              {/* Status Indicator */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)}`} />
                <span className="text-xs text-gray-400">
                  {task.lastCheckTime
                    ? new Date(task.lastCheckTime).toLocaleTimeString('zh-CN')
                    : '-'}
                </span>
              </div>

              {/* Task Info */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{task.name}</h3>
                <p className="text-xs text-gray-500 font-mono truncate">{task.target}</p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-xs text-gray-500">响应时间</p>
                  <p className={`text-lg font-semibold ${
                    task.lastResponseTime
                      ? task.lastResponseTime > 1000
                        ? 'text-red-600'
                        : task.lastResponseTime > 500
                        ? 'text-yellow-600'
                        : 'text-gray-900'
                      : 'text-gray-400'
                  }`}>
                    {task.lastResponseTime !== undefined ? `${task.lastResponseTime}ms` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">可用率</p>
                  <p className={`text-lg font-semibold ${
                    task.availability
                      ? task.availability >= 99
                        ? 'text-green-600'
                        : task.availability >= 95
                        ? 'text-yellow-600'
                        : 'text-red-600'
                      : 'text-gray-400'
                  }`}>
                    {task.availability !== undefined ? `${task.availability}%` : '-'}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {taskTypeMap[task.type]}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{getNodeName(task.nodeId)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
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
                  响应时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  可用率
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  执行节点
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后检查
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(task.status)}`} />
                      {getStatusIcon(task.status)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{task.name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {taskTypeMap[task.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 font-mono">{task.target}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      task.lastResponseTime
                        ? task.lastResponseTime > 1000
                          ? 'text-red-600'
                          : task.lastResponseTime > 500
                          ? 'text-yellow-600'
                          : 'text-gray-900'
                        : 'text-gray-400'
                    }`}>
                      {task.lastResponseTime !== undefined ? `${task.lastResponseTime}ms` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${
                      task.availability
                        ? task.availability >= 99
                          ? 'text-green-600'
                          : task.availability >= 95
                          ? 'text-yellow-600'
                          : 'text-red-600'
                        : 'text-gray-400'
                    }`}>
                      {task.availability !== undefined ? `${task.availability}%` : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{getNodeName(task.nodeId)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {task.lastCheckTime
                        ? new Date(task.lastCheckTime).toLocaleString('zh-CN', {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>未找到匹配的任务</p>
        </div>
      )}
    </div>
  );
}

// Status Card Component
interface StatusCardProps {
  label: string;
  count: number;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
}

function StatusCard({ label, count, color, icon, onClick, active }: StatusCardProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 transition-all hover:shadow-md ${
        active ? 'border-[#2B5D3A] ring-2 ring-[#2B5D3A]/20' : 'border-gray-100'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg ${color} bg-opacity-10 flex items-center justify-center`}>
        <span className={color.replace('bg-', 'text-')}>{icon}</span>
      </div>
      <div className="text-left">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{count}</p>
      </div>
    </button>
  );
}
