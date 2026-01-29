import api from '@/api';

const state = {
  companies: [],
  companyTree: [],
  currentCompany: null,
  companyStats: null
};

const mutations = {
  SET_COMPANIES(state, companies) {
    state.companies = companies;
  },
  SET_COMPANY_TREE(state, tree) {
    state.companyTree = tree;
  },
  SET_CURRENT_COMPANY(state, company) {
    state.currentCompany = company;
  },
  SET_COMPANY_STATS(state, stats) {
    state.companyStats = stats;
  }
};

const actions = {
  async getCompanies({ commit }) {
    try {
      const response = await api.getCompanies();
      if (response.data.success) {
        commit('SET_COMPANIES', response.data.data);
      }
    } catch (error) {
      console.error('获取公司列表失败', error);
    }
  },

  async getCompanyTree({ commit }) {
    try {
      const response = await api.getCompanyTree();
      if (response.data.success) {
        commit('SET_COMPANY_TREE', response.data.data);
      }
    } catch (error) {
      console.error('获取公司树失败', error);
    }
  },

  async getCompanyDetail({ commit }, id) {
    try {
      const response = await api.getCompany(id);
      if (response.data.success) {
        commit('SET_CURRENT_COMPANY', response.data.data);
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('获取公司详情失败', error);
      return null;
    }
  },

  async getCompanyStats({ commit }, id) {
    try {
      const response = await api.getCompanyStats(id);
      if (response.data.success) {
        commit('SET_COMPANY_STATS', response.data.data);
      }
    } catch (error) {
      console.error('获取公司统计失败', error);
    }
  },

  async createCompany(_, companyData) {
    try {
      const response = await api.createCompany(companyData);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async updateCompany(_, { id, data }) {
    try {
      const response = await api.updateCompany(id, data);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  },

  async deleteCompany(_, id) {
    try {
      const response = await api.deleteCompany(id);
      return response.data;
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
};

const getters = {
  companies: state => state.companies,
  companyTree: state => state.companyTree,
  currentCompany: state => state.currentCompany,
  companyStats: state => state.companyStats
};

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
};
