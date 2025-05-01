import { MCPGenerator } from '../core/generator/mcp-generator';
import { IProvider } from '../core/models/provider';
import { IParsedSpec } from '../core/models/parser-types';
import { TemplateLoader } from '../core/utils/template-loader';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock fs-extra module
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{}'),
  pathExists: jest.fn().mockResolvedValue(true)
}));

// Create a more comprehensive mock provider
const createMockProvider = (overrides = {}): IProvider => ({
  name: 'mock',
  version: '1.0.0',
  description: 'Mock provider for testing',
  
  parseOpenAPISpec: jest.fn(() => ({
    title: 'Mock API',
    version: '1.0.0',
    servers: [],
    endpoints: [],
    securitySchemes: {},
    components: {
      schemas: {}
    }
  })),
  
  createAuthProvider: jest.fn(() => ({
    code: 'mock code',
    name: 'mock-auth',
    type: 'mock'
  })),
  
  mapOperationsToTools: jest.fn(() => []),
  
  generateHandlers: jest.fn(() => '// Generated handlers'),
  
  generateServerImplementation: jest.fn(() => '// Server implementation'),
  
  generateAdditionalFiles: jest.fn(() => new Map([
    ['src/types.ts', '// Types'],
    ['package.json.additions', JSON.stringify({ dependencies: { 'test-dep': '1.0.0' } })]
  ])),
  
  ...overrides
});

// Create a mock parsed spec
const createMockSpec = (overrides = {}): IParsedSpec => ({
  title: 'Test API',
  version: '1.0.0',
  description: 'Test API description',
  servers: [{ url: 'https://api.example.com' }],
  endpoints: [],
  securitySchemes: {},
  components: {
    schemas: {}
  },
  ...overrides
});

describe('MCPGenerator Enhanced Tests', () => {
  let outputDir: string;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up output directory for each test
    outputDir = path.join('test', 'output', `output-${Date.now()}`);
    
    // Enable test mode for TemplateLoader
    TemplateLoader.setTestMode(true);
  });
  
  test('generates all expected files', async () => {
    const mockProvider = createMockProvider();
    const mockSpec = createMockSpec();
    const generator = new MCPGenerator();
    
    const result = await generator.generate(mockSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      serverDescription: 'Test Server',
      outputDir
    });
    
    expect(result.success).toBe(true);
    
    // Check that all expected files were generated
    expect(result.files).toContain('package.json');
    expect(result.files).toContain('tsconfig.json');
    expect(result.files).toContain('README.md');
    expect(result.files).toContain('src/mcp-types.ts');
    expect(result.files).toContain('src/mock-auth.ts');
    expect(result.files).toContain('src/test-server-server.ts');
    expect(result.files).toContain('src/index.ts');
    expect(result.files).toContain('src/cli.ts');
    expect(result.files).toContain('src/types.ts');
    
    expect((fs.writeFile as unknown as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(result.files.length);
  });
  
  test('applies package.json additions', async () => {
    const mockProvider = createMockProvider();
    const mockSpec = createMockSpec();
    const generator = new MCPGenerator();
    
    // Mock readFile to return a package.json
    (fs.readFile as unknown as jest.Mock).mockResolvedValue(JSON.stringify({
      name: 'test-server',
      version: '1.0.0',
      dependencies: {
        'existing-dep': '1.0.0'
      }
    }));
    
    await generator.generate(mockSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      outputDir
    });
    
    // Check that writeFile was called with merged package.json
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('package.json'),
      expect.stringContaining('test-dep')
    );
  });
  
  test('handles missing provider-specific files', async () => {
    // Create provider without generateAdditionalFiles
    const mockProvider = createMockProvider({
      generateAdditionalFiles: undefined
    });
    
    const mockSpec = createMockSpec();
    const generator = new MCPGenerator();
    
    const result = await generator.generate(mockSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      outputDir
    });
    
    expect(result.success).toBe(true);
    // Should still generate core files
    expect(result.files.length).toBeGreaterThan(5);
  });
  
  test('handles errors in file generation', async () => {
    const mockProvider = createMockProvider();
    const mockSpec = createMockSpec();
    const generator = new MCPGenerator();
    
    // Make writeFile throw an error
    (fs.writeFile as unknown as jest.Mock).mockRejectedValueOnce(new Error('Write error'));
    
    const result = await generator.generate(mockSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      outputDir
    });
    
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Write error');
  });
  
  test('uses provider-specific configuration', async () => {
    const mockProvider = createMockProvider();
    const mockSpec = createMockSpec();
    const generator = new MCPGenerator();
    
    await generator.generate(mockSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      outputDir,
      providerConfig: {
        customOption: 'value',
        dependencies: {
          'provider-dep': '1.0.0'
        }
      }
    });
    
    // Check that provider config was passed to server implementation
    expect(mockProvider.generateServerImplementation).toHaveBeenCalledWith(
      mockSpec,
      expect.objectContaining({
        customOption: 'value',
        dependencies: expect.objectContaining({
          'provider-dep': '1.0.0'
        })
      })
    );
  });
});