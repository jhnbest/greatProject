/**
 * 监控数据路由
 * 实时监控数据查询
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const dataCollectionService = require('../services/dataCollectionService');
const logger = require('../utils/logger');

router.get('/realtime', auth.verifyToken, async (req, res) => {
  try {
    const { companyId, brand, onlineStatus } = req.query;

    let sql = `
      SELECT d.*, c.NAME as COMPANY_NAME,
        (SELECT DISK_USAGE_RATE FROM NVR_DEVICE_STATUS 
         WHERE DEVICE_ID = d.ID 
         ORDER BY CREATE_TIME DESC LIMIT 1) as disk_usage,
        (SELECT NETWORK_STATUS FROM NVR_DEVICE_STATUS 
         WHERE DEVICE_ID = d.ID 
         ORDER BY CREATE_TIME DESC LIMIT 1) as network_status,
        (SELECT CHANNEL_ONLINE_COUNT FROM NVR_DEVICE_STATUS 
         WHERE DEVICE_ID = d.ID 
         ORDER BY CREATE_TIME DESC LIMIT 1) as channel_online,
        (SELECT CHANNEL_TOTAL_COUNT FROM NVR_DEVICE_STATUS 
         WHERE DEVICE_ID = d.ID 
         ORDER BY CREATE_TIME DESC LIMIT 1) as channel_total,
        (SELECT RECORDING_STATUS FROM NVR_DEVICE_STATUS 
         WHERE DEVICE_ID = d.ID 
         ORDER BY CREATE_TIME DESC LIMIT 1) as recording_status
      FROM NVR_DEVICE d 
      LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID 
      WHERE d.STATUS = 'ACTIVE'
    `;
    const params = [];

    if (companyId) {
      sql += ' AND d.COMPANY_ID = ?';
      params.push(companyId);
    }

    if (brand) {
      sql += ' AND d.BRAND = ?';
      params.push(brand);
    }

    if (onlineStatus !== undefined) {
      sql += ' AND d.IS_ONLINE = ?';
      params.push(onlineStatus === 'true' || onlineStatus === '1' ? 1 : 0);
    }

    sql += ' ORDER BY d.IS_ONLINE DESC, d.NAME';

    const devices = await db.query(sql, params);

    const onlineCount = devices.filter(d => d.IS_ONLINE).length;
    const offlineCount = devices.length - onlineCount;
    const avgDiskUsage = devices.length > 0
      ? (devices.reduce((sum, d) => sum + (parseFloat(d.disk_usage) || 0), 0) / devices.length).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        devices: devices.map(d => ({
          id: d.ID,
          name: d.NAME,
          code: d.CODE,
          brand: d.BRAND,
          ipAddress: d.IP_ADDRESS,
          port: d.PORT,
          companyId: d.COMPANY_ID,
          companyName: d.COMPANY_NAME,
          isOnline: d.IS_ONLINE === 1,
          diskUsageRate: parseFloat(d.disk_usage) || 0,
          networkStatus: d.network_status || 'UNKNOWN',
          channelInfo: {
            online: d.channel_online || 0,
            total: d.channel_total || d.CHANNEL_COUNT || 0
          },
          recordingStatus: d.recording_status || 'UNKNOWN',
          lastOnlineTime: d.LAST_ONLINE_TIME,
          lastUpdateTime: d.UPDATE_TIME
        })),
        summary: {
          total: devices.length,
          online: onlineCount,
          offline: offlineCount,
          avgDiskUsage: parseFloat(avgDiskUsage)
        }
      }
    });
  } catch (error) {
    logger.error('获取实时监控数据失败', error);
    res.status(500).json({
      success: false,
      message: '获取实时监控数据失败'
    });
  }
});

router.get('/device/:id', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const devices = await db.query(
      `SELECT d.*, c.NAME as COMPANY_NAME 
       FROM NVR_DEVICE d 
       LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID 
       WHERE d.ID = ?`,
      [id]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    const device = devices[0];
    const status = await dataCollectionService.getDeviceLatestStatus(id);

    res.json({
      success: true,
      data: {
        device: {
          id: device.ID,
          name: device.NAME,
          code: device.CODE,
          brand: device.BRAND,
          model: device.MODEL,
          ipAddress: device.IP_ADDRESS,
          port: device.PORT,
          companyId: device.COMPANY_ID,
          companyName: device.COMPANY_NAME,
          isOnline: device.IS_ONLINE === 1,
          lastOnlineTime: device.LAST_ONLINE_TIME,
          lastOfflineTime: device.LAST_OFFLINE_TIME
        },
        status: status ? {
          diskTotal: status.DISK_TOTAL,
          diskUsed: status.DISK_USED,
          diskFree: status.DISK_FREE,
          diskUsageRate: status.DISK_USAGE_RATE,
          recordingStatus: status.RECORDING_STATUS,
          channelOnlineCount: status.CHANNEL_ONLINE_COUNT,
          channelTotalCount: status.CHANNEL_TOTAL_COUNT,
          networkStatus: status.NETWORK_STATUS,
          systemTime: status.SYSTEM_TIME,
          createTime: status.CREATE_TIME
        } : null
      }
    });
  } catch (error) {
    logger.error('获取设备监控详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取设备监控详情失败'
    });
  }
});

router.get('/device/:id/trend', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { period = '24h' } = req.query;

    let hours = 24;
    if (period === '7d') hours = 168;
    if (period === '30d') hours = 720;

    const history = await dataCollectionService.getDeviceStatusHistory(
      id,
      new Date(Date.now() - hours * 60 * 60 * 1000),
      new Date(),
      1000
    );

    const diskTrend = history.reverse().map(h => ({
      time: h.CREATE_TIME,
      value: h.DISK_USAGE_RATE
    }));

    res.json({
      success: true,
      data: {
        deviceId: id,
        period,
        diskTrend
      }
    });
  } catch (error) {
    logger.error('获取设备趋势数据失败', error);
    res.status(500).json({
      success: false,
      message: '获取趋势数据失败'
    });
  }
});

router.get('/statistics', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let deviceWhere = 'WHERE STATUS = ?';
    const deviceParams = ['ACTIVE'];

    if (companyId) {
      deviceWhere += ' AND COMPANY_ID = ?';
      deviceParams.push(companyId);
    }

    const deviceStats = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN IS_ONLINE = 1 THEN 1 ELSE 0 END) as online,
         SUM(CASE WHEN IS_ONLINE = 0 THEN 1 ELSE 0 END) as offline,
         AVG(DISK_USAGE_RATE) as avg_disk_usage
       FROM NVR_DEVICE ${deviceWhere}`,
      deviceParams
    );

    const brandStats = await db.query(
      `SELECT BRAND, COUNT(*) as count 
       FROM NVR_DEVICE ${deviceWhere}
       GROUP BY BRAND`,
      deviceParams
    );

    const alarmStats = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN STATUS = 'PENDING' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN ALARM_LEVEL = 'HIGH' AND STATUS = 'PENDING' THEN 1 ELSE 0 END) as high_pending
       FROM NVR_ALARM a
       JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
       WHERE d.STATUS = 'ACTIVE' ${companyId ? 'AND d.COMPANY_ID = ?' : ''}`,
      companyId ? [companyId] : []
    );

    const companyStats = await db.query(
      `SELECT 
         c.ID, c.NAME,
         COUNT(d.ID) as device_count,
         SUM(d.IS_ONLINE) as online_count
       FROM SYS_COMPANY c
       LEFT JOIN NVR_DEVICE d ON c.ID = d.COMPANY_ID AND d.STATUS = 'ACTIVE'
       WHERE c.STATUS = '1'
       GROUP BY c.ID
       ORDER BY device_count DESC`
    );

    res.json({
      success: true,
      data: {
        devices: {
          total: deviceStats[0]?.total || 0,
          online: deviceStats[0]?.online || 0,
          offline: deviceStats[0]?.offline || 0,
          avgDiskUsage: parseFloat(deviceStats[0]?.avg_disk_usage || 0).toFixed(2)
        },
        brands: brandStats.map(b => ({
          brand: b.BRAND,
          count: b.count
        })),
        alarms: {
          total: alarmStats[0]?.total || 0,
          pending: alarmStats[0]?.pending || 0,
          highPending: alarmStats[0]?.high_pending || 0
        },
        companies: companyStats.map(c => ({
          id: c.ID,
          name: c.NAME,
          deviceCount: c.device_count || 0,
          onlineCount: c.online_count || 0
        }))
      }
    });
  } catch (error) {
    logger.error('获取监控统计数据失败', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

router.get('/disk-usage/distribution', auth.verifyToken, async (req, res) => {
  try {
    const distribution = await db.query(
      `SELECT 
         CASE 
           WHEN DISK_USAGE_RATE >= 90 THEN 'critical'
           WHEN DISK_USAGE_RATE >= 80 THEN 'warning'
           WHEN DISK_USAGE_RATE >= 60 THEN 'normal'
           ELSE 'healthy'
         END as category,
         COUNT(*) as count
       FROM NVR_DEVICE 
       WHERE STATUS = 'ACTIVE' AND IS_ONLINE = 1
       GROUP BY category`
    );

    const result = {
      critical: 0,
      warning: 0,
      normal: 0,
      healthy: 0
    };

    distribution.forEach(d => {
      result[d.category] = d.count;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取硬盘使用率分布失败', error);
    res.status(500).json({
      success: false,
      message: '获取分布数据失败'
    });
  }
});

router.get('/online-status/distribution', auth.verifyToken, async (req, res) => {
  try {
    const distribution = await db.query(
      `SELECT 
         CASE WHEN IS_ONLINE = 1 THEN 'online' ELSE 'offline' END as status,
         COUNT(*) as count
       FROM NVR_DEVICE 
       WHERE STATUS = 'ACTIVE'
       GROUP BY IS_ONLINE`
    );

    const result = {
      online: 0,
      offline: 0
    };

    distribution.forEach(d => {
      result[d.status] = d.count;
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取在线状态分布失败', error);
    res.status(500).json({
      success: false,
      message: '获取分布数据失败'
    });
  }
});

router.post('/collect/all', auth.verifyToken, auth.requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const result = await dataCollectionService.collectAllDevicesStatus();

    res.json({
      success: true,
      message: '全量采集完成',
      data: result
    });
  } catch (error) {
    logger.error('全量数据采集失败', error);
    res.status(500).json({
      success: false,
      message: '采集失败'
    });
  }
});

module.exports = router;
