<template>
  <div class="monitor-page">
    <div class="filter-bar">
      <el-select v-model="filters.companyId" placeholder="选择分公司" clearable @change="handleFilter">
        <el-option
          v-for="company in companies"
          :key="company.id"
          :label="company.name"
          :value="company.id"
        ></el-option>
      </el-select>
      
      <el-select v-model="filters.brand" placeholder="设备品牌" clearable @change="handleFilter">
        <el-option
          v-for="brand in brands"
          :key="brand.code"
          :label="brand.name"
          :value="brand.code"
        ></el-option>
      </el-select>
      
      <el-select v-model="filters.onlineStatus" placeholder="在线状态" clearable @change="handleFilter">
        <el-option label="在线" value="true"></el-option>
        <el-option label="离线" value="false"></el-option>
      </el-select>
      
      <el-button type="primary" icon="el-icon-refresh" @click="handleRefresh">刷新</el-button>
      <el-button type="primary" icon="el-icon-download" @click="handleCollectAll">全量采集</el-button>
    </div>

    <el-row :gutter="20" class="summary-row">
      <el-col :xs="8">
        <div class="summary-item">
          <div class="value">{{ realtimeData?.summary?.total || 0 }}</div>
          <div class="label">设备总数</div>
        </div>
      </el-col>
      <el-col :xs="8">
        <div class="summary-item online">
          <div class="value">{{ realtimeData?.summary?.online || 0 }}</div>
          <div class="label">在线设备</div>
        </div>
      </el-col>
      <el-col :xs="8">
        <div class="summary-item offline">
          <div class="value">{{ realtimeData?.summary?.offline || 0 }}</div>
          <div class="label">离线设备</div>
        </div>
      </el-col>
    </el-row>

    <el-card class="device-grid">
      <div slot="header" class="card-header">
        <span>实时监控 ({{ realtimeData?.devices?.length || 0 }})</span>
      </div>
      
      <el-table
        :data="realtimeData?.devices || []"
        style="width: 100%"
        :row-class-name="tableRowClassName"
        @row-click="handleRowClick"
      >
        <el-table-column prop="name" label="设备名称" min-width="150">
          <template slot-scope="{ row }">
            <span class="device-name">
              <i :class="row.isOnline ? 'el-icon-video-play' : 'el-icon-video-pause'"></i>
              {{ row.name }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="ipAddress" label="IP地址" width="140" align="center"></el-table-column>
        
        <el-table-column prop="brand" label="品牌" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag size="small" :type="row.brand === 'HIKVISION' ? 'primary' : 'success'">
              {{ row.brand === 'HIKVISION' ? '海康' : '大华' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="companyName" label="所属公司" min-width="120"></el-table-column>
        
        <el-table-column label="在线状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag
              :type="row.isOnline ? 'success' : 'info'"
              size="small"
            >
              {{ row.isOnline ? '在线' : '离线' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="硬盘使用率" width="180" align="center">
          <template slot-scope="{ row }">
            <el-progress
              :percentage="row.diskUsageRate"
              :color="diskUsageColor(row.diskUsageRate)"
              :stroke-width="18"
            ></el-progress>
          </template>
        </el-table-column>
        
        <el-table-column label="通道状态" width="120" align="center">
          <template slot-scope="{ row }">
            <span>{{ row.channelInfo?.online || 0 }}/{{ row.channelInfo?.total || 0 }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="录像状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag
              :type="row.recordingStatus === 'RECORDING' ? 'success' : 'warning'"
              size="small"
            >
              {{ row.recordingStatus === 'RECORDING' ? '录制中' : '停止' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="120" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click.stop="handleCollect(row)">
              采集
            </el-button>
            <el-button type="text" size="mini" @click.stop="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'MonitorPage',
  data() {
    return {
      filters: {
        companyId: '',
        brand: '',
        onlineStatus: ''
      },
      refreshTimer: null
    };
  },
  computed: {
    ...mapState('device', ['realtimeData', 'brands']),
    ...mapState('company', ['companies'])
  },
  async created() {
    await this.loadData();
    this.startRefreshTimer();
  },
  beforeDestroy() {
    this.stopRefreshTimer();
  },
  methods: {
    ...mapActions('device', ['getRealtimeData', 'getBrands', 'collectDeviceData']),
    ...mapActions('company', ['getCompanies']),
    async loadData() {
      await Promise.all([
        this.getCompanies(),
        this.getBrands()
      ]);
      await this.handleFilter();
    },
    async handleFilter() {
      const params = {
        companyId: this.filters.companyId || undefined,
        brand: this.filters.brand || undefined,
        onlineStatus: this.filters.onlineStatus || undefined
      };
      await this.getRealtimeData(params);
    },
    async handleRefresh() {
      await this.handleFilter();
      this.$message.success('刷新成功');
    },
    async handleCollect(row) {
      try {
        const response = await this.collectDeviceData(row.id);
        if (response.success) {
          this.$message.success('数据采集成功');
          await this.handleFilter();
        } else {
          this.$message.error(response.message || '采集失败');
        }
      } catch (error) {
        this.$message.error('采集失败');
      }
    },
    async handleCollectAll() {
      try {
        const response = await this.$api.monitor.collectAll();
        if (response.data.success) {
          this.$message.success('全量采集完成');
          await this.handleFilter();
        }
      } catch (error) {
        this.$message.error('全量采集失败');
      }
    },
    handleRowClick(row) {
      this.$router.push(`/devices/${row.id}`);
    },
    handleViewDetail(row) {
      this.$router.push(`/devices/${row.id}`);
    },
    diskUsageColor(rate) {
      if (rate >= 90) return '#F56C6C';
      if (rate >= 80) return '#E6A23C';
      if (rate >= 60) return '#409EFF';
      return '#67C23A';
    },
    tableRowClassName({ row }) {
      if (!row.isOnline) return 'offline-row';
      if (row.diskUsageRate >= 90) return 'warning-row';
      return '';
    },
    startRefreshTimer() {
      this.refreshTimer = setInterval(() => {
        this.handleFilter();
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
.monitor-page {
  .filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .summary-row {
    margin-bottom: 20px;
    
    .summary-item {
      background-color: #fff;
      padding: 20px;
      border-radius: 4px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      
      .value {
        font-size: 36px;
        font-weight: bold;
        color: #303133;
      }
      
      .label {
        font-size: 14px;
        color: #909399;
        margin-top: 8px;
      }
      
      &.online .value {
        color: #67C23A;
      }
      
      &.offline .value {
        color: #909399;
      }
    }
  }
  
  .device-grid {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .device-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

::v-deep {
  .el-table {
    .offline-row {
      background-color: #fafafa;
      color: #909399;
    }
    
    .warning-row {
      background-color: #fdf6ec;
    }
    
    .el-table__row {
      cursor: pointer;
    }
  }
}
</style>
