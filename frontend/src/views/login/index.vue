<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <img src="@/assets/logo.svg" alt="Logo" class="logo" />
        <h1>NVR设备监控系统</h1>
        <p>实时监控 · 智能告警 · 统一管理</p>
      </div>
      
      <el-form ref="loginForm" :model="form" :rules="rules" @submit.native.prevent="handleLogin">
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            prefix-icon="el-icon-user"
            clearable
          ></el-input>
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            prefix-icon="el-icon-lock"
            show-password
            @keyup.enter="handleLogin"
          ></el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            native-type="submit"
            class="login-btn"
          >
            {{ loading ? '登录中...' : '登 录' }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <span>技术支持：海康威视、大华NVR设备集成</span>
      </div>
    </div>
    
    <div class="login-bg">
      <div class="overlay"></div>
    </div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';

export default {
  name: 'Login',
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' }
        ],
        password: [
          { required: true, message: '请输入密码', trigger: 'blur' }
        ]
      },
      loading: false
    };
  },
  methods: {
    ...mapActions('user', ['login']),
    async handleLogin() {
      try {
        await this.$refs.loginForm.validate();
        this.loading = true;
        
        const result = await this.login({
          username: this.form.username,
          password: this.form.password
        });
        
        if (result.success) {
          const redirect = this.$route.query.redirect || '/';
          this.$router.push(redirect);
          this.$message.success('登录成功');
        } else {
          this.$message.error(result.message || '登录失败');
        }
      } catch (error) {
        console.error('登录失败', error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.login-container {
  display: flex;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.login-box {
  width: 400px;
  padding: 60px 40px;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
  
  .logo {
    width: 64px;
    height: 64px;
    margin-bottom: 16px;
  }
  
  h1 {
    font-size: 24px;
    font-weight: bold;
    color: #303133;
    margin: 0 0 8px;
  }
  
  p {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 16px;
}

.login-footer {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin-top: 40px;
}

.login-bg {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  .overlay {
    position: absolute;
    inset: 0;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/></svg>');
    background-size: 200px;
    animation: rotate 60s linear infinite;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .login-box {
    width: 100%;
    padding: 40px 20px;
  }
  
  .login-bg {
    display: none;
  }
}
</style>
