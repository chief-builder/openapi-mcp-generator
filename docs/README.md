# Documentation

## User Guides

- [Project README](../README.md): installation, generation, configuration, provider status, and OpenAPI support.
- [Transport Security](./TRANSPORT-SECURITY.md): generated request flow, OAuth validation, deployment controls, and upstream credential handling.

## Testing And Security Review

- [Generated Server Testing](../src/test/functional/README.md): current automated test commands and what each layer covers.
- [Red Team Runbook](./RED-TEAM-WEEKEND.md): automated baseline and manual attack checklist.
- [Red Team Findings](./red-team-findings.md): reusable run record for confirmed findings and passed probes.
- [Archived Red Team Report](./red-team-weekend-report.html): historical snapshot from July 2026. It is not the current test status.

## Development

- [Naming Conventions](../NAMING-CONVENTIONS.md): conventions used by the existing TypeScript codebase.

Stripe and PayPal are experimental providers. Their fixtures and provider-specific tests do not establish production compatibility with either upstream API.
