# Standardized Naming Conventions

We have implemented standardized naming conventions across the codebase to improve code consistency, readability, and maintainability. This document outlines the conventions adopted.

## Conventions Implemented

### Interface Naming
- All interfaces use an 'I' prefix (e.g., `IProvider` instead of `Provider`)
- Interface names use PascalCase
- Generic interfaces indicate their purpose in the name (e.g., `IMCPGeneratorConfig`)

### Method Naming
- Methods use camelCase with verb-noun structure
- Methods should have improved semantic meaning (e.g., `registerProvider` instead of `register`)
- Getter/setter methods follow `getX`/`setX` convention

### Class Naming
- Classes use PascalCase
- Base classes are suffixed with "Base" (e.g., `MCPServerBase`)
- Implementation classes should have clear naming (e.g., `StripeResourceHelperImpl`)

### File and Directory Naming
- Files use kebab-case (e.g., `parameter-mapper.ts`)
- Related files are grouped in descriptive directories

### Function Naming
- Utility functions use descriptive camelCase names
- Conversion functions clearly indicate the transformation (e.g., `kebabToPascalCase`)

## Naming Convention Utilities

The module `/src/core/models/naming-conventions.ts` provides useful utility functions for consistent naming:

- `kebabToPascalCase(str)`: Converts kebab-case to PascalCase
- `camelToKebabCase(str)`: Converts camelCase to kebab-case
- `pascalToKebabCase(str)`: Converts PascalCase to kebab-case
- `snakeToCamelCase(str)`: Converts snake_case to camelCase
- `snakeToPascalCase(str)`: Converts snake_case to PascalCase
- `formatServerClassName(name)`: Formats a server class name
- `formatProviderInterfaceName(name)`: Formats a provider interface name
- `formatResourceFileName(name)`: Formats a resource name to a file name

## Benefits

The implementation of these naming conventions provides several benefits:

1. **Better Code Readability**: Consistent naming makes the code easier to read and understand
2. **Improved Code Navigation**: Clear naming patterns make it easier to find related code
3. **Enhanced Type Safety**: Interface naming makes types more explicit
4. **Better Maintainability**: Consistent conventions reduce cognitive load when maintaining code
5. **Easier Onboarding**: New developers can more quickly understand the codebase