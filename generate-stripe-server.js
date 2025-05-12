// generate-stripe-server.js
const path = require('path');
const fs = require('fs-extra');
const { spawnSync } = require('child_process');

// Paths
const specPath = path.resolve('./specs/stripe/openapi/spec3.json');
const outputDir = path.resolve('./stripe-mcp');

// Run the generator directly without using the CLI
console.log('Generating Stripe MCP server...');

// Create a temporary JavaScript file to run with ts-node
const tempFilePath = path.resolve('./temp-generate.ts');
const tempFileContent = `
import { OpenAPIParser, MCPGenerator } from './src/core';
import { StripeProvider } from './src/providers/stripe';

async function generate() {
  try {
    // Create provider
    const provider = new StripeProvider();
    console.log(\`Using provider: \${provider.name} v\${provider.version}\`);
    
    // Parse OpenAPI spec
    console.log(\`Parsing OpenAPI specification: ${specPath}\`);
    const parser = new OpenAPIParser(provider);
    const parsedSpec = await parser.parseFromFile('${specPath}');
    
    // Generate MCP server
    console.log(\`Generating MCP server in ${outputDir}...\`);
    const generator = new MCPGenerator();
    const result = await generator.generate(parsedSpec, provider, {
      serverName: 'stripe-mcp',
      serverVersion: '1.0.0',
      serverDescription: 'Stripe MCP Server',
      outputDir: '${outputDir}'
    });
    
    if (result.success) {
      console.log('MCP server generated successfully!');
      console.log(\`Output directory: \${result.outputDir}\`);
      console.log(\`Generated \${result.files.length} files.\`);
    } else {
      console.error(\`Error generating MCP server: \${result.errorMessage}\`);
      process.exit(1);
    }
  } catch (error) {
    console.error(\`Error: \${error instanceof Error ? error.message : String(error)}\`);
    process.exit(1);
  }
}

generate();
`;

// Write the temporary file
fs.writeFileSync(tempFilePath, tempFileContent);

// Run the file with ts-node
const result = spawnSync('npx', ['ts-node', tempFilePath], { 
  stdio: 'inherit',
  shell: true
});

// Clean up the temporary file
fs.unlinkSync(tempFilePath);

// Exit with the same code as the ts-node process
process.exit(result.status);