/**
 * MCP Transport Interface
 * 
 * This module provides the interface for MCP transport implementations.
 */

import { IMCPRequest, IMCPResponse } from '../models/mcp-types';
import { IncomingHttpHeaders } from 'http';

/**
 * Interface for MCP Transport implementations
 */
export interface IMCPTransport {
  /**
   * Start the transport and begin accepting connections
   */
  start(): Promise<void>;
  
  /**
   * Stop the transport and close all connections
   */
  stop(): Promise<void>;
  
  /**
   * Send a response to a client
   * 
   * @param response The response to send
   * @param requestId Optional identifier to associate with the original request
   */
  sendResponse(response: IMCPResponse, requestId?: string): Promise<void>;
  
  /**
   * Set the handler for processing incoming requests
   * 
   * @param handler Function to handle incoming requests
   */
  setRequestHandler(handler: (request: IMCPRequest, headers?: IncomingHttpHeaders) => Promise<IMCPResponse>): void;
  
  /**
   * Get the status of the transport
   * 
   * @returns Whether the transport is running
   */
  isRunning(): boolean;
}

/**
 * Security configuration for MCP transports
 */
export interface IMCPTransportSecurityConfig {
  /**
   * Whether to bind the server to localhost only (127.0.0.1)
   * This is recommended for security to prevent remote access
   * Default: true
   */
  bindToLocalhost?: boolean;
  
  /**
   * List of allowed origins for CORS
   * If not specified, only localhost origins are allowed
   * Set to ['*'] to allow all origins (not recommended)
   * Example: ['http://localhost:3000', 'https://example.com']
   */
  allowedOrigins?: string[];
  
  /**
   * Request timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  requestTimeoutMs?: number;
  
  /**
   * Maximum request body size in bytes
   * Default: 1048576 (1 MB)
   */
  maxRequestBodySize?: number;
  
  /**
   * Whether to validate content type header
   * Default: true
   */
  validateContentType?: boolean;
  
  /**
   * Rate limit configuration
   */
  rateLimit?: {
    /**
     * Maximum number of requests per minute
     * Default: 100
     */
    maxRequestsPerMinute?: number;
    
    /**
     * Window size in milliseconds for rate limiting
     * Default: 60000 (1 minute)
     */
    windowMs?: number;
  };
}

/**
 * Base configuration for MCP transports
 */
export interface IMCPTransportConfig {
  /**
   * Port to listen on (for HTTP and SSE transports)
   * Default: 8080
   */
  port?: number;
  
  /**
   * Security configuration
   */
  security?: IMCPTransportSecurityConfig;
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: IMCPTransportSecurityConfig = {
  bindToLocalhost: true,
  allowedOrigins: ['http://localhost', 'http://localhost:*', 'http://127.0.0.1:*'],
  requestTimeoutMs: 30000,
  maxRequestBodySize: 1048576, // 1 MB
  validateContentType: true,
  rateLimit: {
    maxRequestsPerMinute: 100,
    windowMs: 60000
  }
};

/**
 * Utility function to check if an origin is allowed
 * 
 * @param origin Origin to check
 * @param allowedOrigins List of allowed origins
 * @returns Whether the origin is allowed
 */
export function isAllowedOrigin(origin: string | undefined, allowedOrigins: string[] = []): boolean {
  if (!origin) return false;
  
  // Check exact matches first
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  
  // Check wildcard patterns
  for (const pattern of allowedOrigins) {
    if (pattern === '*') {
      return true;
    }
    
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -1);
      if (origin.startsWith(prefix)) {
        return true;
      }
    }
  }
  
  return false;
}