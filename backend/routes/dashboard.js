/**
 * 仪表盘路由
 * 系统总览和统计数据
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/overview', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let deviceWhere = 'WHERE d.STATUS = ?';
    const deviceParams = ['ACTIVE'];

    if (companyId) {
      deviceWhere += ' AND d.COMPANY_ID = ?';
      deviceParams.push(companyId);
    }

    const [deviceStats] = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN d.IS_ONLINE = 1 THEN 1 ELSE 0 END) as online,
         SUM(CASE WHEN d.IS_ONLINE = 0 THEN 1 ELSE 0 END) as offline,
         AVG(d.DISK_USAGE_RATE) as avg_disk_usage
       FROM NVR_DEVICE d ${deviceWhere}`,
      deviceParams
    );

    const [companyCount] = await db.query(
      'SELECT COUNT(*) as count FROM SYS_COMPONY WHERE STATUS = ?',
      ['1']
    );

    const [alarmStats] = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN STATUS = 'PENDING' THEN 1 ELSE 0 END) as pending,
         SUM(CASE WHEN ALARM_LEVEL = 'HIGH' AND STATUS = 'PENDING' THEN 1 ELSE 0 END) as high_pending
       FROM NVR_ALARM a
       JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID ${companyId ? 'AND d.COMPANY_ID = ?' : ''}`,
      companyId ? [companyId] : []
    );

    const onlineRate = deviceStats.total > 0 
      ? ((deviceStats.online / deviceStats.total) * 100).toFixed(2) 
      : 0;

    res.json({
      success: true,
      data: {
        devices: {
          total: deviceStats.total || 0,
          online: deviceStats.online || 0,
          offline: deviceStats.offline || 0,
          onlineRate: parseFloat(onlineRate),
          avgDiskUsage: parseFloat(deviceStats.avg_disk_usage || 0).toFixed(2)
        },
        companies: {
          total: companyCount.count || 0
        },
        alarms: {
          total: alarmStats.total || 0,
          pending: alarmStats.pending || 0,
          highPending: alarmStats.high_pending || 0
        }
      }
    });
  } catch (error) {
    logger.error('获取仪表盘概览失败', error);
    res.status(500).json({
      success: false,
      message: '获取仪表盘数据失败'
    });
  }
});

router.get('/device-stats', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let sql = `
      SELECT 
        c.ID as company_id,
        c.NAME as company_name,
        COUNT(d.ID) as device_count,
        SUM(CASE WHEN d.IS_ONLINE = 1 THEN 1 ELSE 0 END) as online_count,
        AVG(d.DISK_USAGE_RATE) as avg_disk_usage
      FROM SYS_COMPANY c
      LEFT JOIN NVR_DEVICE d ON c.ID = d.COMPANY_ID AND d.STATUS = 'ACTIVE'
      WHERE c.STATUS = '1'
      GROUP BY c.ID
      ORDER BY device_count DESC
    `;

    const stats = await db.query(sql);

    res.json({
      success: true,
      data: stats.map(s => ({
        companyId: s.company_id,
        companyName: s.company_name,
        deviceCount: s.device_count || 0,
        onlineCount: s.online_count || 0,
        offlineCount: (s.device_count || 0) - (s.online_count || 0),
        avgDiskUsage: parseFloat(s.avg_disk_usage || 0).toFixed(2)
      }))
    });
  } catch (error) {
    logger.error('获取设备统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取设备统计失败'
    });
  }
});

router.get('/brand-distribution', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let sql = `
      SELECT BRAND, COUNT(*) as count
      FROM NVR_DEVICE
      WHERE STATUS = 'ACTIVE'
    `;
    const params = [];

    if (companyId) {
      sql += ' AND COMPANY_ID = ?';
      params.push(companyId);
    }

    sql += ' GROUP BY BRAND';

    const distribution = await db.query(sql, params);

    const total = distribution.reduce((sum, d) => sum + d.count, 0);

    res.json({
      success: true,
      data: {
        list: distribution.map(d => ({
          brand: d.BRAND,
          count: d.count,
          percentage: total > 0 ? ((d.count / total) * 100).toFixed(2) : 0
        })),
        total
      }
    });
  } catch (error) {
    logger.error('获取品牌分布失败', error);
    res.status(500).json({
      success: false,
      message: '获取品牌分布失败'
    });
  }
});

router.get('/disk-usage-chart', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let sql = `
      SELECT 
        CASE 
          WHEN DISK_USAGE_RATE >= 90 THEN '严重'
          WHEN DISK_USAGE_RATE >= 80 THEN '警告'
          WHEN DISK_USAGE_RATE >= 60 THEN '一般'
          ELSE '正常'
        END as category,
        COUNT(*) as count
      FROM NVR_DEVICE
      WHERE STATUS = 'ACTIVE' AND IS_ONLINE = 1
    `;
    const params = [];

    if (companyId) {
      sql += ' AND COMPANY_ID = ?';
      params.push(companyId);
    }

    sql += ' GROUP BY category';

    const data = await db.query(sql, params);

    const result = {
      normal: 0,
      general: 0,
      warning: 0,
      critical: 0
    };

    data.forEach(d => {
      switch (d.category) {
        case '正常': result.normal = d.count; break;
        case '一般': result.general = d.count; break;
        case '警告': result.warning = d.count; break;
        case '严重': result.critical = d.count; break;
      }
    });

    res.json({
      success: true,
      data: [
        { name: '正常', value: result.normal, color: '#67C23A' },
        { name: '一般', value: result.general, color: '#409EFF' },
        { name: '警告', value: result.warning, color: '#E6A23C' },
        { name: '严重', value: result.critical, color: '#F56C6C' }
      ]
    });
  } catch (error) {
    logger.error('获取硬盘使用率图表数据失败', error);
    res.status(500).json({
      success: false,
      message: '获取图表数据失败'
    });
  }
});

router.get('/online-status-chart', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let sql = `
      SELECT 
        CASE WHEN IS_ONLINE = 1 THEN '在线' ELSE '离线' END as status,
        COUNT(*) as count
      FROM NVR_DEVICE
      WHERE STATUS = 'ACTIVE'
    `;
    const params = [];

    if (companyId) {
      sql += ' AND COMPANY_ID = ?';
      params.push(companyId);
    }

    sql += ' GROUP BY IS_ONLINE';

    const data = await db.query(sql, params);

    const result = {
      online: 0,
      offline: 0
    };

    data.forEach(d => {
      if (d.status === '在线') result.online = d.count;
      else result.offline = d.count;
    });

    res.json({
      success: true,
      data: [
        { name: '在线', value: result.online, color: '#67C23A' },
        { name: '离线', value: result.offline, color: '#909399' }
      ]
    });
  } catch (error) {
    logger.error('获取在线状态图表数据失败', error);
    res.status(500).json({
      success: false,
      message: '获取图表数据失败'
    });
  }
});

router.get('/alarm-trend', auth.verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const trend = await db.query(
      `SELECT 
         DATE(CREATE_TIME) as date,
         COUNT(*) as total,
         SUM(CASE WHEN ALARM_LEVEL = 'HIGH' THEN 1 ELSE 0 END) as high,
         SUM(CASE WHEN ALARM_LEVEL = 'MEDIUM' THEN 1 ELSE 0 END) as medium,
         SUM(CASE WHEN ALARM_LEVEL = 'LOW' THEN 1 ELSE 0 END) as low
       FROM NVR_ALARM
       WHERE CREATE_TIME >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(CREATE_TIME)
       ORDER BY date`,
      [parseInt(days)]
    );

    res.json({
      success: true,
      data: trend.map(t => ({
        date: t.date,
        total: t.total,
        high: t.high,
        medium: t.medium,
        low: t.low
      }))
    });
  } catch (error) {
    logger.error('获取告警趋势失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警趋势失败'
    });
  }
});

router.get('/alarm-type-distribution', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;

    let sql = `
      SELECT 
        ALARM_TYPE,
        COUNT(*) as count
      FROM NVR_ALARM a
      JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
      WHERE 1=1
    `;
    const params = [];

    if (companyId) {
      sql += ' AND d.COMPANY_ID = ?';
      params.push(companyId);
    }

    sql += ' GROUP BY ALARM_TYPE';

    const distribution = await db.query(sql, params);

    const typeNames = {
      DISK: '硬盘告警',
      DEVICE: '设备告警',
      NETWORK: '网络告警',
      CHANNEL: '通道告警'
    };

    res.json({
      success: true,
      data: distribution.map(d => ({
        type: d.ALARM_TYPE,
        typeName: typeNames[d.ALARM_TYPE] || d.ALARM_TYPE,
        count: d.count
      }))
    });
  } catch (error) {
    logger.error('获取告警类型分布失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警类型分布失败'
    });
  }
});

router.get('/recent-alarms', auth.verifyToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const alarms = await db.query(
      `SELECT a.*, d.NAME as DEVICE_NAME, d.IP_ADDRESS
       FROM NVR_ALARM a
       JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
       ORDER BY a.CREATE_TIME DESC
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json({
      success: true,
      data: alarms.map(a => ({
        id: a.ID,
        deviceId: a.DEVICE_ID,
        deviceName: a.DEVICE_NAME,
        deviceIP: a.IP_ADDRESS,
        alarmType: a.ALARM_TYPE,
        alarmLevel: a.ALARM_LEVEL,
        alarmTitle: a.ALARM_TITLE,
        alarmContent: a.ALARM_CONTENT,
        status: a.STATUS,
        createTime: a.CREATE_TIME
      }))
    });
  } catch (error) {
    logger.error('获取最近告警失败', error);
    res.status(500).json({
      success: false,
      message: '获取最近告警失败'
    });
  }
});

router.get('/top-devices', auth.verifyToken, async (req, res) => {
  try {
    const { type = 'disk', limit = 10 } = req.query;

    let sql = `
      SELECT d.ID, d.NAME, d.IP_ADDRESS, c.NAME as COMPANY_NAME,
             d.DISK_USAGE_RATE, d.IS_ONLINE
      FROM NVR_DEVICE d
      LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID
      WHERE d.STATUS = 'ACTIVE'
    `;

    if (type === 'disk') {
      sql += ' ORDER BY d.DISK_USAGE_RATE DESC';
    } else if (type === 'offline') {
      sql += ' AND d.IS_ONLINE = 0 ORDER BY d.LAST_OFFLINE_TIME DESC';
    }

    sql += ' LIMIT ?';

    const devices = await db.query(sql, [parseInt(limit)]);

    res.json({
      success: true,
      data: devices.map(d => ({
        id: d.ID,
        name: d.NAME,
        ipAddress: d.IP_ADDRESS,
        companyName: d.COMPANY_NAME,
        diskUsageRate: d.DISK_USAGE_RATE,
        isOnline: d.IS_ONLINE
      }))
    });
  } catch (error) {
    logger.error('获取设备排行失败', error);
    res.status(500).json({
      success: false,
      message: '获取设备排行失败'
    });
  }
});

module.exports = router;
