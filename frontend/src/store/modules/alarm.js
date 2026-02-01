import api from '@/api';

const state = {
  alarms: [],
  alarmsTotal: 0,
  pendingAlarms: [],
  alarmStatistics: null,
  alarmTrend: [],
  alarmTypes: [],
  alarmLevels: []
};

const mutations = {
  SET_ALARMS(state, { list, total }) {
    state.alarms = list;
    state.alarmsTotal = total;
  },
  SET_PENDING_ALARMS(state, alarms) {
    state.pendingAlarms = alarms;
  },
  SET_ALARM_STATISTICS(state, stats) {
    state.alarmStatistics = stats;
  },
  SET_ALARM_TREND(state, trend) {
    state.alarmTrend = trend;
  },
  SET_ALARM_TYPES(state, types) {
    state.alarmTypes = types;
  },
  SET_ALARM_LEVELS(state, levels) {
    state.alarmLevels = levels;
  },
  ADD_PENDING_ALARM(state, alarm) {
    state.pendingAlarms.unshift(alarm);
    state.alarmsTotal++;
  },
  REMOVE_PENDING_ALARM(state, alarmId) {
    const index = state.pendingAlarms.findIndex(a => a.id === alarmId);
    if (index > -1) {
      state.pendingAlarms.splice(index, 1);
    }
  }
};

const actions = {
  async getAlarms({ commit }, params) {
    try {
      const response = await api.alarms.getList(params);
      if (response.data.success) {
        commit('SET_ALARMS', response.data.data);
      }
    } catch (error) {
      console.error('获取告警列表失败', error);
    }
  },

  async getPendingAlarms({ commit }) {
    try {
      const response = await api.alarms.getPending();
      if (response.data.success) {
        commit('SET_PENDING_ALARMS', response.data.data);
      }
    } catch (error) {
      console.error('获取待处理告警失败', error);
    }
  },

  async getAlarmStatistics({ commit }) {
    try {
      const response = await api.alarms.getStatistics();
      if (response.data.success) {
        commit('SET_ALARM_STATISTICS', response.data.data);
      }
    } catch (error) {
      console.error('获取告警统计失败', error);
    }
  },

  async getAlarmTrend({ commit }, days) {
    try {
      const response = await api.alarms.getTrend(days);
      if (response.data.success) {
        commit('SET_ALARM_TREND', response.data.data);
      }
    } catch (error) {
      console.error('获取告警趋势失败', error);
    }
  },

  async getAlarmTypes({ commit }) {
    try {
      const response = await api.alarms.getTypes();
      if (response.data.success) {
        commit('SET_ALARM_TYPES', response.data.data);
      }
    } catch (error) {
      console.error('获取告警类型失败', error);
    }
  },

  async getAlarmLevels({ commit }) {
    try {
      const response = await api.alarms.getLevels();
      if (response.data.success) {
        commit('SET_ALARM_LEVELS', response.data.data);
      }
    } catch (error) {
      console.error('获取告警级别失败', error);
    }
  },

  async handleAlarm({ dispatch }, { id, handleContent }) {
    try {
      const response = await api.alarms.handle(id, handleContent);
      if (response.data.success) {
        dispatch('getPendingAlarms');
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async batchHandleAlarms({ dispatch }, { alarmIds, handleContent }) {
    try {
      const response = await api.alarms.batchHandle(alarmIds, handleContent);
      if (response.data.success) {
        dispatch('getPendingAlarms');
        return response.data;
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  addAlarm({ commit }, alarm) {
    commit('ADD_PENDING_ALARM', alarm);
  },

  removeAlarm({ commit }, alarmId) {
    commit('REMOVE_PENDING_ALARM', alarmId);
  }
};

const getters = {
  alarms: state => state.alarms,
  alarmsTotal: state => state.alarmsTotal,
  pendingAlarms: state => state.pendingAlarms,
  pendingCount: state => state.pendingAlarms.length,
  alarmStatistics: state => state.alarmStatistics,
  alarmTrend: state => state.alarmTrend,
  alarmTypes: state => state.alarmTypes,
  alarmLevels: state => state.alarmLevels
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
