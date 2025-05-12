/**
 * PayPal test helper for getting access tokens
 * 
 * This is a standalone module to help with PayPal authentication
 * outside of the main MCP server flow.
 */

const https = require('https');
const querystring = require('querystring');

// Helper to format time
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Get a PayPal access token
 * 
 * @param {string} clientId PayPal client ID
 * @param {string} clientSecret PayPal client secret
 * @returns {Promise<string>} Access token
 */
async function getPayPalAccessToken(clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    console.log(`[${formatTimestamp()}] Getting PayPal token...`);
    
    const environment = 'sandbox';
    const baseUrl = environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';
    
    // Create auth header using client ID and secret
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    // Request options
    const options = {
      hostname: new URL(baseUrl).hostname,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${auth}`
      }
    };
    
    // Create request
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          // Parse response
          const response = JSON.parse(data);
          
          if (response.access_token) {
            resolve(response.access_token);
          } else if (response.error) {
            reject(new Error(`Authentication error: ${response.error_description || response.error}`));
          } else {
            reject(new Error('Failed to get access token: Unknown error'));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    // Send request with grant_type parameter
    req.write(querystring.stringify({
      grant_type: 'client_credentials'
    }));
    
    req.end();
  });
}

/**
 * Initialize PayPal client with token
 * 
 * @param {string} accessToken PayPal access token
 * @returns {Object} PayPal client with convenience methods
 */
function initializePayPalClient(accessToken) {
  return {
    token: accessToken,
    
    // Helper methods
    get: async (path) => {
      return makePayPalRequest('GET', path, null, accessToken);
    },
    
    post: async (path, data) => {
      return makePayPalRequest('POST', path, data, accessToken);
    },
    
    put: async (path, data) => {
      return makePayPalRequest('PUT', path, data, accessToken);
    },
    
    delete: async (path) => {
      return makePayPalRequest('DELETE', path, null, accessToken);
    }
  };
}

/**
 * Make a PayPal API request
 * 
 * @param {string} method HTTP method
 * @param {string} path API path
 * @param {Object} data Request data (for POST, PUT)
 * @param {string} accessToken PayPal access token
 * @returns {Promise<Object>} Response data
 */
async function makePayPalRequest(method, path, data, accessToken) {
  return new Promise((resolve, reject) => {
    const environment = 'sandbox';
    const baseUrl = environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';
    
    const url = new URL(path, baseUrl);
    
    // Request options
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    };
    
    // Create request
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          // If empty response, return empty object
          if (!responseData) {
            return resolve({});
          }
          
          // Parse response
          const response = JSON.parse(responseData);
          
          // Check for error response
          if (res.statusCode >= 400) {
            reject({
              name: response.name || 'API_ERROR',
              message: response.message || 'Unknown error',
              details: response.details,
              statusCode: res.statusCode
            });
            return;
          }
          
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Send request body if applicable
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

module.exports = {
  getPayPalAccessToken,
  initializePayPalClient
};