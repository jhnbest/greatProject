/**
 * 认证路由
 * 用户登录、注册、登出
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空')
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

    const { username, password } = req.body;

    const users = await db.query(
      `SELECT u.*, c.NAME as COMPANY_NAME 
       FROM SYS_USER u 
       LEFT JOIN SYS_COMPANY c ON u.COMPANY_ID = c.ID 
       WHERE u.USERNAME = ? AND u.STATUS = '1'`,
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    const user = users[0];

    if (!auth.verifyPassword(password, user.PASSWORD)) {
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    await db.query(
      'UPDATE SYS_USER SET LAST_LOGIN_TIME = ? WHERE ID = ?',
      [new Date(), user.ID]
    );

    const token = auth.generateToken({
      userId: user.ID,
      username: user.USERNAME,
      role: user.ROLE,
      companyId: user.COMPANY_ID
    });

    auth.logOperation(user.ID, 'LOGIN', '用户登录成功', req.ip);

    logger.info(`用户登录成功: ${username}`);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.ID,
          username: user.USERNAME,
          realName: user.REAL_NAME,
          role: user.ROLE,
          companyId: user.COMPANY_ID,
          companyName: user.COMPANY_NAME
        }
      }
    });
  } catch (error) {
    logger.error('登录失败', error);
    res.status(500).json({
      success: false,
      message: '登录失败',
      error: error.message
    });
  }
});

router.post('/register', [
  body('username').isLength({ min: 3, max: 20 }).withMessage('用户名需为3-20个字符'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6个字符'),
  body('realName').notEmpty().withMessage('真实姓名不能为空'),
  body('companyId').notEmpty().withMessage('所属公司不能为空')
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

    const { username, password, realName, phone, email, companyId } = req.body;

    const existingUsers = await db.query(
      'SELECT ID FROM SYS_USER WHERE USERNAME = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    const hashedPassword = auth.hashPassword(password);
    const id = uuidv4();

    await db.query(
      `INSERT INTO SYS_USER 
       (ID, USERNAME, PASSWORD, REAL_NAME, PHONE, EMAIL, COMPANY_ID, ROLE) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'USER')`,
      [id, username, hashedPassword, realName, phone, email, companyId]
    );

    logger.info(`新用户注册成功: ${username}`);

    res.json({
      success: true,
      message: '注册成功',
      data: { id, username }
    });
  } catch (error) {
    logger.error('注册失败', error);
    res.status(500).json({
      success: false,
      message: '注册失败',
      error: error.message
    });
  }
});

router.post('/logout', auth.verifyToken, async (req, res) => {
  try {
    auth.logOperation(req.user.userId, 'LOGOUT', '用户登出', req.ip);
    
    res.json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    logger.error('登出失败', error);
    res.status(500).json({
      success: false,
      message: '登出失败'
    });
  }
});

router.get('/profile', auth.verifyToken, async (req, res) => {
  try {
    const users = await db.query(
      `SELECT u.*, c.NAME as COMPANY_NAME 
       FROM SYS_USER u 
       LEFT JOIN SYS_COMPANY c ON u.COMPANY_ID = c.ID 
       WHERE u.ID = ?`,
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        id: user.ID,
        username: user.USERNAME,
        realName: user.REAL_NAME,
        phone: user.PHONE,
        email: user.EMAIL,
        role: user.ROLE,
        companyId: user.COMPANY_ID,
        companyName: user.COMPANY_NAME,
        lastLoginTime: user.LAST_LOGIN_TIME,
        createTime: user.CREATE_TIME
      }
    });
  } catch (error) {
    logger.error('获取用户信息失败', error);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

router.put('/password', auth.verifyToken, [
  body('oldPassword').notEmpty().withMessage('原密码不能为空'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6个字符')
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

    const { oldPassword, newPassword } = req.body;

    const users = await db.query(
      'SELECT PASSWORD FROM SYS_USER WHERE ID = ?',
      [req.user.userId]
    );

    if (users.length === 0 || !auth.verifyPassword(oldPassword, users[0].PASSWORD)) {
      return res.status(400).json({
        success: false,
        message: '原密码错误'
      });
    }

    const hashedPassword = auth.hashPassword(newPassword);

    await db.query(
      'UPDATE SYS_USER SET PASSWORD = ? WHERE ID = ?',
      [hashedPassword, req.user.userId]
    );

    auth.logOperation(req.user.userId, 'PASSWORD_CHANGE', '修改密码', req.ip);

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    logger.error('修改密码失败', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败'
    });
  }
});

router.get('/users', auth.verifyToken, auth.requireRole('ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, role, status } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT u.*, c.NAME as COMPANY_NAME 
      FROM SYS_USER u 
      LEFT JOIN SYS_COMPANY c ON u.COMPANY_ID = c.ID 
      WHERE 1=1
    `;
    const params = [];

    if (keyword) {
      sql += ' AND (u.USERNAME LIKE ? OR u.REAL_NAME LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (role) {
      sql += ' AND u.ROLE = ?';
      params.push(role);
    }

    if (status) {
      sql += ' AND u.STATUS = ?';
      params.push(status);
    }

    sql += ' ORDER BY u.CREATE_TIME DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const users = await db.query(sql, params);

    const countSql = 'SELECT COUNT(*) as total FROM SYS_USER WHERE 1=1';
    const [countResult] = await db.query(countSql);

    res.json({
      success: true,
      data: {
        list: users.map(u => ({
          id: u.ID,
          username: u.USERNAME,
          realName: u.REAL_NAME,
          phone: u.PHONE,
          email: u.EMAIL,
          role: u.ROLE,
          companyId: u.COMPANY_ID,
          companyName: u.COMPANY_NAME,
          status: u.STATUS,
          lastLoginTime: u.LAST_LOGIN_TIME,
          createTime: u.CREATE_TIME
        })),
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('获取用户列表失败', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

router.put('/users/:id/status', auth.verifyToken, auth.requireRole('ADMIN'), [
  body('status').isIn(['0', '1']).withMessage('状态值无效')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await db.query(
      'UPDATE SYS_USER SET STATUS = ? WHERE ID = ?',
      [status, id]
    );

    auth.logOperation(req.user.userId, 'USER_STATUS_CHANGE', `修改用户状态: ${id}`, req.ip);

    res.json({
      success: true,
      message: '状态更新成功'
    });
  } catch (error) {
    logger.error('更新用户状态失败', error);
    res.status(500).json({
      success: false,
      message: '更新用户状态失败'
    });
  }
});

module.exports = router;
