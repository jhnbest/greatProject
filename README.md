# NVR设备监控系统

基于Vue2 + Node.js + 达梦数据库的NVR设备实时监控系统，支持海康威视和大华两大品牌NVR设备的集成与数据采集。

## 系统功能

- **实时监控**: 实时查询各NVR设备的硬盘使用率、设备在线状态等关键信息
- **设备管理**: 支持添加、编辑、删除集团各分公司的NVR设备信息
- **全面展示**: 全面展示NVR设备API接口返回的所有可用信息
- **美观界面**: 基于ElementUI的美观用户界面和友好的交互体验
- **数据可视化**: 硬盘使用率图表、设备状态分布等数据可视化展示
- **告警功能**: 设备异常实时告警，支持异常状态实时提醒
- **权限管理**: 用户认证与权限管理，区分不同层级用户权限
- **层级管理**: 建立分公司与设备的层级管理结构

## 技术架构

### 前端技术栈
- Vue 2.0 + JavaScript
- ElementUI 组件库
- ECharts 数据可视化
- Vuex 状态管理
- Vue Router 路由管理
- Socket.IO Client 实时通信

### 后端技术栈
- Node.js + Express 框架
- 达梦数据库 (DM8+)
- JWT 认证
- Socket.IO 实时推送
- Node-Schedule 定时任务

## 项目结构

```
nvr-monitor/
├── backend/                 # 后端项目
│   ├── config/             # 配置文件
│   │   └── database.js     # 数据库配置
│   ├── middleware/         # 中间件
│   │   └── auth.js         # 认证中间件
│   ├── routes/             # 路由
│   │   ├── auth.js         # 认证路由
│   │   ├── company.js      # 公司路由
│   │   ├── device.js       # 设备路由
│   │   ├── monitor.js      # 监控路由
│   │   ├── alarm.js        # 告警路由
│   │   └── dashboard.js    # 仪表盘路由
│   ├── services/           # 服务层
│   │   ├── hikvisionService.js   # 海康NVR服务
│   │   ├── dahuaService.js       # 大华NVR服务
│   │   ├── deviceFactory.js      # 设备工厂
│   │   ├── dataCollectionService.js  # 数据采集服务
│   │   └── alarmService.js       # 告警服务
│   ├── utils/              # 工具类
│   │   └── logger.js       # 日志工具
│   ├── app.js              # 应用入口
│   └── package.json        # 依赖配置
│
├── frontend/               # 前端项目
│   ├── public/             # 公共资源
│   ├── src/
│   │   ├── api/            # API接口
│   │   ├── assets/         # 静态资源
│   │   ├── components/     # 组件
│   │   │   ├── layout/     # 布局组件
│   │   │   └── alarm/      # 告警组件
│   │   ├── router/         # 路由配置
│   │   ├── store/          # Vuex状态管理
│   │   │   └── modules/    # 状态模块
│   │   ├── styles/         # 样式文件
│   │   ├── views/          # 页面视图
│   │   ├── App.vue         # 根组件
│   │   └── main.js         # 入口文件
│   ├── index.html          # HTML模板
│   ├── vite.config.js      # Vite配置
│   └── package.json        # 依赖配置
│
├── docs/                   # 文档
│   ├── API文档.md          # API接口文档
│   ├── 数据库设计.md        # 数据库设计文档
│   ├── 部署说明.md          # 部署指南
│   └── 用户手册.md          # 用户操作手册
│
└── sql/                    # SQL脚本
    └── init_database.sql   # 数据库初始化脚本
```

## 快速开始

### 1. 数据库准备

1. 安装达梦数据库DM8+
2. 执行数据库初始化脚本:
```bash
cd sql
dis SYSDBA/SYSDBA@localhost:5236
SQL> start init_database.sql
```

### 2. 后端部署

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等信息

# 启动服务
npm start
```

### 3. 前端部署

```bash
cd frontend

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build
```

### 4. 访问系统

- 前端地址: http://localhost:8080
- 后端API: http://localhost:3000/api
- 健康检查: http://localhost:3000/api/health

### 5. 登录信息

- **用户名**: admin
- **密码**: admin123

## 配置说明

### 后端环境变量 (.env)

```env
# 服务器配置
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:8080

# 达梦数据库配置
DB_HOST=localhost
DB_PORT=5236
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=NVR_MONITOR

# JWT认证配置
JWT_SECRET=your-jwt-secret-key
TOKEN_EXPIRES_IN=24h

# 加密配置
ENCRYPTION_KEY=your-encryption-key
ENCRYPTION_IV=1234567890123456

# 数据采集配置
DATA_COLLECTION_INTERVAL=30000
ALARM_CHECK_INTERVAL=10000
```

## 设备接入

### 支持的设备品牌

| 品牌 | 代码 | 说明 |
|------|------|------|
| 海康威视 | HIKVISION | 支持ISAPI协议 |
| 大华 | DAHUA | 支持DHAPI协议 |

### 设备连接配置

添加设备时需要提供以下信息：

- **设备名称**: 自定义名称
- **设备编码**: 唯一标识
- **品牌**: 海康威视/大华
- **IP地址**: 设备网络地址
- **端口号**: API访问端口（默认8000）
- **用户名**: 设备管理用户名
- **密码**: 设备管理密码
- **所属公司**: 选择所属分公司

## 告警规则

系统内置以下告警规则：

| 告警类型 | 触发条件 | 告警级别 |
|----------|----------|----------|
| 硬盘空间严重不足 | 使用率 >= 90% | 高危 |
| 硬盘空间预警 | 使用率 >= 80% | 中危 |
| 设备离线 | 设备离线 | 高危 |
| 设备上线 | 设备恢复在线 | 信息 |
| 网络不稳定 | 网络状态异常 | 中危 |

## API文档

详细的API接口文档请参考 [docs/API文档.md](docs/API文档.md)

## 数据库设计

数据库设计文档请参考 [docs/数据库设计.md](docs/数据库设计.md)

## 部署说明

系统部署文档请参考 [docs/部署说明.md](docs/部署说明.md)

## 用户手册

用户操作手册请参考 [docs/用户手册.md](docs/用户手册.md)

## 技术支持

如有问题，请联系技术支持团队。

## 许可证

MIT License
