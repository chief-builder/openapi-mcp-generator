/**
 * Secure MCP Server Example
 * 
 * This example demonstrates how to configure and run a secure MCP server
 * with enhanced transport security features.
 */

import { StripeMCPServer } from './stripe-mcp-server';

/**
 * Example 1: Basic secure configuration
 * 
 * This configuration provides good security for most use cases.
 */
function createSecureServer() {
  const server = new StripeMCPServer({
    apiKey: process.env.STRIPE_API_KEY,
    
    // Transport configuration
    transport: 'http',
    httpPort: 8080,
    
    // Security configuration - explicitly set defaults for clarity
    bindToLocalhost: true, // Only allow connections from localhost
    allowedOrigins: ['http://localhost:3000'], // Only allow specific origins
    maxRequestBodySize: 1 * 1024 * 1024, // 1 MB limit for request size
    requestTimeoutMs: 30000, // 30 second timeout
    validateContentType: true, // Require application/json content type
    maxRequestsPerMinute: 100 // Rate limit to 100 requests per minute
  });
  
  return server;
}

/**
 * Example 2: Production configuration with multiple origins
 * 
 * For a production environment with multiple frontend applications.
 */
function createProductionServer() {
  const server = new StripeMCPServer({
    apiKey: process.env.STRIPE_API_KEY,
    
    // Transport configuration
    transport: 'http',
    httpPort: 8080,
    
    // Security configuration
    bindToLocalhost: false, // Allow external access (use with reverse proxy)
    allowedOrigins: [
      'https://app.example.com',
      'https://admin.example.com',
      'https://dashboard.example.com'
    ],
    maxRequestBodySize: 5 * 1024 * 1024, // 5 MB for larger payloads
    requestTimeoutMs: 60000, // 60 seconds for longer operations
    maxRequestsPerMinute: 300 // Higher rate limit for production
  });
  
  return server;
}

/**
 * Example 3: Development configuration
 * 
 * For local development with relaxed security.
 */
function createDevelopmentServer() {
  const server = new StripeMCPServer({
    apiKey: process.env.STRIPE_API_KEY || 'sk_test_...',
    
    // Transport configuration
    transport: 'http',
    httpPort: 8080,
    
    // Security configuration - relaxed for development
    bindToLocalhost: true, // Still bind to localhost for safety
    allowedOrigins: [
      'http://localhost:*', // Allow any localhost port
      'http://127.0.0.1:*'
    ],
    maxRequestBodySize: 10 * 1024 * 1024, // 10 MB for easier debugging
    requestTimeoutMs: 120000, // 2 minutes for debugging
    maxRequestsPerMinute: 1000, // High limit for development
    validateContentType: false // Allow any content type for testing
  });
  
  return server;
}

/**
 * Example 4: Behind a reverse proxy
 * 
 * When running behind a reverse proxy like Nginx or Apache.
 */
function createProxiedServer() {
  const server = new StripeMCPServer({
    apiKey: process.env.STRIPE_API_KEY,
    
    // Transport configuration
    transport: 'http',
    httpPort: 8080,
    
    // Security configuration
    bindToLocalhost: true, // Only accept connections from the proxy
    allowedOrigins: [
      'https://example.com',
      'https://*.example.com' // Allow all subdomains
    ],
    
    // Trust X-Forwarded-For header from proxy
    // (This is handled internally by the HTTP transport)
  });
  
  return server;
}

/**
 * Example 5: High security configuration
 * 
 * For applications handling sensitive data.
 */
function createHighSecurityServer() {
  const server = new StripeMCPServer({
    apiKey: process.env.STRIPE_API_KEY,
    
    // Transport configuration
    transport: 'http',
    httpPort: 8080,
    
    // Security configuration
    bindToLocalhost: true,
    allowedOrigins: [
      'https://secure.example.com' // Only one specific origin
    ],
    maxRequestBodySize: 512 * 1024, // 512 KB limit
    requestTimeoutMs: 15000, // 15 second timeout
    maxRequestsPerMinute: 60, // Strict rate limiting
    rateLimitWindowMs: 30000, // 30 second window for stricter rate limiting
    validateContentType: true
  });
  
  return server;
}

/**
 * Running the server
 */
async function runServer() {
  // Choose the appropriate configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let server;
  
  if (isProduction) {
    server = createProductionServer();
  } else if (isDevelopment) {
    server = createDevelopmentServer();
  } else {
    server = createSecureServer();
  }
  
  try {
    // Start the server
    await server.start();
    console.log('Server started successfully');
    
    // Set up graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('Shutting down server...');
      await server.stop();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server if this file is executed directly
if (require.main === module) {
  runServer().catch(console.error);
}