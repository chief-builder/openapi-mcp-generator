/**
 * Test script for Stripe MCP Server with a sandbox API key
 * 
 * This script:
 * 1. Starts the Stripe MCP server
 * 2. Checks server information
 * 3. Gets list of available tools
 * 4. Makes a tool call to test a specific API operation
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

// Configuration
const SERVER_PORT = 9002; // Using 9002 to avoid conflicts
// IMPORTANT: Replace with your test Stripe API key
const STRIPE_API_KEY = process.env.STRIPE_API_KEY || 'sk_test_dummy_key_replace_me';
const SERVER_DIR = path.join(__dirname, 'stripe-mcp');
const REQUEST_TIMEOUT = 5000; // ms

// Helper to format time
function formatTimestamp() {
  return new Date().toISOString();
}

// Helper to send JSON-RPC request to MCP server
async function sendRequest(method, params = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const requestBody = {
      jsonrpc: '2.0',
      id: requestId,
      method
    };
    
    if (params) {
      requestBody.params = params;
    }
    
    const requestData = JSON.stringify(requestBody);
    
    const options = {
      hostname: 'localhost',
      port: SERVER_PORT,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };
    
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const request = http.request(options, (response) => {
      const chunks = [];
      
      response.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      response.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString();
          const responseData = JSON.parse(body);
          resolve(responseData);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    const timeout = setTimeout(() => {
      request.destroy();
      reject(new Error('Request timed out'));
    }, REQUEST_TIMEOUT);
    
    request.on('response', () => {
      clearTimeout(timeout);
    });
    
    request.write(requestData);
    request.end();
  });
}

// Start the Stripe MCP server
function startServer() {
  console.log(`[${formatTimestamp()}] Starting Stripe MCP server...`);
  
  const serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      API_KEY: STRIPE_API_KEY,
      PORT: SERVER_PORT.toString()
    },
    stdio: 'pipe',
    detached: true
  });
  
  let serverOutput = '';
  
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log(`[Server] ${output.trim()}`);
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.error(`[Server Error] ${output.trim()}`);
  });
  
  return new Promise((resolve, reject) => {
    // Wait for server start indication
    const startTimeout = setTimeout(() => {
      if (serverOutput.includes('listening on port')) {
        clearTimeout(startTimeout);
        resolve(serverProcess);
      } else {
        clearTimeout(startTimeout);
        serverProcess.kill();
        reject(new Error('Failed to start server within timeout period'));
      }
    }, 5000);
    
    serverProcess.on('error', (error) => {
      clearTimeout(startTimeout);
      reject(new Error(`Failed to start server: ${error.message}`));
    });
    
    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        clearTimeout(startTimeout);
        reject(new Error(`Server process exited with code ${code}`));
      }
    });
  });
}

// Tests

// Test server info endpoint
async function testServerInfo() {
  console.log(`\n[${formatTimestamp()}] Testing server.info...`);
  try {
    const response = await sendRequest('server.info');
    console.log('Server info:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error testing server info:', error);
    throw error;
  }
}

// Test tools list endpoint
async function testToolsList() {
  console.log(`\n[${formatTimestamp()}] Testing tools.list...`);
  try {
    const response = await sendRequest('tools.list');
    
    if (response.result && response.result.tools) {
      console.log(`Found ${response.result.tools.length} tools`);
      
      // Display first 5 tools
      console.log('Sample tools:');
      response.result.tools.slice(0, 5).forEach((tool, index) => {
        console.log(`${index + 1}. ${tool.name}: ${tool.description?.substring(0, 100) || 'No description'}...`);
      });
    } else {
      console.log('Tools list result:', JSON.stringify(response, null, 2));
    }
    
    return response;
  } catch (error) {
    console.error('Error testing tools list:', error);
    throw error;
  }
}

// Test a specific tool call - listing customers
async function testListCustomers() {
  console.log(`\n[${formatTimestamp()}] Testing listCustomers tool...`);
  try {
    const response = await sendRequest('tools.call', {
      tool: 'listCustomers',
      parameters: {
        limit: 5
      }
    }, STRIPE_API_KEY);
    
    console.log('List customers result:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error testing list customers:', error);
    throw error;
  }
}

// Test creating a customer
async function testCreateCustomer() {
  console.log(`\n[${formatTimestamp()}] Testing createCustomer tool...`);
  
  // Create a test customer with a unique email
  const testEmail = `test-${Date.now()}@example.com`;
  
  try {
    const response = await sendRequest('tools.call', {
      tool: 'createCustomer',
      parameters: {
        email: testEmail,
        name: 'Test Customer',
        description: 'Created by MCP test script'
      }
    }, STRIPE_API_KEY);
    
    console.log('Create customer result:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// Run all tests
async function runTests() {
  let serverProcess;
  
  try {
    // Start the server
    serverProcess = await startServer();
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run tests
    await testServerInfo();
    await testToolsList();
    
    // If API key is provided, test actual API operations
    if (STRIPE_API_KEY && STRIPE_API_KEY !== 'sk_test_dummy_key_replace_me') {
      await testListCustomers();
      await testCreateCustomer();
    } else {
      console.log(`\n[${formatTimestamp()}] Skipping API tests - valid Stripe API key not provided`);
      console.log('Set the STRIPE_API_KEY environment variable to run API tests.');
    }
    
    console.log(`\n[${formatTimestamp()}] All tests completed successfully!`);
  } catch (error) {
    console.error(`\n[${formatTimestamp()}] Error during tests:`, error);
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log(`\n[${formatTimestamp()}] Stopping server...`);
      process.kill(-serverProcess.pid);
    }
  }
}

// Run the tests
runTests();