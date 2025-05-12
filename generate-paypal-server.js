/**
 * Script to generate PayPal MCP server
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const PAYPAL_SPEC_PATH = path.join(__dirname, 'specs', 'paypal', 'openapi', 'spec3.json');
const OUTPUT_DIR = path.join(__dirname, 'paypal-payment-server-new');

// Check if PayPal spec exists
if (!fs.existsSync(PAYPAL_SPEC_PATH)) {
  console.error(`PayPal OpenAPI spec not found at: ${PAYPAL_SPEC_PATH}`);
  process.exit(1);
}

// Run the generator CLI
console.log('Generating PayPal MCP server...');
try {
  const command = `node dist/cli/index.js generate --spec ${PAYPAL_SPEC_PATH} --provider paypal --output ${OUTPUT_DIR}`;
  console.log(`Running command: ${command}`);
  
  const output = execSync(command, { encoding: 'utf8' });
  console.log(output);
  
  console.log(`PayPal MCP server generated successfully at: ${OUTPUT_DIR}`);
} catch (error) {
  console.error('Error generating PayPal MCP server:', error.message);
  process.exit(1);
}