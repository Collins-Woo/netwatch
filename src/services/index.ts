/**
 * API Service Index
 *
 * 默认使用真实后端API，仅当显式设置 VITE_USE_MOCK_API=true 时使用Mock数据
 * VITE_USE_MOCK_API=true - 使用Mock数据（前端Demo模式）
 * VITE_USE_MOCK_API=false - 使用真实后端API（默认）
 */

import * as mockApi from './mockApi';
import * as apiModule from './api';
import * as userApiModule from './userApi';

// Determine which API to use - 默认使用真实API（仅当显式设置 VITE_USE_MOCK_API=true 时使用Mock）
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

// Create API proxy based on mode
const apiProxy = {
  get tasks() { return useMockApi ? mockApi.tasksApi : apiModule.tasksApi; },
  get nodes() { return useMockApi ? mockApi.nodesApi : apiModule.nodesApi; },
  get alerts() { return useMockApi ? mockApi.alertsApi : apiModule.alertsApi; },
  get status() { return useMockApi ? mockApi.statusApi : apiModule.statusApi; },
  get history() { return useMockApi ? mockApi.historyApi : apiModule.historyApi; },
  get dashboard() { return useMockApi ? mockApi.dashboardApi : apiModule.dashboardApi; },
  get users() { return useMockApi ? mockApi.usersApi : userApiModule.usersApi; },
  get auth() { return useMockApi ? mockApi.authApi : userApiModule.authApi; },
  get audit() { return useMockApi ? mockApi.auditApi : userApiModule.auditApi; },
  get session() { return useMockApi ? mockApi.sessionApi : userApiModule.sessionApi; },
};

// Export individual APIs
export const tasksApi = useMockApi ? mockApi.tasksApi : apiModule.tasksApi;
export const nodesApi = useMockApi ? mockApi.nodesApi : apiModule.nodesApi;
export const alertsApi = useMockApi ? mockApi.alertsApi : apiModule.alertsApi;
export const statusApi = useMockApi ? mockApi.statusApi : apiModule.statusApi;
export const historyApi = useMockApi ? mockApi.historyApi : apiModule.historyApi;
export const dashboardApi = useMockApi ? mockApi.dashboardApi : apiModule.dashboardApi;

// User management APIs
export const usersApi = useMockApi ? mockApi.usersApi : userApiModule.usersApi;
export const authApi = useMockApi ? mockApi.authApi : userApiModule.authApi;
export const auditApi = useMockApi ? mockApi.auditApi : userApiModule.auditApi;
export const sessionApi = useMockApi ? mockApi.sessionApi : userApiModule.sessionApi;

// Permission utilities
export const hasPermission = userApiModule.hasPermission;
export const hasRole = userApiModule.hasRole;
export const Permissions = userApiModule.Permissions;

export default useMockApi ? mockApi.default : apiProxy;
