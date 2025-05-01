/**
 * Command Line Interface for OpenAPI MCP Generator
 */

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { OpenAPIParser, MCPGenerator, ProviderRegistry } from '../core';

// Create CLI program
const program = new Command();

program
  .name('openapi-mcp-generator')
  .description('Generate MCP servers from OpenAPI specifications')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate an MCP server from an OpenAPI specification')
  .requiredOption('-s, --spec <path>', 'Path to OpenAPI specification')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-p, --provider <name>', 'Provider name', 'stripe')
  .option('-n, --name <name>', 'Server name')
  .option('-v, --version <version>', 'Server version', '1.0.0')
  .option('-d, --description <description>', 'Server description')
  .option('-c, --config <path>', 'Configuration file')
  .action(async (options) => {
    try {
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
      
      // Create generator configuration
      const generatorConfig = {
        serverName,
        serverVersion: options.version || config.serverVersion || '1.0.0',
        serverDescription: options.description || config.serverDescription || `MCP server for ${parsedSpec.title}`,
        outputDir: options.output,
        httpPort: config.httpPort || 8080,
        transport: config.transport || 'http',
        generateTypes: config.generateTypes !== false,
        providerConfig: config.providerConfig || {},
        authConfig: config.authConfig || {},
        includeExamples: config.includeExamples !== false
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
  .description('Run a test with Stripe OpenAPI specification')
  .option('-s, --spec <path>', 'Path to Stripe OpenAPI specification')
  .option('-o, --output <dir>', 'Output directory', './output/stripe-mcp-server')
  .action(async (options) => {
    try {
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

// Parse command line arguments
program.parse();

const cli = {
  run: () => program.parse(process.argv)
};

export default cli;