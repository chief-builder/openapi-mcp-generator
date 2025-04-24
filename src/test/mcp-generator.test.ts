/**
 * Tests for the MCP Generator
 */

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
  pathExists: jest.fn().mockResolvedValue(true),
  remove: jest.fn().mockResolvedValue(undefined)
}));

// Mock provider implementation
const mockProvider: IProvider = {
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
  
  generateHandlers: jest.fn(() => ''),
  
  generateServerImplementation: jest.fn(() => '')
};

// Mock parsed spec
const mockParsedSpec: IParsedSpec = {
  title: 'Test API',
  version: '1.0.0',
  servers: [],
  endpoints: [],
  securitySchemes: {},
  components: {
    schemas: {}
  }
};

describe('MCPGenerator', () => {
  let outputDir: string;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set up output directory for each test
    outputDir = path.join('test', 'output', `output-${Date.now()}`);
    
    // Enable test mode for TemplateLoader
    TemplateLoader.setTestMode(true);
  });
  
  test('generates an MCP server', async () => {
    const generator = new MCPGenerator();
    
    const result = await generator.generate(mockParsedSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      outputDir
    });
    
    expect(result.success).toBe(true);
    expect(result.outputDir).toBe(outputDir);
    
    // Check if ensureDir was called with the correct arguments
    expect(fs.ensureDir).toHaveBeenCalledWith(outputDir);
    expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src'));
  });
  
  test('returns error result when generation fails', async () => {
    const generator = new MCPGenerator();
    
    // Make ensureDir throw an error
    (fs.ensureDir as jest.Mock).mockRejectedValueOnce(new Error('Directory creation failed'));
    
    const result = await generator.generate(mockParsedSpec, mockProvider, {
      serverName: 'test-server',
      serverVersion: '1.0.0',
      outputDir
    });
    
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Directory creation failed');
  });
});