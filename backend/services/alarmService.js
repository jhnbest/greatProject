/**
 * 告警服务
 * 检测设备异常并生成告警
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class AlarmService {
  constructor() {
    this.alarmRules = this.getDefaultAlarmRules();
    this.pendingAlarms = new Map();
  }

  getDefaultAlarmRules() {
    return [
      {
        id: 'DISK_FULL',
        name: '硬盘空间不足',
        type: 'DISK',
        level: 'HIGH',
        condition: (status) => status.diskUsageRate >= 90,
        message: '硬盘使用率超过90%',
        enabled: true
      },
      {
        id: 'DISK_WARNING',
        name: '硬盘空间预警',
        type: 'DISK',
        level: 'MEDIUM',
        condition: (status) => status.diskUsageRate >= 80 && status.diskUsageRate < 90,
        message: '硬盘使用率超过80%',
        enabled: true
      },
      {
        id: 'DEVICE_OFFLINE',
        name: '设备离线',
        type: 'DEVICE',
        level: 'HIGH',
        condition: (status) => status.onlineStatus === 'OFFLINE',
        message: '设备已离线',
        enabled: true
      },
      {
        id: 'DEVICE_ONLINE',
        name: '设备上线',
        type: 'DEVICE',
        level: 'INFO',
        condition: (status) => status.onlineStatus === 'ONLINE' && status.wasOffline,
        message: '设备已恢复在线',
        enabled: true
      },
      {
        id: 'NETWORK_UNSTABLE',
        name: '网络不稳定',
        type: 'NETWORK',
        level: 'MEDIUM',
        condition: (status) => status.networkStatus === 'UNSTABLE',
        message: '网络连接不稳定',
        enabled: true
      }
    ];
  }

  async checkAndGenerateAlarms() {
    try {
      const devices = await db.query(
        `SELECT d.*, 
          (SELECT DISK_USAGE_RATE FROM NVR_DEVICE_STATUS 
           WHERE DEVICE_ID = d.ID 
           ORDER BY CREATE_TIME DESC LIMIT 1) as latest_disk_usage,
          (SELECT NETWORK_STATUS FROM NVR_DEVICE_STATUS 
           WHERE DEVICE_ID = d.ID 
           ORDER BY CREATE_TIME DESC LIMIT 1) as latest_network_status,
          (SELECT IS_ONLINE FROM NVR_DEVICE 
           WHERE ID = d.ID) as is_online
        FROM NVR_DEVICE d 
        WHERE d.STATUS = 'ACTIVE'`
      );

      for (const device of devices) {
        await this.checkDeviceAlarms(device);
      }
    } catch (error) {
      logger.error('告警检测任务执行失败', error);
      throw error;
    }
  }

  async checkDeviceAlarms(device) {
    const status = {
      diskUsageRate: parseFloat(device.latest_disk_usage) || 0,
      onlineStatus: device.IS_ONLINE ? 'ONLINE' : 'OFFLINE',
      networkStatus: device.latest_network_status || 'UNKNOWN',
      wasOffline: device.LAST_OFFLINE_TIME && 
        new Date() - new Date(device.LAST_OFFLINE_TIME) < 60000
    };

    for (const rule of this.alarmRules) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(status)) {
          await this.generateAlarm(device, rule, status);
        }
      } catch (error) {
        logger.error(`告警规则检查失败: ${rule.id}`, error);
      }
    }
  }

  async generateAlarm(device, rule, status) {
    const alarmKey = `${device.ID}_${rule.id}`;

    if (this.pendingAlarms.has(alarmKey)) {
      const existingAlarm = this.pendingAlarms.get(alarmKey);
      const timeSinceLastAlarm = Date.now() - existingAlarm.lastAlarmTime;

      if (timeSinceLastAlarm < rule.cooldown || 300000) {
        return;
      }
    }

    try {
      const id = uuidv4();
      const alarmValue = rule.id.includes('DISK') 
        ? `${status.diskUsageRate}%` 
        : status.onlineStatus;

      await db.query(
        `INSERT INTO NVR_ALARM (
          ID, DEVICE_ID, ALARM_TYPE, ALARM_LEVEL,
          ALARM_TITLE, ALARM_CONTENT, ALARM_VALUE, STATUS
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          device.ID,
          rule.type,
          rule.level,
          `${device.NAME} - ${rule.name}`,
          rule.message,
          alarmValue,
          'PENDING'
        ]
      );

      const alarm = {
        id,
        deviceId: device.ID,
        deviceName: device.NAME,
        deviceIP: device.IP_ADDRESS,
        alarmType: rule.type,
        alarmLevel: rule.level,
        alarmTitle: `${device.NAME} - ${rule.name}`,
        alarmContent: rule.message,
        alarmValue,
        status: 'PENDING',
        createTime: new Date().toISOString()
      };

      this.pendingAlarms.set(alarmKey, {
        alarmId: id,
        lastAlarmTime: Date.now()
      });

      this.broadcastAlarm(alarm);

      logger.warn(`生成告警: ${alarm.alarmTitle} - ${alarm.alarmContent}`);

      return alarm;
    } catch (error) {
      logger.error(`生成告警失败: ${device.ID}`, error);
      throw error;
    }
  }

  broadcastAlarm(alarm) {
    if (global.io) {
      global.io.to('alarms').emit('new-alarm', alarm);
      global.io.emit('alarm-count-update', {
        count: this.pendingAlarms.size,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getPendingAlarms(companyId = null) {
    try {
      let sql = `
        SELECT a.*, d.NAME as DEVICE_NAME, d.IP_ADDRESS, d.COMPANY_ID
        FROM NVR_ALARM a
        JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
        WHERE a.STATUS = 'PENDING'
      `;
      const params = [];

      if (companyId) {
        sql += ' AND d.COMPANY_ID = ?';
        params.push(companyId);
      }

      sql += ' ORDER BY a.CREATE_TIME DESC';

      const rows = await db.query(sql, params);
      return rows;
    } catch (error) {
      logger.error('获取待处理告警失败', error);
      throw error;
    }
  }

  async getAlarmList(filters = {}) {
    try {
      let sql = `
        SELECT a.*, d.NAME as DEVICE_NAME, d.IP_ADDRESS, d.BRAND, c.NAME as COMPANY_NAME
        FROM NVR_ALARM a
        JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
        LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID
        WHERE 1=1
      `;
      const params = [];

      if (filters.deviceId) {
        sql += ' AND a.DEVICE_ID = ?';
        params.push(filters.deviceId);
      }

      if (filters.companyId) {
        sql += ' AND d.COMPANY_ID = ?';
        params.push(filters.companyId);
      }

      if (filters.alarmType) {
        sql += ' AND a.ALARM_TYPE = ?';
        params.push(filters.alarmType);
      }

      if (filters.alarmLevel) {
        sql += ' AND a.ALARM_LEVEL = ?';
        params.push(filters.alarmLevel);
      }

      if (filters.status) {
        sql += ' AND a.STATUS = ?';
        params.push(filters.status);
      }

      if (filters.startTime) {
        sql += ' AND a.CREATE_TIME >= ?';
        params.push(new Date(filters.startTime));
      }

      if (filters.endTime) {
        sql += ' AND a.CREATE_TIME <= ?';
        params.push(new Date(filters.endTime));
      }

      sql += ' ORDER BY a.CREATE_TIME DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(filters.limit));
      }

      if (filters.offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(filters.offset));
      }

      const rows = await db.query(sql, params);
      return rows;
    } catch (error) {
      logger.error('获取告警列表失败', error);
      throw error;
    }
  }

  async handleAlarm(alarmId, handlerId, handleContent) {
    try {
      await db.query(
        `UPDATE NVR_ALARM 
         SET STATUS = 'HANDLED', 
             HANDLER_ID = ?, 
             HANDLE_TIME = ?, 
             HANDLE_CONTENT = ?
         WHERE ID = ?`,
        [handlerId, new Date(), handleContent, alarmId]
      );

      const alarmKey = Array.from(this.pendingAlarms.keys())
        .find(key => this.pendingAlarms.get(key).alarmId === alarmId);

      if (alarmKey) {
        this.pendingAlarms.delete(alarmKey);
      }

      if (global.io) {
        global.io.emit('alarm-handled', { alarmId, handlerId });
      }

      return { success: true, message: '告警处理成功' };
    } catch (error) {
      logger.error(`处理告警失败: ${alarmId}`, error);
      throw error;
    }
  }

  async getAlarmStatistics(companyId = null) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as TOTAL_COUNT,
          SUM(CASE WHEN STATUS = 'PENDING' THEN 1 ELSE 0 END) as PENDING_COUNT,
          SUM(CASE WHEN ALARM_LEVEL = 'HIGH' AND STATUS = 'PENDING' THEN 1 ELSE 0 END) as HIGH_LEVEL_COUNT,
          SUM(CASE WHEN ALARM_LEVEL = 'MEDIUM' AND STATUS = 'PENDING' THEN 1 ELSE 0 END) as MEDIUM_LEVEL_COUNT,
          SUM(CASE WHEN ALARM_TYPE = 'DISK' THEN 1 ELSE 0 END) as DISK_ALARM_COUNT,
          SUM(CASE WHEN ALARM_TYPE = 'DEVICE' THEN 1 ELSE 0 END) as DEVICE_ALARM_COUNT
        FROM NVR_ALARM a
        JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
        WHERE 1=1
      `;
      const params = [];

      if (companyId) {
        sql += ' AND d.COMPANY_ID = ?';
        params.push(companyId);
      }

      const [stats] = await db.query(sql, params);
      return stats;
    } catch (error) {
      logger.error('获取告警统计失败', error);
      throw error;
    }
  }

  async getAlarmTrend(days = 7) {
    try {
      const sql = `
        SELECT 
          DATE(CREATE_TIME) as ALARM_DATE,
          COUNT(*) as ALARM_COUNT,
          SUM(CASE WHEN ALARM_LEVEL = 'HIGH' THEN 1 ELSE 0 END) as HIGH_COUNT,
          SUM(CASE WHEN ALARM_LEVEL = 'MEDIUM' THEN 1 ELSE 0 END) as MEDIUM_COUNT
        FROM NVR_ALARM
        WHERE CREATE_TIME >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(CREATE_TIME)
        ORDER BY ALARM_DATE
      `;

      const rows = await db.query(sql, [days]);
      return rows;
    } catch (error) {
      logger.error('获取告警趋势失败', error);
      throw error;
    }
  }
}

module.exports = new AlarmService();
