# Transport Security

This document describes the security controls emitted into generated servers by the current generator.

Generated servers are Express applications that expose MCP over stateless Streamable HTTP at `POST /mcp`. They are designed to be OAuth 2.1 resource servers, not authorization servers and not upstream API credential brokers.

## Request Flow

1. Express parses JSON request bodies with a `1mb` limit.
2. `securityGuard` validates `Host` and `Origin`.
3. `requireBearerAuth` validates the bearer token.
4. Per-tool scope middleware checks `x-mcp-scope` for `tools/call`.
5. A fresh `McpServer` and `StreamableHTTPServerTransport` handle the request.
6. Tool handlers call the upstream REST API using the configured upstream auth mode.

## Bind Address

Generated servers bind to loopback by default:

```bash
HOST=127.0.0.1
```

When `HOST` is `127.0.0.1`, the generated guard rejects unexpected `Host` headers unless `ALLOWED_ORIGINS` is configured. This reduces DNS-rebinding exposure for local servers.

To expose a server beyond loopback, set `HOST` explicitly and put the process behind a production reverse proxy:

```bash
HOST=0.0.0.0
PUBLIC_BASE_URL=https://mcp.example.com
```

Use HTTPS at the proxy or hosting layer.

## Origin Guard

Browser requests with an `Origin` header must match `ALLOWED_ORIGINS`.

```bash
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

Default behavior is intentionally restrictive: no browser origins are allowed unless configured.

## OAuth Resource Server Controls

Generated servers publish Protected Resource Metadata:

```text
GET /.well-known/oauth-protected-resource
```

Token validation checks:

- JWT signature using `MCP_JWKS_URI`;
- issuer using `MCP_ISSUER` or the first `MCP_AUTHORIZATION_SERVERS` entry;
- expiry through JWT verification;
- audience using `MCP_RESOURCE_URI`.

Required variables for a deployable protected server:

```bash
MCP_RESOURCE_URI=https://mcp.example.com/mcp
MCP_AUTHORIZATION_SERVERS=https://auth.example.com
MCP_JWKS_URI=https://auth.example.com/.well-known/jwks.json
PUBLIC_BASE_URL=https://mcp.example.com
```

Optional baseline scopes:

```bash
MCP_REQUIRED_SCOPES=payments.read,payments.write
```

## Per-Tool Authorization

OpenAPI operation extensions are carried into generated tool descriptors:

```json
{
  "operationId": "captureOrder",
  "x-mcp-scope": "orders.capture",
  "x-mcp-group": "payments-admin"
}
```

`x-mcp-scope` is enforced on `tools/call`. If the caller lacks the tool scope, the server returns `403 insufficient_scope` and includes the needed scope in `WWW-Authenticate`.

`x-mcp-group` controls visibility. Tools with a required group are only registered for callers whose validated token contains that group in the configured groups claim. The claim defaults to `groups` and can be changed at generation time with `--groups-claim`.

Use `--authz-hook` when authorization depends on validated claims or argument values beyond scopes and groups. The generator emits `src/authz-hook.ts` with a pass-through implementation; deployments must replace it with their policy and test rejection behavior before relying on it as a control.

## Upstream Authentication

The generated server separates MCP caller identity from upstream API credentials.

Modes:

| Mode | Behavior |
|---|---|
| `env-credential` | Default. Uses `UPSTREAM_API_KEY` as `Authorization: Bearer <key>` for upstream calls. |
| `none` | Sends no upstream authorization header. |
| `passthrough` | Forwards the caller's bearer token upstream. Discouraged unless the upstream API intentionally accepts the same resource token. |

Default mode:

```bash
UPSTREAM_API_KEY=upstream_secret
```

Passthrough can be selected with `--upstream-auth passthrough` or `--allow-token-passthrough`; the CLI prints a warning because this can create confused-deputy risk.

## Method Surface

Generated servers support:

```text
POST /mcp
GET /.well-known/oauth-protected-resource
```

Generated servers reject:

```text
GET /mcp
DELETE /mcp
```

The generated transport is stateless. There is no server-side session teardown endpoint and no server-initiated stream.

## Deployment Checklist

- Set `PUBLIC_BASE_URL` to the externally reachable HTTPS origin.
- Set `MCP_RESOURCE_URI` to the exact audience your authorization server issues.
- Set `MCP_AUTHORIZATION_SERVERS`, `MCP_JWKS_URI`, and, when needed, `MCP_ISSUER`.
- Keep `upstream-auth` as `env-credential` unless token passthrough is a deliberate resource-server design.
- Set `UPSTREAM_API_KEY` through your secret manager.
- Configure `ALLOWED_ORIGINS` only for browser clients that must call the server directly.
- Prefer loopback binding behind a reverse proxy when possible.
- Run generated servers on Node 20 or newer.
