<template>
  <div class="navbar">
    <div class="left">
      <i class="el-icon-menu hamburger" @click="$emit('toggle')"></i>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item v-if="currentPageTitle">
          {{ currentPageTitle }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="right">
      <el-badge :value="pendingAlarmCount" :hidden="pendingAlarmCount === 0" class="alarm-badge">
        <el-button icon="el-icon-bell" circle @click="goToAlarms"></el-button>
      </el-badge>

      <el-dropdown trigger="click" @command="handleCommand">
        <div class="user-info">
          <el-avatar :size="32" icon="el-icon-user"></el-avatar>
          <span class="username">{{ userInfo?.realName || userInfo?.username }}</span>
          <i class="el-icon-caret-bottom"></i>
        </div>
        <el-dropdown-menu slot="dropdown">
          <el-dropdown-item command="profile">
            <i class="el-icon-user"></i> 个人中心
          </el-dropdown-item>
          <el-dropdown-item command="settings">
            <i class="el-icon-setting"></i> 设置
          </el-dropdown-item>
          <el-dropdown-item divided command="logout">
            <i class="el-icon-switch-button"></i> 退出登录
          </el-dropdown-item>
        </el-dropdown-menu>
      </el-dropdown>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';

export default {
  name: 'Navbar',
  computed: {
    ...mapState(['user']),
    ...mapGetters('alarm', ['pendingCount']),
    userInfo() {
      return this.user.userInfo;
    },
    pendingAlarmCount() {
      return this.pendingCount;
    },
    currentPageTitle() {
      return this.$route.meta?.title;
    }
  },
  methods: {
    handleCommand(command) {
      switch (command) {
        case 'profile':
          this.$router.push('/profile');
          break;
        case 'settings':
          this.$router.push('/settings');
          break;
        case 'logout':
          this.logout();
          break;
      }
    },
    goToAlarms() {
      this.$router.push('/alarms');
    },
    async logout() {
      await this.$store.dispatch('user/logout');
      this.$router.push('/login');
    }
  }
};
</script>

<style lang="scss" scoped>
.navbar {
  height: 60px;
  background-color: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.left {
  display: flex;
  align-items: center;
  
  .hamburger {
    font-size: 20px;
    cursor: pointer;
    margin-right: 16px;
    
    &:hover {
      color: #409EFF;
    }
  }
}

.right {
  display: flex;
  align-items: center;
  
  .alarm-badge {
    margin-right: 20px;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    cursor: pointer;
    
    .username {
      margin: 0 8px;
      font-size: 14px;
    }
    
    &:hover {
      opacity: 0.8;
    }
  }
}
</style>
