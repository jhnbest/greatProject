/**
 * 公司管理路由
 * 分公司层级管理
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

router.get('/', auth.verifyToken, async (req, res) => {
  try {
    const { keyword, status } = req.query;

    let sql = `
      SELECT c.*, p.NAME as PARENT_NAME 
      FROM SYS_COMPANY c 
      LEFT JOIN SYS_COMPANY p ON c.PARENT_ID = p.ID 
      WHERE 1=1
    `;
    const params = [];

    if (keyword) {
      sql += ' AND (c.NAME LIKE ? OR c.CODE LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (status) {
      sql += ' AND c.STATUS = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.CODE, c.CREATE_TIME';

    const companies = await db.query(sql, params);

    res.json({
      success: true,
      data: companies.map(c => ({
        id: c.ID,
        name: c.NAME,
        code: c.CODE,
        parentId: c.PARENT_ID,
        parentName: c.PARENT_NAME,
        address: c.ADDRESS,
        contactPerson: c.CONTACT_PERSON,
        contactPhone: c.CONTACT_PHONE,
        status: c.STATUS,
        remarks: c.REMARKS,
        createTime: c.CREATE_TIME,
        updateTime: c.UPDATE_TIME
      }))
    });
  } catch (error) {
    logger.error('获取公司列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取公司列表失败'
    });
  }
});

router.get('/tree', auth.verifyToken, async (req, res) => {
  try {
    const companies = await db.query(
      `SELECT c.*, p.NAME as PARENT_NAME 
       FROM SYS_COMPANY c 
       LEFT JOIN SYS_COMPANY p ON c.PARENT_ID = p.ID 
       WHERE c.STATUS = '1'
       ORDER BY c.CODE`
    );

    const buildTree = (parentId = null) => {
      return companies
        .filter(c => c.PARENT_ID === parentId)
        .map(c => ({
          id: c.ID,
          name: c.NAME,
          code: c.CODE,
          label: c.NAME,
          value: c.ID,
          children: buildTree(c.ID),
          address: c.ADDRESS,
          contactPerson: c.CONTACT_PERSON,
          contactPhone: c.CONTACT_PHONE
        }));
    };

    const treeData = buildTree(null);

    res.json({
      success: true,
      data: treeData
    });
  } catch (error) {
    logger.error('获取公司树结构失败', error);
    res.status(500).json({
      success: false,
      message: '获取公司树结构失败'
    });
  }
});

router.get('/:id', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const companies = await db.query(
      `SELECT c.*, p.NAME as PARENT_NAME 
       FROM SYS_COMPANY c 
       LEFT JOIN SYS_COMPANY p ON c.PARENT_ID = p.ID 
       WHERE c.ID = ?`,
      [id]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: '公司不存在'
      });
    }

    const company = companies[0];

    const deviceCount = await db.query(
      'SELECT COUNT(*) as count FROM NVR_DEVICE WHERE COMPANY_ID = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        id: company.ID,
        name: company.NAME,
        code: company.CODE,
        parentId: company.PARENT_ID,
        parentName: company.PARENT_NAME,
        address: company.ADDRESS,
        contactPerson: company.CONTACT_PERSON,
        contactPhone: company.CONTACT_PHONE,
        status: company.STATUS,
        remarks: company.REMARKS,
        createTime: company.CREATE_TIME,
        updateTime: company.UPDATE_TIME,
        deviceCount: deviceCount[0]?.count || 0
      }
    });
  } catch (error) {
    logger.error('获取公司详情失败', error);
    res.status(500).json({
      success: false,
      message: '获取公司详情失败'
    });
  }
});

router.post('/', auth.verifyToken, auth.requireRole('ADMIN'), [
  body('name').notEmpty().withMessage('公司名称不能为空'),
  body('code').notEmpty().withMessage('公司编码不能为空'),
  body('code').isLength({ min: 2, max: 20 }).withMessage('公司编码需为2-20个字符')
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

    const { name, code, parentId, address, contactPerson, contactPhone, remarks } = req.body;

    const existing = await db.query(
      'SELECT ID FROM SYS_COMPANY WHERE CODE = ?',
      [code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '公司编码已存在'
      });
    }

    const id = uuidv4();

    await db.query(
      `INSERT INTO SYS_COMPANY 
       (ID, NAME, CODE, PARENT_ID, ADDRESS, CONTACT_PERSON, CONTACT_PHONE, REMARKS) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, code, parentId || null, address, contactPerson, contactPhone, remarks]
    );

    auth.logOperation(req.user.userId, 'COMPANY_CREATE', `创建公司: ${name}`, req.ip);

    logger.info(`创建公司成功: ${name}`);

    res.json({
      success: true,
      message: '创建成功',
      data: { id, name, code }
    });
  } catch (error) {
    logger.error('创建公司失败', error);
    res.status(500).json({
      success: false,
      message: '创建公司失败'
    });
  }
});

router.put('/:id', auth.verifyToken, auth.requireRole('ADMIN'), [
  body('name').notEmpty().withMessage('公司名称不能为空')
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
    const { name, parentId, address, contactPerson, contactPhone, status, remarks } = req.body;

    const companies = await db.query('SELECT ID FROM SYS_COMPANY WHERE ID = ?', [id]);
    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        message: '公司不存在'
      });
    }

    await db.query(
      `UPDATE SYS_COMPANY 
       SET NAME = ?, PARENT_ID = ?, ADDRESS = ?, 
           CONTACT_PERSON = ?, CONTACT_PHONE = ?, STATUS = ?, 
           REMARKS = ?, UPDATE_TIME = ?
       WHERE ID = ?`,
      [name, parentId || null, address, contactPerson, contactPhone, status, remarks, new Date(), id]
    );

    auth.logOperation(req.user.userId, 'COMPANY_UPDATE', `更新公司: ${id}`, req.ip);

    res.json({
      success: true,
      message: '更新成功'
    });
  } catch (error) {
    logger.error('更新公司失败', error);
    res.status(500).json({
      success: false,
      message: '更新公司失败'
    });
  }
});

router.delete('/:id', auth.verifyToken, auth.requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const devices = await db.query(
      'SELECT COUNT(*) as count FROM NVR_DEVICE WHERE COMPANY_ID = ?',
      [id]
    );

    if (devices[0]?.count > 0) {
      return res.status(400).json({
        success: false,
        message: '该公司下存在设备，无法删除'
      });
    }

    const subCompanies = await db.query(
      'SELECT COUNT(*) as count FROM SYS_COMPANY WHERE PARENT_ID = ?',
      [id]
    );

    if (subCompanies[0]?.count > 0) {
      return res.status(400).json({
        success: false,
        message: '该公司下存在子级公司，无法删除'
      });
    }

    await db.query('DELETE FROM SYS_COMPANY WHERE ID = ?', [id]);

    auth.logOperation(req.user.userId, 'COMPANY_DELETE', `删除公司: ${id}`, req.ip);

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logger.error('删除公司失败', error);
    res.status(500).json({
      success: false,
      message: '删除公司失败'
    });
  }
});

router.get('/:id/stats', auth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const stats = {
      deviceTotal: 0,
      deviceOnline: 0,
      deviceOffline: 0,
      alarmPending: 0,
      diskUsageAvg: 0
    };

    const deviceStats = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN IS_ONLINE = 1 THEN 1 ELSE 0 END) as online,
         SUM(CASE WHEN IS_ONLINE = 0 THEN 1 ELSE 0 END) as offline
       FROM NVR_DEVICE 
       WHERE COMPANY_ID = ?`,
      [id]
    );

    if (deviceStats[0]) {
      stats.deviceTotal = deviceStats[0].total || 0;
      stats.deviceOnline = deviceStats[0].online || 0;
      stats.deviceOffline = deviceStats[0].offline || 0;
    }

    const alarmStats = await db.query(
      `SELECT COUNT(*) as count 
       FROM NVR_ALARM a 
       JOIN NVR_DEVICE d ON a.DEVICE_ID = d.ID 
       WHERE d.COMPANY_ID = ? AND a.STATUS = 'PENDING'`,
      [id]
    );

    stats.alarmPending = alarmStats[0]?.count || 0;

    const diskStats = await db.query(
      `SELECT AVG(s.DISK_USAGE_RATE) as avg_usage
       FROM NVR_DEVICE_STATUS s
       INNER JOIN NVR_DEVICE d ON s.DEVICE_ID = d.ID
       WHERE d.COMPANY_ID = ? AND s.CREATE_TIME >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [id]
    );

    stats.diskUsageAvg = parseFloat(diskStats[0]?.avg_usage || 0).toFixed(2);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取公司统计信息失败', error);
    res.status(500).json({
      success: false,
      message: '获取公司统计信息失败'
    });
  }
});

module.exports = router;
