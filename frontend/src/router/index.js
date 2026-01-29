import Vue from 'vue';
import Router from 'vue-router';

Vue.use(Router);

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/dashboard/index.vue'),
    meta: { requireAuth: true, title: '仪表盘' }
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('@/views/monitor/index.vue'),
    meta: { requireAuth: true, title: '实时监控' }
  },
  {
    path: '/devices',
    name: 'devices',
    component: () => import('@/views/devices/index.vue'),
    meta: { requireAuth: true, title: '设备管理' }
  },
  {
    path: '/devices/:id',
    name: 'device-detail',
    component: () => import('@/views/devices/detail.vue'),
    meta: { requireAuth: true, title: '设备详情' }
  },
  {
    path: '/companies',
    name: 'companies',
    component: () => import('@/views/companies/index.vue'),
    meta: { requireAuth: true, title: '分公司管理', roles: ['ADMIN'] }
  },
  {
    path: '/alarms',
    name: 'alarms',
    component: () => import('@/views/alarms/index.vue'),
    meta: { requireAuth: true, title: '告警管理' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/settings/index.vue'),
    meta: { requireAuth: true, title: '个人设置' }
  },
  {
    path: '/403',
    name: '403',
    component: () => import('@/views/error/403.vue'),
    meta: { title: '无权限' }
  },
  {
    path: '*',
    component: () => import('@/views/error/404.vue'),
    meta: { title: '页面不存在' }
  }
];

const router = new Router({
  routes,
  scrollBehavior() {
    return { x: 0, y: 0 };
  }
});

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'NVR监控'} - NVR设备监控系统`;
  next();
});

export default router;
