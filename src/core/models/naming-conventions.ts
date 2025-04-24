/**
 * Naming Conventions
 * 
 * This file defines standardized naming conventions for the OpenAPI MCP Generator.
 */

/**
 * File and Directory Naming
 * 
 * - Use kebab-case for all file and directory names
 * - Descriptive, function-based file names
 * - Group related files in descriptive directories
 * 
 * Examples:
 * - src/core/generator/mcp-generator.ts
 * - src/core/models/generator-types.ts
 * - src/providers/stripe/handler-generator.ts
 */

/**
 * Class and Interface Naming
 * 
 * - Use PascalCase for all class and interface names
 * - Prefix interfaces with 'I' for distinguishability 
 * - Add descriptive suffixes based on functionality
 * - Consistent casing for acronyms (e.g. MCP, not Mcp)
 * 
 * Examples:
 * - MCPGenerator, not McpGenerator or Mcp_Generator
 * - IProvider, not Provider for interfaces
 * - StripeHandlerGenerator, OpenAPIParser
 */

/**
 * Method and Variable Naming
 * 
 * - Use camelCase for methods and variables
 * - Use descriptive verb-noun combinations for methods
 * - Use nouns or descriptive adjective-noun combinations for variables
 * - Boolean variables should use 'is', 'has', or 'should' prefixes
 * 
 * Examples:
 * - generateServerImplementation(), not GenerateServerImplementation()
 * - parseSpecification(), not ParseSpec()
 * - isAuthenticated, not authenticated
 * - hasCustomAuth, not customAuth
 */

/**
 * Type Naming
 * 
 * - Use PascalCase for all custom types, including enums
 * - Use descriptive names that indicate the type's purpose
 * - Suffix type aliases with 'Type' when needed for clarity
 * 
 * Examples:
 * - ParsedSpec, not parsedSpec or PARSED_SPEC
 * - HandlerGenerationOptions, not handlerGenOptions
 * - MCPCapabilityType, not MCPCapabilityTypes
 */

/**
 * Constant Naming
 * 
 * - Use camelCase for simple constants
 * - Use SCREAMING_SNAKE_CASE for magic values and configuration constants
 * - Use PascalCase for complex constant objects that resemble types
 * 
 * Examples:
 * - defaultPort = 8080
 * - DEFAULT_API_VERSION = '2023-10-16'
 * - StripeResourceMap = { ... } (for exported complex constants)
 */

/**
 * Namespace Naming
 * 
 * - Use PascalCase for namespaces
 * - Keep namespace names short and descriptive
 * 
 * Examples:
 * - namespace OpenAPI { ... }
 * - namespace Stripe { ... }
 */

/**
 * Utility Functions
 * 
 * Utility functions for working with names
 */

/**
 * Convert kebab-case to PascalCase
 * 
 * @param kebabCase kebab-case string
 * @returns PascalCase string
 */
export function kebabToPascalCase(kebabCase: string): string {
  if (!kebabCase) return '';
  return kebabCase
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Convert camelCase to kebab-case
 * 
 * @param camelCase camelCase string
 * @returns kebab-case string
 */
export function camelToKebabCase(camelCase: string): string {
  if (!camelCase) return '';
  return camelCase
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert PascalCase to kebab-case
 * 
 * @param pascalCase PascalCase string
 * @returns kebab-case string
 */
export function pascalToKebabCase(pascalCase: string): string {
  if (!pascalCase) return '';
  return pascalCase
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * Convert snake_case to camelCase
 * 
 * @param snakeCase snake_case string
 * @returns camelCase string 
 */
export function snakeToCamelCase(snakeCase: string): string {
  if (!snakeCase) return '';
  return snakeCase
    .toLowerCase()
    .replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Convert snake_case to PascalCase
 * 
 * @param snakeCase snake_case string
 * @returns PascalCase string
 */
export function snakeToPascalCase(snakeCase: string): string {
  if (!snakeCase) return '';
  return snakeCase
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Format a server class name
 * 
 * @param name Base name for server
 * @returns Properly formatted class name
 */
export function formatServerClassName(name: string): string {
  return `${kebabToPascalCase(name)}Server`;
}

/**
 * Format a provider interface name
 * 
 * @param name Base name for provider
 * @returns Properly formatted interface name
 */
export function formatProviderInterfaceName(name: string): string {
  return `I${kebabToPascalCase(name)}Provider`;
}

/**
 * Format a resource name to file name
 * 
 * @param resourceName Name of the resource
 * @returns File name in kebab-case
 */
export function formatResourceFileName(resourceName: string): string {
  return camelToKebabCase(resourceName);
}