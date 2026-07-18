# Red-Team Findings

Use this file as the run record for the commit currently under review. Replace the placeholders and retain evidence for failures; do not carry an older passing result forward.

## Run Metadata

- Date and timezone: `<YYYY-MM-DD HH:MM TZ>`
- Commit: `<full-or-short-sha>`
- Operator: `<name>`
- Node.js: `<version>`
- Platform: `<platform>`

## Command Results

| Command | Result | Notes |
|---|---|---|
| `npm run build` | Not run | |
| `npm test` | Not run | Record suite and test counts. |
| `npm run test:e2e` | Not run | |
| `npm run test:red-team` | Not run | |
| `npm run lint` | Not run | Record warnings separately from errors. |

## Confirmed Findings

No findings recorded for this run.

For each finding, record:

- severity and affected area;
- exact reproduction steps;
- expected and actual behavior;
- security or correctness impact;
- proposed regression-test location;
- fix status and commit.

## Passed Probes

Record only probes executed for this commit. The automated harness covers token validation, baseline and per-tool scopes, group visibility, Host and Origin checks, request-size limits, unsupported methods, and upstream credential separation.

## Manual Checks Remaining

- `<check or none>`

## Artifacts

- Logs: `<path or link>`
- Screenshots or traces: `<path or link>`

The [archived HTML report](./red-team-weekend-report.html) is an example from July 2026, not evidence for the current commit.
