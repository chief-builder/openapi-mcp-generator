# Generated Server Testing

The project uses three test layers for generated MCP servers.

## Unit And Integration Tests

```bash
npm test
```

This runs parser, provider, generator, template, CLI, and generated-source shape tests. It also verifies that the compiled CLI can generate a project from the packaged templates.

To run only integration tests:

```bash
npm run test:integration
```

## Runtime Smoke Test

```bash
npm run test:e2e
```

The runtime test generates a temporary project, installs its dependencies, builds it, starts local JWKS and MCP servers, and verifies authentication, audience and scope enforcement, Origin checks, tool listing, tool calls, and the generated authorization hook.

## Red-Team Harness

```bash
npm run test:red-team
```

The red-team harness adds malformed and expired tokens, wrong issuer and audience, hidden-tool access, Host rejection, body limits, unsupported methods, and upstream credential-separation checks. See the [red-team runbook](../../../docs/RED-TEAM-WEEKEND.md) for the full checklist.

Both runtime scripts use temporary directories and local services. They may require registry access when installing dependencies for the generated project. They do not require real Stripe or PayPal credentials.
