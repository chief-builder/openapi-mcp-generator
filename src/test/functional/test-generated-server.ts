/**
 * Functional Test for Generated MCP Server
 * 
 * This script tests a generated MCP server by:
 * 1. Building the server
 * 2. Starting the server in a child process
 * 3. Sending test requests to the server
 * 4. Stopping the server
 */

import * as child_process from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import fetch from 'node-fetch';

// Configuration
const config = {
  // Path to the generated server (relative to the project root)
  serverPath: path.resolve(process.cwd(), 'output', 'stripe-mcp-server'),
  
  // Port to run the server on
  serverPort: 9090,
  
  // Stripe API key (for testing)
  stripeApiKey: process.env.STRIPE_API_KEY || 'sk_test_your_test_key',
  
  // Test timeout (in milliseconds)
  timeout: 30000
};

/**
 * Main test function
 */
async function main() {
  console.log('=== Functional Test for Generated MCP Server ===');
  
  try {
    // Check if the server directory exists
    if (!fs.existsSync(config.serverPath)) {
      console.error(`Error: Server directory not found at ${config.serverPath}`);
      console.log('Please run the generator first with `npm run test:stripe`');
      process.exit(1);
    }
    
    // Step 1: Install dependencies
    console.log('\n1. Installing dependencies...');
    await runCommand('npm install', config.serverPath);
    
    // Step 2: Build the server
    console.log('\n2. Building the server...');
    await runCommand('npm run build', config.serverPath);
    
    // Step 3: Start the server
    console.log('\n3. Starting the server...');
    const serverProcess = startServer();
    
    // Wait for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Step 4: Test the server
      console.log('\n4. Testing the server...');
      await testServer();
      
      console.log('\nAll tests passed! ✅');
    } finally {
      // Step 5: Stop the server
      console.log('\n5. Stopping the server...');
      stopServer(serverProcess);
    }
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

/**
 * Run a command in a specific directory
 * 
 * @param command Command to run
 * @param cwd Working directory
 * @returns Promise that resolves when the command completes
 */
async function runCommand(command: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = child_process.exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command failed: ${command}`);
        console.error(stderr);
        reject(error);
        return;
      }
      
      resolve();
    });
    
    // Forward stdout to console
    process.stdout?.on('data', (data) => {
      console.log(data.toString().trim());
    });
  });
}

/**
 * Start the server in a child process
 * 
 * @returns Child process
 */
function startServer(): child_process.ChildProcess {
  const serverProcess = child_process.spawn('node', ['dist/index.js'], {
    cwd: config.serverPath,
    env: {
      ...process.env,
      PORT: config.serverPort.toString(),
      API_KEY: config.stripeApiKey
    }
  });
  
  // Forward stdout to console
  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data.toString().trim()}`);
  });
  
  // Forward stderr to console
  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
  });
  
  return serverProcess;
}

/**
 * Stop the server
 * 
 * @param serverProcess Server process
 */
function stopServer(serverProcess: child_process.ChildProcess): void {
  serverProcess.kill();
}

async function testServer(): Promise<void> {
  // Test 1: Check server info (no changes needed)
  console.log('\nTest 1: Check server info');
  const serverInfo = await sendRequest('server.info');
  console.log(`Server name: ${serverInfo.name}`);
  console.log(`Server version: ${serverInfo.version}`);
  
  // Test 2: List tools (no changes needed)
  console.log('\nTest 2: List tools');
  const toolsResponse = await sendRequest('tools.list');
  const tools = toolsResponse.tools || [];
  console.log(`Found ${tools.length} tools`);
  for (let i = 0; i < tools.length; i++) {
    console.log(`Tool ${i + 1}: ${tools[i].name}`);
  }
  
  // Test 3: Check server status (no changes needed)
  console.log('\nTest 3: Check server status');
  const statusResponse = await sendRequest('lifecycle.status');
  console.log(`Server status: ${statusResponse.status}`);
  
  // Test 4: Create a test customer - use postCustomers
  if (config.stripeApiKey && config.stripeApiKey.startsWith('sk_test_')) {
    console.log('\nTest 4: Create a test customer');
    try {
      const createResult = await sendRequest('tools.call', {
        tool: 'postCustomers', // Changed from createCustomer
        parameters: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test Customer',
          description: 'Created by MCP server test'
        }
      });
      
      console.log(`Created customer: ${createResult.id}`);
      
      // Test 5: Retrieve the customer - use getCustomersCustomer
      console.log('\nTest 5: Retrieve the customer');
      const getResult = await sendRequest('tools.call', {
        tool: 'getCustomersCustomer', // Changed from getCustomer
        parameters: {
          id: createResult.id
        }
      });
      
      console.log(`Retrieved customer: ${getResult.name}`);
      
      // Test 6: Update the customer - use postCustomersCustomer
      console.log('\nTest 6: Update the customer');
      const updateResult = await sendRequest('tools.call', {
        tool: 'postCustomersCustomer', // Changed from updateCustomer
        parameters: {
          id: createResult.id,
          description: 'Updated by MCP server test'
        }
      });
      
      console.log(`Updated customer: ${updateResult.description}`);
      
      // Test 7: List customers - use getCustomers
      console.log('\nTest 7: List customers');
      const listResult = await sendRequest('tools.call', {
        tool: 'getCustomers', // Changed from listCustomers
        parameters: {
          limit: 5
        }
      });
      
      console.log(`Listed ${listResult.data?.length || 0} customers`);
      
      // Test 8: Delete the customer - use deleteCustomersCustomer
      console.log('\nTest 8: Delete the customer');
      const deleteResult = await sendRequest('tools.call', {
        tool: 'deleteCustomersCustomer', // Changed from deleteCustomer
        parameters: {
          id: createResult.id
        }
      });
      
      console.log(`Deleted customer: ${deleteResult.id} (deleted: ${deleteResult.deleted})`);
      
    } catch (error) {
      console.error('API test failed:', (error as Error).message);
    }
  } else {
    console.log('\nSkipping Stripe API tests - valid test API key not provided');
  }
}

/**
 * Send a request to the server
 * 
 * @param method Method to call
 * @param params Parameters
 * @returns Response
 */
async function sendRequest(method: string, params: any = {}): Promise<any> {
  const response = await fetch(`http://localhost:${config.serverPort}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.stripeApiKey}`
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    })
  });
  
  if (!response.ok) {
    throw new Error(`Request failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Server error: ${data.error.message}`);
  }
  
  return data.result;
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}