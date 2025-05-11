/**
 * String utility functions for consistent string manipulation
 */

// Import naming conventions but don't re-export them to avoid conflicts
import {
  kebabToPascalCase as _kebabToPascalCase,
  camelToKebabCase as _camelToKebabCase,
  pascalToKebabCase as _pascalToKebabCase,
  snakeToCamelCase as _snakeToCamelCase,
  snakeToPascalCase as _snakeToPascalCase,
  formatServerClassName as _formatServerClassName
} from '../models/naming-conventions';

/**
 * Capitalize the first letter of a string
 * 
 * @param str String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to camelCase
 * 
 * @param str String to convert
 * @returns camelCase string
 */
export function toCamelCase(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

/**
 * Convert a string to PascalCase
 * 
 * @param str String to convert
 * @returns PascalCase string
 */
export function toPascalCase(str: string): string {
  if (!str) return '';
  
  return capitalize(toCamelCase(str));
}

/**
 * Convert a string to kebab-case
 * 
 * @param str String to convert
 * @returns kebab-case string
 */
export function toKebabCase(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Convert a string to snake_case
 * 
 * @param str String to convert
 * @returns snake_case string
 */
export function toSnakeCase(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 *
 * @param str kebab-case string
 * @returns camelCase string
 */
export function kebabToCamelCase(str: string): string {
  if (!str) return '';

  // Use the internal implementation to avoid dependency on imported functions
  const segments = str.split('-').map(capitalize);
  const pascal = segments.join('');
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a string to singular form (simple implementation)
 *
 * @param str String to convert
 * @returns Singular form of the string
 */
export function singularize(str: string): string {
  if (!str) return '';

  // Simple implementation for common plurals
  // In a real-world app, consider using a library like pluralize
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  } else if (str.endsWith('es')) {
    return str.slice(0, -2);
  } else if (str.endsWith('s') && !str.endsWith('ss')) {
    return str.slice(0, -1);
  }

  // If already singular, return as is
  return str;
}

/**
 * Convert a string to plural form (simple implementation)
 * 
 * @param str String to convert
 * @returns Plural form of the string
 */
export function pluralize(str: string): string {
  if (!str) return '';
  
  // Simple implementation for common singulars
  // In a real-world app, consider using a library like pluralize
  if (str.endsWith('y') && !str.endsWith('ay') && !str.endsWith('ey') && !str.endsWith('oy')) {
    return str.slice(0, -1) + 'ies';
  } else if (str.endsWith('s') || str.endsWith('x') || str.endsWith('z') || str.endsWith('ch') || str.endsWith('sh')) {
    return str + 'es';
  } else {
    return str + 's';
  }
}

/**
 * Format a string as a title (e.g., "get_users" becomes "Get Users")
 * 
 * @param str String to format
 * @returns Formatted title
 */
export function formatAsTitle(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}