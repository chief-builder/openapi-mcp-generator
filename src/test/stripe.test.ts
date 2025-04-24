/**
 * Test script for the OpenAPI to MCP Generator with Stripe provider
 * 
 * This script demonstrates how to use the OpenAPI to MCP Generator
 * to create an MCP server from Stripe's OpenAPI specification.
 */

import * as fs from 'fs-extra';
import * as path from 'path';

import { 
  OpenAPIParser, 
  MCPGenerator, 
  ProviderRegistry
} from '../core';

import { StripeProvider } from '../providers/stripe';

// Skip running this file directly when in test environment
if (process.env.JEST_WORKER_ID) {
  describe('Stripe test script', () => {
    test('skipped during test run', () => {
      // Skip this test
    });
  });
} else {
  // Register Stripe provider
  ProviderRegistry.registerProvider(new StripeProvider());

  /**
   * Main test function
   */
  async function main() {
    try {
      console.log('Starting OpenAPI to MCP Generator test...');
      
      // Configuration
      const config = {
        specPath: path.resolve(process.cwd(), 'specs/stripe/openapi/spec3.json'), // Path to Stripe OpenAPI spec
        outputDir: path.resolve(process.cwd(), 'output', 'stripe-mcp-server'),
        serverName: 'stripe-mcp',
        serverVersion: '1.0.0',
        serverDescription: 'MCP Server for the Stripe API (Test)',
        includeOperations: [
          'customers.create',
          'customers.retrieve',
          'customers.update',
          'customers.list',
          'payment_intents.create',
          'payment_intents.retrieve',
          'payment_intents.update',
          'payment_intents.list',
          'payment_methods.create',
          'payment_methods.retrieve',
          'payment_methods.list'
        ]
      };
      
      // Check if spec file exists
      if (!fs.existsSync(config.specPath)) {
        console.error(`Error: Stripe OpenAPI spec not found at ${config.specPath}`);
        console.log('Please download it from https://github.com/stripe/openapi');
        return; // Exit function but don't call process.exit() in tests
      }
      
      // Get provider
      const provider = ProviderRegistry.getProvider('stripe');
      console.log(`Using provider: ${provider.name} v${provider.version}`);
      
      // Create parser
      const parser = new OpenAPIParser(provider, {
        includeOperations: config.includeOperations
      });
      
      // Parse OpenAPI spec
      console.log(`Parsing OpenAPI spec from ${config.specPath}...`);
      const parsedSpec = await parser.parseFromFile(config.specPath);
      console.log(`Parsed ${parsedSpec.endpoints.length} endpoints`);
      
      // Create generator
      const generator = new MCPGenerator();
      
      // Generate MCP server
      console.log(`Generating MCP server in ${config.outputDir}...`);
      const result = await generator.generate(parsedSpec, provider, {
        serverName: config.serverName,
        serverVersion: config.serverVersion,
        serverDescription: config.serverDescription,
        outputDir: config.outputDir,
        httpPort: 8080,
        transport: 'http',
        generateTypes: true,
        includeExamples: true
      });
      
      // Check result
      if (result.success) {
        console.log(`MCP server generated successfully in ${config.outputDir}`);
        console.log(`Generated ${result.files.length} files:`);
        result.files.forEach(file => console.log(`- ${file}`));
        
        console.log('\nTo build and run the server:');
        console.log(`cd ${config.outputDir}`);
        console.log('npm install');
        console.log('npm run build');
        console.log('STRIPE_API_KEY=your_api_key npm start');
      } else {
        console.error(`Error generating MCP server: ${result.errorMessage}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  // Run the test if this file is executed directly
  if (require.main === module) {
    main();
  }
}