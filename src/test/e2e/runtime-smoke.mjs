/**
 * Runtime end-to-end smoke test for a generated MCP server.
 *
 * Generates a server, installs + builds it, boots it against a local JWKS, and
 * asserts real security behaviour:
 *   1. no token            -> 401 + WWW-Authenticate(resource_metadata)
 *   2. PRM document         at /.well-known/oauth-protected-resource
 *   3. wrong-audience token -> 401 (RFC 8707 audience binding)
 *   4. missing scope        -> 403
 *   5. cross-origin browser -> 403 (DNS-rebinding defense)
 *   6. valid token          -> SDK initialize + tools/list handshake succeeds
 *
 * Heavy (network install + build), so it is NOT part of `npm test`. Run with
 * `npm run test:e2e`. Requires network access.
 */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const REPO = new URL('../../..', import.meta.url).pathname;
const PORT = 9310;
const JWKS_PORT = 9401;
const ISSUER = `http://127.0.0.1:${JWKS_PORT}`;
const RESOURCE = `http://localhost:${PORT}/mcp`;

let failures = 0;
const check = (name, cond) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`);
  if (!cond) failures++;
};
const sh = (cmd, args, opts) => spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', ...opts });

const work = mkdtempSync(join(tmpdir(), 'mcp-e2e-'));
const out = join(work, 'server');
let jwks, server;

try {
  // --- local issuer + JWKS -------------------------------------------------
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  jwks = createServer((req, res) => {
    if (req.url.startsWith('/certs')) { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ keys: [jwk] })); }
    else { res.statusCode = 404; res.end(); }
  });
  await new Promise((r) => jwks.listen(JWKS_PORT, '127.0.0.1', r));
  const mint = (aud, scope) => new SignJWT({ scope })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(ISSUER).setAudience(aud).setSubject('u1').setIssuedAt().setExpirationTime('5m').sign(privateKey);
  const good = await mint(RESOURCE, 'mcp:read');
  const wrongAud = await mint('http://localhost:9999/other', 'mcp:read');

  // --- generate + install + build -----------------------------------------
  const spec = join(work, 'spec.json');
  writeFileSync(spec, JSON.stringify({
    openapi: '3.0.0', info: { title: 'E2E', version: '1.0.0' }, servers: [{ url: 'https://api.example.com' }],
    paths: { '/ping': { get: { operationId: 'ping', responses: { '200': { description: 'ok' } } } } },
  }));
  const gen = sh('npx', ['ts-node', 'src/cli/index.ts', 'generate', '--spec', spec, '--output', out,
    '--provider', 'stripe', '--name', 'e2e-mcp', '--resource-uri', RESOURCE,
    '--auth-server', ISSUER, '--jwks-uri', `${ISSUER}/certs`], { cwd: REPO });
  if (gen.status !== 0) { console.error(gen.stderr); throw new Error('generation failed'); }
  if (sh('npm', ['install'], { cwd: out }).status !== 0) throw new Error('npm install failed');
  const build = sh('npm', ['run', 'build'], { cwd: out });
  if (build.status !== 0) { console.error(build.stdout, build.stderr); throw new Error('build failed'); }

  // --- boot ----------------------------------------------------------------
  server = spawn('node', ['dist/index.js'], {
    cwd: out, stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT), MCP_RESOURCE_URI: RESOURCE,
      MCP_AUTHORIZATION_SERVERS: ISSUER, MCP_ISSUER: ISSUER, MCP_JWKS_URI: `${ISSUER}/certs`,
      MCP_REQUIRED_SCOPES: 'mcp:read' },
  });
  await new Promise((r) => setTimeout(r, 2500));

  const post = (headers, body = '{"jsonrpc":"2.0","id":1,"method":"tools/list"}') =>
    fetch(`http://127.0.0.1:${PORT}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body });

  // 1. no token -> 401 + challenge
  const r1 = await post({});
  check('no token -> 401', r1.status === 401);
  check('401 carries WWW-Authenticate(resource_metadata)',
    /resource_metadata=/.test(r1.headers.get('www-authenticate') || ''));

  // 2. PRM
  const prm = await (await fetch(`http://127.0.0.1:${PORT}/.well-known/oauth-protected-resource`)).json();
  check('PRM resource matches', prm.resource === RESOURCE);
  check('PRM lists the authorization server', (prm.authorization_servers || []).includes(ISSUER));

  // 3. wrong audience -> 401
  check('wrong-audience token -> 401', (await post({ authorization: `Bearer ${wrongAud}` })).status === 401);

  // 4. missing scope -> 403 (mint a token lacking mcp:read)
  const noScope = await mint(RESOURCE, 'mcp:other');
  check('insufficient scope -> 403', (await post({ authorization: `Bearer ${noScope}` })).status === 403);

  // 5. cross-origin browser -> 403
  check('cross-origin Origin -> 403',
    (await post({ authorization: `Bearer ${good}`, origin: 'https://evil.example' })).status === 403);

  // 6. valid token -> SDK handshake
  const clientProbe = join(out, 'probe.mjs');
  writeFileSync(clientProbe, `
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
const t = new StreamableHTTPClientTransport(new URL('http://127.0.0.1:${PORT}/mcp'), { requestInit: { headers: { Authorization: 'Bearer ' + process.env.TOK } } });
const c = new Client({ name: 'probe', version: '1.0.0' });
await c.connect(t);
const tools = await c.listTools();
console.log('TOOLS:' + tools.tools.map(x => x.name).join(','));
await c.close();
`);
  const probe = sh('node', ['probe.mjs'], { cwd: out, env: { ...process.env, TOK: good } });
  check('valid token -> SDK initialize + tools/list', /TOOLS:ping/.test(probe.stdout));
} finally {
  if (server) server.kill();
  if (jwks) jwks.close();
  rmSync(work, { recursive: true, force: true });
}

console.log(failures === 0 ? '\ne2e: ALL GREEN' : `\ne2e: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
