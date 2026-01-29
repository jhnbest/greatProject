import api from '@/api';

const state = {
  devices: [],
  devicesTotal: 0,
  currentDevice: null,
  realtimeData: null,
  deviceStatistics: null,
  brands: []
};

const mutations = {
  SET_DEVICES(state, { list, total }) {
    state.devices = list;
    state.devicesTotal = total;
  },
  SET_CURRENT_DEVICE(state, device) {
    state.currentDevice = device;
  },
  SET_REALTIME_DATA(state, data) {
    state.realtimeData = data;
  },
  SET_DEVICE_STATISTICS(state, stats) {
    state.deviceStatistics = stats;
  },
  SET_BRANDS(state, brands) {
    state.brands = brands;
  }
};

const actions = {
  async getDevices({ commit }, params) {
    try {
      const response = await api.getDevices(params);
      if (response.data.success) {
        commit('SET_DEVICES', response.data.data);
      }
    } catch (error) {
      console.error('获取设备列表失败', error);
    }
  },

  async getAllDevices({ commit }) {
    try {
      const response = await api.getAllDevices();
      if (response.data.success) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error('获取全部设备失败', error);
      return [];
    }
  },

  async getDeviceDetail({ commit }, id) {
    try {
      const response = await api.getDevice(id);
      if (response.data.success) {
        commit('SET_CURRENT_DEVICE', response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('获取设备详情失败', error);
      return null;
    }
  },

  async getRealtimeData({ commit }, params) {
    try {
      const response = await api.getRealtimeMonitor(params);
      if (response.data.success) {
        commit('SET_REALTIME_DATA', response.data.data);
      }
    } catch (error) {
      console.error('获取实时监控数据失败', error);
    }
  },

  async getDeviceStatistics({ commit }) {
    try {
      const response = await api.getMonitorStatistics();
      if (response.data.success) {
        commit('SET_DEVICE_STATISTICS', response.data.data);
      }
    } catch (error) {
      console.error('获取设备统计失败', error);
    }
  },

  async getBrands({ commit }) {
    try {
      const response = await api.getDeviceBrands();
      if (response.data.success) {
        commit('SET_BRANDS', response.data.data);
      }
    } catch (error) {
      console.error('获取品牌列表失败', error);
    }
  },

  async createDevice(_, deviceData) {
    try {
      const response = await api.createDevice(deviceData);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async updateDevice(_, { id, data }) {
    try {
      const response = await api.updateDevice(id, data);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async deleteDevice(_, id) {
    try {
      const response = await api.deleteDevice(id);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async testDeviceConnection(_, id) {
    try {
      const response = await api.testDeviceConnection(id);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async collectDeviceData(_, id) {
    try {
      const response = await api.collectDeviceData(id);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async getDeviceHistory(_, { id, params }) {
    try {
      const response = await api.getDeviceHistory(id, params);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async updateDeviceStatus(_, { id, status }) {
    try {
      const response = await api.updateDeviceStatus(id, status);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

const getters = {
  devices: state => state.devices,
  devicesTotal: state => state.devicesTotal,
  currentDevice: state => state.currentDevice,
  realtimeData: state => state.realtimeData,
  deviceStatistics: state => state.deviceStatistics,
  brands: state => state.brands
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
