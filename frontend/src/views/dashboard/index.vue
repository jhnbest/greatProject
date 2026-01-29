<template>
  <div class="dashboard">
    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="12" :sm="6" v-for="stat in statCards" :key="stat.label">
        <div class="stat-card" :style="{ backgroundColor: stat.color }">
          <div class="stat-icon">
            <i :class="stat.icon"></i>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :sm="12">
        <el-card class="chart-card">
          <div slot="header" class="card-header">
            <span>硬盘使用率分布</span>
          </div>
          <div class="chart-container">
            <v-chart :options="diskUsageChart" autoresize></v-chart>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card class="chart-card">
          <div slot="header" class="card-header">
            <span>设备在线状态</span>
          </div>
          <div class="chart-container">
            <v-chart :options="onlineStatusChart" autoresize></v-chart>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24">
        <el-card class="chart-card">
          <div slot="header" class="card-header">
            <span>近7天告警趋势</span>
          </div>
          <div class="chart-container tall">
            <v-chart :options="alarmTrendChart" autoresize></v-chart>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="table-row">
      <el-col :xs="24" :sm="12">
        <el-card class="table-card">
          <div slot="header" class="card-header">
            <span>品牌分布</span>
          </div>
          <el-table :data="brandDistribution" stripe>
            <el-table-column prop="brand" label="品牌" align="center"></el-table-column>
            <el-table-column prop="count" label="设备数量" align="center"></el-table-column>
            <el-table-column prop="percentage" label="占比" align="center">
              <template slot-scope="{ row }">
                <el-progress :percentage="parseFloat(row.percentage)" :stroke-width="8"></el-progress>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12">
        <el-card class="table-card">
          <div slot="header" class="card-header">
            <span>最新告警</span>
            <el-button type="text" @click="$router.push('/alarms')">查看更多</el-button>
          </div>
          <div class="alarm-list">
            <div
              v-for="alarm in recentAlarms"
              :key="alarm.id"
              class="alarm-item"
              :class="`alarm-${alarm.alarmLevel.toLowerCase()}`"
            >
              <div class="alarm-info">
                <span class="alarm-title">{{ alarm.alarmTitle }}</span>
                <span class="alarm-device">{{ alarm.deviceName }}</span>
              </div>
              <div class="alarm-time">{{ formatTime(alarm.createTime) }}</div>
            </div>
            <el-empty v-if="recentAlarms.length === 0" description="暂无告警"></el-empty>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';
import ECharts from 'vue-echarts';
import 'echarts/lib/chart/pie';
import 'echarts/lib/chart/line';
import 'echarts/lib/component/legend';
import 'echarts/lib/component/tooltip';
import dayjs from 'dayjs';

