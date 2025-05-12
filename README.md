# OpenAPI MCP Generator

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)

A powerful tool for generating [Model Context Protocol (MCP)](https://github.com/anthropics/anthropic-cookbook/tree/main/mcp) servers from OpenAPI specifications. This tool enables seamless integration between OpenAPI-based services and AI assistants supporting the MCP protocol.

## Overview

The OpenAPI MCP Generator transforms standard OpenAPI specifications into fully functional MCP servers that expose API operations as MCP tools. This allows AI assistants to interact with APIs in a standardized way, making it easier to build AI-powered applications that leverage existing API ecosystems.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  OpenAPI Spec   │────>│  MCP Generator  │────>│   MCP Server    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        │
                                                        ▼
                                             ┌─────────────────┐
                                             │                 │
                                             │  AI Assistant   │
                                             │                 │
                                             └─────────────────┘
```

## Features

- **Automated Code Generation**: Generates fully functional TypeScript MCP server implementations
- **Provider-Based Design**: Extensible provider system supporting different API styles and authentication methods
- **Standardized Naming Conventions**: Consistent naming across generated code
- **Customizable Templates**: Easily modify templates to suit specific needs
- **Authentication Support**: Automatic generation of auth providers based on OpenAPI security schemes
- **Tool Mapping**: Maps OpenAPI operations to MCP tools with appropriate schemas
- **Stripe Integration**: Built-in support for the Stripe API (557 tools from 563 operations)
- **PayPal Integration**: Built-in support for the PayPal API with OAuth 2.0 authentication
- **Enhanced Security**: Transport security features including CORS protection, rate limiting, and request validation
- **Multiple Transport Options**: Support for HTTP, stdio (coming soon), and SSE (coming soon) transports
- **Dynamic Execution**: Automatic mapping of REST operations to MCP tools for seamless integration

## Key Metrics

### Stripe MCP Server
- **Tools Coverage**: 557 tools covering the entire Stripe API
- **API Integration**: Complete REST API coverage with dynamic execution
- **Resource Management**: CRUD operations on all Stripe resources
- **Authentication**: API key authentication with secure token handling

### PayPal MCP Server
- **Tools Coverage**: 8 tools covering the complete PayPal Orders API
- **Authentication**: OAuth 2.0 flow with automatic token management
- **Order Management**: Complete order creation and processing workflow
- **API Integration**: Direct integration with PayPal's API endpoints

## Installation

```bash
# Clone the repository
git clone https://github.com/chief-builder/openapi-mcp-generator.git
cd openapi-mcp-generator

# Install dependencies
npm install

# Build the project
npm run build
```

## Quick Start

### Step 1: Generate an MCP server from an OpenAPI spec

```bash
# Generate an MCP server for Stripe API
npm run generate -- --provider=stripe --spec=./specs/stripe/openapi/spec3.json --output=./output/stripe-mcp
```

### Example: Generating a PayPal MCP Server

```bash
# Generate an MCP server for PayPal API
npm run generate -- --provider=paypal --spec=./test-resources/paypal-spec.json --output=./output/paypal-mcp

# Navigate to the output directory and install
cd ./output/paypal-mcp
npm install
npm run build

# Start the server with PayPal credentials
PAYPAL_CLIENT_ID=your_client_id PAYPAL_CLIENT_SECRET=your_client_secret npm start
```

### Step 2: Install and start the generated server

```bash
# Navigate to the output directory
cd ./output/stripe-mcp

# Install dependencies
npm install

# Build the server
npm run build

# Start the server
STRIPE_API_KEY=your_api_key npm start
```

### Step 3: Interact with the server using MCP

```json
// List available tools
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools.list"
}

// Call a specific tool
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools.call",
  "params": {
    "tool": "postCustomers",
    "parameters": {
      "email": "customer@example.com",
      "name": "Test Customer"
    }
  }
}
```

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Core Components                       │
├────────────┬────────────┬─────────────┬────────────┬────────┤
│            │            │             │            │        │
│   Parser   │ Generator  │  Registry   │  Templates │ Models │
│            │            │             │            │        │
└────────────┴────────────┴─────────────┴────────────┴────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Provider Implementations                │
├────────────────┬───────────────┬──────────────┬─────────────┤
│                │               │              │             │
│ Stripe Provider│ PayPal Provider│ Other       │ Your        │
│                │               │ Provider     │ Provider    │
└────────────────┴───────────────┴──────────────┴─────────────┘
```

