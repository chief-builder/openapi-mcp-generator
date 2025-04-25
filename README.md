# OpenAPI MCP Generator

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

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
- **Stripe Integration**: Built-in support for the Stripe API

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/openapi-mcp-generator.git
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
│ Stripe Provider│ Other Provider│ Custom       │ Your        │
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

| Provider | Description                        | Status      |
|----------|------------------------------------|-------------|
| Stripe   | Stripe Payments API                | Implemented |
| Generic  | Generic OpenAPI provider           | Planned     |
| Custom   | Support for custom implementations | Supported   |

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
│   │   └── utils        # Utility functions
│   ├── providers        # API providers
│   │   └── stripe       # Stripe API implementation
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

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run Stripe functional test
npm run test:functional
```

## Customizing Generated Servers

The generated servers can be customized in several ways:

1. **Modify templates**: Edit template files in `src/core/templates/` or provider-specific templates
2. **Add custom prompts**: Create custom prompts in the provider implementation
3. **Extend the generated code**: Add additional functionality to generated servers

## License

This project is licensed under the MIT License - see the LICENSE file for details.