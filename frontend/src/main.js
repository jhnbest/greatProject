import Vue from 'vue';
import ElementUI from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
import locale from 'element-ui/lib/locale/lang/zh-CN';
import App from './App.vue';
import router from './router';
import store from './store';
import './styles/index.scss';

Vue.use(ElementUI, { locale });

Vue.config.productionTip = false;

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.requireAuth) {
    if (!token) {
      next({ name: 'login', query: { redirect: to.fullPath } });
    } else {
      next();
    }
  } else {
    next();
  }
});

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app');
