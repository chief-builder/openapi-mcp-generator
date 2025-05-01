/**
 * MCP Generator
 * 
 * This module generates MCP servers from OpenAPI specifications.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { IParsedSpec } from '../models/parser-types';
import { IProvider, IProviderConfig } from '../models/provider';
import { 
  IGeneratorConfig, 
  IGeneratorResult, 
  IMCPGenerator
} from '../models/generator-types';
import { 
  formatServerClassName, 
  kebabToPascalCase 
} from '../models/naming-conventions';
import { TemplateLoader } from '../utils/template-loader';

/**
 * Generator for creating MCP servers from OpenAPI specifications
 */
export class MCPGenerator implements IMCPGenerator {
  /**
   * Generate MCP server from parsed OpenAPI spec
   * 
   * @param spec Parsed OpenAPI specification
   * @param provider API provider implementation
   * @param config Generator configuration
   * @returns Generator result
   */
  public async generate(
    spec: IParsedSpec,
    provider: IProvider,
    config: IGeneratorConfig
  ): Promise<IGeneratorResult> {
    try {
      console.log(`Generating MCP server for ${spec.title} in ${config.outputDir}...`);
      const generatedFiles: string[] = [];
      
      // Create output directory if it doesn't exist
      await fs.ensureDir(config.outputDir);
      
      // Create src directory
      const srcDir = path.join(config.outputDir, 'src');
      await fs.ensureDir(srcDir);
      
      // Create provider config
      const providerConfig: IProviderConfig = {
        name: config.serverName,
        version: config.serverVersion,
        description: config.serverDescription,
        ...config.providerConfig
      };
      
      // Generate package.json
      await this.generatePackageJson(config);
      generatedFiles.push('package.json');
      
      // Generate tsconfig.json
      await this.generateTsConfig(config);
      generatedFiles.push('tsconfig.json');
      
      // Generate README.md
      await this.generateReadme(config, spec, provider);
      generatedFiles.push('README.md');
      
      // Generate MCP types
      await this.generateMCPTypes(path.join(config.outputDir, 'src'));
      generatedFiles.push('src/mcp-types.ts');
      
      // Generate auth provider
      const authProviderResult = provider.createAuthProvider({
        type: 'api-key',
        requireAuth: config.authConfig?.requireAuth ?? true,
        defaultApiKey: config.authConfig?.defaultApiKey,
        ...config.authConfig
      });
      
      await fs.writeFile(
        path.join(srcDir, `${authProviderResult.name}.ts`),
        authProviderResult.code
      );
      generatedFiles.push(`src/${authProviderResult.name}.ts`);
      
      // Generate server implementation
      const serverImplementation = provider.generateServerImplementation(spec, providerConfig);
      await fs.writeFile(
        path.join(srcDir, `${providerConfig.name || 'api'}-server.ts`),
        serverImplementation
      );
      generatedFiles.push(`src/${providerConfig.name || 'api'}-server.ts`);
      
      
      // Generate index file
      await this.generateIndexFile(config, providerConfig, authProviderResult.name);
      generatedFiles.push('src/index.ts');
      
      // Generate CLI file
      await this.generateCliFile(config, providerConfig);
      generatedFiles.push('src/cli.ts');
      
      // Generate additional files if provider has them
      if (provider.generateAdditionalFiles) {
        const additionalFiles = provider.generateAdditionalFiles(spec, providerConfig);
        
        for (const [filename, content] of additionalFiles.entries()) {
          // Special handling for package.json.additions
          if (filename === 'package.json.additions') {
            await this.applyPackageAdditions(config.outputDir, content);
            // Don't add to generatedFiles since we're not creating a new file
            continue;
          }
          
          // Normal file creation
          const filePath = path.join(config.outputDir, filename);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, content);
          generatedFiles.push(filename);
        }
      }
      
      return {
        outputDir: config.outputDir,
        files: generatedFiles,
        success: true
      };
    } catch (error) {
      return {
        outputDir: config.outputDir,
        files: [],
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Generate package.json file
   * 
   * @param config Generator configuration
   */
  private async generatePackageJson(config: IGeneratorConfig): Promise<void> {
    const templatePath = TemplateLoader.getCoreTemplatePath('package.json.template');
    const variables = {
      serverName: config.serverName,
      serverVersion: config.serverVersion,
      serverDescription: config.serverDescription || 'MCP server generated from OpenAPI specification'
    };
    
    let packageJsonContent = await TemplateLoader.loadAndRenderTemplate(templatePath, variables);
    
    // Apply any provider-specific additions if available
    if (config.providerConfig?.dependencies) {
      const packageJson = JSON.parse(packageJsonContent);
      packageJson.dependencies = {
        ...packageJson.dependencies,
        ...config.providerConfig.dependencies
      };
      packageJsonContent = JSON.stringify(packageJson, null, 2);
    }
    
    await fs.writeFile(
      path.join(config.outputDir, 'package.json'),
      packageJsonContent
    );
  }
    
  /**
   * Generate tsconfig.json file
   * 
   * @param config Generator configuration
   */
  private async generateTsConfig(config: IGeneratorConfig): Promise<void> {
    const templatePath = TemplateLoader.getCoreTemplatePath('tsconfig.json.template');
    const tsConfigContent = await TemplateLoader.loadAndRenderTemplate(templatePath, {});
    
    await fs.writeFile(
      path.join(config.outputDir, 'tsconfig.json'),
      tsConfigContent
    );
  }
  
  /**
   * Generate MCP types file
   * @param srcDir Directory where the types file will be created
   */
  private async generateMCPTypes(srcDir: string): Promise<void> {
    const templatePath = TemplateLoader.getCoreTemplatePath('mcp-types.ts.template');
    const typesContent = await TemplateLoader.loadAndRenderTemplate(templatePath, {});
    await fs.writeFile(path.join(srcDir, 'mcp-types.ts'), typesContent);
  }
  
  /**
   * Generate the main index file for the MCP server
   * 
   * @param config Generator configuration
   * @param providerConfig Provider configuration
   * @param authProviderName Name of the auth provider file
   */
  private async generateIndexFile(
    config: IGeneratorConfig,
    providerConfig: IProviderConfig,
    authProviderName: string
  ): Promise<void> {
    const serverFileName = this.getServerFileName(providerConfig.name || 'api');
    const serverClassName = formatServerClassName(providerConfig.name || 'api');
    
    const templatePath = TemplateLoader.getCoreTemplatePath('index.ts.template');
    const variables = {
      providerName: providerConfig.name || 'API',
      serverFileName,
      serverClassName,
      authProviderName
    };
    
    const indexContent = await TemplateLoader.loadAndRenderTemplate(templatePath, variables);
    await fs.writeFile(path.join(config.outputDir, 'src', 'index.ts'), indexContent);
  }
  
  /**
   * Get the server file name (without extension)
   * 
   * @param baseName Base name for the server
   * @returns Server file name
   */
  private getServerFileName(baseName: string): string {
    return `${baseName}-server`;
  }
  
  /**
   * Generate CLI file for the MCP server
   * 
   * @param config Generator configuration
   * @param providerConfig Provider configuration
   */
  private async generateCliFile(
    config: IGeneratorConfig,
    providerConfig: IProviderConfig
  ): Promise<void> {
    const serverFileName = this.getServerFileName(providerConfig.name || 'api');
    const serverClassName = formatServerClassName(providerConfig.name || 'api');
    
    const templatePath = TemplateLoader.getCoreTemplatePath('cli.ts.template');
    const variables = {
      providerName: providerConfig.name || 'API',
      serverFileName,
      serverClassName
    };
    
    const cliContent = await TemplateLoader.loadAndRenderTemplate(templatePath, variables);
    await fs.writeFile(path.join(config.outputDir, 'src', 'cli.ts'), cliContent);
  }
  
  /**
   * Generate README file
   * 
   * @param config Generator configuration
   * @param spec Parsed OpenAPI specification
   * @param provider Provider implementation
   */
  private async generateReadme(
    config: IGeneratorConfig,
    spec: IParsedSpec,
    provider: IProvider
  ): Promise<void> {
    // Generate the authentication documentation
    const authDoc = await this.getAuthenticationDoc(provider);
    
    // Generate the example requests
    const exampleRequests = await this.getExampleRequests(spec, provider);
    
    // Generate the tools list
    const toolsList = spec.endpoints.slice(0, 10).map(endpoint => 
      `- \`${endpoint.operationId}\`: ${endpoint.summary || endpoint.description || 'No description'}`
    ).join('\n');
    
    const toolsExtra = spec.endpoints.length > 10 
      ? `\n...and ${spec.endpoints.length - 10} more` 
      : '';
    
    // Load and render the README template
    const templatePath = TemplateLoader.getCoreTemplatePath('readme.md.template');
    const variables = {
      serverName: config.serverName,
      serverDescription: config.serverDescription || 'MCP server generated from OpenAPI specification',
      apiTitle: spec.title,
      toolsList,
      toolsExtra,
      authDoc,
      exampleRequests
    };
    
    const readmeContent = await TemplateLoader.loadAndRenderTemplate(templatePath, variables);
    await fs.writeFile(path.join(config.outputDir, 'README.md'), readmeContent);
  }

/**
 * Get authentication documentation
 * 
 * @param provider Provider implementation
 * @returns Authentication documentation
 */
private async getAuthenticationDoc(provider: IProvider): Promise<string> {
  // Load and render the authentication documentation template
  const templatePath = TemplateLoader.getCoreTemplatePath('auth-doc.md.template');
  return await TemplateLoader.loadAndRenderTemplate(templatePath, {});
}

/**
 * Get example requests
 * 
 * @param spec Parsed OpenAPI specification
 * @param provider Provider implementation
 * @returns Example requests
 */
private async getExampleRequests(spec: IParsedSpec, provider: IProvider): Promise<string> {
  // Get a sample endpoint
  const sampleEndpoint = spec.endpoints[0];
  
  if (!sampleEndpoint) {
    return 'No endpoints available for examples.';
  }
  
  // Load and render the example requests template
  const templatePath = TemplateLoader.getCoreTemplatePath('example-requests.md.template');
  const variables = {
    sampleOperationId: sampleEndpoint.operationId
  };
  
  return await TemplateLoader.loadAndRenderTemplate(templatePath, variables);
}

/**
 * Apply additions to package.json
 * 
 * @param outputDir Output directory containing package.json
 * @param additionsContent JSON string with additions to package.json
 */
private async applyPackageAdditions(outputDir: string, additionsContent: string): Promise<void> {
  try {
    // Parse additions content
    const additions = JSON.parse(additionsContent);
    
    // Read existing package.json
    const packageJsonPath = path.join(outputDir, 'package.json');
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // Deep merge the additions into the package.json
    const mergedPackageJson = this.deepMerge(packageJson, additions);
    
    // Write updated package.json
    await fs.writeFile(
      packageJsonPath,
      JSON.stringify(mergedPackageJson, null, 2)
    );
  } catch (error) {
    console.error('Failed to apply package.json additions:', error);
    throw error;
  }
}

/**
 * Deep merge two objects
 * 
 * @param target Target object
 * @param source Source object to merge into target
 * @returns Merged object
 */
private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  if (!source) return target;
  
  const output = { ...target };
  
  if (this.isObject(target) && this.isObject(source)) {
    Object.keys(source).forEach(key => {
      if (this.isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = this.deepMerge(
            target[key] || {}, 
            source[key]
          );
        }
      } else {
        output[key] = source[key];
      }
    });
  }
  
  return output;
}

/**
 * Check if value is an object
 * 
 * @param item Value to check
 * @returns True if value is an object
 */
private isObject(item: any): boolean {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
}