<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">403</div>
      <div class="error-message">抱歉，您没有权限访问此页面</div>
      <div class="error-description">
        您的权限不足，请联系管理员获取相应权限
      </div>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<script>
export default {
  name: '403Page',
  methods: {
    goHome() {
      this.$router.push('/');
    }
  }
};
</script>

<style lang="scss" scoped>
.error-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.error-content {
  text-align: center;
  
  .error-code {
    font-size: 120px;
    font-weight: bold;
    color: #E6A23C;
    line-height: 1;
    margin-bottom: 20px;
  }
  
  .error-message {
    font-size: 24px;
    color: #303133;
    margin-bottom: 12px;
  }
  
  .error-description {
    font-size: 14px;
    color: #909399;
    margin-bottom: 30px;
  }
}
</style>
