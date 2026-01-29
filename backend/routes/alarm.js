/**
 * 告警管理路由
 * 告警查询、处理、统计
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const alarmService = require('../services/alarmService');
const logger = require('../utils/logger');

router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      deviceId,
      companyId,
      alarmType,
      alarmLevel,
      status,
      startTime,
      endTime
    } = req.query;
    const offset = (page - 1) * limit;

    const alarms = await alarmService.getAlarmList({
      deviceId,
      companyId,
      alarmType,
      alarmLevel,
      status,
      startTime,
      endTime,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    let countSql = `
      SELECT COUNT(*) as total 
      FROM NVR_ALARM a 
      JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID 
      WHERE 1=1
    `;
    const countParams = [];

    if (deviceId) {
      countSql += ' AND a.DEVICE_ID = ?';
      countParams.push(deviceId);
    }

    if (companyId) {
      countSql += ' AND d.COMPANY_ID = ?';
      countParams.push(companyId);
    }

    if (alarmType) {
      countSql += ' AND a.ALARM_TYPE = ?';
      countParams.push(alarmType);
    }

    if (alarmLevel) {
      countSql += ' AND a.ALARM_LEVEL = ?';
      countParams.push(alarmLevel);
    }

    if (status) {
      countSql += ' AND a.STATUS = ?';
      countParams.push(status);
    }

    if (startTime) {
      countSql += ' AND a.CREATE_TIME >= ?';
      countParams.push(new Date(startTime));
    }

    if (endTime) {
      countSql += ' AND a.CREATE_TIME <= ?';
      countParams.push(new Date(endTime));
    }

    const [countResult] = await db.query(countSql, countParams);

    res.json({
      success: true,
      data: {
        list: alarms.map(a => ({
          id: a.ID,
          deviceId: a.DEVICE_ID,
          deviceName: a.DEVICE_NAME,
          deviceIP: a.IP_ADDRESS,
          brand: a.BRAND,
          companyId: a.COMPANY_ID,
          companyName: a.COMPANY_NAME,
          alarmType: a.ALARM_TYPE,
          alarmLevel: a.ALARM_LEVEL,
          alarmTitle: a.ALARM_TITLE,
          alarmContent: a.ALARM_CONTENT,
          alarmValue: a.ALARM_VALUE,
          status: a.STATUS,
          handlerId: a.HANDLER_ID,
          handleTime: a.HANDLE_TIME,
          handleContent: a.HANDLE_CONTENT,
          createTime: a.CREATE_TIME
        })),
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('获取告警列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警列表失败'
    });
  }
});

router.get('/pending', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;
    const alarms = await alarmService.getPendingAlarms(companyId);

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
        alarmValue: a.ALARM_VALUE,
        status: a.STATUS,
        createTime: a.CREATE_TIME
      }))
    });
  } catch (error) {
    logger.error('获取待处理告警失败', error);
    res.status(500).json({
      success: false,
      message: '获取待处理告警失败'
    });
  }
});

router.get('/statistics', auth.verifyToken, async (req, res) => {
  try {
    const { companyId } = req.query;
    const stats = await alarmService.getAlarmStatistics(companyId);

    res.json({
      success: true,
      data: {
        totalCount: stats.TOTAL_COUNT || 0,
        pendingCount: stats.PENDING_COUNT || 0,
        highLevelCount: stats.HIGH_LEVEL_COUNT || 0,
        mediumLevelCount: stats.MEDIUM_LEVEL_COUNT || 0,
        diskAlarmCount: stats.DISK_ALARM_COUNT || 0,
        deviceAlarmCount: stats.DEVICE_ALARM_COUNT || 0
      }
    });
  } catch (error) {
    logger.error('获取告警统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警统计失败'
    });
  }
});

router.get('/trend', auth.verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const trend = await alarmService.getAlarmTrend(parseInt(days));

    res.json({
      success: true,
      data: trend.map(t => ({
        date: t.ALARM_DATE,
        totalCount: t.ALARM_COUNT,
        highCount: t.HIGH_COUNT,
        mediumCount: t.MEDIUM_COUNT
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

router.get('/types', auth.verifyToken, async (req, res) => {
  try {
    const types = [
      { code: 'DISK', name: '硬盘告警' },
      { code: 'DEVICE', name: '设备告警' },
      { code: 'NETWORK', name: '网络告警' },
      { code: 'CHANNEL', name: '通道告警' }
    ];

    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    logger.error('获取告警类型失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警类型失败'
    });
  }
});

router.get('/levels', auth.verifyToken, async (req, res) => {
  try {
    const levels = [
      { code: 'HIGH', name: '高危', color: '#F56C6C' },
      { code: 'MEDIUM', name: '中危', color: '#E6A23C' },
      { code: 'LOW', name: '低危', color: '#909399' },
      { code: 'INFO', name: '信息', color: '#909399' }
    ];

    res.json({
      success: true,
      data: levels
    });
  } catch (error) {
    logger.error('获取告警级别失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警级别失败'
    });
  }
});

router.post('/:id/handle', auth.verifyToken, [
  body('handleContent').notEmpty().withMessage('处理意见不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { handleContent } = req.body;

    const result = await alarmService.handleAlarm(id, req.user.userId, handleContent);

    auth.logOperation(req.user.userId, 'ALARM_HANDLE', `处理告警: ${id}`, req.ip);

    res.json({
      success: true,
      message: '处理成功',
      data: result
    });
  } catch (error) {
    logger.error('处理告警失败', error);
    res.status(500).json({
      success: false,
      message: '处理告警失败'
    });
  }
});

router.put('/batch/handle', auth.verifyToken, auth.requireRole('ADMIN', 'OPERATOR'), [
  body('alarmIds').isArray({ min: 1 }).withMessage('告警ID列表不能为空'),
  body('handleContent').notEmpty().withMessage('处理意见不能为空')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '参数验证失败',
        errors: errors.array()
      });
    }

    const { alarmIds, handleContent } = req.body;
    let successCount = 0;

    for (const alarmId of alarmIds) {
      try {
        await alarmService.handleAlarm(alarmId, req.user.userId, handleContent);
        successCount++;
      } catch (error) {
        logger.error(`批量处理告警失败: ${alarmId}`, error);
      }
    }

    auth.logOperation(req.user.userId, 'ALARM_BATCH_HANDLE', `批量处理告警: ${alarmIds.length}`, req.ip);

    res.json({
      success: true,
      message: `成功处理 ${successCount}/${alarmIds.length} 条告警`,
      data: { total: alarmIds.length, success: successCount }
    });
  } catch (error) {
    logger.error('批量处理告警失败', error);
    res.status(500).json({
      success: false,
      message: '批量处理告警失败'
    });
  }
});

router.get('/:id', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const alarms = await db.query(
      `SELECT a.*, d.NAME as DEVICE_NAME, d.IP_ADDRESS, d.BRAND, d.COMPANY_ID,
              c.NAME as COMPANY_NAME, u.REAL_NAME as HANDLER_NAME
       FROM NVR_ALARM a
       JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID
       LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID
       LEFT JOIN SYS_USER u ON a.HANDLER_ID = u.ID
       WHERE a.ID = ?`,
      [id]
    );

    if (alarms.length === 0) {
      return res.status(404).json({
        success: false,
        message: '告警不存在'
      });
    }

    const alarm = alarms[0];

    res.json({
      success: true,
      data: {
        id: alarm.ID,
        deviceId: alarm.DEVICE_ID,
        deviceName: alarm.DEVICE_NAME,
        deviceIP: alarm.IP_ADDRESS,
        brand: alarm.BRAND,
        companyId: alarm.COMPANY_ID,
        companyName: alarm.COMPANY_NAME,
        alarmType: alarm.ALARM_TYPE,
        alarmLevel: alarm.ALARM_LEVEL,
        alarmTitle: alarm.ALARM_TITLE,
        alarmContent: alarm.ALARM_CONTENT,
        alarmValue: alarm.ALARM_VALUE,
        status: alarm.STATUS,
        handlerId: alarm.HANDLER_ID,
        handlerName: alarm.HANDLER_NAME,
        handleTime: alarm.HANDLE_TIME,
        handleContent: alarm.HANDLE_CONTENT,
        createTime: alarm.CREATE_TIME
      }
    });
  } catch (error) {
    logger.error('获取告警详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取告警详情失败'
    });
  }
});

module.exports = router;
