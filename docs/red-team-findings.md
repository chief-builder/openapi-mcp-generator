# Red Team Findings

Use this file during a red-team run. Keep confirmed issues separate from probes that behaved correctly.

## Run Metadata

- Date: 2026-07-09 19:44:14 EDT
- Commit: 2bccdf3
- Operator: Codex
- Commands:
  - `npm run build` - passed
  - `npm test` - passed, 23 suites / 258 tests
  - `npm run test:e2e` - passed, `e2e: ALL GREEN`
  - `npm run test:red-team` - passed, `red-team: ALL GREEN`

## Confirmed Findings

- None from the automated weekend baseline.

## Probes That Passed

- Missing token: rejected with 401.
- Malformed token: rejected with 401.
- Expired token: rejected with 401.
- Wrong issuer: rejected with 401.
- Wrong audience: rejected with 401.
- Missing baseline scope: rejected with 403.
- Disallowed Origin: rejected with 403.
- External Host: rejected with 421 on loopback bind.
- Group-hidden tool: hidden from `tools/list` without the required group.
- Direct hidden-tool call: did not reach upstream.
- Under-scoped tool call: rejected with `insufficient_scope`.
- Authorized group and scope: `adminWrite` succeeded.
- Upstream credential separation: upstream received `UPSTREAM_API_KEY`, not caller bearer token.
- Oversized JSON body: rejected with 413.
- Unsupported methods: `GET /mcp` and `DELETE /mcp` rejected with 405.

## Open Questions

- Manual checklist probes remain available for deeper weekend coverage beyond the automated baseline, especially custom `--groups-claim`, `--authz-hook`, malformed JWKS availability, and non-JSON upstream failure behavior.

## Report

- Standalone process and value report: [red-team-weekend-report.html](./red-team-weekend-report.html)
