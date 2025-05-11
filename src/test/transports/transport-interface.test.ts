import { isAllowedOrigin, DEFAULT_SECURITY_CONFIG } from '../../core/transports/transport-interface';

describe('Transport Interface', () => {
  describe('isAllowedOrigin', () => {
    test('allows exact match origins', () => {
      const allowedOrigins = ['http://example.com', 'https://test.com'];
      
      expect(isAllowedOrigin('http://example.com', allowedOrigins)).toBe(true);
      expect(isAllowedOrigin('https://test.com', allowedOrigins)).toBe(true);
      expect(isAllowedOrigin('http://other.com', allowedOrigins)).toBe(false);
    });
    
    test('handles wildcard patterns', () => {
      const allowedOrigins = ['http://localhost:*', 'https://*.example.com'];
      
      expect(isAllowedOrigin('http://localhost:3000', allowedOrigins)).toBe(true);
      expect(isAllowedOrigin('http://localhost:8080', allowedOrigins)).toBe(true);
      expect(isAllowedOrigin('https://sub.example.com', allowedOrigins)).toBe(false); // Not implemented yet
    });
    
    test('allows all origins with wildcard', () => {
      const allowedOrigins = ['*'];
      
      expect(isAllowedOrigin('http://example.com', allowedOrigins)).toBe(true);
      expect(isAllowedOrigin('https://test.com', allowedOrigins)).toBe(true);
      expect(isAllowedOrigin('file://local', allowedOrigins)).toBe(true);
    });
    
    test('handles undefined or empty origin', () => {
      const allowedOrigins = ['http://example.com'];
      
      expect(isAllowedOrigin(undefined, allowedOrigins)).toBe(false);
      expect(isAllowedOrigin('', allowedOrigins)).toBe(false);
    });
    
    test('handles empty allowed origins', () => {
      expect(isAllowedOrigin('http://example.com', [])).toBe(false);
      expect(isAllowedOrigin('http://example.com')).toBe(false);
    });
  });
  
  describe('DEFAULT_SECURITY_CONFIG', () => {
    test('has secure defaults', () => {
      expect(DEFAULT_SECURITY_CONFIG.bindToLocalhost).toBe(true);
      expect(DEFAULT_SECURITY_CONFIG.allowedOrigins).toContain('http://localhost');
      expect(DEFAULT_SECURITY_CONFIG.maxRequestBodySize).toBeGreaterThan(0);
      expect(DEFAULT_SECURITY_CONFIG.validateContentType).toBe(true);
    });
    
    test('has reasonable rate limiting', () => {
      expect(DEFAULT_SECURITY_CONFIG.rateLimit).toBeDefined();
      expect(DEFAULT_SECURITY_CONFIG.rateLimit?.maxRequestsPerMinute).toBeGreaterThan(0);
      expect(DEFAULT_SECURITY_CONFIG.rateLimit?.windowMs).toBe(60000); // 1 minute
    });
  });
});