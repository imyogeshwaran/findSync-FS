/**
 * Authentication Middleware
 * 
 * This module provides role-based authentication middleware for secure
 * access control across the application. It implements defense-in-depth
 * by validating roles on both frontend and backend.
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const jwtSecret = process.env.JWT_SECRET || 'dev-secret';

/**
 * Verify User JWT Token
 * Validates that the token is valid and the user has 'user' role
 * (or no role, defaulting to user)
 */
exports.verifyUserToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret);

    // Check if user has correct role (default to 'user' if not specified)
    const userRole = decoded.role || 'user';
    if (userRole !== 'user') {
      return res.status(403).json({ error: 'Unauthorized - User access required' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Verify Admin JWT Token
 * Validates that the token is valid and the user has 'admin' role
 * CRITICAL: This prevents privilege escalation by enforcing role at backend
 */
exports.verifyAdminToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('[AUTH] Admin access attempt with no token');
      return res.status(401).json({ error: 'No authentication token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret);

    // CRITICAL SECURITY CHECK: Verify admin role
    if (decoded.role !== 'admin') {
      console.warn(`[AUTH] Unauthorized admin access attempt. Role: ${decoded.role}, ID: ${decoded.admin_id || decoded.id}`);
      return res.status(403).json({ error: 'Unauthorized - Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn('[AUTH] Admin token expired');
      return res.status(401).json({ error: 'Authentication token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      console.warn('[AUTH] Invalid admin token');
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    console.error('[AUTH] Admin token verification error:', error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Verify Optional User Token
 * Allows access with or without token, but validates if provided
 */
exports.verifyOptionalUserToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret);

    const userRole = decoded.role || 'user';
    if (userRole !== 'user') {
      return res.status(403).json({ error: 'Invalid user token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid but not required, continue without user
    req.user = null;
    next();
  }
};

/**
 * Refresh User Token
 * Generates a new JWT token with extended expiry
 */
exports.refreshUserToken = (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No user session' });
    }

    const newToken = jwt.sign(
      {
        id: req.user.id,
        firebase_uid: req.user.firebase_uid,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role || 'user'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

/**
 * Refresh Admin Token
 * Generates a new JWT token for admin with extended expiry
 */
exports.refreshAdminToken = (req, res) => {
  try {
    if (!req.admin || req.admin.role !== 'admin') {
      return res.status(401).json({ error: 'No admin session' });
    }

    const newToken = jwt.sign(
      {
        admin_id: req.admin.admin_id,
        username: req.admin.username,
        email: req.admin.email,
        role: 'admin'
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Admin token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
};

/**
 * Audit Log Middleware
 * Logs authentication events for security monitoring
 */
exports.auditLog = (action) => {
  return (req, res, next) => {
    const user = req.user || req.admin;
    const userInfo = user ? `User: ${user.email || user.username}, ID: ${user.id || user.admin_id}` : 'Anonymous';
    const timestamp = new Date().toISOString();
    
    console.log(`[AUDIT] ${action} | ${userInfo} | IP: ${req.ip} | Time: ${timestamp}`);
    next();
  };
};

module.exports = exports;
