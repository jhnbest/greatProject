<template>
  <div class="sidebar">
    <div class="logo-container">
      <img src="@/assets/logo.svg" alt="Logo" class="logo" />
      <span v-show="!collapsed" class="title">NVR监控平台</span>
    </div>

    <el-menu
      :default-active="currentRoute"
      :collapse="collapsed"
      :unique-opened="true"
      background-color="#304156"
      text-color="#bfcbd9"
      active-text-color="#409EFF"
      router
    >
      <el-menu-item v-for="route in menus" :key="route.path" :index="route.path">
        <i :class="route.meta.icon"></i>
        <span slot="title">{{ route.meta.title }}</span>
      </el-menu-item>
    </el-menu>

    <div class="collapse-btn" @click="$emit('toggle')">
      <i :class="collapsed ? 'el-icon-d-arrow-right' : 'el-icon-d-arrow-left'"></i>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Sidebar',
  props: {
    collapsed: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    currentRoute() {
      return this.$route.path;
    },
    menus() {
      return this.$router.options.routes.filter(r => 
        r.meta && r.meta.requireAuth && r.path !== '*'
      );
    }
  }
};
</script>

<style lang="scss" scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 220px;
  background-color: #304156;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: width 0.3s;
}

.sidebar.collapsed {
  width: 64px;
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  background-color: #263445;
  
  .logo {
    width: 32px;
    height: 32px;
  }
  
  .title {
    margin-left: 12px;
    color: #fff;
    font-size: 16px;
    font-weight: bold;
    white-space: nowrap;
  }
}

.el-menu {
  flex: 1;
  border-right: none;
  
  &.el-menu--collapse {
    .el-menu-item {
      padding: 0 !important;
      justify-content: center;
      
      i {
        margin-right: 0;
      }
    }
  }
}

.el-menu-item {
  &:hover {
    background-color: #263445 !important;
  }
  
  &.is-active {
    background-color: #1f2d3d !important;
  }
  
  i {
    margin-right: 8px;
    font-size: 18px;
  }
}

.collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #263445;
  color: #bfcbd9;
  cursor: pointer;
  font-size: 16px;
  
  &:hover {
    color: #409EFF;
  }
}
</style>
