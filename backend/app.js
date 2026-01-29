/**
 * NVR设备监控系统 - 主应用程序入口
 * 支持海康、大华NVR设备的实时监控
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const schedule = require('node-schedule');

const logger = require('./utils/logger');
const db = require('./config/database');
const authMiddleware = require('./middleware/auth');

// 导入路由
const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const deviceRoutes = require('./routes/device');
const monitorRoutes = require('./routes/monitor');
const alarmRoutes = require('./routes/alarm');
const dashboardRoutes = require('./routes/dashboard');

// 导入定时任务服务
const dataCollectionService = require('./services/dataCollectionService');
const alarmService = require('./services/alarmService');

const app = express();
const server = http.createServer(app);

// Socket.IO 配置
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    methods: ['GET', 'POST']
  }
});

// 全局变量存储 Socket.IO 实例
global.io = io;

// 中间件配置
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 静态文件服务
app.use('/uploads', express.static('uploads'));
app.use('/public', express.static('public'));

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/alarms', alarmRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 健康检查接口
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Socket.IO 连接处理
io.on('connection', (socket) => {
  logger.info(`客户端连接: ${socket.id}`);
  
  socket.on('subscribe-device', (deviceId) => {
    socket.join(`device-${deviceId}`);
    logger.info(`客户端 ${socket.id} 订阅设备 ${deviceId}`);
  });

  socket.on('unsubscribe-device', (deviceId) => {
    socket.leave(`device-${deviceId}`);
    logger.info(`客户端 ${socket.id} 取消订阅设备 ${deviceId}`);
  });

  socket.on('subscribe-alarms', () => {
    socket.join('alarms');
    logger.info(`客户端 ${socket.id} 订阅告警`);
  });

  socket.on('disconnect', () => {
    logger.info(`客户端断开: ${socket.id}`);
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`系统错误: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 数据库连接测试
db.connect()
  .then(() => {
    logger.info('数据库连接成功');
    
    // 启动数据采集定时任务 (每30秒执行一次)
    schedule.scheduleJob('*/30 * * * * *', async () => {
      try {
        await dataCollectionService.collectAllDevicesStatus();
      } catch (error) {
        logger.error('数据采集任务执行失败', error);
      }
    });

    // 告警检测定时任务 (每10秒执行一次)
    schedule.scheduleJob('*/10 * * * * *', async () => {
      try {
        await alarmService.checkAndGenerateAlarms();
      } catch (error) {
        logger.error('告警检测任务执行失败', error);
      }
    });

    // 启动服务器
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      logger.info(`NVR监控服务器启动成功，监听端口: ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    logger.error('数据库连接失败', error);
    process.exit(1);
  });

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    logger.info('服务器已关闭');
    process.exit(0);
  });
});

module.exports = app;