### MCP Server Structure

```
┌───────────────────────────────────────────────────────────┐
│                     MCP Server                             │
├───────────────┬───────────────┬───────────────────────────┤
│               │               │                           │
│ Server Module │ Auth Provider │ Tool Implementations      │
│               │               │                           │
└───────┬───────┴───────┬───────┴─────────────┬─────────────┘
        │               │                     │
        ▼               ▼                     ▼
┌───────────────┐ ┌────────────┐    ┌─────────────────────┐
│ HTTP Transport│ │ JSON-RPC   │    │ API Client          │
│               │ │ Handler    │    │ (Stripe, etc.)      │
└───────────────┘ └────────────┘    └─────────────────────┘
```

## Providers

The system currently supports the following providers:

| Provider | Description                        | Status      | Tools Count |
|----------|------------------------------------|-------------|-------------|
| Stripe   | Stripe Payments API                | Implemented | 557         |
| PayPal   | PayPal Payments and Orders API     | Implemented | 8           |
| Generic  | Generic OpenAPI provider           | Planned     | -           |
| Custom   | Support for custom implementations | Supported   | -           |

## Development

### Project Structure

```
.
├── src
│   ├── cli              # Command-line interface
│   ├── core             # Core components
│   │   ├── generator    # MCP server generation logic
│   │   ├── models       # Type definitions
│   │   ├── parser       # OpenAPI parser
│   │   ├── registry     # Provider registry
│   │   ├── templates    # Core templates
│   │   ├── transports   # Transport implementations
│   │   └── utils        # Utility functions
│   ├── providers        # API providers
│   │   ├── stripe       # Stripe API implementation
│   │   └── paypal       # PayPal API implementation
│   └── test             # Tests
└── output               # Generated servers
```

### Adding a New Provider

1. Create a new provider directory under `src/providers/`
2. Implement the `IProvider` interface
3. Add templates for provider-specific code generation
4. Register the provider in `src/providers/index.ts`

```typescript
// Example provider implementation
import { IProvider } from '../../core/models/provider';

export class MyProvider implements IProvider {
  readonly name = 'my-provider';
  readonly version = '1.0.0';
  readonly description = 'My custom provider';
  
  // Implement required methods...
}
```

## Testing Generated Servers

### Testing Strategy
The OpenAPI MCP Generator has a comprehensive testing strategy combining unit tests and integration tests to ensure reliability and correctness.

- **Unit Tests**
    Unit tests focus on testing individual components in isolation:
    1. Parser Tests: Verify that OpenAPI specifications are correctly parsed.
    2. Generator Tests: Ensure code generation works as expected with different inputs.
    3. Provider Tests: Test provider-specific functionality like mapping operations to tools.
    4. Utility Tests: Test helper functions and utilities like naming conventions.

- **Integration Tests**
    Integration tests verify that components work correctly together:
    1. Parser-Generator Integration: Tests the flow from parsing a specification to generating code.
    2. Provider Integration: Verifies that providers correctly implement all required interfaces.
    3. Server Generation: Tests generation of server files with correct structure.
    4. Full Integration: End-to-end tests from specification to server generation.

- **Running Tests**
  - Run Unit Tests: `npm run test`
  - Run Integration Tests: `npm run test:integration`
  - Run All Tests: `npm run test:all`

### Testing the Stripe MCP Server

#### Method 1: Using the test script

1. Make sure you have a Stripe test API key
2. Run the test script with your API key:

```bash
STRIPE_API_KEY=sk_test_your_test_key_here node test-stripe-server.js
```

#### Method 2: Manual testing with curl

```bash
# Start the server
cd stripe-mcp
API_KEY=sk_test_your_test_key_here npm run dev

# In another terminal, get list of tools
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tools.list"
  }'

# Create a customer
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_test_your_test_key_here" \
  -d '{
    "jsonrpc": "2.0",
    "id": "4",
    "method": "tools.call",
    "params": {
      "tool": "createCustomer",
      "parameters": {
        "email": "test@example.com",
        "name": "Test Customer"
      }
    }
  }'
```

### Testing the PayPal MCP Server

#### Method 1: Using the test script with environment variables

