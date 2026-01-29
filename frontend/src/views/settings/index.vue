<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>个人设置</h2>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :sm="8">
        <el-card class="profile-card">
          <div class="profile-header">
            <el-avatar :size="80" icon="el-icon-user"></el-avatar>
            <h3>{{ userInfo?.realName || userInfo?.username }}</h3>
            <el-tag :type="userInfo?.role === 'ADMIN' ? 'danger' : 'primary'" size="small">
              {{ userInfo?.role === 'ADMIN' ? '管理员' : '操作员' }}
            </el-tag>
          </div>
          <div class="profile-info">
            <div class="info-item">
              <span class="label">用户名:</span>
              <span class="value">{{ userInfo?.username }}</span>
            </div>
            <div class="info-item">
              <span class="label">所属公司:</span>
              <span class="value">{{ userInfo?.companyName }}</span>
            </div>
            <div class="info-item">
              <span class="label">最后登录:</span>
              <span class="value">{{ formatTime(userInfo?.lastLoginTime) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="16">
        <el-card>
          <el-tabs v-model="activeTab">
            <el-tab-pane label="基本信息" name="profile">
              <el-form
                ref="profileForm"
                :model="profileForm"
                :rules="profileRules"
                label-width="100px"
              >
                <el-form-item label="真实姓名" prop="realName">
                  <el-input v-model="profileForm.realName" placeholder="请输入真实姓名"></el-input>
                </el-form-item>
                
                <el-form-item label="手机号码" prop="phone">
                  <el-input v-model="profileForm.phone" placeholder="请输入手机号码"></el-input>
                </el-form-item>
                
                <el-form-item label="电子邮箱" prop="email">
                  <el-input v-model="profileForm.email" placeholder="请输入电子邮箱"></el-input>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="handleUpdateProfile">保存修改</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <el-tab-pane label="修改密码" name="password">
              <el-form
                ref="passwordForm"
                :model="passwordForm"
                :rules="passwordRules"
                label-width="100px"
              >
                <el-form-item label="原密码" prop="oldPassword">
                  <el-input
                    v-model="passwordForm.oldPassword"
                    type="password"
                    placeholder="请输入原密码"
                    show-password
                  ></el-input>
                </el-form-item>
                
                <el-form-item label="新密码" prop="newPassword">
                  <el-input
                    v-model="passwordForm.newPassword"
                    type="password"
                    placeholder="请输入新密码"
                    show-password
                  ></el-input>
                </el-form-item>
                
                <el-form-item label="确认密码" prop="confirmPassword">
                  <el-input
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    placeholder="请再次输入新密码"
                    show-password
                  ></el-input>
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="handleChangePassword">修改密码</el-button>
                  <el-button @click="handleResetPasswordForm">重置</el-button>
                </el-form-item>
              </el-form>
            </el-tab-pane>
            
            <el-tab-pane label="系统信息" name="about">
              <div class="about-info">
                <h3>NVR设备监控系统</h3>
                <p class="version">版本: 1.0.0</p>
                <p class="description">
                  本系统用于实时监控集团公司的NVR存储设备，支持海康威视和大华两大品牌的设备集成，
                  提供设备状态监控、硬盘使用率统计、异常告警等功能。
                </p>
                <div class="feature-list">
                  <h4>主要功能:</h4>
                  <ul>
                    <li>实时监控NVR设备在线状态</li>
                    <li>硬盘使用率实时采集与预警</li>
                    <li>支持海康、大华NVR设备集成</li>
                    <li>分公司层级管理</li>
                    <li>设备异常实时告警</li>
                    <li>数据可视化展示</li>
                  </ul>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import dayjs from 'dayjs';

export default {
  name: 'SettingsPage',
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.passwordForm.newPassword) {
        callback(new Error('两次输入的密码不一致'));
      } else {
        callback();
      }
    };
    
    return {
      activeTab: 'profile',
      profileForm: {
        realName: '',
        phone: '',
        email: ''
      },
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      profileRules: {
        realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }]
      },
      passwordRules: {
        oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度至少6个字符', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    };
  },
  computed: {
    ...mapState('user', ['userInfo'])
  },
  created() {
    this.initForm();
  },
  methods: {
    ...mapActions('user', ['getUserInfo', 'changePassword']),
    initForm() {
      if (this.userInfo) {
        this.profileForm = {
          realName: this.userInfo.realName || '',
          phone: this.userInfo.phone || '',
          email: this.userInfo.email || ''
        };
      }
    },
    handleUpdateProfile() {
      this.$message.info('个人基本信息修改功能开发中');
    },
    async handleChangePassword() {
      try {
        await this.$refs.passwordForm.validate();
        
        const response = await this.changePassword({
          oldPassword: this.passwordForm.oldPassword,
          newPassword: this.passwordForm.newPassword
        });
        
        if (response.success) {
          this.$message.success('密码修改成功');
          this.handleResetPasswordForm();
        } else {
          this.$message.error(response.message || '密码修改失败');
        }
      } catch (error) {
        console.error('修改密码失败', error);
      }
    },
    handleResetPasswordForm() {
      this.passwordForm = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      };
      this.$refs.passwordForm && this.$refs.passwordForm.resetFields();
    },
    formatTime(time) {
      return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-';
    }
  }
};
</script>

<style lang="scss" scoped>
.settings-page {
  .page-header {
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
  }
  
  .profile-card {
    .profile-header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid #ebeef5;
      
      h3 {
        margin: 12px 0 8px;
        font-size: 18px;
      }
    }
    
    .profile-info {
      padding-top: 20px;
      
      .info-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        
        .label {
          color: #909399;
        }
        
        .value {
          color: #303133;
        }
      }
    }
  }
  
  .about-info {
    h3 {
      margin: 0 0 10px;
      font-size: 20px;
    }
    
    .version {
      color: #909399;
      margin-bottom: 16px;
    }
    
    .description {
      color: #606266;
      line-height: 1.6;
      margin-bottom: 20px;
    }
    
    .feature-list {
      h4 {
        margin: 0 0 12px;
        font-size: 16px;
      }
      
      ul {
        padding-left: 20px;
        margin: 0;
        
        li {
          padding: 4px 0;
          color: #606266;
        }
      }
    }
  }
}
</style>
