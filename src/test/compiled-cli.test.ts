import { spawnSync } from 'node:child_process';
import * as fs from 'fs-extra';
import * as os from 'node:os';
import * as path from 'node:path';

describe('compiled CLI distribution', () => {
  let tempDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'compiled-cli-'));
  });

  afterAll(async () => {
    if (tempDir) await fs.remove(tempDir);
  });

  test('build output includes templates and honors config-file values', () => {
    const build = spawnSync('npm', ['run', 'build'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' },
    });
    expect(build.status).toBe(0);
    expect(fs.existsSync(path.join(process.cwd(), 'dist/core/templates/mcp-server.ts.template'))).toBe(true);

    const outputDir = path.join(tempDir, 'generated');
    const configPath = path.join(tempDir, 'config.json');
    fs.writeJsonSync(configPath, {
      serverName: 'compiled-config-server',
      serverVersion: '9.8.7',
      serverAuthConfig: {
        resourceUri: 'urn:mcp:compiled-config',
        authorizationServers: ['https://auth.example.com'],
        upstreamAuth: 'none',
        groupsClaim: 'teams',
        authzHook: true,
      },
    });

    const generated = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), 'dist/cli/index.js'),
        'generate',
        '--spec', path.join(process.cwd(), 'specs/test/simple-spec.json'),
        '--output', outputDir,
        '--provider', 'generic',
        '--config', configPath,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'production' },
      },
    );

    expect(generated.status).toBe(0);
    expect(generated.stderr).not.toContain('Error generating MCP server');
    const pkg = fs.readJsonSync(path.join(outputDir, 'package.json'));
    expect(pkg.name).toBe('compiled-config-server');
    expect(pkg.version).toBe('9.8.7');
    expect(pkg.bin).toBeUndefined();

    const server = fs.readFileSync(path.join(outputDir, 'src/mcp-server.ts'), 'utf8');
    expect(server).toContain('UPSTREAM_AUTH_MODE: string = "none"');
    expect(server).toContain('const GROUPS_CLAIM = "teams"');
    expect(fs.existsSync(path.join(outputDir, 'src/authz-hook.ts'))).toBe(true);
  }, 30000);
});
