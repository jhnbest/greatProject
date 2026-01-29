/**
 * 认证中间件
 * JWT令牌验证和用户权限控制
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'nvr-monitor-secret-key-2024';
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || '24h';

const authMiddleware = {
  verifyToken: (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: '未提供认证令牌'
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
          success: false,
          message: '令牌格式无效'
        });
      }

      const token = parts[1];
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: '令牌已过期'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: '令牌无效'
        });
      }
      
      logger.error('令牌验证失败', error);
      return res.status(401).json({
        success: false,
        message: '认证失败'
      });
    }
  },

  requireRole: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未认证'
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }

      next();
    };
  },

  requireAdmin: (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限'
      });
    }
    next();
  },

  async loadUser(req, res, next) {
    try {
      if (req.user && req.user.userId) {
        const users = await db.query(
          'SELECT ID, USERNAME, ROLE, COMPANY_ID, STATUS FROM SYS_USER WHERE ID = ?',
          [req.user.userId]
        );

        if (users.length > 0 && users[0].STATUS === '1') {
          req.userDetails = users[0];
        }
      }
      next();
    } catch (error) {
      logger.error('加载用户信息失败', error);
      next();
    }
  },

  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
  },

  verifyPassword: (plainPassword, hashedPassword) => {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(plainPassword, hashedPassword);
  },

  hashPassword: (password) => {
    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    return bcrypt.hashSync(password, salt);
  },

  logOperation: (userId, operType, operContent, operIp = null) => {
    db.query(
      `INSERT INTO SYS_OPER_LOG (ID, USER_ID, OPER_TYPE, OPER_CONTENT, OPER_IP) 
       VALUES (?, ?, ?, ?, ?)`,
      [require('uuid').v4(), userId, operType, operContent, operIp]
    ).catch(error => {
      logger.error('操作日志记录失败', error);
    });
  }
};

module.exports = authMiddleware;
