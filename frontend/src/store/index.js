import Vue from 'vue';
import Vuex from 'vuex';
import user from './modules/user';
import device from './modules/device';
import alarm from './modules/alarm';
import company from './modules/company';

Vue.use(Vuex);

export default new Vuex.Store({
  modules: {
    user,
    device,
    alarm,
    company
  },
  state: {
    token: localStorage.getItem('token') || '',
    sidebarCollapsed: false,
    loading: false,
    socketConnected: false
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token;
      localStorage.setItem('token', token);
    },
    CLEAR_TOKEN(state) {
      state.token = '';
      localStorage.removeItem('token');
    },
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    SET_SOCKET_CONNECTED(state, connected) {
      state.socketConnected = connected;
    }
  },
  actions: {
    logout({ commit }) {
      commit('CLEAR_TOKEN');
      commit('user/CLEAR_USER_INFO');
    }
  },
  getters: {
    isLoggedIn: state => !!state.token,
    loading: state => state.loading,
    socketConnected: state => state.socketConnected
  }
});
