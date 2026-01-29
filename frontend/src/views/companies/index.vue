<template>
  <div class="companies-page">
    <div class="page-header">
      <h2>分公司管理</h2>
      <el-button type="primary" icon="el-icon-plus" @click="showAddDialog">
        添加分公司
      </el-button>
    </div>

    <el-card>
      <el-table
        :data="companies"
        :loading="loading"
        style="width: 100%"
        row-key="id"
        default-expand-all
        :tree-props="{ children: 'children' }"
      >
        <el-table-column prop="name" label="公司名称" min-width="200">
          <template slot-scope="{ row }">
            <i :class="row.children?.length ? 'el-icon-folder' : 'el-icon-document'"></i>
            {{ row.name }}
          </template>
        </el-table-column>
        
        <el-table-column prop="code" label="公司编码" width="150" align="center"></el-table-column>
        
        <el-table-column prop="contactPerson" label="联系人" width="120" align="center"></el-table-column>
        
        <el-table-column prop="contactPhone" label="联系电话" width="140" align="center"></el-table-column>
        
        <el-table-column prop="deviceCount" label="设备数量" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag size="small">{{ row.deviceCount || 0 }}</el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template slot-scope="{ row }">
            <el-tag :type="row.status === '1' ? 'success' : 'info'" size="small">
              {{ row.status === '1' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" align="center">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="handleView(row)">查看</el-button>
            <el-button type="text" size="mini" @click="handleEdit(row)">编辑</el-button>
            <el-button type="text" size="mini" @click="handleAddChild(row)" v-if="!row.children">
              添加下级
            </el-button>
            <el-button type="text" size="mini" @click="handleDelete(row)" class="danger-btn">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      :title="dialogType === 'add' ? '添加分公司' : dialogType === 'child' ? '添加下级分公司' : '编辑分公司'"
      :visible.sync="dialogVisible"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form
        ref="companyForm"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="公司名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入公司名称"></el-input>
        </el-form-item>
        
        <el-form-item label="公司编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入公司编码" :disabled="dialogType === 'edit'"></el-input>
        </el-form-item>
        
        <el-form-item label="上级公司" prop="parentId">
          <el-select
            v-model="form.parentId"
            placeholder="请选择上级公司（留空为顶级）"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="company in topLevelCompanies"
              :key="company.id"
              :label="company.name"
              :value="company.id"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="联系地址" prop="address">
          <el-input v-model="form.address" placeholder="请输入联系地址"></el-input>
        </el-form-item>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="form.contactPerson" placeholder="请输入联系人"></el-input>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" placeholder="请输入联系电话"></el-input>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="备注" prop="remarks">
          <el-input v-model="form.remarks" type="textarea" :rows="3" placeholder="请输入备注"></el-input>
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-switch
            v-model="form.status"
            active-value="1"
            inactive-value="0"
          ></el-switch>
          <span class="status-text">{{ form.status === '1' ? '启用' : '禁用' }}</span>
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
import { mapState, mapActions } from 'vuex';

export default {
  name: 'CompaniesPage',
  data() {
    return {
      dialogVisible: false,
      dialogType: 'add',
      submitLoading: false,
      form: this.getInitialForm(),
      formRules: {
        name: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
        code: [{ required: true, message: '请输入公司编码', trigger: 'blur' }]
      }
    };
  },
  computed: {
    ...mapState('company', ['companies']),
    ...mapState(['loading']),
    topLevelCompanies() {
      return this.companies.filter(c => !c.parentId);
    }
  },
  async created() {
    await this.loadData();
  },
  methods: {
    ...mapActions('company', ['getCompanies', 'getCompanyTree', 'createCompany', 'updateCompany', 'deleteCompany']),
    getInitialForm() {
      return {
        name: '',
        code: '',
        parentId: null,
        address: '',
        contactPerson: '',
        contactPhone: '',
        status: '1',
        remarks: ''
      };
    },
    async loadData() {
      await this.getCompanyTree();
    },
    showAddDialog() {
      this.dialogType = 'add';
      this.form = this.getInitialForm();
      this.dialogVisible = true;
    },
    handleAddChild(row) {
      this.dialogType = 'child';
      this.form = {
        ...this.getInitialForm(),
        parentId: row.id
      };
      this.dialogVisible = true;
    },
    handleEdit(row) {
      this.dialogType = 'edit';
      this.form = {
        name: row.name,
        code: row.code,
        parentId: row.parentId || null,
        address: row.address || '',
        contactPerson: row.contactPerson || '',
        contactPhone: row.contactPhone || '',
        status: row.status,
        remarks: row.remarks || '',
        id: row.id
      };
      this.dialogVisible = true;
    },
    handleView(row) {
      this.$router.push(`/companies/${row.id}`);
    },
    handleDelete(row) {
      this.$confirm('确定要删除该分公司吗?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async () => {
        const response = await this.deleteCompany(row.id);
        if (response.success) {
          this.$message.success('删除成功');
          await this.loadData();
        } else {
          this.$message.error(response.message || '删除失败');
        }
      }).catch(() => {});
    },
    handleDialogClose() {
      this.$refs.companyForm && this.$refs.companyForm.resetFields();
      this.form = this.getInitialForm();
    },
    async handleSubmit() {
      try {
        await this.$refs.companyForm.validate();
        this.submitLoading = true;
        
        let response;
        if (this.dialogType === 'edit') {
          response = await this.updateCompany({ id: this.form.id, data: this.form });
        } else {
          response = await this.createCompany(this.form);
        }
        
        if (response.success) {
          this.$message.success(this.dialogType === 'edit' ? '更新成功' : '添加成功');
          this.dialogVisible = false;
          await this.loadData();
        } else {
          this.$message.error(response.message || '操作失败');
        }
      } catch (error) {
        console.error('提交失败', error);
      } finally {
        this.submitLoading = false;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.companies-page {
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
  
  .danger-btn {
    color: #F56C6C;
  }
  
  .status-text {
    margin-left: 10px;
    color: #909399;
  }
}
</style>
