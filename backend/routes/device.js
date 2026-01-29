/**
 * 设备管理路由
 * NVR设备增删改查和状态监控
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const DeviceFactory = require('../services/deviceFactory');
const dataCollectionService = require('../services/dataCollectionService');
const logger = require('../utils/logger');

router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, companyId, brand, status } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT d.*, c.NAME as COMPANY_NAME 
      FROM NVR_DEVICE d 
      LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID 
      WHERE 1=1
    `;
    const params = [];

    if (keyword) {
      sql += ' AND (d.NAME LIKE ? OR d.CODE LIKE ? OR d.IP_ADDRESS LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    if (companyId) {
      sql += ' AND d.COMPANY_ID = ?';
      params.push(companyId);
    }

    if (brand) {
      sql += ' AND d.BRAND = ?';
      params.push(brand);
    }

    if (status) {
      sql += ' AND d.STATUS = ?';
      params.push(status);
    }

    sql += ' ORDER BY d.CREATE_TIME DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const devices = await db.query(sql, params);

    const countSql = 'SELECT COUNT(*) as total FROM NVR_DEVICE WHERE 1=1';
    const [countResult] = await db.query(countSql);

    res.json({
      success: true,
      data: {
        list: devices.map(d => ({
          id: d.ID,
          name: d.NAME,
          code: d.CODE,
          brand: d.BRAND,
          model: d.MODEL,
          ipAddress: d.IP_ADDRESS,
          port: d.PORT,
          companyId: d.COMPANY_ID,
          companyName: d.COMPANY_NAME,
          channelCount: d.CHANNEL_COUNT,
          status: d.STATUS,
          isOnline: d.IS_ONLINE,
          lastOnlineTime: d.LAST_ONLINE_TIME,
          lastOfflineTime: d.LAST_OFFLINE_TIME,
          diskUsageRate: d.DISK_USAGE_RATE,
          remarks: d.REMARKS,
          createTime: d.CREATE_TIME
        })),
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('获取设备列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取设备列表失败'
    });
  }
});

router.get('/all', auth.verifyToken, async (req, res) => {
  try {
    let sql = `
      SELECT d.*, c.NAME as COMPANY_NAME 
      FROM NVR_DEVICE d 
      LEFT JOIN SYS_COMPANY c ON d.COMPANY_ID = c.ID 
      WHERE d.STATUS = 'ACTIVE'
      ORDER BY d.CREATE_TIME
    `;

    const devices = await db.query(sql);

    res.json({
      success: true,
      data: devices.map(d => ({
        id: d.ID,
        name: d.NAME,
        code: d.CODE,
        brand: d.BRAND,
        ipAddress: d.IP_ADDRESS,
        companyId: d.COMPANY_ID,
        companyName: d.COMPANY_NAME,
        isOnline: d.IS_ONLINE,
        diskUsageRate: d.DISK_USAGE_RATE
      }))
    });
  } catch (error) {
    logger.error('获取全部设备列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取全部设备列表失败'
    });
  }
});

router.get('/brands', auth.verifyToken, async (req, res) => {
  try {
    const brands = DeviceFactory.getSupportedBrands();
    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    logger.error('获取支持的品牌列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取品牌列表失败'
    });
  }
});

router.get('/:id', auth.verifyToken, async (req, res) => {
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
        id: device.ID,
        name: device.NAME,
        code: device.CODE,
        brand: device.BRAND,
        model: device.MODEL,
        ipAddress: device.IP_ADDRESS,
        port: device.PORT,
        username: device.USERNAME,
        companyId: device.COMPANY_ID,
        companyName: device.COMPANY_NAME,
        channelCount: device.CHANNEL_COUNT,
        status: device.STATUS,
        isOnline: device.IS_ONLINE,
        lastOnlineTime: device.LAST_ONLINE_TIME,
        lastOfflineTime: device.LAST_OFFLINE_TIME,
        deviceInfo: device.DEVICE_INFO,
        diskUsageRate: device.DISK_USAGE_RATE,
        remarks: device.REMARKS,
        createTime: device.CREATE_TIME,
        latestStatus: status ? {
          diskTotal: status.DISK_TOTAL,
          diskUsed: status.DISK_USED,
          diskFree: status.DISK_FREE,
          diskUsageRate: status.DISK_USAGE_RATE,
          recordingStatus: status.RECORDING_STATUS,
          channelOnlineCount: status.CHANNEL_ONLINE_COUNT,
          networkStatus: status.NETWORK_STATUS,
          systemTime: status.SYSTEM_TIME
        } : null
      }
    });
  } catch (error) {
    logger.error('获取设备详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取设备详情失败'
    });
  }
});

router.post('/', auth.verifyToken, auth.requireRole('ADMIN', 'OPERATOR'), [
  body('name').notEmpty().withMessage('设备名称不能为空'),
  body('code').notEmpty().withMessage('设备编码不能为空'),
  body('brand').notEmpty().withMessage('设备品牌不能为空'),
  body('ipAddress').isIP().withMessage('IP地址格式无效'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('端口号无效'),
  body('companyId').notEmpty().withMessage('所属公司不能为空'),
  body('username').notEmpty().withMessage('设备用户名不能为空'),
  body('password').notEmpty().withMessage('设备密码不能为空')
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

    const {
      name, code, brand, model, ipAddress, port,
      username, password, companyId, channelCount, remarks
    } = req.body;

    const existing = await db.query(
      'SELECT ID FROM NVR_DEVICE WHERE CODE = ? OR (IP_ADDRESS = ? AND PORT = ?)',
      [code, ipAddress, port]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '设备编码或IP地址+端口已存在'
      });
    }

    const testResult = await DeviceFactory.testConnection(brand, {
      ip: ipAddress,
      port: port,
      username: username,
      password: password
    });

    if (!testResult.success) {
      return res.status(400).json({
        success: false,
        message: `设备连接测试失败: ${testResult.message}`
      });
    }

    const encryptedPassword = Buffer.from(password).toString('base64');
    const id = uuidv4();

    await db.query(
      `INSERT INTO NVR_DEVICE 
       (ID, NAME, CODE, BRAND, MODEL, IP_ADDRESS, PORT, USERNAME, PASSWORD, 
        COMPANY_ID, CHANNEL_COUNT, REMARKS) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, code, brand, model, ipAddress, port, username, encryptedPassword, companyId, channelCount || 0, remarks]
    );

    auth.logOperation(req.user.userId, 'DEVICE_CREATE', `创建设备: ${name}`, req.ip);

    logger.info(`创建设备成功: ${name}`);

    res.json({
      success: true,
      message: '创建成功',
      data: { id, name, code }
    });
  } catch (error) {
    logger.error('创建设备失败', error);
    res.status(500).json({
      success: false,
      message: '创建设备失败'
    });
  }
});

router.put('/:id', auth.verifyToken, auth.requireRole('ADMIN', 'OPERATOR'), [
  body('name').notEmpty().withMessage('设备名称不能为空'),
  body('ipAddress').isIP().withMessage('IP地址格式无效'),
  body('port').isInt({ min: 1, max: 65535 }).withMessage('端口号无效')
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
    const {
      name, brand, model, ipAddress, port,
      username, password, companyId, channelCount, status, remarks
    } = req.body;

    const devices = await db.query('SELECT ID FROM NVR_DEVICE WHERE ID = ?', [id]);
    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    if (password) {
      const encryptedPassword = Buffer.from(password).toString('base64');
      await db.query(
        `UPDATE NVR_DEVICE 
         SET NAME = ?, BRAND = ?, MODEL = ?, IP_ADDRESS = ?, PORT = ?, 
             USERNAME = ?, PASSWORD = ?, COMPANY_ID = ?, 
             CHANNEL_COUNT = ?, STATUS = ?, REMARKS = ?, UPDATE_TIME = ?
         WHERE ID = ?`,
        [name, brand, model, ipAddress, port, username, encryptedPassword, companyId, 
         channelCount, status, remarks, new Date(), id]
      );
    } else {
      await db.query(
        `UPDATE NVR_DEVICE 
         SET NAME = ?, BRAND = ?, MODEL = ?, IP_ADDRESS = ?, PORT = ?, 
             USERNAME = ?, COMPANY_ID = ?, 
             CHANNEL_COUNT = ?, STATUS = ?, REMARKS = ?, UPDATE_TIME = ?
         WHERE ID = ?`,
        [name, brand, model, ipAddress, port, username, companyId, 
         channelCount, status, remarks, new Date(), id]
      );
    }

    auth.logOperation(req.user.userId, 'DEVICE_UPDATE', `更新设备: ${id}`, req.ip);

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error) {
    logger.error('更新设备失败', error);
    res.status(500).json({
      success: false,
      message: '更新设备失败'
    });
  }
});

router.delete('/:id', auth.verifyToken, auth.requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const devices = await db.query('SELECT ID FROM NVR_DEVICE WHERE ID = ?', [id]);
    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    await db.query('DELETE FROM NVR_DEVICE_STATUS WHERE DEVICE_ID = ?', [id]);
    await db.query('DELETE FROM NVR_ALARM WHERE DEVICE_ID = ?', [id]);
    await db.query('DELETE FROM NVR_DEVICE WHERE ID = ?', [id]);

    auth.logOperation(req.user.userId, 'DEVICE_DELETE', `删除设备: ${id}`, req.ip);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logger.error('删除设备失败', error);
    res.status(500).json({
      success: false,
      message: '删除设备失败'
    });
  }
});

router.post('/:id/test', auth.verifyToken, auth.requireRole('ADMIN', 'OPERATOR'), async (req, res) => {
  try {
    const { id } = req.params;

    const devices = await db.query(
      'SELECT * FROM NVR_DEVICE WHERE ID = ?',
      [id]
    );

    if (devices.length === 0) {
      return res.status(404).json({
        success: false,
        message: '设备不存在'
      });
    }

    const device = devices[0];
    const password = Buffer.from(device.PASSWORD, 'base64').toString('utf8');

    const testResult = await DeviceFactory.testConnection(device.BRAND, {
      ip: device.IP_ADDRESS,
      port: device.PORT,
      username: device.USERNAME,
      password: password
    });

    res.json({
      success: testResult.success,
      message: testResult.message,
      deviceInfo: testResult.deviceInfo || null
    });
  } catch (error) {
    logger.error('测试设备连接失败', error);
    res.status(500).json({
      success: false,
      message: `测试失败: ${error.message}`
    });
  }
});

router.post('/:id/collect', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await dataCollectionService.collectSingleDevice(id);

    res.json({
      success: true,
      message: '数据采集成功',
      data: result
    });
  } catch (error) {
    logger.error('手动采集设备状态失败', error);
    res.status(500).json({
      success: false,
      message: `采集失败: ${error.message}`
    });
  }
});

router.get('/:id/history', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startTime, endTime, limit = 100 } = req.query;

    const history = await dataCollectionService.getDeviceStatusHistory(
      id,
      startTime,
      endTime,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: history.map(h => ({
        id: h.ID,
        deviceId: h.DEVICE_ID,
        cpuUsage: h.CPU_USAGE,
        memoryUsage: h.MEMORY_USAGE,
        diskTotal: h.DISK_TOTAL,
        diskUsed: h.DISK_USED,
        diskFree: h.DISK_FREE,
        diskUsageRate: h.DISK_USAGE_RATE,
        recordingStatus: h.RECORDING_STATUS,
        channelOnlineCount: h.CHANNEL_ONLINE_COUNT,
        networkStatus: h.NETWORK_STATUS,
        systemTime: h.SYSTEM_TIME,
        createTime: h.CREATE_TIME
      }))
    });
  } catch (error) {
    logger.error('获取设备历史状态失败', error);
    res.status(500).json({
      success: false,
      message: '获取历史状态失败'
    });
  }
});

router.put('/:id/status', auth.verifyToken, auth.requireRole('ADMIN', 'OPERATOR'), [
  body('status').isIn(['ACTIVE', 'INACTIVE']).withMessage('状态值无效')
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
    const { status } = req.body;

    await db.query(
      'UPDATE NVR_DEVICE SET STATUS = ?, UPDATE_TIME = ? WHERE ID = ?',
      [status, new Date(), id]
    );

    auth.logOperation(req.user.userId, 'DEVICE_STATUS_CHANGE', `修改设备状态: ${id}`, req.ip);

    res.json({
      success: true,
      message: '状态更新成功'
    });
  } catch (error) {
    logger.error('更新设备状态失败', error);
    res.status(500).json({
      success: false,
      message: '更新设备状态失败'
    });
  }
});

module.exports = router;
