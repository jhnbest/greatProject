<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-code">404</div>
      <div class="error-message">抱歉，您访问的页面不存在</div>
      <div class="error-description">
        您访问的页面已被删除或不存在，请检查URL是否正确
      </div>
      <div class="error-actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: '404Page',
  methods: {
    goHome() {
      this.$router.push('/');
    },
    goBack() {
      this.$router.go(-1);
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
    color: #909399;
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
  
  .error-actions {
    display: flex;
    justify-content: center;
    gap: 16px;
  }
}
</style>
