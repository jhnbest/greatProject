import api from '@/api';

const state = {
  userInfo: null,
  users: [],
  usersTotal: 0
};

const mutations = {
  SET_USER_INFO(state, info) {
    state.userInfo = info;
  },
  CLEAR_USER_INFO(state) {
    state.userInfo = null;
  },
  SET_USERS(state, { list, total }) {
    state.users = list;
    state.usersTotal = total;
  }
};

const actions = {
  async login({ commit }, { username, password }) {
    try {
      const response = await api.auth.login(username, password);
      if (response.data.success) {
        commit('SET_TOKEN', response.data.data.token);
        commit('SET_USER_INFO', response.data.data.user);
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async logout({ dispatch }) {
    try {
      await api.auth.logout();
    } catch (error) {
      console.error('登出请求失败', error);
    }
    dispatch('app/logout', null, { root: true });
  },

  async getUserInfo({ commit }) {
    try {
      const response = await api.auth.getProfile();
      if (response.data.success) {
        commit('SET_USER_INFO', response.data.data);
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
    }
  },

  async getUsers({ commit }, params) {
    try {
      const response = await api.auth.getUsers(params);
      if (response.data.success) {
        commit('SET_USERS', response.data.data);
      }
    } catch (error) {
      console.error('获取用户列表失败', error);
    }
  },

  async updateUserStatus({ dispatch }, { id, status }) {
    try {
      const response = await api.auth.updateUserStatus(id, status);
      if (response.data.success) {
        dispatch('getUsers', {});
        return { success: true };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async changePassword(_, { oldPassword, newPassword }) {
    try {
      const response = await api.auth.changePassword(oldPassword, newPassword);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

const getters = {
  userInfo: state => state.userInfo,
  users: state => state.users,
  usersTotal: state => state.usersTotal,
  isAdmin: state => state.userInfo?.role === 'ADMIN'
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
