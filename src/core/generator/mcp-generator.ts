/**
 * MCP Generator
 * 
 * This module generates MCP servers from OpenAPI specifications.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { IParsedSpec, IParsedEndpoint } from '../models/parser-types';
import { IProvider, IProviderConfig } from '../models/provider';
import {
  IGeneratorConfig,
  IGeneratorResult,
  IMCPGenerator,
  IServerAuthConfig
} from '../models/generator-types';
import {
  formatServerClassName,
  kebabToPascalCase
} from '../models/naming-conventions';
import { TemplateLoader } from '../utils/template-loader';

/**
 * A self-contained description of one MCP tool: its schema plus how to route
 * validated arguments back onto the upstream HTTP operation.
 */
interface IToolDescriptor {
  name: string;
  title?: string;
  description?: string;
  inputSchema: any;
  annotations?: Record<string, unknown>;
  method: string;
  path: string;
  pathParams: string[];
  queryParams: string[];
  bodyParams: string[];
  /** Required scope for execution (from `x-mcp-scope`); missing -> 403 step-up. */
  requiredScope?: string;
  /** Required group for visibility (from `x-mcp-group`); filters tools/list. */
  requiredGroup?: string;
}

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

      // Create output + src directories
      await fs.ensureDir(config.outputDir);
      const srcDir = path.join(config.outputDir, 'src');
      await fs.ensureDir(srcDir);

      const providerConfig: IProviderConfig = {
        name: config.serverName,
        version: config.serverVersion,
        description: config.serverDescription,
        ...config.providerConfig
      };

      // package.json, tsconfig.json, README.md
      await this.generatePackageJson(config);
      generatedFiles.push('package.json');
      await this.generateTsConfig(config);
      generatedFiles.push('tsconfig.json');
      await this.generateReadme(config, spec, provider);
      generatedFiles.push('README.md');

      // OAuth 2.1 resource-server module (verbatim core template)
      await this.emitCoreFile('oauth-resource-server.ts.template', path.join(srcDir, 'oauth-resource-server.ts'));
      generatedFiles.push('src/oauth-resource-server.ts');

      // Shared SDK-based, stateless MCP server driven by the tool descriptors
      const tools = this.buildToolDescriptors(spec, provider);
      await this.emitSharedServer(config, spec, tools, path.join(srcDir, 'mcp-server.ts'));
      generatedFiles.push('src/mcp-server.ts');

      // Entry point
      await this.emitIndex(config, path.join(srcDir, 'index.ts'));
      generatedFiles.push('src/index.ts');

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
   * Copy a core template to a destination file verbatim (no variable rendering).
   */
  private async emitCoreFile(templateName: string, destPath: string): Promise<void> {
    const content = await TemplateLoader.loadTemplate(TemplateLoader.getCoreTemplatePath(templateName));
    await fs.writeFile(destPath, content);
  }

  /**
   * Resolve the resource-server config, filling defaults.
   */
  private resolveAuthConfig(config: IGeneratorConfig): Required<Omit<IServerAuthConfig, 'issuer'>> & { issuer: string } {
    const auth: IServerAuthConfig = config.serverAuthConfig ?? {
      resourceUri: `urn:mcp:${config.serverName}`,
      authorizationServers: [],
    };
    const authServers = auth.authorizationServers ?? [];
    return {
      resourceUri: auth.resourceUri,
      authorizationServers: authServers,
      jwksUri: auth.jwksUri ?? (authServers[0] ? `${authServers[0]}/protocol/openid-connect/certs` : ''),
      issuer: auth.issuer ?? '',
      requiredScopes: auth.requiredScopes ?? [],
      upstreamAuth: auth.upstreamAuth ?? 'env-credential',
      upstreamBaseUrl: auth.upstreamBaseUrl ?? '',
      authzHook: auth.authzHook ?? false,
      groupsClaim: auth.groupsClaim ?? 'groups',
    };
  }

  /**
   * Build MCP tool descriptors from the parsed endpoints. Tool names/titles/
   * annotations come from the provider (nice naming); the input schema and
   * argument routing (path/query/body) are derived from the endpoint itself so
   * schema keys and routing always agree.
   */
  private buildToolDescriptors(spec: IParsedSpec, provider: IProvider): IToolDescriptor[] {
    const providerTools = provider.mapOperationsToTools(spec.endpoints);
    const byOp = new Map<string, any>();
    for (const t of providerTools) {
      const opId = (t.metadata && t.metadata.operationId) || t.id;
      byOp.set(opId, t);
    }

    return spec.endpoints.map((endpoint) => {
      const info = byOp.get(endpoint.operationId);
      const pathParams = endpoint.parameters.filter((p) => p.in === 'path').map((p) => p.name);
      const queryParams = endpoint.parameters.filter((p) => p.in === 'query').map((p) => p.name);
      const { bodyParams, inputSchema } = this.buildInputSchema(endpoint);

      const ext = endpoint.extensions || {};
      return {
        name: info?.name ?? this.defaultToolName(endpoint.operationId),
        title: info?.annotations?.title,
        description: info?.description || endpoint.description || endpoint.summary || undefined,
        inputSchema,
        annotations: info?.annotations,
        method: endpoint.method.toUpperCase(),
        path: endpoint.path,
        pathParams,
        queryParams,
        bodyParams,
        requiredScope: ext['x-mcp-scope'],
        requiredGroup: ext['x-mcp-group'],
      };
    });
  }

  /**
   * Build a JSON-schema inputSchema from an endpoint's path/query params and
   * request body, returning the body property names for argument routing.
   */
  private buildInputSchema(endpoint: IParsedEndpoint): { bodyParams: string[]; inputSchema: any } {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    const bodyParams: string[] = [];

    for (const param of endpoint.parameters) {
      if (param.in !== 'path' && param.in !== 'query') continue;
      properties[param.name] = {
        ...(param.schema || { type: 'string' }),
        description: param.description || `${param.name} parameter`,
      };
      if (param.required) required.push(param.name);
    }

    const body = endpoint.requestBody?.content;
    if (body) {
      const contentType = body['application/json'] ? 'application/json' : Object.keys(body)[0];
      const bodySchema = contentType ? body[contentType]?.schema : undefined;
      if (bodySchema?.properties) {
        for (const [name, propSchema] of Object.entries(bodySchema.properties as Record<string, any>)) {
          properties[name] = {
            ...(propSchema as any),
            description: (propSchema as any).description || `${name} parameter`,
          };
          bodyParams.push(name);
        }
        if (Array.isArray(bodySchema.required)) required.push(...bodySchema.required);
      }
    }

    return {
      bodyParams,
      inputSchema: {
        type: 'object',
        properties,
        ...(required.length ? { required: Array.from(new Set(required)) } : {}),
      },
    };
  }

  private defaultToolName(operationId: string): string {
    if (!operationId) return 'unknownTool';
    return operationId
      .replace(/[^a-zA-Z0-9]+([a-zA-Z0-9])/g, (_, c) => c.toUpperCase())
      .replace(/^([A-Z])/, (_, c) => c.toLowerCase());
  }

  /**
   * Render and write the shared stateless SDK server. Uses %%TOKEN%% markers so
   * runtime `${...}` template literals in the emitted TypeScript survive.
   */
  private async emitSharedServer(
    config: IGeneratorConfig,
    spec: IParsedSpec,
    tools: IToolDescriptor[],
    destPath: string
  ): Promise<void> {
    const auth = this.resolveAuthConfig(config);
    const baseUrl = auth.upstreamBaseUrl || spec.servers?.[0]?.url || '';
    const template = await TemplateLoader.loadTemplate(TemplateLoader.getCoreTemplatePath('mcp-server.ts.template'));

    const replacements: Record<string, string> = {
      SERVER_NAME: config.serverName,
      SERVER_VERSION: config.serverVersion,
      HTTP_PORT: String(config.httpPort || 3000),
      BASE_URL: baseUrl,
      UPSTREAM_AUTH_MODE: auth.upstreamAuth,
      RESOURCE_URI: auth.resourceUri,
      AUTH_SERVERS: auth.authorizationServers.join(','),
      JWKS_URI: auth.jwksUri,
      ISSUER: auth.issuer,
      REQUIRED_SCOPES: auth.requiredScopes.join(','),
      GROUPS_CLAIM: auth.groupsClaim,
      TOOLS_JSON: JSON.stringify(tools, null, 2),
      // Optional authorization hook wiring (empty when disabled).
      AUTHZ_HOOK_IMPORT: auth.authzHook
        ? "import { authorize } from './authz-hook.js';"
        : '',
      AUTHZ_HOOK_CALL: auth.authzHook
        ? 'args = await authorize({ auth, tool, args });'
        : '',
    };

    let rendered = template;
    for (const [token, value] of Object.entries(replacements)) {
      rendered = rendered.split(`%%${token}%%`).join(value);
    }
    await fs.writeFile(destPath, rendered);
  }

  /**
   * Render and write the entry point.
   */
  private async emitIndex(config: IGeneratorConfig, destPath: string): Promise<void> {
    const templatePath = TemplateLoader.getCoreTemplatePath('index.ts.template');
    const content = await TemplateLoader.loadAndRenderTemplate(templatePath, {
      serverName: config.serverName,
      serverDescription: config.serverDescription || 'MCP server generated from an OpenAPI specification',
    });
    await fs.writeFile(destPath, content);
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

    const providerTools = provider.mapOperationsToTools(spec.endpoints);
    const toolByOperationId = new Map<string, any>();
    for (const tool of providerTools) {
      const operationId = tool.metadata?.operationId || tool.id;
      toolByOperationId.set(operationId, tool);
    }
    
    // Generate the example requests
    const exampleRequests = await this.getExampleRequests(spec, provider);
    
    // Generate the tools list
    const toolsList = spec.endpoints.slice(0, 10).map(endpoint => {
      const tool = toolByOperationId.get(endpoint.operationId);
      const toolName = tool?.name || endpoint.operationId;
      const description = tool?.description || endpoint.summary || endpoint.description || 'No description';
      return `- \`${toolName}\`: ${description}`;
    }).join('\n');
    
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

  const providerTools = provider.mapOperationsToTools(spec.endpoints);
  const sampleTool = providerTools.find((tool) =>
    (tool.metadata?.operationId || tool.id) === sampleEndpoint.operationId
  );
  
  // Load and render the example requests template
  const templatePath = TemplateLoader.getCoreTemplatePath('example-requests.md.template');
  const variables = {
    sampleToolName: sampleTool?.name || sampleEndpoint.operationId
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
