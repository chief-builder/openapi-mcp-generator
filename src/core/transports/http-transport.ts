/**
 * HTTP Transport Implementation for MCP
 * 
 * This module provides a secure HTTP transport implementation for MCP servers.
 */

import * as http from 'http';
import { IMCPTransport, IMCPTransportConfig, DEFAULT_SECURITY_CONFIG, isAllowedOrigin } from './transport-interface';
import { IMCPRequest, IMCPResponse } from '../models/mcp-types';

/**
 * HTTP Transport Configuration
 */
export interface IHTTPTransportConfig extends IMCPTransportConfig {
  /**
   * HTTP server options
   */
  serverOptions?: http.ServerOptions;
}

/**
 * Rate limiting implementation
 */
class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  
  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if a client has exceeded the rate limit
   * 
   * @param clientId Identifier for the client (e.g., IP address)
   * @returns Whether the request should be allowed
   */
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    
    // Get existing requests for this client
    let requests = this.requestCounts.get(clientId) || [];
    
    // Filter out requests outside the window
    requests = requests.filter(timestamp => (now - timestamp) < this.windowMs);
    
    // Check if client has exceeded the limit
    if (requests.length >= this.maxRequests) {
      return false;
    }
    
    // Add this request
    requests.push(now);
    this.requestCounts.set(clientId, requests);
    
    return true;
  }
  
  /**
   * Get remaining requests allowed for a client
   * 
   * @param clientId Identifier for the client
   * @returns Number of requests remaining in the current window
   */
  getRemainingRequests(clientId: string): number {
    const now = Date.now();
    const requests = this.requestCounts.get(clientId) || [];
    const validRequests = requests.filter(timestamp => (now - timestamp) < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
  
  /**
   * Get reset time for a client
   * 
   * @param clientId Identifier for the client
   * @returns Time in ms until the client's rate limit resets
   */
  getResetTime(clientId: string): number {
    const now = Date.now();
    const requests = this.requestCounts.get(clientId) || [];
    
    if (requests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...requests);
    return Math.max(0, this.windowMs - (now - oldestRequest));
  }
}

/**
 * HTTP Transport Implementation
 */
export class HTTPTransport implements IMCPTransport {
  private server: http.Server | null = null;
  private requestHandler: ((request: IMCPRequest, headers?: http.IncomingHttpHeaders) => Promise<IMCPResponse>) | null = null;
  private running = false;
  private rateLimiter: RateLimiter;
  private readonly config: IHTTPTransportConfig;
  
  /**
   * Create a new HTTP transport
   * 
   * @param config Transport configuration
   */
  constructor(config: IHTTPTransportConfig = {}) {
    this.config = {
      ...config,
      port: config.port || 8080,
      security: {
        ...DEFAULT_SECURITY_CONFIG,
        ...config.security
      }
    };
    
    // Initialize rate limiter
    const rateLimit = this.config.security?.rateLimit;
    this.rateLimiter = new RateLimiter(
      rateLimit?.maxRequestsPerMinute || 100,
      rateLimit?.windowMs || 60000
    );
  }
  
  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    
    return new Promise((resolve) => {
      // Create server with options if provided
      this.server = this.config.serverOptions
        ? http.createServer(this.config.serverOptions, this.handleHttpRequest.bind(this))
        : http.createServer(this.handleHttpRequest.bind(this));
      
      // Determine host binding
      const bindToLocalhost = this.config.security?.bindToLocalhost !== false;
      const host = bindToLocalhost ? '127.0.0.1' : '0.0.0.0';
      
      // Start server
      const port = this.config.port || 8080;
      this.server.listen(port, host, () => {
        console.log(`[HTTPTransport] Server listening on ${host}:${port}`);
        this.running = true;
        resolve();
      });
      
      // Handle server errors
      this.server.on('error', (error) => {
        console.error('[HTTPTransport] Server error:', error);
        this.running = false;
      });
    });
  }
  
  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (!this.running || !this.server) {
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve, reject) => {
      this.server!.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.running = false;
          this.server = null;
          resolve();
        }
      });
    });
  }
  
  /**
   * Send a response
   * 
   * @param response MCP response to send
   */
  async sendResponse(response: IMCPResponse): Promise<void> {
    // This is a no-op for HTTP transport as responses are sent directly
    // in the request handler
    return Promise.resolve();
  }
  
  /**
   * Set the request handler
   * 
   * @param handler Function to handle MCP requests
   */
  setRequestHandler(handler: (request: IMCPRequest, headers?: http.IncomingHttpHeaders) => Promise<IMCPResponse>): void {
    this.requestHandler = handler;
  }
  
  /**
   * Check if the transport is running
   */
  isRunning(): boolean {
    return this.running;
  }
  
  /**
   * Handle incoming HTTP requests
   */
  private async handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    // Get client IP for rate limiting
    const clientIp = this.getClientIp(req);

    // Apply rate limiting
    if (!this.rateLimiter.isAllowed(clientIp)) {
      this.sendRateLimitExceededResponse(res, clientIp);
      return;
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      this.handleCorsPreflightRequest(req, res);
      return;
    }

    // Check CORS for non-OPTIONS requests
    const origin = req.headers.origin;
    if (origin && !this.isOriginAllowed(origin)) {
      res.statusCode = 403;
      res.end('Forbidden - Origin not allowed');
      return;
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Method not allowed',
          data: { message: 'Only POST requests are allowed' }
        }
      }));
      return;
    }
    
    // Validate content type if required
    if (this.config.security?.validateContentType !== false) {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        res.statusCode = 415;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid content type',
            data: { message: 'Content-Type must be application/json' }
          }
        }));
        return;
      }
    }
    
    // Handle the request with proper security checks
    try {
      // Apply CORS headers
      this.applyCorsHeaders(req, res);
      
      // Read request body with size limit
      const body = await this.readRequestBody(req);
      
      // Parse request body
      let requestData: IMCPRequest;
      try {
        requestData = JSON.parse(body) as IMCPRequest;
      } catch (error) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32700,
            message: 'Parse error',
            data: { message: (error as Error).message }
          }
        }));
        return;
      }
      
      // Ensure request handler is set
      if (!this.requestHandler) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: requestData.id,
          error: {
            code: -32603,
            message: 'Internal error',
            data: { message: 'Request handler not set' }
          }
        }));
        return;
      }
      
      // Process request with timeout
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        // Set up timeout
        const timeoutPromise = new Promise<IMCPResponse>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error('Request timeout'));
          }, this.config.security?.requestTimeoutMs || 30000);
        });
        
        // Process request
        const responsePromise = this.requestHandler(requestData, req.headers);
        
        // Wait for response or timeout
        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        // Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Send response
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(response));
        
      } catch (error) {
        // Clear timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Send error response
        const errorObj = error as Error;
        const isTimeout = errorObj.message === 'Request timeout';
        res.statusCode = isTimeout ? 408 : 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          id: requestData.id,
          error: {
            code: isTimeout ? -32000 : -32603,
            message: isTimeout ? 'Request timeout' : 'Internal error',
            data: { message: errorObj.message }
          }
        }));
      }
      
    } catch (error) {
      // Handle request reading errors
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: { message: (error as Error).message }
        }
      }));
    }
  }
  
  /**
   * Read the request body with size limit
   * 
   * @param req HTTP request
   * @returns Request body as string
   */
  private async readRequestBody(req: http.IncomingMessage): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const maxSize = this.config.security?.maxRequestBodySize || 1048576; // 1 MB
      
      req.on('data', (chunk: Buffer) => {
        size += chunk.length;
        
        // Check size limit
        if (size > maxSize) {
          req.destroy();
          reject(new Error(`Request body too large (max ${maxSize} bytes)`));
          return;
        }
        
        chunks.push(chunk);
      });
      
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body);
      });
      
      req.on('error', (err) => {
        reject(err);
      });
    });
  }
  
  /**
   * Handle CORS preflight requests
   * 
   * @param req HTTP request
   * @param res HTTP response
   */
  private handleCorsPreflightRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Get origin
    const origin = req.headers.origin;

    // Check if origin is allowed
    if (origin && !this.isOriginAllowed(origin)) {
      res.statusCode = 403;
      res.end('Forbidden - Origin not allowed');
      return;
    }

    // Set CORS headers
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // End the request
    res.statusCode = 204;
    res.end();
  }
  
  /**
   * Apply CORS headers to a response
   * 
   * @param req HTTP request
   * @param res HTTP response
   */
  private applyCorsHeaders(req: http.IncomingMessage, res: http.ServerResponse): void {
    const origin = req.headers.origin;
    
    if (origin && this.isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    // Add other CORS headers as needed
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  
  /**
   * Send a rate limit exceeded response
   * 
   * @param res HTTP response
   * @param clientId Client identifier
   */
  private sendRateLimitExceededResponse(res: http.ServerResponse, clientId: string): void {
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', String(this.rateLimiter.getRemainingRequests(clientId)));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(this.rateLimiter.getResetTime(clientId) / 1000)));
    
    // Send 429 Too Many Requests
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32029,
        message: 'Too many requests',
        data: {
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil(this.rateLimiter.getResetTime(clientId) / 1000)
        }
      }
    }));
  }
  
  /**
   * Check if an origin is allowed
   * 
   * @param origin Origin to check
   * @returns Whether the origin is allowed
   */
  private isOriginAllowed(origin: string): boolean {
    return isAllowedOrigin(origin, this.config.security?.allowedOrigins);
  }
  
  /**
   * Get the client IP address
   * 
   * @param req HTTP request
   * @returns Client IP address
   */
  private getClientIp(req: http.IncomingMessage): string {
    // Try to get IP from X-Forwarded-For header
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can be a comma-separated list of IPs
      // The first one is the client IP
      const ips = Array.isArray(forwardedFor) 
        ? forwardedFor[0] 
        : forwardedFor.split(',')[0].trim();
      
      return ips;
    }
    
    // Try socket remote address
    const remoteAddress = req.socket.remoteAddress;
    if (remoteAddress) {
      return remoteAddress;
    }
    
    // Fallback
    return 'unknown';
  }
}