/**
 * NetWatch 用户管理页面
 * 支持管理员、运维人员、审计员、查看者四种角色
 */

import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Shield,
  ShieldCheck,
  Eye,
  FileText,
  Power,
  PowerOff,
  X,
  Check,
  Lock,
  Unlock,
  LogIn,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  User,
  UserRole,
  UserStatus,
  RolePermissions,
  AuditLog,
} from '../types';

// Mock 数据
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@netwatch.local',
    phone: '13800138000',
    role: 'admin',
    status: 'active',
    lastLoginAt: new Date().toISOString(),
    lastLoginIp: '192.168.1.100',
    loginCount: 156,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    username: 'operator01',
    email: 'operator@netwatch.local',
    phone: '13900139000',
    role: 'operator',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 3600000).toISOString(),
    lastLoginIp: '192.168.1.101',
    loginCount: 89,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z',
  },
  {
    id: '3',
    username: 'auditor01',
    email: 'auditor@netwatch.local',
    role: 'auditor',
    status: 'active',
    lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
    lastLoginIp: '192.168.1.102',
    loginCount: 45,
    createdAt: '2024-01-08T00:00:00Z',
    updatedAt: '2024-01-08T00:00:00Z',
  },
  {
    id: '4',
    username: 'viewer01',
    email: 'viewer@netwatch.local',
    role: 'viewer',
    status: 'inactive',
    loginCount: 12,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
  {
    id: '5',
    username: 'locked_user',
    email: 'locked@netwatch.local',
    role: 'operator',
    status: 'locked',
    lastLoginAt: new Date(Date.now() - 604800000).toISOString(),
    lastLoginIp: '10.0.0.1',
    loginCount: 5,
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
  },
];

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    userId: '1',
    username: 'admin',
    action: 'login',
    resource: 'system',
    details: '{"result": "success"}',
    ip: '192.168.1.100',
    userAgent: 'Chrome/120.0',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: '1',
    username: 'admin',
    action: 'create',
    resource: 'task',
    resourceId: 'task-001',
    details: '{"name": "携程官网监控", "type": "http"}',
    ip: '192.168.1.100',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: '3',
    userId: '1',
    username: 'admin',
    action: 'update',
    resource: 'node',
    resourceId: 'node-001',
    details: '{"name": "华东节点-01", "enabled": true}',
    ip: '192.168.1.100',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '4',
    userId: '2',
    username: 'operator01',
    action: 'delete',
    resource: 'task',
    resourceId: 'task-005',
    details: '{"name": "过期任务"}',
    ip: '192.168.1.101',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

// 角色图标映射
const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="w-4 h-4" />,
  operator: <ShieldCheck className="w-4 h-4" />,
  auditor: <FileText className="w-4 h-4" />,
  viewer: <Eye className="w-4 h-4" />,
};

// 角色颜色映射
const roleColors: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  operator: 'bg-blue-100 text-blue-700',
  auditor: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
};

// 状态颜色映射
const statusColors: Record<UserStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  locked: 'bg-red-100 text-red-700',
};

