/**
 * Asserts the *shape* of what the generator emits: real MCP SDK, stateless
 * Streamable HTTP, OAuth 2.1 resource-server behaviour, and — critically — no
 * token passthrough. Fast and hermetic (no install/boot); the runtime e2e that
 * actually boots a server lives in src/test/e2e/runtime-smoke.mjs.
 */
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs-extra';
import { MCPGenerator } from '../core/generator/mcp-generator';
import { StripeProvider } from '../providers/stripe/provider';
import { TemplateLoader } from '../core/utils/template-loader';

const RAW_SPEC = {
  openapi: '3.0.0',
  info: { title: 'Shape API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/widgets': {
      get: {
        operationId: 'listWidgets',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer' } }],
        responses: { '200': { description: 'ok' } },
      },
    },
    '/widgets/{id}': {
      get: {
        operationId: 'getWidget',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'ok' } },
      },
    },
  },
};

describe('generated server shape', () => {
  let outDir: string;
  let server: string;
  let oauth: string;
  let pkg: any;

  beforeAll(async () => {
    TemplateLoader.setTestMode(false); // render real templates, not test mocks
    TemplateLoader.clearCache();
    outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-shape-'));
    const provider = new StripeProvider();
    const spec = provider.parseOpenAPISpec(RAW_SPEC);
    await new MCPGenerator().generate(spec, provider, {
      serverName: 'shape-mcp',
      serverVersion: '1.0.0',
      serverDescription: 'shape test',
      outputDir: outDir,
      httpPort: 8080,
      serverAuthConfig: {
        resourceUri: 'https://mcp.example.com/mcp',
        authorizationServers: ['https://auth.example.com/realms/x'],
        requiredScopes: ['mcp:read'],
      },
    });
    server = await fs.readFile(path.join(outDir, 'src', 'mcp-server.ts'), 'utf8');
    oauth = await fs.readFile(path.join(outDir, 'src', 'oauth-resource-server.ts'), 'utf8');
    pkg = JSON.parse(await fs.readFile(path.join(outDir, 'package.json'), 'utf8'));
  });

  afterAll(async () => {
    TemplateLoader.setTestMode(true);
    if (outDir) await fs.remove(outDir);
  });

  test('depends on the official MCP SDK, jose, zod, express (not the old bespoke deps)', () => {
    expect(pkg.dependencies['@modelcontextprotocol/sdk']).toBeDefined();
    expect(pkg.dependencies.jose).toBeDefined();
    expect(pkg.dependencies.zod).toBeDefined();
    expect(pkg.dependencies.express).toBeDefined();
    expect(pkg.dependencies.stripe).toBeUndefined();
  });

  test('uses SDK McpServer over Streamable HTTP in stateless mode', () => {
    expect(server).toContain("from '@modelcontextprotocol/sdk/server/mcp.js'");
    expect(server).toContain('StreamableHTTPServerTransport');
    expect(server).toContain('sessionIdGenerator: undefined');
  });

  test('is an OAuth 2.1 resource server: PRM + bearer challenge + audience binding', () => {
    expect(server).toContain('/.well-known/oauth-protected-resource');
    expect(server).toContain('requireBearerAuth');
    expect(server).toContain('resourceMetadataUrl');
    // Audience binding (RFC 8707): token aud must equal this server's resource URI.
    expect(oauth).toContain('audience: config.resourceUri');
    expect(server).toContain("resourceUri: process.env.MCP_RESOURCE_URI || 'https://mcp.example.com/mcp'");
  });

  test('does NOT pass the caller token upstream by default (confused-deputy fix)', () => {
    expect(server).toContain("const UPSTREAM_AUTH_MODE = 'env-credential'");
    // passthrough must be an explicit, guarded branch — never the default.
    expect(server).toContain("UPSTREAM_AUTH_MODE === 'passthrough'");
  });

  test('binds loopback and defends against DNS-rebinding (Host/Origin checks)', () => {
    expect(server).toContain("process.env.HOST || '127.0.0.1'");
    expect(server).toContain('isLoopbackHost');
    expect(server).toContain('forbidden_origin');
  });

  test('embeds tools with location-correct argument routing', () => {
    const match = server.match(/const TOOLS[^=]*=\s*(\[[\s\S]*?\]);/);
    expect(match).toBeTruthy();
    const tools = JSON.parse(match![1]);
    const get = tools.find((t: any) => t.name === 'getWidget');
    const list = tools.find((t: any) => t.name === 'listWidgets');
    expect(get.pathParams).toEqual(['id']);
    expect(list.queryParams).toEqual(['limit']);
  });

  test('emits no stale bespoke artifacts (server-implementation / auth-provider / dot-methods)', () => {
    expect(fs.existsSync(path.join(outDir, 'src', 'shape-mcp-server.ts'))).toBe(false);
    expect(server).not.toContain('tools.list'); // old dot-notation
    expect(server).not.toContain('createServer('); // old hand-rolled http
  });
});
