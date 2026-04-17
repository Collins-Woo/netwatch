import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  History as HistoryIcon,
  Calendar,
  Download,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  FileText,
  FileJson,
} from 'lucide-react';
import { mockAlerts, mockTasks, generateResponseTimeData, alertLevelMap } from '../data/mockData';
import { Alert } from '../types';
import { useSearchParams } from 'react-router-dom';

export default function HistoryPage() {
  const [selectedTask, setSelectedTask] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [activeTab, setActiveTab] = useState<'alerts' | 'response'>('alerts');
  const [searchParams] = useSearchParams();
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Check if export was triggered from header
  const shouldExport = searchParams.get('export') === 'true';

  // Filter alerts
  const filteredAlerts = mockAlerts.filter((alert) => {
    if (selectedTask !== 'all' && alert.taskId !== selectedTask) {
      return false;
    }
    return true;
  });

  // Generate sample response time data
  const responseTimeData = generateResponseTimeData();

  // Calculate statistics
  const stats = {
    totalChecks: 13452,
    avgResponseTime: 287,
    maxResponseTime: 1250,
    minResponseTime: 8,
    availability: 98.7,
  };

  // Export data functionality
  const exportData = (format: 'csv' | 'json') => {
    let data: string;
    let filename: string;
    let mimeType: string;

    if (activeTab === 'alerts') {
      const exportData = filteredAlerts.map(a => ({
        时间: new Date(a.timestamp).toLocaleString('zh-CN'),
        任务: a.taskName,
        级别: a.level === 'critical' ? '严重' : a.level === 'warning' ? '警告' : '提示',
        消息: a.message,
        状态: a.acknowledged ? '已确认' : '未确认'
      }));

      if (format === 'csv') {
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','));
        data = [headers, ...rows].join('\n');
        filename = `alerts-${dateRange}.csv`;
        mimeType = 'text/csv';
      } else {
        data = JSON.stringify(exportData, null, 2);
        filename = `alerts-${dateRange}.json`;
        mimeType = 'application/json';
      }
    } else {
      const exportData = responseTimeData.map(d => ({
        时间: d.time,
        响应时间_ms: d.responseTime,
        状态: d.status === 'normal' ? '正常' : d.status === 'slow' ? '缓慢' : '异常'
      }));

      if (format === 'csv') {
        const headers = Object.keys(exportData[0] || {}).join(',');
        const rows = exportData.map(row => Object.values(row).join(','));
        data = [headers, ...rows].join('\n');
        filename = `response-time-${dateRange}.csv`;
        mimeType = 'text/csv';
      } else {
        data = JSON.stringify(exportData, null, 2);
        filename = `response-time-${dateRange}.json`;
        mimeType = 'application/json';
      }
    }

    // Create and download file
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Auto-open export menu if triggered from header
  if (shouldExport && !showExportMenu) {
    setShowExportMenu(true);
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">历史记录</h1>
          <p className="text-gray-500 mt-1">查看监控历史数据和告警记录</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
              <div className="p-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 px-2">选择导出格式</p>
              </div>
              <button
                onClick={() => exportData('csv')}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4" />
                导出为 CSV
              </button>
              <button
                onClick={() => exportData('json')}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <FileJson className="w-4 h-4" />
                导出为 JSON
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date Range Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              {['24h', '7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === '24h' ? '24小时' : range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
            >
              <option value="all">所有任务</option>
              {mockTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('response')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'response'
                ? 'border-[#2B5D3A] text-[#2B5D3A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            响应时间
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-[#2B5D3A] text-[#2B5D3A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            告警记录
          </button>
        </nav>
      </div>

      {/* Response Time Tab */}
      {activeTab === 'response' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="总检测次数"
              value={stats.totalChecks.toLocaleString()}
              icon={<HistoryIcon className="w-5 h-5" />}
            />
            <StatCard
              label="平均响应时间"
              value={`${stats.avgResponseTime}ms`}
              icon={<Clock className="w-5 h-5" />}
              trend="up"
            />
            <StatCard
              label="最快响应"
              value={`${stats.minResponseTime}ms`}
              icon={<TrendingDown className="w-5 h-5" />}
            />
            <StatCard
              label="最慢响应"
              value={`${stats.maxResponseTime}ms`}
              icon={<TrendingUp className="w-5 h-5" />}
            />
          </div>

          {/* Response Time Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">响应时间趋势</h3>
                <p className="text-sm text-gray-500 mt-1">单位: 毫秒 (ms)</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-[#2B5D3A]" />
                  响应时间
                </span>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E5E7EB' }}
                    unit="ms"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                    formatter={(value: number) => [`${value}ms`, '响应时间']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#2B5D3A"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: '#2B5D3A' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Availability Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">可用率统计</h3>
              <span className="text-2xl font-bold text-green-600">{stats.availability}%</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                style={{ width: `${stats.availability}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-500">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Alert Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">严重告警</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAlerts.filter((a) => a.level === 'critical').length}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">警告告警</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAlerts.filter((a) => a.level === 'warning').length}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">提示告警</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAlerts.filter((a) => a.level === 'info').length}
                </p>
              </div>
            </div>
          </div>

          {/* Alert List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">告警历史</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {filteredAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
            {filteredAlerts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <p>暂无告警记录</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}

function StatCard({ label, value, icon, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-gray-400">{icon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <span
            className={`text-sm ${
              trend === 'up' ? 'text-red-500' : 'text-green-500'
            }`}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}

// Alert Item Component
function AlertItem({ alert }: { alert: Alert }) {
  const levelConfig = {
    critical: {
      bg: 'bg-red-500',
      border: 'border-red-200',
      text: 'text-red-700',
      bgLight: 'bg-red-50',
    },
    warning: {
      bg: 'bg-yellow-500',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      bgLight: 'bg-yellow-50',
    },
    info: {
      bg: 'bg-blue-500',
      border: 'border-blue-200',
      text: 'text-blue-700',
      bgLight: 'bg-blue-50',
    },
  };

  const config = levelConfig[alert.level];

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        <div className={`w-2 h-2 rounded-full mt-2 ${config.bg}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-medium text-gray-900">{alert.taskName}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${config.bgLight} ${config.text}`}
            >
              {alertLevelMap[alert.level]}
            </span>
            {alert.acknowledged && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                已确认
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>{new Date(alert.createdAt).toLocaleString('zh-CN')}</span>
            {alert.responseTime !== undefined && alert.responseTime > 0 && (
              <span>响应时间: {alert.responseTime}ms</span>
            )}
            {alert.statusCode !== undefined && (
              <span>状态码: {alert.statusCode}</span>
            )}
          </div>
        </div>
        {!alert.acknowledged && (
          <button className="px-3 py-1.5 text-sm text-[#2B5D3A] border border-[#2B5D3A] rounded-lg hover:bg-[#2B5D3A]/5 transition-colors">
            确认
          </button>
        )}
      </div>
    </div>
  );
}
