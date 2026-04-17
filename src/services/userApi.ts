// User Management API Service
import { User, UserRole, UserStatus, AuditLog, UserFormData } from '../types';

// Generic fetch wrapper that handles auth token
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
  const url = `${apiBaseUrl}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`,
    };
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`User API Error [${endpoint}]:`, error);
    throw error;
  }
}

// User API
export const usersApi = {
  // Get all users with optional filters
  getAll: (params?: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    return fetchApi(`/users${query ? `?${query}` : ''}`);
  },

  // Get user by ID
  getById: (id: string) => fetchApi(`/users/${id}`),

  // Create new user
  create: (data: UserFormData) =>
    fetchApi('/users', { method: 'POST', body: JSON.stringify(data) }),

  // Update user
  update: (id: string, data: Partial<UserFormData>) =>
    fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Delete user
  delete: (id: string) => fetchApi(`/users/${id}`, { method: 'DELETE' }),

  // Change user password (admin only)
  changePassword: (id: string, newPassword: string) =>
    fetchApi(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword }),
    }),

  // Lock user account
  lock: (id: string) => fetchApi(`/users/${id}/lock`, { method: 'POST' }),

  // Unlock user account
  unlock: (id: string) => fetchApi(`/users/${id}/unlock`, { method: 'POST' }),

  // Get user permissions
  getPermissions: (userId?: string) =>
    fetchApi(`/users/${userId || 'me'}/permissions`),
};

// Auth API
export const authApi = {
  // Login
  login: (username: string, password: string) =>
    fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  // Logout
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),

  // Get current user
  getCurrentUser: () => fetchApi('/auth/me'),

  // Refresh token
  refreshToken: () => fetchApi('/auth/refresh', { method: 'POST' }),

  // Change own password
  changeMyPassword: (oldPassword: string, newPassword: string) =>
    fetchApi('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),
};

// Audit Log API
export const auditApi = {
  // Get audit logs with filters
  getLogs: (params?: {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.action) searchParams.append('action', params.action);
    if (params?.resource) searchParams.append('resource', params.resource);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize));

    const query = searchParams.toString();
    return fetchApi(`/audit${query ? `?${query}` : ''}`);
  },

  // Export audit logs
  exportLogs: (params?: {
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'json';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.format) searchParams.append('format', params.format);

    const query = searchParams.toString();
    return fetchApi(`/audit/export${query ? `?${query}` : ''}`);
  },
};

// Session Management API
export const sessionApi = {
  // Get active sessions for current user
  getMySessions: () => fetchApi('/sessions'),

  // Revoke a session
  revokeSession: (sessionId: string) =>
    fetchApi(`/sessions/${sessionId}`, { method: 'DELETE' }),

  // Revoke all other sessions
  revokeAllOtherSessions: () =>
    fetchApi('/sessions/revoke-others', { method: 'POST' }),
};

// Permission check helper
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  // Check for wildcard permission (admin)
  if (userPermissions.includes('*')) return true;
  if (userPermissions.includes('*:*')) return true;

  // Check exact match
  if (userPermissions.includes(requiredPermission)) return true;

  // Check wildcard for resource (e.g., 'user:*' allows 'user:create')
  const [resource, action] = requiredPermission.split(':');
  if (userPermissions.includes(`${resource}:*`)) return true;

  return false;
};

// Role check helper
export const hasRole = (
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean => {
  return requiredRoles.includes(userRole);
};

// Permission definitions by action
export const Permissions = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',

  // Node management
  NODE_CREATE: 'node:create',
  NODE_READ: 'node:read',
  NODE_UPDATE: 'node:update',
  NODE_DELETE: 'node:delete',

  // Task management
  TASK_CREATE: 'task:create',
  TASK_READ: 'task:read',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',

  // Alert management
  ALERT_READ: 'alert:read',
  ALERT_ACKNOWLEDGE: 'alert:acknowledge',
  ALERT_CONFIG: 'alert:config',

  // Config management
  CONFIG_READ: 'config:read',
  CONFIG_UPDATE: 'config:update',

  // Audit
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
};

export default {
  users: usersApi,
  auth: authApi,
  audit: auditApi,
  session: sessionApi,
  hasPermission,
  hasRole,
  Permissions,
};
