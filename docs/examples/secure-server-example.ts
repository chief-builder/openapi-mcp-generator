/**
 * Generated server deployment example.
 *
 * Copy this pattern into a generated server project if you want a small
 * environment preflight before calling the generated startServer() function.
 *
 * The generated project exports startServer from src/index.ts, which re-exports
 * src/mcp-server.ts.
 */
import { startServer } from './src/index.js';

const REQUIRED_ENV = [
  'MCP_RESOURCE_URI',
  'MCP_AUTHORIZATION_SERVERS',
  'MCP_JWKS_URI',
  'UPSTREAM_API_KEY',
] as const;

function requireEnv(): void {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Example production environment:
 *
 * HOST=127.0.0.1
 * PORT=3000
 * PUBLIC_BASE_URL=https://mcp.example.com
 * MCP_RESOURCE_URI=https://mcp.example.com/mcp
 * MCP_AUTHORIZATION_SERVERS=https://auth.example.com
 * MCP_JWKS_URI=https://auth.example.com/.well-known/jwks.json
 * MCP_REQUIRED_SCOPES=payments.read,payments.write
 * ALLOWED_ORIGINS=https://app.example.com
 * UPSTREAM_BASE_URL=https://api.example.com
 * UPSTREAM_API_KEY=upstream_api_secret
 */
function main(): void {
  requireEnv();
  startServer();
}

main();
