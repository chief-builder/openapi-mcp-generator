# MCP Transport Security Guide

This document describes the security features of the MCP transport layer and provides guidelines for secure implementation.

## Table of Contents

- [Introduction](#introduction)
- [Security Features](#security-features)
  - [Localhost Binding](#localhost-binding)
  - [CORS Protection](#cors-protection)
  - [Request Size Limiting](#request-size-limiting)
  - [Rate Limiting](#rate-limiting)
  - [Content Type Validation](#content-type-validation)
  - [Request Timeout](#request-timeout)
- [Security Configuration](#security-configuration)
- [Examples](#examples)
  - [Basic Secure Configuration](#basic-secure-configuration)
  - [Production Configuration](#production-configuration)
  - [Development Configuration](#development-configuration)
- [Security Best Practices](#security-best-practices)

## Introduction

The MCP transport layer is responsible for the communication between clients and MCP servers. It provides security features to protect against common web vulnerabilities and attacks, such as cross-site request forgery (CSRF), distributed denial of service (DDoS), and request smuggling.

## Security Features

### Localhost Binding

By default, MCP servers are bound to localhost (127.0.0.1) only, preventing direct access from the network. This is a security measure to ensure that only local clients can connect to the server.

To expose the server to the network, you must explicitly disable localhost binding:

```typescript
const config = {
  // ... other configuration
  security: {
    bindToLocalhost: false // Not recommended for production
  }
};
```

### CORS Protection

Cross-Origin Resource Sharing (CORS) is a security feature that controls which web origins are allowed to access the MCP server. By default, only localhost origins are allowed.

To configure allowed origins:

```typescript
const config = {
  // ... other configuration
  security: {
    allowedOrigins: [
      'http://localhost:3000',
      'https://example.com'
    ]
  }
};
```

**Warning:** Setting `allowedOrigins` to `['*']` allows all origins and is not recommended for production use.

### Request Size Limiting

To prevent denial of service attacks and resource exhaustion, the MCP server limits the size of request bodies. The default limit is 1 MB.

To configure the request size limit:

```typescript
const config = {
  // ... other configuration
  security: {
    maxRequestBodySize: 2 * 1024 * 1024 // 2 MB
  }
};
```

### Rate Limiting

Rate limiting protects against abuse and DoS attacks by limiting the number of requests that can be made in a time window. The default limit is 100 requests per minute.

To configure rate limiting:

```typescript
const config = {
  // ... other configuration
  security: {
    rateLimit: {
      maxRequestsPerMinute: 200, // Increase the limit
      windowMs: 60000 // 1 minute window
    }
  }
};
```

### Content Type Validation

The MCP server validates that requests use the correct content type (`application/json`) to prevent content type mismatch attacks. This validation is enabled by default.

To disable content type validation (not recommended):

```typescript
const config = {
  // ... other configuration
  security: {
    validateContentType: false // Not recommended
  }
};
```

### Request Timeout

To prevent resource exhaustion from long-running requests, the MCP server applies a timeout to each request. The default timeout is 30 seconds.

To configure the request timeout:

```typescript
const config = {
  // ... other configuration
  security: {
    requestTimeoutMs: 60000 // 60 seconds
  }
};
```

## Security Configuration

The security configuration is specified in the server configuration object:

```typescript
import { IMCPServerConfig } from './mcp-types';

const config: IMCPServerConfig = {
  serverName: 'My MCP Server',
  serverVersion: '1.0.0',
  transport: 'http',
  httpPort: 8080,
  security: {
    bindToLocalhost: true,
    allowedOrigins: ['http://localhost:3000'],
    maxRequestBodySize: 1048576, // 1 MB
    requestTimeoutMs: 30000, // 30 seconds
    validateContentType: true,
    rateLimit: {
      maxRequestsPerMinute: 100,
      windowMs: 60000 // 1 minute
    }
  }
};
```

## Examples

### Basic Secure Configuration

This configuration provides good security for most use cases:

```typescript
const config = {
  serverName: 'My MCP Server',
  serverVersion: '1.0.0',
  transport: 'http',
  httpPort: 8080,
  security: {
    // Use default security settings
  }
};
```

### Production Configuration

For production environments with multiple frontends:

```typescript
const config = {
  serverName: 'Production MCP Server',
  serverVersion: '1.0.0',
  transport: 'http',
  httpPort: 8080,
  security: {
    bindToLocalhost: false, // Allow network access (use reverse proxy)
    allowedOrigins: [
      'https://app.example.com',
      'https://admin.example.com'
    ],
    maxRequestBodySize: 5 * 1024 * 1024, // 5 MB
    requestTimeoutMs: 60000, // 60 seconds
    rateLimit: {
      maxRequestsPerMinute: 300,
      windowMs: 60000 // 1 minute
    }
  }
};
```

### Development Configuration

For local development:

```typescript
const config = {
  serverName: 'Dev MCP Server',
  serverVersion: '1.0.0',
  transport: 'http',
  httpPort: 8080,
  security: {
    bindToLocalhost: true,
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:8000',
      'http://127.0.0.1:*'
    ],
    maxRequestBodySize: 10 * 1024 * 1024, // 10 MB for easier debugging
    requestTimeoutMs: 120000, // 2 minutes for debugging
    rateLimit: {
      maxRequestsPerMinute: 1000 // High limit for development
    }
  }
};
```

## Security Best Practices

1. **Always bind to localhost** unless you need to expose the server to the network.
2. **Use HTTPS** when exposing the server to the network.
3. **Limit allowed origins** to only the domains that need access.
4. **Use a reverse proxy** (like Nginx or Apache) in front of the MCP server for additional security.
5. **Set appropriate rate limits** based on expected usage patterns.
6. **Monitor server logs** for suspicious activity.
7. **Keep dependencies updated** to address security vulnerabilities.
8. **Use authentication** for all tool calls when possible.
9. **Implement consent management** for sensitive operations.
10. **Regularly audit your security configuration** for potential weaknesses.

By following these guidelines, you can secure your MCP server against common attacks and vulnerabilities.