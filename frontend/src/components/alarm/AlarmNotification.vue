<template>
  <transition-group name="alarm-fade" tag="div" class="alarm-notification-container">
    <div
      v-for="alarm in visibleAlarms"
      :key="alarm.id"
      class="alarm-notification"
      :class="alarmClass(alarm.alarmLevel)"
      @click="handleAlarmClick(alarm)"
    >
      <div class="alarm-header">
        <i :class="alarmIcon(alarm.alarmLevel)"></i>
        <span class="alarm-title">{{ alarm.alarmTitle }}</span>
        <el-button class="close-btn" type="text" icon="el-icon-close" @click.stop="closeAlarm(alarm.id)"></el-button>
      </div>
      <div class="alarm-content">
        <p>{{ alarm.alarmContent }}</p>
        <p class="alarm-device">{{ alarm.deviceName }} ({{ alarm.deviceIP }})</p>
        <p class="alarm-time">{{ formatTime(alarm.createTime) }}</p>
      </div>
    </div>
  </transition-group>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';
import dayjs from 'dayjs';

export default {
  name: 'AlarmNotification',
  data() {
    return {
      visibleAlarms: [],
      maxVisible: 5
    };
  },
  computed: {
    ...mapGetters('alarm', ['pendingAlarms'])
  },
  watch: {
    pendingAlarms: {
      handler(val) {
        this.updateVisibleAlarms(val);
      },
      immediate: true
    }
  },
  methods: {
    ...mapActions('alarm', ['removeAlarm']),
    updateVisibleAlarms(alarms) {
      this.visibleAlarms = alarms.slice(0, this.maxVisible);
    },
    alarmClass(level) {
      return {
        'alarm-high': level === 'HIGH',
        'alarm-medium': level === 'MEDIUM',
        'alarm-low': level === 'LOW',
        'alarm-info': level === 'INFO'
      }[level] || 'alarm-info';
    },
    alarmIcon(level) {
      return {
        HIGH: 'el-icon-warning',
        MEDIUM: 'el-icon-warning-outline',
        LOW: 'el-icon-info',
        INFO: 'el-icon-info'
      }[level] || 'el-icon-info';
    },
    formatTime(time) {
      return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
    },
    closeAlarm(alarmId) {
      this.removeAlarm(alarmId);
    },
    handleAlarmClick(alarm) {
      this.$router.push(`/devices/${alarm.deviceId}`);
    }
  }
};
</script>

<style lang="scss" scoped>
.alarm-notification-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.alarm-notification {
  width: 320px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateX(-4px);
  }
  
  &.alarm-high {
    border-left: 4px solid #F56C6C;
    
    .alarm-header {
      background-color: #FEF0F0;
      color: #F56C6C;
    }
  }
  
  &.alarm-medium {
    border-left: 4px solid #E6A23C;
    
    .alarm-header {
      background-color: #FCF6EC;
      color: #E6A23C;
    }
  }
  
  &.alarm-low,
  &.alarm-info {
    border-left: 4px solid #909399;
    
    .alarm-header {
      background-color: #F4F4F5;
      color: #909399;
    }
  }
}

.alarm-header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  font-size: 14px;
  font-weight: 500;
  
  i {
    margin-right: 8px;
    font-size: 16px;
  }
  
  .alarm-title {
    flex: 1;
  }
  
  .close-btn {
    color: inherit;
    padding: 0;
    font-size: 16px;
    
    &:hover {
      opacity: 0.7;
    }
  }
}

.alarm-content {
  padding: 12px;
  font-size: 13px;
  color: #606266;
  
  p {
    margin: 4px 0;
  }
  
  .alarm-device {
    color: #909399;
    font-size: 12px;
  }
  
  .alarm-time {
    color: #C0C4CC;
    font-size: 12px;
  }
}

.alarm-fade-enter-active,
.alarm-fade-leave-active {
  transition: all 0.5s ease;
}

.alarm-fade-enter {
  opacity: 0;
  transform: translateX(100%);
}

.alarm-fade-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
