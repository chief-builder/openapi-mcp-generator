# OpenAPI MCP Generator

![Version](https://img.shields.io/badge/version-0.2.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)

Generate [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers from OpenAPI specifications. Generated servers are built on the **official `@modelcontextprotocol/sdk`**, speak MCP over **stateless Streamable HTTP** (the 2026-07-28 architectural model), and are **OAuth 2.1 resource servers** out of the box.

## Overview

The generator turns an OpenAPI spec into a real MCP server that exposes each operation as an MCP tool. The emitted server:

- uses the SDK's `McpServer` over `StreamableHTTPServerTransport` in **stateless mode** — real `initialize` / `tools/list` / `tools/call`, no bespoke JSON-RPC, no sessions;
- is an **OAuth 2.1 resource server** (MCP Authorization spec): publishes Protected Resource Metadata (RFC 9728), challenges with `WWW-Authenticate`, and validates that every token's `aud` names this server (RFC 8707 audience binding);
- **never forwards the caller's token upstream** — the upstream API credential is a separate secret (no confused-deputy);
- validates tool inputs with **zod**, binds **loopback** by default, and checks **Origin / Host** (DNS-rebinding).

> The protocol wire version is whatever the installed SDK negotiates (currently `2025-11-25`, moving to `2026-07-28` as the SDK lands it). Bump the SDK to move the wire version — no regeneration needed.

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

- **Official MCP SDK**: generated servers depend on `@modelcontextprotocol/sdk` and speak the real protocol — no hand-rolled JSON-RPC.
- **Stateless Streamable HTTP**: a fresh server + transport per request (`sessionIdGenerator: undefined`); runs behind a plain load balancer.
- **OAuth 2.1 resource server**: Protected Resource Metadata (RFC 9728), `WWW-Authenticate` challenges, JWT signature/issuer/expiry validation via `jose`, and RFC 8707 audience binding.
- **No token passthrough**: upstream credential is a separate env secret by default; `passthrough` is an explicit, warned opt-in.
- **zod input validation**: each tool's arguments are validated against a schema derived from the OpenAPI operation.
- **Loopback + DNS-rebinding defense**: binds `127.0.0.1` by default and validates `Origin` / `Host`.
- **Provider-based mapping**: providers (Stripe, PayPal) contribute tool names/annotations; the secure server is generated centrally — every provider gets the identical hardened server.

## Generate a server

```sh
npm run generate -- \
  --spec ./openapi.json \
  --output ./my-mcp-server \
  --provider stripe \
  --name my-mcp \
  --resource-uri https://mcp.example.com/mcp \
  --auth-server https://auth.example.com/realms/plane \
  --upstream-auth env-credential
```

Then in the generated server: `npm install && npm run build && npm start`.
Configure it at runtime via env: `MCP_RESOURCE_URI`, `MCP_AUTHORIZATION_SERVERS`,
`MCP_JWKS_URI`, `MCP_REQUIRED_SCOPES`, `UPSTREAM_API_KEY`, `PORT`, `HOST`, `ALLOWED_ORIGINS`.

### Key flags

| Flag | Meaning |
|---|---|
| `--resource-uri` | Canonical server URI = the required token audience (RFC 8707) |
| `--auth-server` | Authorization server issuer URL(s) advertised in Protected Resource Metadata |
| `--jwks-uri` | JWKS for token signature validation (defaults from `--auth-server`) |
| `--required-scope` | Scope(s) the server enforces (403 on shortfall) |
| `--upstream-auth` | `none` \| `env-credential` (default) \| `passthrough` (discouraged) |

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