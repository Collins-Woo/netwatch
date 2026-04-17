import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Server,
  Bell,
  Activity,
  History,
  Menu,
  X,
  ChevronLeft,
  Users,
  LogOut,
  Settings,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { mockAlerts } from '../data/mockData';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/tasks', label: '监控任务', icon: Target },
  { path: '/nodes', label: '监控节点', icon: Server },
  { path: '/status', label: '监控状态', icon: Activity },
  { path: '/history', label: '历史记录', icon: History },
  { path: '/alerts', label: '告警配置', icon: Bell },
  { path: '/users', label: '用户管理', icon: Users },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#1E3A2F] text-white transition-all duration-300 z-50 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo 区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#2B5D3A]">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#F5A623]" />
            <span className="font-bold text-lg">NetWatch</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[#2B5D3A] transition-colors"
        >
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* 导航菜单 */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-[#2B5D3A] text-white'
                  : 'text-gray-300 hover:bg-[#2B5D3A]/50 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* 底部信息 */}
      {!collapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="p-3 bg-[#2B5D3A]/30 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">版本信息</p>
            <p className="text-sm font-medium">NetWatch v1.0.0</p>
          </div>
        </div>
      )}
    </aside>
  );
}

interface Alert {
  id: string;
  taskId: string;
  taskName: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: string;
  acknowledged: boolean;
}

interface HeaderProps {
  collapsed: boolean;
}

export function Header({ collapsed }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const alertDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // 加载告警数据
  useEffect(() => {
    setAlerts(mockAlerts.filter(a => !a.acknowledged).slice(0, 5));
  }, []);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (alertDropdownRef.current && !alertDropdownRef.current.contains(event.target as Node)) {
        setShowAlertDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 搜索处理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  // 确认告警
  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // 根据路径获取面包屑
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return [{ label: '仪表盘' }];

    const routes: Record<string, string> = {
      '/tasks': '监控任务',
      '/nodes': '监控节点',
      '/alerts': '告警配置',
      '/status': '监控状态',
      '/history': '历史记录',
      '/users': '用户管理',
    };

    const mainRoute = routes[path] || path.split('/').pop();
    return [{ label: mainRoute }];
  };

  const breadcrumb = getBreadcrumb();
  const unacknowledgedCount = alerts.length;

  // 告警等级样式
  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 transition-all duration-300 z-40 ${
        collapsed ? 'left-16' : 'left-56'
      }`}
    >
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-500">首页</span>
        {breadcrumb.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">{item.label}</span>
          </span>
        ))}
      </div>

      {/* 右侧操作 */}
      <div className="flex items-center gap-4">
        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务或节点..."
            className="w-64 px-4 py-2 pl-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        {/* 导出按钮 */}
        <button
          onClick={() => navigate('/history?export=true')}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="导出数据"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* 通知铃铛 */}
        <div className="relative" ref={alertDropdownRef}>
          <button
            onClick={() => setShowAlertDropdown(!showAlertDropdown)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unacknowledgedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unacknowledgedCount > 9 ? '9+' : unacknowledgedCount}
              </span>
            )}
          </button>

          {/* 告警下拉列表 */}
          {showAlertDropdown && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">最新告警</span>
                <button
                  onClick={() => navigate('/status')}
                  className="text-xs text-[#2B5D3A] hover:underline flex items-center gap-1"
                >
                  查看全部 <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    暂无告警
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 border-b border-gray-100 last:border-b-0 ${getAlertStyle(alert.level)}`}
                    >
                      <div className="flex items-start gap-2">
                        {getAlertIcon(alert.level)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{alert.taskName}</p>
                          <p className="text-xs opacity-80 mt-0.5">{alert.message}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(alert.timestamp).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs px-2 py-1 bg-white rounded hover:bg-gray-50 transition-colors"
                        >
                          确认
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 用户头像 */}
        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 pl-4 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#2B5D3A] flex items-center justify-center text-white text-sm font-medium">
              管
            </div>
            <span className="text-sm text-gray-700">管理员</span>
          </button>

          {/* 用户下拉菜单 */}
          {showUserDropdown && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => { navigate('/users'); setShowUserDropdown(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" />
                用户管理
              </button>
              <button
                onClick={() => { navigate('/alerts'); setShowUserDropdown(false); }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <Settings className="w-4 h-4" />
                系统设置
              </button>
              <div className="border-t border-gray-100"></div>
              <button
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header collapsed={collapsed} />
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${
          collapsed ? 'pl-16' : 'pl-56'
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
