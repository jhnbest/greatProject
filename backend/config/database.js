/**
 * 达梦数据库连接配置
 */

const dm = require('dm');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5236,
      user: process.env.DB_USER || 'SYSDBA',
      password: process.env.DB_PASSWORD || 'SYSDBA',
      database: process.env.DB_NAME || 'NVR_MONITOR'
    };
  }

  async connect() {
    try {
      logger.info(`正在连接达梦数据库: ${this.config.host}:${this.config.port}`);
      
      // 创建连接池
      this.pool = dm.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectionLimit: 20,
        waitForConnections: true,
        queueLimit: 0
      });

      // 测试连接
      const connection = await this.pool.getConnection();
      logger.info('数据库连接池创建成功');
      connection.release();
      
      return this.pool;
    } catch (error) {
      logger.error('数据库连接失败', error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      logger.error('SQL查询失败', { sql, error: error.message });
      throw error;
    }
  }

  async getConnection() {
    return await this.pool.getConnection();
  }

  async transaction(callback) {
    const connection = await this.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('数据库连接池已关闭');
    }
  }

  async initialize() {
    try {
      logger.info('开始初始化数据库表结构...');
      
      // 创建分公司表
      await this.query(`
        CREATE TABLE IF NOT EXISTS SYS_COMPANY (
          ID VARCHAR(36) PRIMARY KEY,
          NAME VARCHAR(100) NOT NULL,
          CODE VARCHAR(50) UNIQUE NOT NULL,
          PARENT_ID VARCHAR(36),
          ADDRESS VARCHAR(500),
          CONTACT_PERSON VARCHAR(50),
          CONTACT_PHONE VARCHAR(20),
          STATUS VARCHAR(10) DEFAULT '1',
          REMARKS VARCHAR(500),
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          UPDATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (PARENT_ID) REFERENCES SYS_COMPANY(ID)
        )
      `);

      // 创建用户表
      await this.query(`
        CREATE TABLE IF NOT EXISTS SYS_USER (
          ID VARCHAR(36) PRIMARY KEY,
          USERNAME VARCHAR(50) UNIQUE NOT NULL,
          PASSWORD VARCHAR(255) NOT NULL,
          REAL_NAME VARCHAR(50),
          PHONE VARCHAR(20),
          EMAIL VARCHAR(100),
          ROLE VARCHAR(20) DEFAULT 'USER',
          COMPANY_ID VARCHAR(36),
          STATUS VARCHAR(10) DEFAULT '1',
          LAST_LOGIN_TIME DATETIME,
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          UPDATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (COMPANY_ID) REFERENCES SYS_COMPANY(ID)
        )
      `);

      // 创建NVR设备表
      await this.query(`
        CREATE TABLE IF NOT EXISTS NVR_DEVICE (
          ID VARCHAR(36) PRIMARY KEY,
          NAME VARCHAR(100) NOT NULL,
          CODE VARCHAR(50) UNIQUE NOT NULL,
          BRAND VARCHAR(20) NOT NULL,
          MODEL VARCHAR(100),
          IP_ADDRESS VARCHAR(50) NOT NULL,
          PORT INT DEFAULT 8000,
          USERNAME VARCHAR(50),
          PASSWORD VARCHAR(255),
          COMPANY_ID VARCHAR(36) NOT NULL,
          CHANNEL_COUNT INT DEFAULT 0,
          STATUS VARCHAR(20) DEFAULT 'OFFLINE',
          IS_ONLINE TINYINT(1) DEFAULT 0,
          LAST_ONLINE_TIME DATETIME,
          LAST_OFFLINE_TIME DATETIME,
          DEVICE_INFO TEXT,
          REMARKS VARCHAR(500),
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          UPDATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (COMPANY_ID) REFERENCES SYS_COMPANY(ID)
        )
      `);

      // 创建设备状态记录表
      await this.query(`
        CREATE TABLE IF NOT EXISTS NVR_DEVICE_STATUS (
          ID VARCHAR(36) PRIMARY KEY,
          DEVICE_ID VARCHAR(36) NOT NULL,
          CPU_USAGE DECIMAL(5,2),
          MEMORY_USAGE DECIMAL(5,2),
          DISK_TOTAL DECIMAL(10,2),
          DISK_USED DECIMAL(10,2),
          DISK_FREE DECIMAL(10,2),
          DISK_USAGE_RATE DECIMAL(5,2),
          DEVICE_TEMPERATURE DECIMAL(5,2),
          RECORDING_STATUS VARCHAR(20),
          CHANNEL_ONLINE_COUNT INT,
          CHANNEL_TOTAL_COUNT INT,
          NETWORK_STATUS VARCHAR(20),
          SYSTEM_TIME DATETIME,
          RAW_DATA TEXT,
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (DEVICE_ID) REFERENCES NVR_DEVICE(ID)
        )
      `);

      // 创建告警表
      await this.query(`
        CREATE TABLE IF NOT EXISTS NVR_ALARM (
          ID VARCHAR(36) PRIMARY KEY,
          DEVICE_ID VARCHAR(36) NOT NULL,
          ALARM_TYPE VARCHAR(50) NOT NULL,
          ALARM_LEVEL VARCHAR(20) NOT NULL,
          ALARM_TITLE VARCHAR(200) NOT NULL,
          ALARM_CONTENT TEXT,
          ALARM_VALUE VARCHAR(100),
          STATUS VARCHAR(20) DEFAULT 'PENDING',
          HANDLER_ID VARCHAR(36),
          HANDLE_TIME DATETIME,
          HANDLE_CONTENT VARCHAR(500),
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (DEVICE_ID) REFERENCES NVR_DEVICE(ID),
          FOREIGN KEY (HANDLER_ID) REFERENCES SYS_USER(ID)
        )
      `);

      // 创建系统配置表
      await this.query(`
        CREATE TABLE IF NOT EXISTS SYS_CONFIG (
          ID VARCHAR(36) PRIMARY KEY,
          CONFIG_KEY VARCHAR(100) UNIQUE NOT NULL,
          CONFIG_VALUE TEXT,
          CONFIG_TYPE VARCHAR(50),
          DESCRIPTION VARCHAR(200),
          STATUS VARCHAR(10) DEFAULT '1',
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
          UPDATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建操作日志表
      await this.query(`
        CREATE TABLE IF NOT EXISTS SYS_OPER_LOG (
          ID VARCHAR(36) PRIMARY KEY,
          USER_ID VARCHAR(36),
          OPER_TYPE VARCHAR(50),
          OPER_CONTENT TEXT,
          OPER_IP VARCHAR(50),
          CREATE_TIME DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      logger.info('数据库表初始化完成');
      
      // 创建索引
      await this.query('CREATE INDEX IF NOT EXISTS IDX_DEVICE_STATUS_DEVICE_ID ON NVR_DEVICE_STATUS(DEVICE_ID)');
      await this.query('CREATE INDEX IF NOT EXISTS IDX_ALARM_DEVICE_ID ON NVR_ALARM(DEVICE_ID)');
      await this.query('CREATE INDEX IF NOT EXISTS IDX_ALARM_CREATE_TIME ON NVR_ALARM(CREATE_TIME)');
      
    } catch (error) {
      logger.error('数据库初始化失败', error);
      throw error;
    }
  }
}

module.exports = new Database();
