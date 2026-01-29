<template>
  <div class="device-detail" v-if="device">
    <div class="page-header">
      <el-button icon="el-icon-arrow-left" @click="goBack">返回</el-button>
      <div class="header-info">
        <h2>{{ device.name }}</h2>
        <el-tag :type="device.isOnline ? 'success' : 'info'" size="small">
          {{ device.isOnline ? '在线' : '离线' }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-button icon="el-icon-refresh" @click="handleRefresh">刷新</el-button>
        <el-button icon="el-icon-collection" @click="handleCollect">采集数据</el-button>
      </div>
    </div>

    <el-row :gutter="20" class="info-row">
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card class="info-card">
          <div slot="header">基本信息</div>
          <div class="info-list">
            <div class="info-item">
              <span class="label">设备编码:</span>
              <span class="value">{{ device.code }}</span>
            </div>
            <div class="info-item">
              <span class="label">IP地址:</span>
              <span class="value">{{ device.ipAddress }}:{{ device.port }}</span>
            </div>
            <div class="info-item">
              <span class="label">品牌:</span>
              <span class="value">{{ device.brand === 'HIKVISION' ? '海康威视' : '大华' }}</span>
            </div>
            <div class="info-item">
              <span class="label">型号:</span>
              <span class="value">{{ device.model || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="label">所属公司:</span>
              <span class="value">{{ device.companyName }}</span>
            </div>
            <div class="info-item">
              <span class="label">通道数量:</span>
              <span class="value">{{ device.channelCount }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card class="info-card">
          <div slot="header">硬盘信息</div>
          <div class="disk-info">
            <div class="disk-chart">
              <v-chart :options="diskChartOptions" autoresize></v-chart>
            </div>
            <div class="disk-stats">
              <div class="stat-item">
                <span class="label">总容量:</span>
                <span class="value">{{ latestStatus?.diskTotal || '-' }} TB</span>
              </div>
              <div class="stat-item">
                <span class="label">已使用:</span>
                <span class="value">{{ latestStatus?.diskUsed || '-' }} TB</span>
              </div>
              <div class="stat-item">
                <span class="label">剩余空间:</span>
                <span class="value">{{ latestStatus?.diskFree || '-' }} TB</span>
              </div>
              <div class="stat-item">
                <span class="label">使用率:</span>
                <el-progress
                  :percentage="latestStatus?.diskUsageRate || 0"
                  :color="getDiskUsageColor(latestStatus?.diskUsageRate)"
                ></el-progress>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="8">
        <el-card class="info-card">
          <div slot="header">设备状态</div>
          <div class="status-list">
            <div class="status-item">
              <i class="el-icon-video-camera"></i>
              <span class="label">通道状态:</span>
              <span class="value">
                {{ latestStatus?.channelOnlineCount || 0 }}/{{ latestStatus?.channelTotalCount || device.channelCount || 0 }}
              </span>
            </div>
            <div class="status-item">
              <i class="el-icon-video-play"></i>
              <span class="label">录像状态:</span>
              <span class="value">
                <el-tag :type="latestStatus?.recordingStatus === 'RECORDING' ? 'success' : 'warning'" size="small">
                  {{ latestStatus?.recordingStatus === 'RECORDING' ? '录制中' : '停止' }}
                </el-tag>
              </span>
            </div>
            <div class="status-item">
              <i class="el-icon-connection"></i>
              <span class="label">网络状态:</span>
              <span class="value">{{ latestStatus?.networkStatus || '未知' }}</span>
            </div>
            <div class="status-item">
              <i class="el-icon-time"></i>
              <span class="label">最后在线:</span>
              <span class="value">{{ formatTime(device.lastOnlineTime) }}</span>
            </div>
            <div class="status-item">
              <i class="el-icon-warning"></i>
              <span class="label">最后离线:</span>
              <span class="value">{{ formatTime(device.lastOfflineTime) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="chart-card">
      <div slot="header">
        <span>硬盘使用率趋势 (24小时)</span>
      </div>
      <div class="chart-container">
        <v-chart :options="trendChartOptions" autoresize></v-chart>
      </div>
    </el-card>
  </div>
  <div v-else class="loading-container">
    <el-skeleton :rows="6" animated />
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import ECharts from 'vue-echarts';
import 'echarts/lib/chart/gauge';
import 'echarts/lib/chart/line';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/tooltip';
import 'echarts/lib/component/dataZoom';
import dayjs from 'dayjs';

export default {
  name: 'DeviceDetail',
  components: {
    'v-chart': ECharts
  },
  data() {
    return {
      device: null,
      latestStatus: null,
      trendData: []
    };
  },
  computed: {
    diskChartOptions() {
      const usage = this.latestStatus?.diskUsageRate || 0;
      return {
        series: [{
          type: 'gauge',
          radius: '90%',
          center: ['50%', '60%'],
          startAngle: 180,
          endAngle: 0,
          min: 0,
          max: 100,
          splitNumber: 10,
          itemStyle: { color: this.getDiskUsageColor(usage) },
          progress: { show: true, width: 18 },
          pointer: { show: false },
          axisLine: { lineStyle: { width: 18 } },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: { show: false },
          detail: {
            valueAnimation: true,
            width: '60%',
            lineHeight: 40,
            borderRadius: 8,
            offsetCenter: [0, '30%'],
            fontSize: 24,
            fontWeight: 'bolder',
            formatter: '{value}%',
            color: '#333'
          },
          data: [{ value: usage }]
        }]
      };
    },
    trendChartOptions() {
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: ['硬盘使用率'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          data: this.trendData.map(d => dayjs(d.time).format('HH:mm'))
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' }
        },
        dataZoom: [{ type: 'inside' }, { type: 'slider' }],
        series: [{
          name: '硬盘使用率',
          type: 'line',
          data: this.trendData.map(d => d.value),
          smooth: true,
          areaStyle: { opacity: 0.3 },
          itemStyle: { color: '#409EFF' }
        }]
      };
    }
  },
  async created() {
    await this.loadData();
    this.startRefreshTimer();
  },
  beforeDestroy() {
    this.stopRefreshTimer();
  },
  methods: {
    ...mapActions('device', ['getDeviceDetail', 'collectDeviceData']),
    async loadData() {
      const id = this.$route.params.id;
      try {
        const device = await this.getDeviceDetail(id);
        if (device) {
          this.device = device;
          this.latestStatus = device.latestStatus;
          await this.loadTrendData(id);
        }
      } catch (error) {
        console.error('加载设备详情失败', error);
      }
    },
    async loadTrendData(id) {
      try {
        const response = await this.$api.monitor.getDeviceTrend(id, { period: '24h' });
        if (response.data.success) {
          this.trendData = response.data.data.diskTrend || [];
        }
      } catch (error) {
        console.error('加载趋势数据失败', error);
      }
    },
    async handleRefresh() {
      await this.loadData();
      this.$message.success('刷新成功');
    },
    async handleCollect() {
      try {
        const response = await this.collectDeviceData(this.device.id);
        if (response.success) {
          this.$message.success('数据采集成功');
          await this.loadData();
        } else {
          this.$message.error(response.message || '采集失败');
        }
      } catch (error) {
        this.$message.error('采集失败');
      }
    },
    goBack() {
      this.$router.go(-1);
    },
    formatTime(time) {
      return time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : '-';
    },
    getDiskUsageColor(rate) {
      if (rate >= 90) return '#F56C6C';
      if (rate >= 80) return '#E6A23C';
      if (rate >= 60) return '#409EFF';
      return '#67C23A';
    },
    startRefreshTimer() {
      this.refreshTimer = setInterval(() => {
        this.loadData();
      }, 60000);
    },
    stopRefreshTimer() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.device-detail {
  .page-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 20px;
    
    .header-info {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      
      h2 {
        margin: 0;
        font-size: 20px;
      }
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
  }
  
  .info-row {
    margin-bottom: 20px;
  }
  
  .info-card {
    height: 100%;
    
    .info-list {
      .info-item {
        display: flex;
        padding: 8px 0;
        border-bottom: 1px solid #ebeef5;
        
        &:last-child {
          border-bottom: none;
        }
        
        .label {
          width: 100px;
          color: #909399;
          flex-shrink: 0;
        }
        
        .value {
          flex: 1;
          color: #303133;
        }
      }
    }
    
    .disk-info {
      display: flex;
      align-items: center;
      
      .disk-chart {
        width: 150px;
        height: 150px;
      }
      
      .disk-stats {
        flex: 1;
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          
          .label {
            color: #909399;
          }
          
          .value {
            font-weight: 500;
          }
        }
      }
    }
    
    .status-list {
      .status-item {
        display: flex;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #ebeef5;
        
        &:last-child {
          border-bottom: none;
        }
        
        i {
          font-size: 18px;
          margin-right: 12px;
          color: #409EFF;
        }
        
        .label {
          flex: 1;
          color: #909399;
        }
        
        .value {
          font-weight: 500;
        }
      }
    }
  }
  
  .chart-card {
    .chart-container {
      height: 400px;
    }
  }
}

.loading-container {
  padding: 20px;
}
</style>
