#!/usr/bin/env node

/**
 * Command Line Interface for OpenAPI MCP Generator
 */

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { OpenAPIParser, MCPGenerator, ProviderRegistry } from '../core';
import { version as pkgVersion } from '../../package.json';

// Register providers (side-effect import).
require('../providers');

// Create CLI program
const program = new Command();

program
  .name('openapi-mcp-generator')
  .description('Generate MCP servers from OpenAPI specifications')
  .version(pkgVersion);

program
  .command('generate')
  .description('Generate an MCP server from an OpenAPI specification')
  .requiredOption('-s, --spec <path>', 'Path to OpenAPI specification')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option(
    '-p, --provider <name>',
    'Provider name (generic is supported; stripe and paypal are experimental)',
    'generic'
  )
  .option('-n, --name <name>', 'Server name')
  .option('-v, --version <version>', 'Server version')
  .option('-d, --description <description>', 'Server description')
  .option('-c, --config <path>', 'Configuration file')
  .option('--resource-uri <uri>', 'Canonical MCP server URI = required token audience (RFC 8707)')
  .option('--auth-server <url...>', 'Authorization server issuer URL(s) for Protected Resource Metadata')
  .option('--jwks-uri <url>', 'JWKS URL for token signature validation')
  .option('--issuer <url>', 'Expected token issuer (defaults to the first --auth-server)')
  .option('--required-scope <scope...>', 'Scope(s) the server requires (enforced -> 403)')
  .option('--upstream-auth <mode>', 'Upstream auth: none | env-credential | passthrough')
  .option('--upstream-base-url <url>', 'Upstream API base URL (defaults to the spec server URL)')
  .option('--allow-token-passthrough', 'Shortcut for --upstream-auth passthrough (discouraged)')
  .option('--authz-hook', 'Emit a call to a hand-written ./authz-hook.ts before each tool call')
  .option('--groups-claim <name>', 'Token claim carrying groups (per-tool visibility)')
  .action(async (options) => {
    try {
      console.log('Generate command triggered');
      console.log('Generating MCP server...');
      
      // Check if provider is registered
      if (!ProviderRegistry.hasProvider(options.provider)) {
        console.error(`Error: Provider "${options.provider}" not found.`);
        console.error('Available providers:');
        const providers = ProviderRegistry.getAllProviders();
        if (providers.length === 0) {
          console.error('  No providers registered.');
        } else {
          providers.forEach((provider: any) => {
            console.error(`  - ${provider.name} (${provider.version})`);
          });
        }
        process.exit(1);
      }
      
      // Get provider
      const provider = ProviderRegistry.getProvider(options.provider);
      console.log(`Using provider: ${provider.name} v${provider.version}`);
      
      // Check if spec file exists
      if (!fs.existsSync(options.spec)) {
        console.error(`Error: Specification file not found: ${options.spec}`);
        process.exit(1);
      }
      
      // Load configuration from file if provided
      let config: any = {};
      if (options.config) {
        if (!fs.existsSync(options.config)) {
          console.error(`Error: Configuration file not found: ${options.config}`);
          process.exit(1);
        }
        
        try {
          const configContent = await fs.readFile(options.config, 'utf8');
          config = JSON.parse(configContent);
        } catch (error) {
          console.error(`Error parsing configuration file: ${error instanceof Error ? error.message : String(error)}`);
          process.exit(1);
        }
      }
      
      // Parse OpenAPI specification
      console.log(`Parsing OpenAPI specification: ${options.spec}`);
      const parser = new OpenAPIParser(provider);
      const parsedSpec = await parser.parseFromFile(options.spec);
      
      // Determine server name
      const serverName = options.name || config.serverName || parsedSpec.title.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-mcp-server';
      
      // Resolve resource-server (OAuth) configuration from flags/config file.
      const authServers: string[] =
        options.authServer || config.serverAuthConfig?.authorizationServers || [];
      const upstreamAuth = options.allowTokenPassthrough
        ? 'passthrough'
        : (options.upstreamAuth || config.serverAuthConfig?.upstreamAuth || 'env-credential');
      if (!['none', 'env-credential', 'passthrough'].includes(upstreamAuth)) {
        throw new Error(
          `Invalid upstream auth mode "${upstreamAuth}". Expected none, env-credential, or passthrough.`
        );
      }
      const serverAuthConfig = {
        resourceUri:
          options.resourceUri ||
          config.serverAuthConfig?.resourceUri ||
          `urn:mcp:${serverName}`,
        authorizationServers: authServers,
        jwksUri: options.jwksUri || config.serverAuthConfig?.jwksUri,
        issuer: options.issuer || config.serverAuthConfig?.issuer,
        requiredScopes: options.requiredScope || config.serverAuthConfig?.requiredScopes || [],
        upstreamAuth,
        upstreamBaseUrl: options.upstreamBaseUrl || config.serverAuthConfig?.upstreamBaseUrl,
        authzHook: options.authzHook || config.serverAuthConfig?.authzHook || false,
        groupsClaim: options.groupsClaim || config.serverAuthConfig?.groupsClaim || 'groups',
      };

      if (upstreamAuth === 'passthrough') {
        console.warn(
          'WARNING: --upstream-auth passthrough forwards the caller token to the upstream API. ' +
          'This is a confused-deputy risk the MCP spec forbids for third-party APIs. Prefer env-credential.',
        );
      }
      if (!serverAuthConfig.authorizationServers.length) {
        console.warn(
          'WARNING: no --auth-server given; generated server cannot validate tokens until ' +
          'MCP_AUTHORIZATION_SERVERS / MCP_JWKS_URI are set in its environment.',
        );
      }

      // Create generator configuration
      const generatorConfig = {
        serverName,
        serverVersion: options.version || config.serverVersion || '1.0.0',
        serverDescription: options.description || config.serverDescription || `MCP server for ${parsedSpec.title}`,
        outputDir: options.output,
        httpPort: config.httpPort || 3000,
        transport: config.transport || 'http',
        generateTypes: config.generateTypes !== false,
        providerConfig: config.providerConfig || {},
        authConfig: config.authConfig || {},
        includeExamples: config.includeExamples !== false,
        serverAuthConfig,
      };
      
      // Generate MCP server
      console.log(`Generating MCP server in ${options.output}...`);
      const generator = new MCPGenerator();
      const result = await generator.generate(parsedSpec, provider, generatorConfig);
      
      if (result.success) {
        console.log('MCP server generated successfully!');
        console.log(`Output directory: ${path.resolve(result.outputDir)}`);
        console.log(`Generated ${result.files.length} files.`);
        console.log('\nTo build and run the server:');
        console.log(`  cd ${result.outputDir}`);
        console.log('  npm install');
        console.log('  npm run build');
        console.log('  npm start');
      } else {
        console.error(`Error generating MCP server: ${result.errorMessage}`);
        process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command('list-providers')
  .description('List available providers')
  .action(() => {
    const providers = ProviderRegistry.getAllProviders();
    
    console.log('Available providers:');
    if (providers.length === 0) {
      console.log('  No providers registered.');
    } else {
      providers.forEach((provider: any) => {
        console.log(`  - ${provider.name} v${provider.version}: ${provider.description || 'No description'}`);
      });
    }
  });

// Add the stripe-test command
program
  .command('stripe-test')
  .description('Run an experimental test with a Stripe OpenAPI specification')
  .option('-s, --spec <path>', 'Path to Stripe OpenAPI specification')
  .option('-o, --output <dir>', 'Output directory', './output/stripe-mcp-server')
  .action(async (options) => {
    try {
      console.warn(
        'WARNING: the Stripe provider is experimental and does not fully support ' +
        'form or multipart request serialization.'
      );

      // Use a default spec path if not provided
      const specPath = options.spec || path.resolve(process.cwd(), 'specs/stripe/openapi/spec3.json');
      
      // Ensure the spec file exists
      if (!fs.existsSync(specPath)) {
        console.error(`Error: Stripe OpenAPI spec not found at ${specPath}`);
        console.log('Please download it from https://github.com/stripe/openapi');
        process.exit(1);
      }
      
      // Run the stripe-test command
      console.log(`Testing with Stripe OpenAPI spec at ${specPath}`);
      console.log(`Output directory: ${options.output}`);
      
      // Forward to generate command
      await program.parseAsync([
        'node', 'openapi-mcp-generator', 'generate',
        '--spec', specPath,
        '--output', options.output,
        '--provider', 'stripe',
        '--name', 'stripe-mcp',
        '--description', 'MCP Server for Stripe API'
      ]);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

const cli = {
  run: (argv: string[] = process.argv) => program.parseAsync(argv)
};

if (require.main === module) {
  void cli.run().catch((error) => {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}

export default cli;
