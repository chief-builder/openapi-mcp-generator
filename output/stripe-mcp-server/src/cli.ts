#!/usr/bin/env node
/**
 * CLI for stripe-mcp MCP Server
 */

import { StripeMcpServer } from './stripe-mcp-server';

// Parse command line arguments
const args = process.argv.slice(2);
const options: Record<string, string> = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value || 'true';
  } else if (arg.startsWith('-')) {
    const key = arg.slice(1);
    const nextArg = args[i + 1];
    
    if (nextArg && !nextArg.startsWith('-')) {
      options[key] = nextArg;
      i++;
    } else {
      options[key] = 'true';
    }
  }
}

// Set configuration
const config = {
  httpPort: parseInt(options.port || process.env.PORT || '8080', 10),
  apiKey: options.apiKey || process.env.API_KEY,
  transport: (options.transport || process.env.TRANSPORT || 'http') as 'http' | 'stdio'
};

// Create and start server
const server = new StripeMcpServer({
  transport: config.transport,
  httpPort: config.httpPort,
  apiKey: config.apiKey
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.stop().catch((error: Error) => console.error(error));
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  server.stop().catch((error: Error) => console.error(error));
  process.exit(0);
});

// Start server
server.start().catch((error: Error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

console.log(`stripe-mcp MCP Server starting...`);
console.log(`Transport: `);

if (config.transport === 'http') {
  console.log(`Port: `);
}

console.log('Press Ctrl+C to stop');