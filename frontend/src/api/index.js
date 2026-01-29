import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else if (status === 403) {
        window.location.href = '/403';
      }
    }
    return Promise.reject(error);
  }
);

const api = {
  auth: {
    login: (username, password) => apiClient.post('/auth/login', { username, password }),
    register: (data) => apiClient.post('/auth/register', data),
    logout: () => apiClient.post('/auth/logout'),
    getProfile: () => apiClient.get('/auth/profile'),
    changePassword: (oldPassword, newPassword) => 
      apiClient.put('/auth/password', { oldPassword, newPassword }),
    getUsers: (params) => apiClient.get('/auth/users', { params }),
    updateUserStatus: (id, status) => apiClient.put(`/auth/users/${id}/status`, { status })
  },

  companies: {
    getList: () => apiClient.get('/companies'),
    getTree: () => apiClient.get('/companies/tree'),
    getDetail: (id) => apiClient.get(`/companies/${id}`),
    getStats: (id) => apiClient.get(`/companies/${id}/stats`),
    create: (data) => apiClient.post('/companies', data),
    update: (id, data) => apiClient.put(`/companies/${id}`, data),
    delete: (id) => apiClient.delete(`/companies/${id}`)
  },

  devices: {
    getList: (params) => apiClient.get('/devices', { params }),
    getAll: () => apiClient.get('/devices/all'),
    getDetail: (id) => apiClient.get(`/devices/${id}`),
    getBrands: () => apiClient.get('/devices/brands'),
    create: (data) => apiClient.post('/devices', data),
    update: (id, data) => apiClient.put(`/devices/${id}`, data),
    delete: (id) => apiClient.delete(`/devices/${id}`),
    testConnection: (id) => apiClient.post(`/devices/${id}/test`),
    collectData: (id) => apiClient.post(`/devices/${id}/collect`),
    getHistory: (id, params) => apiClient.get(`/devices/${id}/history`, { params }),
    updateStatus: (id, status) => apiClient.put(`/devices/${id}/status`, { status })
  },

  monitor: {
    getRealtime: (params) => apiClient.get('/monitor/realtime', { params }),
    getDeviceDetail: (id) => apiClient.get(`/monitor/device/${id}`),
    getDeviceTrend: (id, params) => apiClient.get(`/monitor/device/${id}/trend`, { params }),
    getStatistics: (params) => apiClient.get('/monitor/statistics', { params }),
    getDiskDistribution: () => apiClient.get('/monitor/disk-usage/distribution'),
    getOnlineDistribution: () => apiClient.get('/monitor/online-status/distribution'),
    collectAll: () => apiClient.post('/monitor/collect/all')
  },

  alarms: {
    getList: (params) => apiClient.get('/alarms', { params }),
    getPending: (params) => apiClient.get('/alarms/pending', { params }),
    getStatistics: (params) => apiClient.get('/alarms/statistics', { params }),
    getTrend: (days) => apiClient.get('/alarms/trend', { params: { days } }),
    getTypes: () => apiClient.get('/alarms/types'),
    getLevels: () => apiClient.get('/alarms/levels'),
    handle: (id, handleContent) => apiClient.post(`/alarms/${id}/handle`, { handleContent }),
    batchHandle: (alarmIds, handleContent) => apiClient.put('/alarms/batch/handle', { alarmIds, handleContent }),
    getDetail: (id) => apiClient.get(`/alarms/${id}`)
  },

  dashboard: {
    getOverview: (params) => apiClient.get('/dashboard/overview', { params }),
    getDeviceStats: (params) => apiClient.get('/dashboard/device-stats', { params }),
    getBrandDistribution: (params) => apiClient.get('/dashboard/brand-distribution', { params }),
    getDiskUsageChart: (params) => apiClient.get('/dashboard/disk-usage-chart', { params }),
    getOnlineStatusChart: (params) => apiClient.get('/dashboard/online-status-chart', { params }),
    getAlarmTrend: (days) => apiClient.get('/dashboard/alarm-trend', { params: { days } }),
    getAlarmTypeDistribution: (params) => apiClient.get('/dashboard/alarm-type-distribution', { params }),
    getRecentAlarms: (limit) => apiClient.get('/dashboard/recent-alarms', { params: { limit } }),
    getTopDevices: (params) => apiClient.get('/dashboard/top-devices', { params })
  }
};

export default api;