export default {
  name: 'Dashboard',
  components: {
    'v-chart': ECharts
  },
  data() {
    return {
      overview: null,
      brandDistribution: [],
      recentAlarms: [],
      alarmTrend: []
    };
  },
  computed: {
    ...mapState('user', ['userInfo']),
    statCards() {
      if (!this.overview) {
        return [
          { label: '设备总数', value: 0, icon: 'el-icon-monitor', color: '#409EFF' },
          { label: '在线设备', value: 0, icon: 'el-icon-video-play', color: '#67C23A' },
          { label: '离线设备', value: 0, icon: 'el-icon-video-pause', color: '#909399' },
          { label: '待处理告警', value: 0, icon: 'el-icon-bell', color: '#E6A23C' }
        ];
      }
      
      return [
        { label: '设备总数', value: this.overview.devices.total, icon: 'el-icon-monitor', color: '#409EFF' },
        { label: '在线设备', value: this.overview.devices.online, icon: 'el-icon-video-play', color: '#67C23A' },
        { label: '离线设备', value: this.overview.devices.offline, icon: 'el-icon-video-pause', color: '#909399' },
        { label: '待处理告警', value: this.overview.alarms.pending, icon: 'el-icon-bell', color: '#E6A23C' }
      ];
    },
    diskUsageChart() {
      const data = [
        { name: '正常', value: this.overview?.diskStats?.normal || 0, itemStyle: { color: '#67C23A' } },
        { name: '一般', value: this.overview?.diskStats?.general || 0, itemStyle: { color: '#409EFF' } },
        { name: '警告', value: this.overview?.diskStats?.warning || 0, itemStyle: { color: '#E6A23C' } },
        { name: '严重', value: this.overview?.diskStats?.critical || 0, itemStyle: { color: '#F56C6C' } }
      ];
      
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: 0, left: 'center' },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } },
          data
        }]
      };
    },
    onlineStatusChart() {
      const online = this.overview?.devices?.online || 0;
      const offline = this.overview?.devices?.offline || 0;
      
      return {
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { bottom: 0, left: 'center' },
        series: [{
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { name: '在线', value: online, itemStyle: { color: '#67C23A' } },
            { name: '离线', value: offline, itemStyle: { color: '#909399' } }
          ],
          label: { show: false },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold' } }
        }]
      };
    },
    alarmTrendChart() {
      const dates = this.alarmTrend.map(t => dayjs(t.date).format('MM-DD'));
      const totals = this.alarmTrend.map(t => t.total);
      const highs = this.alarmTrend.map(t => t.high);
      const mediums = this.alarmTrend.map(t => t.medium);
      
      return {
        tooltip: { trigger: 'axis' },
        legend: { data: ['全部', '高危', '中危'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: dates },
        yAxis: { type: 'value' },
        series: [
          { name: '全部', type: 'line', data: totals, smooth: true, itemStyle: { color: '#409EFF' } },
          { name: '高危', type: 'line', data: highs, smooth: true, itemStyle: { color: '#F56C6C' } },
          { name: '中危', type: 'line', data: mediums, smooth: true, itemStyle: { color: '#E6A23C' } }
        ]
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
    ...mapActions('alarm', ['getPendingAlarms']),
    async loadData() {
      try {
        const [overviewRes, brandRes, alarmsRes, trendRes, diskRes] = await Promise.all([
          this.$api.dashboard.getOverview(),
          this.$api.dashboard.getBrandDistribution(),
          this.$api.dashboard.getRecentAlarms(5),
          this.$api.dashboard.getAlarmTrend(7),
          this.$api.monitor.getDiskDistribution()
        ]);
        
        if (overviewRes.data.success) this.overview = overviewRes.data.data;
        if (brandRes.data.success) this.brandDistribution = brandRes.data.data.list;
        if (alarmsRes.data.success) this.recentAlarms = alarmsRes.data.data;
        if (trendRes.data.success) this.alarmTrend = trendRes.data.data;
        if (diskRes.data.success) {
          this.$set(this.overview, 'diskStats', diskRes.data.data);
        }
      } catch (error) {
        console.error('加载仪表盘数据失败', error);
      }
    },
    formatTime(time) {
      return dayjs(time).fromNow();
    },
    startRefreshTimer() {
      this.refreshTimer = setInterval(() => {
        this.loadData();
        this.getPendingAlarms();
      }, 30000);
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
.dashboard {
  .stat-cards {
    margin-bottom: 20px;
  }
  
  .stat-card {
    display: flex;
    align-items: center;
    padding: 20px;
    border-radius: 4px;
    color: #fff;
    margin-bottom: 20px;
    
    .stat-icon {
      font-size: 48px;
      opacity: 0.8;
      margin-right: 16px;
    }
    
    .stat-info {
      .stat-value {
        font-size: 32px;
        font-weight: bold;
      }
      
      .stat-label {
        font-size: 14px;
        opacity: 0.9;
      }
    }
  }
  
  .chart-row,
  .table-row {
    margin-bottom: 20px;
  }
  
  .chart-card,
  .table-card {
    height: 100%;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
  
  .chart-container {
    height: 300px;
    
    &.tall {
      height: 350px;
    }
  }
  
  .alarm-list {
    .alarm-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #ebeef5;
      
      &:last-child {
        border-bottom: none;
      }
      
      .alarm-info {
        .alarm-title {
          display: block;
          font-size: 14px;
          color: #303133;
        }
        
        .alarm-device {
          font-size: 12px;
          color: #909399;
        }
      }
      
      .alarm-time {
        font-size: 12px;
        color: #909399;
      }
      
      &.alarm-high {
        .alarm-title { color: #F56C6C; }
      }
      
      &.alarm-medium {
        .alarm-title { color: #E6A23C; }
      }
    }
  }
}
</style>