1. Create a `.env` file based on the `.env.sample` template
2. Add your PayPal sandbox credentials to the `.env` file
3. Run the test script:

```bash
# The script will load credentials from your .env file
node test-paypal-server-with-helper.js
```

#### Method 2: Using the test script with inline credentials (not recommended)

```bash
PAYPAL_CLIENT_ID=your_client_id PAYPAL_CLIENT_SECRET=your_client_secret node test-paypal-server.js
```

#### Method 3: Manual testing with curl

```bash
# Start the server (using .env file recommended)
cd paypal-payment-server
CLIENT_ID=your_client_id CLIENT_SECRET=your_client_secret npm run dev

# In another terminal, create a PayPal order
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "3",
    "method": "tools.call",
    "params": {
      "tool": "ordersCreate",
      "parameters": {
        "intent": "CAPTURE",
        "purchase_units": [{
          "amount": {
            "currency_code": "USD",
            "value": "100.00"
          }
        }]
      }
    }
  }'
```

## Customizing Generated Servers

The generated servers can be customized in several ways:

1. **Modify templates**: Edit template files in `src/core/templates/` or provider-specific templates
2. **Add custom prompts**: Create custom prompts in the provider implementation
3. **Extend the generated code**: Add additional functionality to generated servers

## Transport Security

The OpenAPI MCP Generator includes robust transport security features to protect your MCP servers:

- **Localhost Binding**: By default, servers only accept connections from localhost
- **CORS Protection**: Configurable allowed origins to prevent cross-site attacks
- **Rate Limiting**: Protection against DoS attacks with customizable limits
- **Request Size Limiting**: Prevents request body overflow attacks
- **Content Type Validation**: Ensures proper content types for all requests
- **Request Timeout**: Configurable timeouts to prevent resource exhaustion

For detailed security configuration options and best practices, see the [Transport Security Guide](./docs/TRANSPORT-SECURITY.md).

### Example Security Configuration

```typescript
const serverConfig = {
  // Server configuration
  serverName: "My Secure MCP Server",
  serverVersion: "1.0.0",
  transport: "http",
  httpPort: 8080,

  // Security configuration
  security: {
    bindToLocalhost: true,
    allowedOrigins: ["https://myapp.example.com"],
    maxRequestBodySize: 1048576, // 1MB
    requestTimeoutMs: 30000,
    validateContentType: true,
    rateLimit: {
      maxRequestsPerMinute: 100,
      windowMs: 60000
    }
  }
};
```

## Multi-Provider Support

The OpenAPI MCP Generator now supports multiple API providers:

- **Stripe**: For payment processing, subscriptions, and financial services (557 tools)
- **PayPal**: For payment processing, orders, and checkout flows (8 tools)
- **Custom Providers**: Extend the system with your own provider implementations

Each provider includes specialized adapters for:

- **Parameter Mapping**: Converts between OpenAPI parameters and provider-specific formats
- **Handler Generation**: Creates optimized handlers for provider-specific operations
- **Templates**: Provider-specific templates for generating specialized code
- **Authentication**: Provider-specific authentication methods (API keys, OAuth, etc.)

To use a specific provider, use the `--provider` flag when generating your MCP server:

```bash
npm run generate -- --provider=stripe --spec=./path/to/spec.json --output=./output/my-server
npm run generate -- --provider=paypal --spec=./path/to/spec.json --output=./output/my-server
```

## Sample Test Output Highlights

The project includes sample test outputs showing the functionality of generated MCP servers:

### Stripe MCP Server:
- **Transport Security**: HTTP server with proper security and rate limiting
- **Tools Coverage**: 557 tools covering the entire Stripe API
- **Dynamic Execution**: Automatic mapping of REST operations to MCP tools
- **Resource Management**: Complete CRUD operations on all Stripe resources
- **JSON-RPC**: Full JSON-RPC 2.0 request/response protocol support

### PayPal MCP Server:
- **Authentication**: OAuth 2.0 flow with automatic token management
- **Transport Security**: HTTP server with robust security features
- **Tools Support**: 8 tools covering all operations in the PayPal Orders API
- **Order Management**: Complete order creation and processing workflow
- **API Integration**: Direct integration with PayPal's API endpoints

For more details, see [Sample_Functional_Test_Output.md](./Sample_Functional_Test_Output.md)

## License

This project is licensed under the MIT License - see the LICENSE file for details.