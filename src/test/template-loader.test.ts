import { TemplateLoader } from '../core/utils/template-loader';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock fs-extra properly
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  pathExists: jest.fn().mockResolvedValue(true)
}));

describe('TemplateLoader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TemplateLoader.clearCache();
    // Important: Set test mode to false to allow our mocks to work
    TemplateLoader.setTestMode(false);
    
    // Fix TypeScript error by properly setting up the mock
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('template content ${variable}');
  });

  test('loads template from file', async () => {
    // Set specific mock for this test
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('template content ${variable}');
    
    const template = await TemplateLoader.loadTemplate('test-template.txt');
    
    expect(template).toBe('template content ${variable}');
    expect(fs.readFile).toHaveBeenCalledTimes(1);
  });

  test('renders template with variables', () => {
    const template = 'Hello ${name}! Welcome to ${product}.';
    const variables = {
      name: 'John',
      product: 'MCP Generator'
    };
    
    const result = TemplateLoader.renderTemplate(template, variables);
    
    expect(result).toBe('Hello John! Welcome to MCP Generator.');
  });

  test('handles missing variables', () => {
    const template = 'Hello ${name}! Welcome to ${product}.';
    const variables = {
      name: 'John'
      // product is missing
    };
    
    const result = TemplateLoader.renderTemplate(template, variables);
    
    expect(result).toBe('Hello John! Welcome to .');
  });

  test('caches templates', async () => {
    // Set specific mock for this test
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('template content');
    
    // First call should read from file
    await TemplateLoader.loadTemplate('cached-template.txt');
    
    // Second call should use cache
    await TemplateLoader.loadTemplate('cached-template.txt');
    
    expect(fs.readFile).toHaveBeenCalledTimes(1);
  });

  test('loads and renders template in one step', async () => {
    // Set specific mock for this test
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('Hello ${name}!');
    
    const result = await TemplateLoader.loadAndRenderTemplate('greeting.txt', { name: 'John' });
    
    expect(result).toBe('Hello John!');
  });

  test('getCoreTemplatePath returns correct path', () => {
    const path = TemplateLoader.getCoreTemplatePath('test.template');
    expect(path).toContain('core/templates/test.template');
  });

  test('getProviderTemplatePath returns correct path', () => {
    const path = TemplateLoader.getProviderTemplatePath('stripe', 'test.template');
    expect(path).toContain('providers/stripe/templates/test.template');
  });
});