export default function UserPage() {
  // 状态
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [auditLogs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 过滤用户
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // 打开新建/编辑弹窗
  const openModal = (user?: User) => {
    setEditingUser(user || null);
    setShowModal(true);
  };

  // 打开详情弹窗
  const openDetailModal = (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };

  // 删除用户
  const deleteUser = (userId: string) => {
    if (confirm('确定要删除此用户吗？此操作不可撤销。')) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  // 切换用户状态
  const toggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus: UserStatus =
            u.status === 'active' ? 'inactive' : 'active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  // 锁定/解锁用户
  const toggleLock = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const newStatus: UserStatus =
            u.status === 'locked' ? 'active' : 'locked';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  // 格式化时间
  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户和权限配置</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5" />
            操作日志
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#2B5D3A] text-white rounded-lg hover:bg-[#234830] transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建用户
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
            />
          </div>

          {/* 角色筛选 */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
          >
            <option value="all">全部角色</option>
            <option value="admin">管理员</option>
            <option value="operator">运维人员</option>
            <option value="auditor">审计员</option>
            <option value="viewer">查看者</option>
          </select>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30"
          >
            <option value="all">全部状态</option>
            <option value="active">正常</option>
            <option value="inactive">停用</option>
            <option value="locked">锁定</option>
          </select>
        </div>
      </div>

      {/* 用户统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">总用户数</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">管理员</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {users.filter((u) => u.role === 'admin').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">在线用户</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {users.filter((u) => u.status === 'active').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Power className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">已锁定</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {users.filter((u) => u.status === 'locked').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Lock className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后登录
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  登录次数
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#2B5D3A]/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-[#2B5D3A]">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.username}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}
                    >
                      {roleIcons[user.role]}
                      {RolePermissions[user.role].label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}
                    >
                      {user.status === 'active' ? (
                        <Power className="w-3 h-3" />
                      ) : user.status === 'locked' ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <PowerOff className="w-3 h-3" />
                      )}
                      {user.status === 'active'
                        ? '正常'
                        : user.status === 'locked'
                        ? '已锁定'
                        : '已停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.lastLoginAt ? formatTime(user.lastLoginAt) : '从未登录'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.loginCount} 次
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openDetailModal(user)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(user.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.status === 'active'
                            ? 'text-yellow-600 hover:bg-yellow-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={user.status === 'active' ? '停用' : '启用'}
                      >
                        {user.status === 'active' ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => toggleLock(user.id)}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title={user.status === 'locked' ? '解锁' : '锁定'}
                      >
                        {user.status === 'locked' ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>未找到匹配的用户</p>
          </div>
        )}
      </div>

      {/* 新建/编辑用户弹窗 */}
      {showModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowModal(false);
            setEditingUser(null);
          }}
          onSave={(userData) => {
            if (editingUser) {
              setUsers((prev) =>
                prev.map((u) => (u.id === editingUser.id ? { ...u, ...userData } : u))
              );
            } else {
              const newUser: User = {
                ...userData,
                id: `user-${Date.now()}`,
                status: 'active',
                loginCount: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              setUsers((prev) => [...prev, newUser]);
            }
            setShowModal(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* 用户详情弹窗 */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* 操作日志弹窗 */}
      {showAuditModal && (
        <AuditLogModal
          logs={auditLogs}
          onClose={() => setShowAuditModal(false)}
        />
      )}
    </div>
  );
}

// 用户表单弹窗组件
interface UserModalProps {
  user: User | null;
  onClose: () => void;
  onSave: (user: Partial<User>) => void;
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const [formData, setFormData] = useState<Partial<User>>(
    user || {
      username: '',
      email: '',
      phone: '',
      role: 'viewer',
      password: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {user ? '编辑用户' : '新建用户'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                required
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                required
              />
            </div>

            {/* 手机号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                手机号
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号（可选）"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
              />
            </div>

            {/* 角色 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['admin', 'operator', 'auditor', 'viewer'] as UserRole[]).map((role) => (
                  <label
                    key={role}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.role === role
                        ? 'border-[#2B5D3A] bg-[#2B5D3A]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={formData.role === role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="mt-1"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`p-1 rounded ${roleColors[role]}`}>
                          {roleIcons[role]}
                        </span>
                        <span className="font-medium text-gray-900">
                          {RolePermissions[role].label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {RolePermissions[role].description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* 密码（新建时必填） */}
            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password || ''}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="请输入密码（至少6位）"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2B5D3A]/30 focus:border-[#2B5D3A]"
                  required
                  minLength={6}
                />
              </div>
            )}

            {/* 权限预览 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">权限预览</p>
              <div className="flex flex-wrap gap-1.5">
                {formData.role &&
                  RolePermissions[formData.role].permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                    >
                      {perm}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
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
              {user ? '保存修改' : '创建用户'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 用户详情弹窗组件
interface UserDetailModalProps {
  user: User;
  onClose: () => void;
}

function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#2B5D3A]/10 flex items-center justify-center">
              <span className="text-lg font-medium text-[#2B5D3A]">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* 基本信息 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">基本信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">用户ID</p>
                <p className="font-mono text-sm text-gray-900">{user.id}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">角色</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                  {roleIcons[user.role]}
                  {RolePermissions[user.role].label}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">状态</p>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                  {user.status === 'active' ? '正常' : user.status === 'locked' ? '已锁定' : '已停用'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">手机号</p>
                <p className="text-sm text-gray-900">{user.phone || '未设置'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                <p className="text-xs text-gray-500 mb-1">权限列表</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {RolePermissions[user.role].permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                    >
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 登录信息 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3">登录信息</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">最后登录时间</p>
                <p className="text-sm text-gray-900">
                  {user.lastLoginAt ? formatTime(user.lastLoginAt) : '从未登录'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">最后登录IP</p>
                <p className="font-mono text-sm text-gray-900">{user.lastLoginIp || '未知'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">登录次数</p>
                <p className="text-sm text-gray-900">{user.loginCount} 次</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">创建时间</p>
                <p className="text-sm text-gray-900">{formatTime(user.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
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

// 操作日志弹窗组件
interface AuditLogModalProps {
  logs: AuditLog[];
  onClose: () => void;
}

function AuditLogModal({ logs, onClose }: AuditLogModalProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(logs.length / pageSize);
  const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);

  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN');
  };

  // 获取操作图标
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login':
        return <LogIn className="w-4 h-4 text-green-600" />;
      case 'create':
        return <Plus className="w-4 h-4 text-blue-600" />;
      case 'update':
        return <Pencil className="w-4 h-4 text-yellow-600" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'login':
        return '登录';
      case 'create':
        return '创建';
      case 'update':
        return '更新';
      case 'delete':
        return '删除';
      default:
        return action;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">操作日志</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    用户
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    操作
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    资源
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    IP地址
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {log.username}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="text-sm text-gray-900">
                          {getActionText(log.action)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.resource}
                      {log.resourceId && (
                        <span className="ml-1 text-gray-400">#{log.resourceId}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      {log.ip}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                显示 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, logs.length)} 条，共 {logs.length} 条
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-700">
                  第 {page} / {totalPages} 页
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-100">
            <button className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              导出日志
            </button>
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
