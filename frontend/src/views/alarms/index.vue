<template>
  <div class="alarms-page">
    <div class="page-header">
      <h2>告警管理</h2>
      <div class="header-actions">
        <el-badge :value="pendingCount" :hidden="pendingCount === 0" class="alarm-badge">
          <el-button icon="el-icon-bell" type="primary" @click="showPendingOnly = !showPendingOnly">
            {{ showPendingOnly ? '显示全部' : '待处理告警' }}
          </el-button>
        </el-badge>
      </div>
    </div>

    <el-row :gutter="20" class="stat-cards">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon danger"><i class="el-icon-warning"></i></div>
          <div class="stat-info">
            <div class="value">{{ statistics?.highPending || 0 }}</div>
            <div class="label">高危告警</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon warning"><i class="el-icon-warning-outline"></i></div>
          <div class="stat-info">
            <div class="value">{{ statistics?.mediumPending || 0 }}</div>
            <div class="label">中危告警</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon pending"><i class="el-icon-clock"></i></div>
          <div class="stat-info">
            <div class="value">{{ statistics?.pendingCount || 0 }}</div>
            <div class="label">待处理</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon total"><i class="el-icon-bell"></i></div>
          <div class="stat-info">
            <div class="value">{{ statistics?.totalCount || 0 }}</div>
            <div class="label">全部告警</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-card>
      <div class="filter-bar">
        <el-select v-model="filters.companyId" placeholder="选择分公司" clearable @change="handleSearch">
          <el-option
            v-for="company in companies"
            :key="company.id"
            :label="company.name"
            :value="company.id"
          ></el-option>
        </el-select>
        
        <el-select v-model="filters.alarmType" placeholder="告警类型" clearable @change="handleSearch">
          <el-option
            v-for="type in alarmTypes"
            :key="type.code"
            :label="type.name"
            :value="type.code"
          ></el-option>
        </el-select>
        
        <el-select v-model="filters.alarmLevel" placeholder="告警级别" clearable @change="handleSearch">
          <el-option
            v-for="level in alarmLevels"
            :key="level.code"
            :label="level.name"
            :value="level.code"
          ></el-option>
        </el-select>
        
        <el-select v-model="filters.status" placeholder="处理状态" clearable @change="handleSearch">
          <el-option label="待处理" value="PENDING"></el-option>
          <el-option label="已处理" value="HANDLED"></el-option>
        </el-select>
        
        <el-date-picker
          v-model="filters.dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="yyyy-MM-dd"
          @change="handleSearch"
        ></el-date-picker>
        
        <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
      </div>

      <el-table
        :data="alarms"
        :loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        
        <el-table-column prop="alarmLevel" label="级别" width="80" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="getLevelType(row.alarmLevel)" size="small">
              {{ getLevelName(row.alarmLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="alarmTitle" label="告警标题" min-width="200"></el-table-column>
        
        <el-table-column prop="alarmContent" label="告警内容" min-width="200"></el-table-column>
        
        <el-table-column prop="deviceName" label="设备名称" width="150"></el-table-column>
        
        <el-table-column prop="deviceIP" label="设备IP" width="120" align="center"></el-table-column>
        
        <el-table-column prop="companyName" label="所属公司" width="120"></el-table-column>
        
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.status === 'PENDING' ? 'warning' : 'success'" size="small">
              {{ row.status === 'PENDING' ? '待处理' : '已处理' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="createTime" label="发生时间" width="160" align="center">
          <template slot-scope="{ row }">
            {{ formatTime(row.createTime) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="handleView(row)">详情</el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              type="text"
              size="mini"
              @click="handleProcess(row)"
            >处理</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination-container">
        <el-pagination
          :current-page="pagination.page"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        ></el-pagination>
        
        <el-button
          v-if="selectedAlarms.length > 0"
          type="primary"
          size="small"
          @click="handleBatchProcess"
        >
          批量处理 ({{ selectedAlarms.length }})
        </el-button>
      </div>
    </el-card>

    <el-dialog
      title="告警详情"
      :visible.sync="detailVisible"
      width="600px"
    >
      <div class="alarm-detail" v-if="currentAlarm">
        <div class="detail-row">
          <span class="label">告警标题:</span>
          <span class="value">{{ currentAlarm.alarmTitle }}</span>
        </div>
        <div class="detail-row">
          <span class="label">告警内容:</span>
          <span class="value">{{ currentAlarm.alarmContent }}</span>
        </div>
        <div class="detail-row">
          <span class="label">告警级别:</span>
          <el-tag :type="getLevelType(currentAlarm.alarmLevel)">
            {{ getLevelName(currentAlarm.alarmLevel) }}
          </el-tag>
        </div>
        <div class="detail-row">
          <span class="label">告警类型:</span>
          <span class="value">{{ getTypeName(currentAlarm.alarmType) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">关联设备:</span>
          <span class="value">{{ currentAlarm.deviceName }} ({{ currentAlarm.deviceIP }})</span>
        </div>
        <div class="detail-row">
          <span class="label">所属公司:</span>
          <span class="value">{{ currentAlarm.companyName }}</span>
        </div>
        <div class="detail-row">
          <span class="label">发生时间:</span>
          <span class="value">{{ formatTime(currentAlarm.createTime) }}</span>
        </div>
        <div class="detail-row" v-if="currentAlarm.status === 'HANDLED'">
          <span class="label">处理时间:</span>
          <span class="value">{{ formatTime(currentAlarm.handleTime) }}</span>
        </div>
        <div class="detail-row" v-if="currentAlarm.handleContent">
          <span class="label">处理意见:</span>
          <span class="value">{{ currentAlarm.handleContent }}</span>
        </div>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailVisible = false">关闭</el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="处理告警"
      :visible.sync="processVisible"
      width="500px"
    >
      <el-form ref="processForm" :model="processForm" label-width="100px">
        <el-form-item label="处理意见" prop="handleContent">
          <el-input
            v-model="processForm.handleContent"
            type="textarea"
            :rows="4"
            placeholder="请输入处理意见"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="processVisible = false">取消</el-button>
        <el-button type="primary" :loading="processLoading" @click="handleProcessSubmit">
          {{ processLoading ? '处理中...' : '确定' }}
        </el-button>
      </span>
    </el-dialog>

    <el-dialog
      title="批量处理"
      :visible.sync="batchProcessVisible"
      width="500px"
    >
      <p>确定要批量处理选中的 {{ selectedAlarms.length }} 条告警吗？</p>
      <el-form ref="batchForm" :model="batchForm" label-width="100px">
        <el-form-item label="处理意见" prop="handleContent">
          <el-input
            v-model="batchForm.handleContent"
            type="textarea"
            :rows="4"
            placeholder="请输入处理意见"
          ></el-input>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="batchProcessVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchProcessLoading" @click="handleBatchProcessSubmit">
          {{ batchProcessLoading ? '处理中...' : '确定' }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState, mapActions, mapGetters } from 'vuex';
import dayjs from 'dayjs';

export default {
  name: 'AlarmsPage',
  data() {
    return {
      filters: {
        companyId: '',
        alarmType: '',
        alarmLevel: '',
        status: '',
        dateRange: []
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      },
      selectedAlarms: [],
      detailVisible: false,
      processVisible: false,
      batchProcessVisible: false,
      currentAlarm: null,
      processLoading: false,
      batchProcessLoading: false,
      showPendingOnly: false,
      processForm: {
        handleContent: '',
        alarmId: null
      },
      batchForm: {
        handleContent: ''
      }
    };
  },
  computed: {
    ...mapState('alarm', ['alarms', 'alarmsTotal', 'statistics', 'alarmTypes', 'alarmLevels']),
    ...mapState('company', ['companies']),
    ...mapGetters(['loading']),
    pendingCount() {
      return this.statistics?.pendingCount || 0;
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
    ...mapActions('alarm', [
      'getAlarms', 'getPendingAlarms', 'getAlarmStatistics',
      'getAlarmTypes', 'getAlarmLevels', 'handleAlarm', 'batchHandleAlarms'
    ]),
    ...mapActions('company', ['getCompanies']),
    async loadData() {
      await Promise.all([
        this.getCompanies(),
        this.getAlarmTypes(),
        this.getAlarmLevels(),
        this.getAlarmStatistics()
      ]);
      await this.handleSearch();
    },
    async handleSearch() {
      const params = {
        page: this.pagination.page,
        limit: this.pagination.limit,
        ...this.filters,
        companyId: this.filters.companyId || undefined,
        alarmType: this.filters.alarmType || undefined,
        alarmLevel: this.filters.alarmLevel || undefined,
        status: this.showPendingOnly ? 'PENDING' : (this.filters.status || undefined),
        startTime: this.filters.dateRange?.[0] || undefined,
        endTime: this.filters.dateRange?.[1] || undefined
      };
      await this.getAlarms(params);
      this.pagination.total = this.alarmsTotal;
    },
    handleSelectionChange(val) {
      this.selectedAlarms = val;
    },
    handleSizeChange(val) {
      this.pagination.limit = val;
      this.pagination.page = 1;
      this.handleSearch();
    },
    handlePageChange(val) {
      this.pagination.page = val;
      this.handleSearch();
    },
    handleView(row) {
      this.currentAlarm = row;
      this.detailVisible = true;
    },
    handleProcess(row) {
      this.currentAlarm = row;
      this.processForm = { handleContent: '', alarmId: row.id };
      this.processVisible = true;
    },
    async handleProcessSubmit() {
      if (!this.processForm.handleContent.trim()) {
        this.$message.warning('请输入处理意见');
        return;
      }
      
      this.processLoading = true;
      try {
        const response = await this.handleAlarm({
          id: this.processForm.alarmId,
          handleContent: this.processForm.handleContent
        });
        
        if (response.success) {
          this.$message.success('处理成功');
          this.processVisible = false;
          await this.loadData();
        } else {
          this.$message.error(response.message || '处理失败');
        }
      } catch (error) {
        this.$message.error('处理失败');
      } finally {
        this.processLoading = false;
      }
    },
    handleBatchProcess() {
      this.batchForm.handleContent = '';
      this.batchProcessVisible = true;
    },
    async handleBatchProcessSubmit() {
      if (!this.batchForm.handleContent.trim()) {
        this.$message.warning('请输入处理意见');
        return;
      }
      
      this.batchProcessLoading = true;
      try {
        const response = await this.batchHandleAlarms({
          alarmIds: this.selectedAlarms.map(a => a.id),
          handleContent: this.batchForm.handleContent
        });
        
        if (response.success) {
          this.$message.success(response.message);
          this.batchProcessVisible = false;
          this.selectedAlarms = [];
          await this.loadData();
        } else {
          this.$message.error(response.message || '批量处理失败');
        }
      } catch (error) {
        this.$message.error('批量处理失败');
      } finally {
        this.batchProcessLoading = false;
      }
    },
    getLevelType(level) {
      const types = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'info', INFO: 'info' };
      return types[level] || 'info';
    },
    getLevelName(level) {
      const names = { HIGH: '高危', MEDIUM: '中危', LOW: '低危', INFO: '信息' };
      return names[level] || level;
    },
    getTypeName(type) {
      const names = { DISK: '硬盘告警', DEVICE: '设备告警', NETWORK: '网络告警', CHANNEL: '通道告警' };
      return names[type] || type;
    },
    formatTime(time) {
      return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
    },
    startRefreshTimer() {
      this.refreshTimer = setInterval(() => {
        this.getAlarmStatistics();
        if (this.showPendingOnly) {
          this.getPendingAlarms();
        }
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
.alarms-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
  }
  
  .stat-cards {
    margin-bottom: 20px;
    
    .stat-card {
      display: flex;
      align-items: center;
      background-color: #fff;
      padding: 20px;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      
      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
        font-size: 24px;
        color: #fff;
        
        &.danger { background-color: #F56C6C; }
        &.warning { background-color: #E6A23C; }
        &.pending { background-color: #409EFF; }
        &.total { background-color: #67C23A; }
      }
      
      .stat-info {
        .value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
        }
        
        .label {
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }
  
  .filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .pagination-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
  }
  
  .alarm-detail {
    .detail-row {
      display: flex;
      padding: 10px 0;
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
}
</style>
