/**
 * Tests for StringUtils
 */

import * as StringUtils from '../core/utils/string-utils';

describe('StringUtils', () => {
  describe('capitalize', () => {
    test('should capitalize first letter', () => {
      expect(StringUtils.capitalize('hello')).toBe('Hello');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.capitalize('')).toBe('');
    });
    
    test('should handle already capitalized string', () => {
      expect(StringUtils.capitalize('Hello')).toBe('Hello');
    });
    
    test('should handle single letter', () => {
      expect(StringUtils.capitalize('a')).toBe('A');
    });
    
    test('should not affect other letters', () => {
      expect(StringUtils.capitalize('helloWorld')).toBe('HelloWorld');
    });
  });

  describe('toCamelCase', () => {
    test('should convert hyphenated string to camelCase', () => {
      expect(StringUtils.toCamelCase('hello-world')).toBe('helloWorld');
    });
    
    test('should convert underscore string to camelCase', () => {
      expect(StringUtils.toCamelCase('hello_world')).toBe('helloWorld');
    });
    
    test('should convert space-separated string to camelCase', () => {
      expect(StringUtils.toCamelCase('hello world')).toBe('helloWorld');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.toCamelCase('')).toBe('');
    });
    
    test('should convert PascalCase to camelCase', () => {
      expect(StringUtils.toCamelCase('HelloWorld')).toBe('helloWorld');
    });
    
    test('should handle multiple separators', () => {
      expect(StringUtils.toCamelCase('hello_world-test string')).toBe('helloWorldTestString');
    });
  });

  describe('toPascalCase', () => {
    test('should convert hyphenated string to PascalCase', () => {
      expect(StringUtils.toPascalCase('hello-world')).toBe('HelloWorld');
    });
    
    test('should convert underscore string to PascalCase', () => {
      expect(StringUtils.toPascalCase('hello_world')).toBe('HelloWorld');
    });
    
    test('should convert space-separated string to PascalCase', () => {
      expect(StringUtils.toPascalCase('hello world')).toBe('HelloWorld');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.toPascalCase('')).toBe('');
    });
    
    test('should keep PascalCase as is', () => {
      expect(StringUtils.toPascalCase('HelloWorld')).toBe('HelloWorld');
    });
    
    test('should convert camelCase to PascalCase', () => {
      expect(StringUtils.toPascalCase('helloWorld')).toBe('HelloWorld');
    });
  });

  describe('toKebabCase', () => {
    test('should convert camelCase to kebab-case', () => {
      expect(StringUtils.toKebabCase('helloWorld')).toBe('hello-world');
    });
    
    test('should convert PascalCase to kebab-case', () => {
      expect(StringUtils.toKebabCase('HelloWorld')).toBe('hello-world');
    });
    
    test('should convert snake_case to kebab-case', () => {
      expect(StringUtils.toKebabCase('hello_world')).toBe('hello-world');
    });
    
    test('should convert space-separated string to kebab-case', () => {
      expect(StringUtils.toKebabCase('hello world')).toBe('hello-world');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.toKebabCase('')).toBe('');
    });
    
    test('should handle multiple uppercase letters in a row', () => {
      expect(StringUtils.toKebabCase('helloWORLD')).toBe('hello-world');
    });
  });

  describe('toSnakeCase', () => {
    test('should convert camelCase to snake_case', () => {
      expect(StringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
    });
    
    test('should convert PascalCase to snake_case', () => {
      expect(StringUtils.toSnakeCase('HelloWorld')).toBe('hello_world');
    });
    
    test('should convert kebab-case to snake_case', () => {
      expect(StringUtils.toSnakeCase('hello-world')).toBe('hello_world');
    });
    
    test('should convert space-separated string to snake_case', () => {
      expect(StringUtils.toSnakeCase('hello world')).toBe('hello_world');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.toSnakeCase('')).toBe('');
    });
  });

  describe('kebabToCamelCase', () => {
    test('should convert kebab-case to camelCase', () => {
      expect(StringUtils.kebabToCamelCase('hello-world')).toBe('helloWorld');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.kebabToCamelCase('')).toBe('');
    });
    
    test('should handle single word', () => {
      expect(StringUtils.kebabToCamelCase('hello')).toBe('hello');
    });
  });

  describe('singularize', () => {
    test('should handle words ending in "s"', () => {
      expect(StringUtils.singularize('cars')).toBe('car');
    });
    
    test('should handle words ending in "es"', () => {
      expect(StringUtils.singularize('classes')).toBe('class');
    });
    
    test('should handle words ending in "ies"', () => {
      expect(StringUtils.singularize('cities')).toBe('city');
    });
    
    test('should not change singular words', () => {
      expect(StringUtils.singularize('car')).toBe('car');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.singularize('')).toBe('');
    });
    
    test('should not change words ending in "ss"', () => {
      expect(StringUtils.singularize('bliss')).toBe('bliss');
    });
  });

  describe('pluralize', () => {
    test('should add "s" to most words', () => {
      expect(StringUtils.pluralize('car')).toBe('cars');
    });
    
    test('should add "es" to words ending in "s", "x", "z", "ch", "sh"', () => {
      expect(StringUtils.pluralize('class')).toBe('classes');
      expect(StringUtils.pluralize('box')).toBe('boxes');
      expect(StringUtils.pluralize('buzz')).toBe('buzzes');
      expect(StringUtils.pluralize('match')).toBe('matches');
      expect(StringUtils.pluralize('brush')).toBe('brushes');
    });
    
    test('should handle words ending in "y"', () => {
      expect(StringUtils.pluralize('city')).toBe('cities');
    });
    
    test('should not change words ending in "ay", "ey", "oy"', () => {
      expect(StringUtils.pluralize('day')).toBe('days');
      expect(StringUtils.pluralize('key')).toBe('keys');
      expect(StringUtils.pluralize('boy')).toBe('boys');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.pluralize('')).toBe('');
    });
  });

  describe('formatAsTitle', () => {
    test('should format camelCase as title', () => {
      expect(StringUtils.formatAsTitle('helloWorld')).toBe('Hello World');
    });
    
    test('should format snake_case as title', () => {
      expect(StringUtils.formatAsTitle('hello_world')).toBe('Hello World');
    });
    
    test('should format kebab-case as title', () => {
      expect(StringUtils.formatAsTitle('hello-world')).toBe('Hello World');
    });
    
    test('should handle empty string', () => {
      expect(StringUtils.formatAsTitle('')).toBe('');
    });
    
    test('should handle multiple spaces and separators', () => {
      expect(StringUtils.formatAsTitle('hello_world-test  string')).toBe('Hello World Test String');
    });
  });
});