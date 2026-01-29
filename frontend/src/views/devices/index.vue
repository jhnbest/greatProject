<template>
  <div class="devices-page">
    <div class="page-header">
      <h2>设备管理</h2>
      <el-button type="primary" icon="el-icon-plus" @click="showAddDialog" v-if="isAdmin">
        添加设备
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filters.companyId" placeholder="选择分公司" clearable @change="handleSearch">
        <el-option
          v-for="company in companies"
          :key="company.id"
          :label="company.name"
          :value="company.id"
        ></el-option>
      </el-select>
      
      <el-select v-model="filters.brand" placeholder="设备品牌" clearable @change="handleSearch">
        <el-option
          v-for="brand in brands"
          :key="brand.code"
          :label="brand.name"
          :value="brand.code"
        ></el-option>
      </el-select>
      
      <el-select v-model="filters.status" placeholder="设备状态" clearable @change="handleSearch">
        <el-option label="启用" value="ACTIVE"></el-option>
        <el-option label="禁用" value="INACTIVE"></el-option>
      </el-select>
      
      <el-input
        v-model="filters.keyword"
        placeholder="搜索设备名称/IP"
        prefix-icon="el-icon-search"
        clearable
        style="width: 200px"
        @keyup.enter="handleSearch"
      ></el-input>
      
      <el-button type="primary" icon="el-icon-search" @click="handleSearch">搜索</el-button>
    </div>

    <el-card>
      <el-table
        :data="devices"
        :loading="loading"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55"></el-table-column>
        
        <el-table-column prop="name" label="设备名称" min-width="150">
          <template slot-scope="{ row }">
            <router-link :to="`/devices/${row.id}`" class="device-link">
              {{ row.name }}
            </router-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="code" label="设备编码" width="120" align="center"></el-table-column>
        
        <el-table-column prop="ipAddress" label="IP地址" width="130" align="center"></el-table-column>
        
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
        
        <el-table-column label="硬盘使用率" width="150" align="center">
          <template slot-scope="{ row }">
            <el-progress
              :percentage="row.diskUsageRate || 0"
              :color="getDiskUsageColor(row.diskUsageRate)"
              :stroke-width="16"
            ></el-progress>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-switch
              v-model="row.status"
              active-value="ACTIVE"
              inactive-value="INACTIVE"
              @change="handleStatusChange(row)"
              :disabled="!isAdmin"
            ></el-switch>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="handleView(row)">查看</el-button>
            <el-button type="text" size="mini" @click="handleTest(row)" v-if="isAdmin">测试</el-button>
            <el-button type="text" size="mini" @click="handleEdit(row)" v-if="isAdmin">编辑</el-button>
            <el-button type="text" size="mini" @click="handleDelete(row)" v-if="isAdmin" class="danger-btn">
              删除
            </el-button>
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
      </div>
    </el-card>

    <el-dialog
      :title="dialogType === 'add' ? '添加设备' : '编辑设备'"
      :visible.sync="dialogVisible"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="deviceForm"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入设备名称"></el-input>
        </el-form-item>
        
        <el-form-item label="设备编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入设备编码" :disabled="dialogType === 'edit'"></el-input>
        </el-form-item>
        
        <el-form-item label="设备品牌" prop="brand">
          <el-select v-model="form.brand" placeholder="请选择设备品牌" style="width: 100%">
            <el-option
              v-for="brand in brands"
              :key="brand.code"
              :label="brand.name"
              :value="brand.code"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="设备型号" prop="model">
          <el-input v-model="form.model" placeholder="请输入设备型号"></el-input>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="IP地址" prop="ipAddress">
              <el-input v-model="form.ipAddress" placeholder="请输入IP地址"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="端口号" prop="port">
              <el-input v-model.number="form.port" placeholder="请输入端口号"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入设备用户名"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" placeholder="请输入设备密码" show-password></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="所属公司" prop="companyId">
          <el-select v-model="form.companyId" placeholder="请选择所属公司" style="width: 100%">
            <el-option
              v-for="company in companies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="通道数量" prop="channelCount">
          <el-input-number v-model="form.channelCount" :min="0" :max="256" placeholder="请输入通道数量"></el-input-number>
        </el-form-item>
        
        <el-form-item label="备注" prop="remarks">
          <el-input v-model="form.remarks" type="textarea" :rows="3" placeholder="请输入备注"></el-input>
        </el-form-item>
      </el-form>
      
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          {{ submitLoading ? '保存中...' : '确定' }}
        </el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'DevicesPage',
  data() {
    return {
      filters: {
        companyId: '',
        brand: '',
        status: '',
        keyword: ''
      },
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      },
      dialogVisible: false,
      dialogType: 'add',
      submitLoading: false,
      selectedDevices: [],
      form: this.getInitialForm(),
      formRules: {
        name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
        code: [{ required: true, message: '请输入设备编码', trigger: 'blur' }],
        brand: [{ required: true, message: '请选择设备品牌', trigger: 'change' }],
        ipAddress: [{ required: true, message: '请输入IP地址', trigger: 'blur' }],
        port: [{ required: true, message: '请输入端口号', trigger: 'blur' }],
        username: [{ required: true, message: '请输入设备用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入设备密码', trigger: 'blur' }],
        companyId: [{ required: true, message: '请选择所属公司', trigger: 'change' }]
      }
    };
  },
  computed: {
    ...mapState('device', ['devices', 'devicesTotal', 'brands']),
    ...mapState('company', ['companies']),
    ...mapState('user', ['userInfo']),
    ...mapGetters(['loading']),
    isAdmin() {
      return this.userInfo?.role === 'ADMIN';
    }
  },
  async created() {
    await this.loadData();
  },
  methods: {
    ...mapActions('device', ['getDevices', 'getBrands', 'createDevice', 'updateDevice', 'deleteDevice']),
    ...mapActions('company', ['getCompanies']),
    getInitialForm() {
      return {
        name: '',
        code: '',
        brand: '',
        model: '',
        ipAddress: '',
        port: 8000,
        username: '',
        password: '',
        companyId: '',
        channelCount: 0,
        remarks: ''
      };
    },
    async loadData() {
      await Promise.all([this.getCompanies(), this.getBrands()]);
      await this.handleSearch();
    },
    async handleSearch() {
      const params = {
        page: this.pagination.page,
        limit: this.pagination.limit,
        ...this.filters,
        companyId: this.filters.companyId || undefined,
        brand: this.filters.brand || undefined,
        status: this.filters.status || undefined,
        keyword: this.filters.keyword || undefined
      };
      await this.getDevices(params);
      this.pagination.total = this.devicesTotal;
    },
    handleSelectionChange(val) {
      this.selectedDevices = val;
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
    showAddDialog() {
      this.dialogType = 'add';
      this.form = this.getInitialForm();
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.dialogType = 'edit';
      this.form = { ...row, password: '' };
      this.dialogVisible = true;
    },
    handleView(row) {
      this.$router.push(`/devices/${row.id}`);
    },
    async handleTest(row) {
      try {
        const response = await this.$api.devices.testConnection(row.id);
        if (response.data.success) {
          this.$message.success('设备连接成功');
        } else {
          this.$message.error(`连接失败: ${response.data.message}`);
        }
      } catch (error) {
        this.$message.error('连接测试失败');
      }
    },
    handleStatusChange(row) {
      this.$api.devices.updateStatus(row.id, row.status)
        .then(res => {
          if (res.data.success) {
            this.$message.success('状态更新成功');
          } else {
            row.status = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            this.$message.error(res.data.message || '状态更新失败');
          }
        })
        .catch(() => {
          row.status = row.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        });
    },
    handleDelete(row) {
      this.$confirm('确定要删除该设备吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const response = await this.deleteDevice(row.id);
        if (response.success) {
          this.$message.success('删除成功');
          await this.handleSearch();
        } else {
          this.$message.error(response.message || '删除失败');
        }
      }).catch(() => {});
    },
    handleDialogClose() {
      this.$refs.deviceForm && this.$refs.deviceForm.resetFields();
      this.form = this.getInitialForm();
    },
    async handleSubmit() {
      try {
        await this.$refs.deviceForm.validate();
        this.submitLoading = true;
        
        let response;
        if (this.dialogType === 'add') {
          response = await this.createDevice(this.form);
        } else {
          response = await this.updateDevice({ id: this.form.id, data: this.form });
        }
        
        if (response.success) {
          this.$message.success(this.dialogType === 'add' ? '添加成功' : '更新成功');
          this.dialogVisible = false;
          await this.handleSearch();
        } else {
          this.$message.error(response.message || '操作失败');
        }
      } catch (error) {
        console.error('提交失败', error);
      } finally {
        this.submitLoading = false;
      }
    },
    getDiskUsageColor(rate) {
      if (rate >= 90) return '#F56C6C';
      if (rate >= 80) return '#E6A23C';
      if (rate >= 60) return '#409EFF';
      return '#67C23A';
    }
  }
};
</script>

<style lang="scss" scoped>
.devices-page {
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
  
  .filter-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
  }
  
  .device-link {
    color: #409EFF;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .danger-btn {
    color: #F56C6C;
  }
  
  .pagination-container {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }
}
</style>
