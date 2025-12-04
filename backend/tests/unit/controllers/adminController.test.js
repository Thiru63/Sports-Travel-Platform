import { adminController } from '../../../src/controllers/adminController.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('AdminController Unit Tests', () => {
  let prisma;

  beforeEach(() => {
    prisma = global.mockPrisma();
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login admin successfully', async () => {
      const req = global.mockRequest({
        body: {
          email: 'admin@example.com',
          password: 'password123',
        },
      });
      const res = global.mockResponse();

      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        password: 'hashed_password',
        name: 'Admin',
        role: 'admin',
      };

      prisma.lead.findFirst.mockResolvedValue(mockAdmin);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_token');

      await adminController.login(req, res);

      expect(prisma.lead.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'admin@example.com',
          role: 'admin',
        },
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
        })
      );
    });

    it('should return error for invalid credentials', async () => {
      const req = global.mockRequest({
        body: {
          email: 'wrong@example.com',
          password: 'wrong',
        },
      });
      const res = global.mockResponse();

      prisma.lead.findFirst.mockResolvedValue(null);

      await adminController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid credentials',
        })
      );
    });
  });

  // ... other tests
});