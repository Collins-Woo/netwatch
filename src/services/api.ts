// API Configuration
// 默认使用相对路径，通过 Nginx 代理转发到后端
// 如果设置了 VITE_API_URL，则直接连接指定的后端地址
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

// Tasks API
export const tasksApi = {
  getAll: (params?: { search?: string; type?: string; status?: string; enabled?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.enabled !== undefined) searchParams.append('enabled', String(params.enabled));

    const query = searchParams.toString();
    return fetchApi(`/tasks${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => fetchApi(`/tasks/${id}`),

  create: (data: any) => fetchApi('/tasks', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) => fetchApi(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) => fetchApi(`/tasks/${id}`, { method: 'DELETE' }),

  batchDelete: (ids: string[]) => fetchApi('/tasks/batch-delete', { method: 'POST', body: JSON.stringify({ ids }) }),

  toggle: (id: string) => fetchApi(`/tasks/${id}/toggle`, { method: 'POST' }),
};

// Nodes API
export const nodesApi = {
  getAll: (params?: { search?: string; region?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.region) searchParams.append('region', params.region);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return fetchApi(`/nodes${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => fetchApi(`/nodes/${id}`),

  create: (data: any) => fetchApi('/nodes', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) => fetchApi(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) => fetchApi(`/nodes/${id}`, { method: 'DELETE' }),

  regenerateKey: (id: string) => fetchApi(`/nodes/${id}/regenerate-key`, { method: 'POST' }),
};

// Alerts API
export const alertsApi = {
  getConfig: () => fetchApi('/alerts/config'),

  saveConfig: (data: any) => fetchApi('/alerts/config', { method: 'POST', body: JSON.stringify(data) }),

  testDingtalk: (data: any) => fetchApi('/alerts/config/test', { method: 'POST', body: JSON.stringify(data) }),

  getAll: (params?: { taskId?: string; level?: string; acknowledged?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.taskId) searchParams.append('taskId', params.taskId);
    if (params?.level) searchParams.append('level', params.level);
    if (params?.acknowledged !== undefined) searchParams.append('acknowledged', params.acknowledged);

    const query = searchParams.toString();
    return fetchApi(`/alerts${query ? `?${query}` : ''}`);
  },

  acknowledge: (id: string) => fetchApi(`/alerts/${id}/acknowledge`, { method: 'PUT' }),
};

// Status API
export const statusApi = {
  getAll: (params?: { status?: string; type?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return fetchApi(`/status${query ? `?${query}` : ''}`);
  },

  getStats: () => fetchApi('/status/stats'),

  getDetail: (taskId: string) => fetchApi(`/status/${taskId}`),
};

// History API
export const historyApi = {
  getResponseTime: (params?: { taskId?: string; limit?: number; range?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.taskId) searchParams.append('taskId', params.taskId);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.range) searchParams.append('range', params.range);

    const query = searchParams.toString();
    return fetchApi(`/history${query ? `?${query}` : ''}`);
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: () => fetchApi('/dashboard/stats'),
};

export default {
  tasks: tasksApi,
  nodes: nodesApi,
  alerts: alertsApi,
  status: statusApi,
  history: historyApi,
  dashboard: dashboardApi,
};
