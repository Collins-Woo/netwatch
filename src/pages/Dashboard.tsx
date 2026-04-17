import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Target,
  Server,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import {
  mockTasks,
  mockAgents,
  mockAlerts,
  mockDashboardStats,
  generateResponseTimeData,
  statusMap,
  alertLevelMap,
} from '../data/mockData';

const COLORS = ['#22C55E', '#F59E0B', '#EF4444', '#9CA3AF'];

export default function Dashboard() {
  const stats = mockDashboardStats;
  const responseTimeData = generateResponseTimeData();

  // 计算状态分布
  const statusDistribution = [
    { name: '正常', value: mockTasks.filter((t) => t.status === 'normal').length },
    { name: '缓慢', value: mockTasks.filter((t) => t.status === 'slow').length },
    { name: '异常', value: mockTasks.filter((t) => t.status === 'error').length },
    { name: '已禁用', value: mockTasks.filter((t) => t.status === 'disabled').length },
  ];

  const unacknowledgedAlerts = mockAlerts.filter((a) => !a.acknowledged);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">监控概览</h1>
        <p className="text-gray-500 mt-1">实时监控系统运行状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="监控任务"
          value={stats.totalTasks}
          icon={Target}
          color="bg-blue-500"
          link="/tasks"
        />
        <StatCard
          title="在线节点"
          value={stats.onlineNodes}
          total={mockAgents.length}
          icon={Server}
          color="bg-green-500"
          link="/nodes"
        />
        <StatCard
          title="当前告警"
          value={stats.currentAlerts}
          icon={AlertTriangle}
          color="bg-red-500"
          trend={stats.currentAlerts > 0 ? 'up' : undefined}
          link="/alerts"
        />
        <StatCard
          title="平均可用率"
          value={`${stats.avgAvailability}%`}
          icon={CheckCircle}
          color="bg-purple-500"
          trend="up"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 响应时间趋势图 */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">响应时间趋势</h3>
              <p className="text-sm text-gray-500 mt-1">最近24小时平均响应时间</p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">每5分钟更新</span>
            </div>
          </div>
          <div className="h-64">
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

        {/* 状态分布饼图 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">监控状态分布</h3>
            <p className="text-sm text-gray-500 mt-1">各类状态任务占比</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {statusDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index] }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900 ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 下方两栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近告警 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">最近告警</h3>
              <p className="text-sm text-gray-500 mt-1">未处理的告警信息</p>
            </div>
            <Link
              to="/history"
              className="flex items-center gap-1 text-sm text-[#2B5D3A] hover:text-[#234830] transition-colors"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {unacknowledgedAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>暂无未处理的告警</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unacknowledgedAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      alert.level === 'critical'
                        ? 'bg-red-500'
                        : alert.level === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{alert.taskName}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          alert.level === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : alert.level === 'warning'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {alertLevelMap[alert.level]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">{alert.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(alert.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 在线节点 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">监控节点</h3>
              <p className="text-sm text-gray-500 mt-1">Agent在线状态</p>
            </div>
            <Link
              to="/nodes"
              className="flex items-center gap-1 text-sm text-[#2B5D3A] hover:text-[#234830] transition-colors"
            >
              查看全部
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {mockAgents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    agent.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{agent.name}</span>
                    <span className="text-xs text-gray-500">{agent.ip}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>{agent.taskCount} 个任务</span>
                    <span>|</span>
                    <span>
                      CPU: {agent.cpuUsage}% | 内存: {agent.memoryUsage}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`text-sm ${
                      agent.status === 'online' ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {agent.status === 'online' ? '在线' : '离线'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number | string;
  total?: number;
  icon: React.ElementType;
  color: string;
  trend?: 'up' | 'down';
  link?: string;
}

function StatCard({ title, value, total, icon: Icon, color, trend, link }: StatCardProps) {
  const content = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-gray-900">{value}</span>
            {total !== undefined && (
              <span className="text-sm text-gray-400">/ {total}</span>
            )}
          </div>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp
                className={`w-4 h-4 ${trend === 'up' ? 'text-red-500' : 'text-green-500'}`}
              />
              <span
                className={`text-xs ${
                  trend === 'up' ? 'text-red-500' : 'text-green-500'
                }`}
              >
                {trend === 'up' ? '较昨日' : '较昨日下降'}
              </span>
            </div>
          )}
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}>{content}</Link>;
  }

  return content;
}
