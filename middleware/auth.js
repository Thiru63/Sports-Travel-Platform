const jwt = require('jsonwebtoken');
const prisma = require('../utils/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await prisma.lead.findFirst({
      where: {
        id: decoded.sub,
        role: 'admin'
      }
    });

    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = admin;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = { authenticateToken };