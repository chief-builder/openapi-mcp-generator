# Red Team Weekend

This runbook turns the generated-server threat model into a repeatable local exercise. It does not require real Stripe or PayPal credentials.

## Goals

- Validate the generated MCP server security boundary with local mock services.
- Find auth, transport, parser, and upstream-routing failures before release.
- Produce findings with repro steps and regression-test recommendations.

## Baseline

Run these first:

```bash
npm run build
npm test
npm run test:e2e
npm run test:red-team
```

`npm run test:red-team` generates a temporary server, boots a local JWKS issuer and local upstream API, and checks:

- missing, malformed, expired, wrong-issuer, and wrong-audience tokens;
- baseline scope enforcement;
- loopback Host and browser Origin rejection;
- oversized body rejection;
- unsupported method rejection;
- `x-mcp-group` tool visibility;
- direct hidden-tool calls;
- per-tool `x-mcp-scope` enforcement;
- upstream credential separation.

## Recording A Baseline

Run all baseline commands against the commit being reviewed, then record the commit, environment, command results, confirmed findings, and unresolved manual checks in [red-team-findings.md](./red-team-findings.md). Do not treat an older report as evidence for the current commit.

The [HTML report](./red-team-weekend-report.html) is an archived July 2026 snapshot retained as an example of a completed report.

## Manual Attack Checklist

Use the automated harness as the safety net, then add targeted probes for anything suspicious.

### OAuth And Metadata

- Tokens with empty, duplicated, huge, or strangely formatted `scope` claims.
- Tokens with `scope` as string and array.
- Tokens with missing `kid`, unknown `kid`, wrong algorithm, expired `exp`, future `nbf`, wrong `iss`, and wrong `aud`.
- Unreachable or empty JWKS endpoint.
- Protected Resource Metadata shape and `WWW-Authenticate` challenges.

### Tool Authorization

- `tools/list` with and without required groups.
- Direct `tools/call` to a hidden tool by name.
- Required tool scope missing, partially matching, case-mismatched, comma-delimited, and whitespace-padded.
- Custom `--groups-claim` values with string, array, missing, and malformed claims.
- `--authz-hook` generation and hook failure behavior.

### Transport

- Host headers: `localhost`, `127.0.0.1`, `[::1]`, external host, host with port, malformed host.
- Origin headers: absent, allowed, disallowed, `null`, mixed-case, and trailing slash.
- Unsupported methods on `/mcp`.
- Invalid JSON, oversized JSON, wrong content type, batch JSON-RPC payloads, missing `id`, and invalid `params`.

### Upstream Routing

- Confirm `env-credential` mode uses only `UPSTREAM_API_KEY`.
- Confirm caller bearer tokens are never forwarded unless the server was generated in `passthrough` mode.
- Path parameter encoding for slashes, spaces, `%2F`, unicode, and repeated values.
- Query parameter metacharacters and repeated values.
- Request body routing for extra args, nested objects, arrays, booleans, numbers, nulls, and unsupported content types.
- Upstream non-JSON responses, 4xx/5xx responses, timeouts, and connection failures.

### Malicious OpenAPI Specs

- Duplicate operation IDs and duplicate generated tool names.
- Operation IDs with quotes, backticks, newlines, TypeScript keywords, path traversal strings, and unicode.
- Path templates with repeated params, missing params, malformed braces, and query-like path segments.
- Deep schemas, huge enums, unsupported content types, and placeholder `$ref` parameters.
- `x-mcp-scope` and `x-mcp-group` values containing quotes, commas, whitespace, and control characters.

## Triage

Use [red-team-findings.md](./red-team-findings.md) for results.

Severity guide:

- Critical: auth bypass, caller token forwarded upstream by default, generated code injection, secret leakage.
- High: scope/group bypass, Host/Origin bypass, dangerous upstream routing.
- Medium: denial of service, unsupported specs crashing generation, misleading error behavior.
- Low: diagnostics, documentation, warnings, or auditability gaps.

Every confirmed finding needs:

- affected area;
- exact repro command or request;
- expected behavior;
- actual behavior;
- suggested fix;
- regression test location.
