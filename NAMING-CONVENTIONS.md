# Naming Conventions

These conventions describe the existing TypeScript codebase. Prefer consistency with the surrounding module over introducing a new naming layer.

## TypeScript Symbols

- Classes, enums, and interfaces use PascalCase.
- Existing interfaces use an `I` prefix, such as `IProvider` and `IGeneratorConfig`.
- Functions, methods, and variables use camelCase.
- Constants use uppercase snake case only for process-wide immutable configuration.
- Boolean names describe the true state, such as `includeDeprecated` or `requiresAuth`.

## Files And Directories

- TypeScript files use kebab-case, such as `openapi-parser.ts`.
- Tests use `<subject>.test.ts` and live under `src/test`.
- Provider code lives under `src/providers/<provider>`.
- Generated-project templates live under `src/core/templates` and end in `.template`.

## Generator Naming Utilities

[`src/core/models/naming-conventions.ts`](./src/core/models/naming-conventions.ts) contains transformations used by providers and generated artifact names:

- `kebabToPascalCase`
- `camelToKebabCase`
- `pascalToKebabCase`
- `snakeToCamelCase`
- `snakeToPascalCase`
- `formatServerClassName`
- `formatProviderInterfaceName`
- `formatResourceFileName`

Use these helpers when the required transformation already exists. Provider-specific public tool naming belongs in the provider mapper rather than in generic string utilities.
