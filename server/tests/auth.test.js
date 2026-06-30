const jwt = require('jsonwebtoken');
const { authenticateToken, requireRole } = require('../middleware/auth');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'test_secret';
  });

  describe('authenticateToken', () => {
    it('should return 401 if Authorization header is missing', () => {
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if token is invalid', () => {
      req.headers['authorization'] = 'Bearer invalidtoken';
      authenticateToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next and set req.user if token is valid', () => {
      const payload = { id: 'user123', email: 'user@test.com', role: 'RESTAURANT' };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      req.headers['authorization'] = `Bearer ${token}`;

      authenticateToken(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe('user123');
      expect(req.user.role).toBe('RESTAURANT');
    });
  });

  describe('requireRole', () => {
    it('should return 401 if req.user is missing', () => {
      const middleware = requireRole('ADMIN');
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 if user role does not match', () => {
      req.user = { id: '123', role: 'RESTAURANT' };
      const middleware = requireRole('ADMIN');
      
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden: Insufficient permissions' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if user role matches string role', () => {
      req.user = { id: '123', role: 'ADMIN' };
      const middleware = requireRole('ADMIN');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next if user role matches one of array roles', () => {
      req.user = { id: '123', role: 'RESTAURANT' };
      const middleware = requireRole(['RESTAURANT', 'ADMIN']);
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
