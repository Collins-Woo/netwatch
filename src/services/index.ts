/**
 * API Service Index
 *
 * 根据环境变量决定使用真实API还是Mock API
 * VITE_USE_MOCK_API=true - 使用Mock数据（前端Demo模式）
 * VITE_USE_MOCK_API=false - 使用真实后端API
 */

import * as mockApi from './mockApi';
import * as userApi from './userApi';

// Determine which API to use
const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false' || !import.meta.env.VITE_API_URL;

// Import real API conditionally
let realApi: any = null;

async function loadRealApi() {
  if (!realApi) {
    const module = await import('./api');
    realApi = module.default;
  }
  return realApi;
}

// Get the appropriate API based on environment
async function getApi() {
  if (useMockApi) {
    return mockApi.default;
  }
  return loadRealApi();
}

// Create dynamic API proxy
const apiProxy = {
  get tasks() { return useMockApi ? mockApi.tasksApi : null; },
  get nodes() { return useMockApi ? mockApi.nodesApi : null; },
  get alerts() { return useMockApi ? mockApi.alertsApi : null; },
  get status() { return useMockApi ? mockApi.statusApi : null; },
  get history() { return useMockApi ? mockApi.historyApi : null; },
  get dashboard() { return useMockApi ? mockApi.dashboardApi : null; },
  get users() { return useMockApi ? mockApi.usersApi : userApi.usersApi; },
  get auth() { return useMockApi ? mockApi.authApi : userApi.authApi; },
  get audit() { return useMockApi ? mockApi.auditApi : userApi.auditApi; },
  get session() { return useMockApi ? mockApi.sessionApi : userApi.sessionApi; },
};

// Export individual APIs
export const tasksApi = useMockApi ? mockApi.tasksApi : null as any;
export const nodesApi = useMockApi ? mockApi.nodesApi : null as any;
export const alertsApi = useMockApi ? mockApi.alertsApi : null as any;
export const statusApi = useMockApi ? mockApi.statusApi : null as any;
export const historyApi = useMockApi ? mockApi.historyApi : null as any;
export const dashboardApi = useMockApi ? mockApi.dashboardApi : null as any;

// User management APIs (available in both modes)
export const usersApi = useMockApi ? mockApi.usersApi : userApi.usersApi;
export const authApi = useMockApi ? mockApi.authApi : userApi.authApi;
export const auditApi = useMockApi ? mockApi.auditApi : userApi.auditApi;
export const sessionApi = useMockApi ? mockApi.sessionApi : userApi.sessionApi;

// Permission utilities
export const hasPermission = userApi.hasPermission;
export const hasRole = userApi.hasRole;
export const Permissions = userApi.Permissions;

export default useMockApi ? mockApi.default : apiProxy;
