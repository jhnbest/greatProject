/**
 * 数据采集服务
 * 定时采集所有NVR设备的状态信息
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const DeviceFactory = require('./deviceFactory');
const logger = require('../utils/logger');

class DataCollectionService {
  constructor() {
    this.deviceServices = new Map();
    this.collectionInterval = 30000;
  }

  async collectAllDevicesStatus() {
    try {
      const devices = await db.query(
        'SELECT * FROM NVR_DEVICE WHERE STATUS = ? AND IS_ONLINE = ?',
        ['ACTIVE', 1]
      );

      const promises = devices.map(device => this.collectDeviceStatus(device));
      const results = await Promise.allSettled(promises);

      let successCount = 0;
      let failCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          failCount++;
          logger.error(`设备 ${devices[index].NAME} 数据采集失败:`, result.reason);
        }
      });

      if (devices.length > 0) {
        logger.info(`数据采集完成: 成功 ${successCount} 台, 失败 ${failCount} 台`);
      }

      return { successCount, failCount };
    } catch (error) {
      logger.error('数据采集任务执行失败', error);
      throw error;
    }
  }

  async collectDeviceStatus(device) {
    try {
      const config = {
        ip: device.IP_ADDRESS,
        port: device.PORT,
        username: device.USERNAME,
        password: this.decryptPassword(device.PASSWORD)
      };

      const service = DeviceFactory.createService(device.BRAND, config);
      const statusData = await service.getDeviceStatus();

      const statusRecord = await this.saveDeviceStatus(device.ID, statusData);

      await this.updateDeviceOnlineStatus(device.ID, true, statusData);

      this.broadcastDeviceStatus(device.ID, statusData);

      return statusRecord;
    } catch (error) {
      await this.updateDeviceOnlineStatus(device.ID, false);
      throw error;
    }
  }

  async saveDeviceStatus(deviceId, statusData) {
    try {
      const id = uuidv4();
      const diskUsageRate = statusData.summary.diskUsageRate || 0;

      await db.query(
        `INSERT INTO NVR_DEVICE_STATUS (
          ID, DEVICE_ID, CPU_USAGE, MEMORY_USAGE, 
          DISK_TOTAL, DISK_USED, DISK_FREE, DISK_USAGE_RATE,
          DEVICE_TEMPERATURE, RECORDING_STATUS, CHANNEL_ONLINE_COUNT,
          CHANNEL_TOTAL_COUNT, NETWORK_STATUS, SYSTEM_TIME, RAW_DATA
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          deviceId,
          null,
          null,
          statusData.summary.diskTotal,
          statusData.summary.diskUsed,
          statusData.summary.diskFree,
          diskUsageRate,
          null,
          statusData.summary.recordingStatus || 'RECORDING',
          statusData.channelInfo?.onlineCount || 0,
          statusData.channelInfo?.totalCount || 0,
          statusData.summary.onlineStatus,
          new Date(),
          JSON.stringify(statusData)
        ]
      );

      return { id, deviceId, ...statusData };
    } catch (error) {
      logger.error(`保存设备状态失败: ${deviceId}`, error);
      throw error;
    }
  }

  async updateDeviceOnlineStatus(deviceId, isOnline, statusData = null) {
    try {
      const now = new Date();
      const updateFields = ['IS_ONLINE = ?', 'UPDATE_TIME = ?'];
      const updateParams = [isOnline ? 1 : 0, now];

      if (isOnline) {
        updateFields.push('LAST_ONLINE_TIME = ?');
        updateParams.push(now);
        if (statusData?.summary?.diskUsageRate !== undefined) {
          updateFields.push('DISK_USAGE_RATE = ?');
          updateParams.push(statusData.summary.diskUsageRate);
        }
      } else {
        updateFields.push('LAST_OFFLINE_TIME = ?');
        updateParams.push(now);
      }

      updateParams.push(deviceId);

      await db.query(
        `UPDATE NVR_DEVICE SET ${updateFields.join(', ')} WHERE ID = ?`,
        updateParams
      );
    } catch (error) {
      logger.error(`更新设备在线状态失败: ${deviceId}`, error);
      throw error;
    }
  }

  broadcastDeviceStatus(deviceId, statusData) {
    if (global.io) {
      global.io.to(`device-${deviceId}`).emit('device-status', {
        deviceId,
        status: statusData,
        timestamp: new Date().toISOString()
      });

      global.io.emit('device-status-update', {
        deviceId,
        diskUsageRate: statusData.summary.diskUsageRate,
        onlineStatus: statusData.summary.onlineStatus,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getDeviceLatestStatus(deviceId) {
    try {
      const rows = await db.query(
        `SELECT * FROM NVR_DEVICE_STATUS 
         WHERE DEVICE_ID = ? 
         ORDER BY CREATE_TIME DESC 
         LIMIT 1`,
        [deviceId]
      );

      if (rows.length === 0) {
        return null;
      }

      const status = rows[0];
      if (status.RAW_DATA) {
        status.parsedData = JSON.parse(status.RAW_DATA);
      }

      return status;
    } catch (error) {
      logger.error(`获取设备最新状态失败: ${deviceId}`, error);
      throw error;
    }
  }

  async getDeviceStatusHistory(deviceId, startTime, endTime, limit = 100) {
    try {
      let sql = `
        SELECT * FROM NVR_DEVICE_STATUS 
        WHERE DEVICE_ID = ? 
      `;
      const params = [deviceId];

      if (startTime) {
        sql += ' AND CREATE_TIME >= ?';
        params.push(new Date(startTime));
      }

      if (endTime) {
        sql += ' AND CREATE_TIME <= ?';
        params.push(new Date(endTime));
      }

      sql += ' ORDER BY CREATE_TIME DESC LIMIT ?';
      params.push(limit);

      const rows = await db.query(sql, params);
      return rows;
    } catch (error) {
      logger.error(`获取设备状态历史失败: ${deviceId}`, error);
      throw error;
    }
  }

  decryptPassword(encryptedPassword) {
    try {
      const crypto = require('crypto');
      const key = crypto.scryptSync(
        process.env.ENCRYPTION_KEY || 'nvr-monitor-secret-key',
        'salt',
        32
      );
      const iv = Buffer.from(
        process.env.ENCRYPTION_IV || '1234567890123456'
      );
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedPassword, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return encryptedPassword;
    }
  }

  async collectSingleDevice(deviceId) {
    try {
      const devices = await db.query(
        'SELECT * FROM NVR_DEVICE WHERE ID = ?',
        [deviceId]
      );

      if (devices.length === 0) {
        throw new Error(`设备不存在: ${deviceId}`);
      }

      return await this.collectDeviceStatus(devices[0]);
    } catch (error) {
      logger.error(`手动采集设备状态失败: ${deviceId}`, error);
      throw error;
    }
  }
}

module.exports = new DataCollectionService();
