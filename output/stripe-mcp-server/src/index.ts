/**
 * stripe-mcp MCP Server
 * 
 * This module exports the stripe-mcp MCP server and related types.
 */

export * from './mcp-types';
export * from './stripe-auth-provider';
export * from './stripe-mcp-server';

import { StripeMcpServer } from './stripe-mcp-server';

// Create and start server if this module is run directly
if (require.main === module) {
  // Load configuration from environment variables
  const config = {
    httpPort: parseInt(process.env.PORT || '8080', 10),
    apiKey: process.env.API_KEY,
    transport: (process.env.TRANSPORT || 'http') as 'http' | 'stdio'
  };

  const server = new StripeMcpServer({
    transport: config.transport,
    httpPort: config.httpPort,
    apiKey: config.apiKey
  });

  server.start().catch((error: Error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}