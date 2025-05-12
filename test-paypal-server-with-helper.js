/**
 * Test script for PayPal MCP Server with sandbox credentials using the helper module
 * 
 * This script:
 * 1. First authenticates with PayPal directly using the helper
 * 2. Starts the PayPal MCP server with the obtained token
 * 3. Checks server information
 * 4. Gets list of available tools
 * 5. Makes tool calls to test specific API operations
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const helper = require('./paypal-test-helper');
const dotenv = require('dotenv');

// Load environment variables from .env file
if (fs.existsSync('.env')) {
  console.log('Loading environment variables from .env file');
  dotenv.config();
} else {
  console.warn('No .env file found. Please create one with your PayPal API credentials.');
  console.warn('See .env.sample for an example.');
  process.exit(1);
}

// Configuration
const SERVER_PORT = process.env.SERVER_PORT || 9003; // Using 9003 to avoid conflicts
// PayPal credentials from environment variables
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Validate environment variables
if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
  console.error('Error: PayPal API credentials are required.');
  console.error('Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in your .env file.');
  process.exit(1);
}

const SERVER_DIR = process.env.SERVER_DIR || path.join(__dirname, 'paypal-payment-server');
const REQUEST_TIMEOUT = 5000; // ms

// Helper to format time
function formatTimestamp() {
  return new Date().toISOString();
}

// Helper to send JSON-RPC request to MCP server
async function sendRequest(method, params = null, accessToken = null) {
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
    
    if (accessToken) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
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

// First authenticate with PayPal directly, then start server with token
async function authenticateAndStartServer() {
  try {
    console.log(`[${formatTimestamp()}] Authenticating with PayPal...`);
    
    // Get access token directly
    const accessToken = await helper.getPayPalAccessToken(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET);
    console.log(`[${formatTimestamp()}] Successfully obtained access token: ${accessToken.substring(0, 10)}...`);
    
    // Start the server with the token
    console.log(`[${formatTimestamp()}] Starting PayPal MCP server with the token...`);
    
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: SERVER_DIR,
      env: {
        ...process.env,
        ACCESS_TOKEN: accessToken, // Pass token directly
        CLIENT_ID: PAYPAL_CLIENT_ID,
        CLIENT_SECRET: PAYPAL_CLIENT_SECRET,
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
          resolve({ serverProcess, accessToken });
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
  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
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

// Test creating an order
async function testCreateOrder(accessToken) {
  console.log(`\n[${formatTimestamp()}] Testing ordersCreate tool...`);
  try {
    const response = await sendRequest('tools.call', {
      tool: 'ordersCreate',
      parameters: {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: '10.00'
            },
            description: 'Test purchase'
          }
        ],
        application_context: {
          return_url: 'https://example.com/success',
          cancel_url: 'https://example.com/cancel'
        }
      }
    }, accessToken);
    
    console.log('Create order result:', JSON.stringify(response, null, 2));
    
    // Extract order ID if available
    let orderId = null;
    try {
      if (response.result && response.result.content) {
        const content = response.result.content[0].text;
        const orderData = JSON.parse(content);
        orderId = orderData.id;
        console.log(`Order created with ID: ${orderId}`);
      }
    } catch (error) {
      console.error('Error extracting order ID:', error);
    }
    
    return { response, orderId };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// Test getting an order
async function testGetOrder(orderId, accessToken) {
  console.log(`\n[${formatTimestamp()}] Testing ordersGet tool for ID: ${orderId}...`);
  try {
    const response = await sendRequest('tools.call', {
      tool: 'ordersGet',
      parameters: {
        id: orderId
      }
    }, accessToken);
    
    console.log('Get order result:', JSON.stringify(response, null, 2));
    return response;
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

// Run all tests
async function runTests() {
  let serverProcess;
  let accessToken;
  
  try {
    // Authenticate and start the server
    const startResult = await authenticateAndStartServer();
    serverProcess = startResult.serverProcess;
    accessToken = startResult.accessToken;
    
    // Give the server a moment to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Run tests
    await testServerInfo();
    await testToolsList();
    
    // Test the API operations with the token
    const { orderId } = await testCreateOrder(accessToken);
    
    if (orderId) {
      await testGetOrder(orderId, accessToken);
    }
    
    console.log(`\n[${formatTimestamp()}] All tests completed successfully!`);
  } catch (error) {
    console.error(`\n[${formatTimestamp()}] Error during tests:`, error);
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log(`\n[${formatTimestamp()}] Stopping server...`);
      try {
        process.kill(-serverProcess.pid);
      } catch (error) {
        console.error(`\n[${formatTimestamp()}] Error stopping server:`, error);
      }
    }
  }
}

// Run the tests
runTests();