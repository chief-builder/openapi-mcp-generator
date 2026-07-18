/**
 * Controlled local red-team harness for generated MCP servers.
 *
 * This intentionally stays local: generated server, mock issuer/JWKS, and mock
 * upstream API. It probes authn/authz, transport guards, malicious-ish OpenAPI
 * input, and upstream credential separation without touching real APIs.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request as httpRequest } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const REPO = new URL('../../..', import.meta.url).pathname;
const PORT = 9320;
const JWKS_PORT = 9411;
const UPSTREAM_PORT = 9412;
const ISSUER = `http://127.0.0.1:${JWKS_PORT}`;
const RESOURCE = `http://localhost:${PORT}/mcp`;
const UPSTREAM = `http://127.0.0.1:${UPSTREAM_PORT}`;
const UPSTREAM_KEY = 'red-team-upstream-secret';

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}${detail ? ` (${detail})` : ''}`);
  if (!cond) failures++;
};
const sh = (cmd, args, opts) => spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function rawPost({ headers = {}, body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' } = {}) {
  const res = await fetch(`http://127.0.0.1:${PORT}/mcp`, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json', ...headers },
    body,
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

function rawHostProbe(host) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({
      host: '127.0.0.1',
      port: PORT,
      path: '/mcp',
      method: 'POST',
      headers: {
        Host: host,
        'content-type': 'application/json',
      },
    }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end('{"jsonrpc":"2.0","id":1,"method":"tools/list"}');
  });
}

function clientProbeFile(port, toolCall) {
  return `
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const t = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:${port}/mcp'), {
  requestInit: { headers: { Authorization: 'Bearer ' + process.env.TOK } },
});
const c = new Client({ name: 'red-team-probe', version: '1.0.0' });
await c.connect(t);
if (${toolCall ? 'true' : 'false'}) {
  const result = await c.callTool({ name: 'adminWrite', arguments: { amount: 7, note: 'safe-local-probe' } });
  console.log('CALL:' + JSON.stringify(result));
} else {
  const tools = await c.listTools();
  console.log('TOOLS:' + tools.tools.map((x) => x.name).sort().join(','));
}
await c.close();
`;
}

const work = mkdtempSync(join(tmpdir(), 'mcp-red-team-'));
const out = join(work, 'server');
let jwksServer;
let upstreamServer;
let generatedServer;
const upstreamRequests = [];

try {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'red-team-k1', alg: 'RS256', use: 'sig' };

  jwksServer = createServer((req, res) => {
    if (req.url.startsWith('/certs')) {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise((resolve) => jwksServer.listen(JWKS_PORT, '127.0.0.1', resolve));

  upstreamServer = createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      upstreamRequests.push({
        method: req.method,
        url: req.url,
        authorization: req.headers.authorization,
        contentType: req.headers['content-type'],
        body: Buffer.concat(chunks).toString('utf8'),
      });
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, path: req.url }));
    });
  });
  await new Promise((resolve) => upstreamServer.listen(UPSTREAM_PORT, '127.0.0.1', resolve));

  const mint = (overrides = {}) => {
    const {
      aud = RESOURCE,
      iss = ISSUER,
      scope = 'mcp:read',
      groups,
      exp = '5m',
      header = { alg: 'RS256', kid: 'red-team-k1' },
    } = overrides;
    const claims = { scope };
    if (groups !== undefined) claims.groups = groups;
    return new SignJWT(claims)
      .setProtectedHeader(header)
      .setIssuer(iss)
      .setAudience(aud)
      .setSubject('red-team-user')
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(privateKey);
  };

  const good = await mint({ scope: 'mcp:read' });
  const admin = await mint({ scope: 'mcp:read admin:write', groups: ['admins'] });
  const hiddenDirect = await mint({ scope: 'mcp:read admin:write' });
  const wrongAudience = await mint({ aud: 'http://localhost:9999/other' });
  const wrongIssuer = await mint({ iss: 'http://issuer.example.invalid' });
  const expired = await mint({ exp: '-10s' });

  const spec = join(work, 'red-team-spec.json');
  writeFileSync(spec, JSON.stringify({
    openapi: '3.0.0',
    info: { title: 'Red Team API', version: '1.0.0' },
    servers: [{ url: UPSTREAM }],
    paths: {
      '/public/{id}': {
        get: {
          operationId: 'publicRead',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'q', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
      '/admin/write': {
        post: {
          operationId: 'adminWrite',
          'x-mcp-scope': 'admin:write',
          'x-mcp-group': 'admins',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'number' },
                    note: { type: 'string' },
                    flags: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'ok' } },
        },
      },
      '/strange/{value}/literal-{value2}': {
        get: {
          operationId: 'strangeCharsProbe',
          parameters: [
            { name: 'value', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'value2', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
    },
  }));

  const gen = sh('npx', ['ts-node', 'src/cli/index.ts', 'generate', '--spec', spec, '--output', out,
    '--provider', 'generic', '--name', 'red-team-mcp', '--resource-uri', RESOURCE,
    '--auth-server', ISSUER, '--jwks-uri', `${ISSUER}/certs`, '--required-scope', 'mcp:read'],
  { cwd: REPO });
  if (gen.status !== 0) {
    console.error(gen.stdout, gen.stderr);
    throw new Error('generation failed');
  }
  check('malicious-ish OpenAPI spec generates successfully', gen.status === 0);

  const install = sh('npm', ['install'], { cwd: out });
  if (install.status !== 0) {
    console.error(install.stdout, install.stderr);
    throw new Error('generated npm install failed');
  }
  const build = sh('npm', ['run', 'build'], { cwd: out });
  if (build.status !== 0) {
    console.error(build.stdout, build.stderr);
    throw new Error('generated build failed');
  }
  check('generated red-team server builds', build.status === 0);

  generatedServer = spawn('node', ['dist/index.js'], {
    cwd: out,
    stdio: 'pipe',
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(PORT),
      MCP_RESOURCE_URI: RESOURCE,
      MCP_AUTHORIZATION_SERVERS: ISSUER,
      MCP_ISSUER: ISSUER,
      MCP_JWKS_URI: `${ISSUER}/certs`,
      MCP_REQUIRED_SCOPES: 'mcp:read',
      UPSTREAM_API_KEY: UPSTREAM_KEY,
    },
  });
  await sleep(2500);

  check('missing token rejected', (await rawPost()).status === 401);
  check('malformed token rejected', (await rawPost({ headers: { authorization: 'Bearer not-a-jwt' } })).status === 401);
  check('expired token rejected', (await rawPost({ headers: { authorization: `Bearer ${expired}` } })).status === 401);
  check('wrong issuer rejected', (await rawPost({ headers: { authorization: `Bearer ${wrongIssuer}` } })).status === 401);
  check('wrong audience rejected', (await rawPost({ headers: { authorization: `Bearer ${wrongAudience}` } })).status === 401);
  check('missing baseline scope rejected', (await rawPost({ headers: { authorization: `Bearer ${await mint({ scope: 'other:scope' })}` } })).status === 403);

  check('external Host rejected on loopback bind', await rawHostProbe('evil.example') === 421);
  check('disallowed browser Origin rejected',
    (await rawPost({ headers: { authorization: `Bearer ${good}`, origin: 'https://evil.example' } })).status === 403);
  const oversized = await rawPost({ headers: { authorization: `Bearer ${good}` }, body: JSON.stringify({ x: 'a'.repeat(1024 * 1024 + 1) }) });
  check('oversized JSON body rejected', oversized.status === 413);
  check('GET /mcp rejected',
    (await fetch(`http://127.0.0.1:${PORT}/mcp`, { headers: { authorization: `Bearer ${good}` } })).status === 405);
  check('DELETE /mcp rejected',
    (await fetch(`http://127.0.0.1:${PORT}/mcp`, { method: 'DELETE', headers: { authorization: `Bearer ${good}` } })).status === 405);

  const noGroupProbe = join(out, 'probe-no-group.mjs');
  const adminProbe = join(out, 'probe-admin.mjs');
  writeFileSync(noGroupProbe, clientProbeFile(PORT, false));
  writeFileSync(adminProbe, clientProbeFile(PORT, false));

  const noGroupTools = sh('node', ['probe-no-group.mjs'], { cwd: out, env: { ...process.env, TOK: good } });
  check('tools/list hides group-restricted tool without group',
    /TOOLS:/.test(noGroupTools.stdout) && !/adminWrite/.test(noGroupTools.stdout), noGroupTools.stdout.trim());

  const adminTools = sh('node', ['probe-admin.mjs'], { cwd: out, env: { ...process.env, TOK: admin } });
  check('tools/list shows group-restricted tool with group',
    /TOOLS:.*adminWrite/.test(adminTools.stdout), adminTools.stdout.trim());

  const beforeHiddenCall = upstreamRequests.length;
  const hiddenCall = await rawPost({
    headers: { authorization: `Bearer ${hiddenDirect}` },
    body: '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"adminWrite","arguments":{"amount":5}}}',
  });
  check('direct hidden tool call does not reach upstream',
    upstreamRequests.length === beforeHiddenCall, `status ${hiddenCall.status}`);

  const underScoped = await rawPost({
    headers: { authorization: `Bearer ${await mint({ scope: 'mcp:read', groups: ['admins'] })}` },
    body: '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"adminWrite","arguments":{"amount":5}}}',
  });
  check('visible but under-scoped tool call rejected with insufficient_scope',
    underScoped.status === 403 && /scope="admin:write"/.test(underScoped.headers.get('www-authenticate') || ''));

  const beforeAdminCall = upstreamRequests.length;
  const adminCall = await rawPost({
    headers: { authorization: `Bearer ${admin}` },
    body: '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"adminWrite","arguments":{"amount":7,"note":"safe-local-probe"}}}',
  });
  check('authorized group + scope tool call succeeds',
    adminCall.status === 200 && upstreamRequests.length === beforeAdminCall + 1,
    `status ${adminCall.status}`);
  const lastUpstream = upstreamRequests.at(-1) || {};
  check('upstream call uses env credential, not caller token',
    lastUpstream.authorization === `Bearer ${UPSTREAM_KEY}` && !lastUpstream.authorization.includes(admin));
  check('body arguments route to upstream JSON body',
    lastUpstream.method === 'POST' && lastUpstream.url === '/admin/write' && /"amount":7/.test(lastUpstream.body));
} finally {
  if (generatedServer) generatedServer.kill();
  if (jwksServer) jwksServer.close();
  if (upstreamServer) upstreamServer.close();
  rmSync(work, { recursive: true, force: true });
}

console.log(failures === 0 ? '\nred-team: ALL GREEN' : `\nred-team: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
