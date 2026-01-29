<template>
  <div id="app" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <template v-if="token">
      <Sidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
      <div class="main-container">
        <Navbar @toggle="toggleSidebar" />
        <div class="content-wrapper">
          <router-view />
        </div>
      </div>
    </template>
    <template v-else>
      <router-view />
    </template>
    
    <AlarmNotification />
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex';
import Sidebar from '@/components/layout/Sidebar.vue';
import Navbar from '@/components/layout/Navbar.vue';
import AlarmNotification from '@/components/alarm/AlarmNotification.vue';

export default {
  name: 'App',
  components: {
    Sidebar,
    Navbar,
    AlarmNotification
  },
  data() {
    return {
      sidebarCollapsed: false
    };
  },
  computed: {
    ...mapState(['token'])
  },
  methods: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }
};
</script>

<style lang="scss">
#app {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.main-container {
  flex: 1;
  margin-left: 220px;
  transition: margin-left 0.3s;
}

#app.sidebar-collapsed .main-container {
  margin-left: 64px;
}

.content-wrapper {
  padding: 20px;
  min-height: calc(100vh - 60px);
}

@media (max-width: 768px) {
  .main-container {
    margin-left: 0;
  }
}
</style>
