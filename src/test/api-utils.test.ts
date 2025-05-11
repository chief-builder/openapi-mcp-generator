/**
 * Tests for ApiUtils
 */

import { ApiUtils } from '../core/utils/api-utils';
import { IParsedEndpoint } from '../core/models/parser-types';
import { IMCPSchema } from '../core/models/mcp-types';

describe('ApiUtils', () => {
  // Test data
  const sampleEndpoints: IParsedEndpoint[] = [
    {
      path: '/resources/{id}',
      method: 'GET',
      operationId: 'getResource',
      summary: 'Get a resource',
      description: 'Get a resource by ID',
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'fields',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ],
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      },
      tags: [],
      extensions: {}
    },
    {
      path: '/resources',
      method: 'POST',
      operationId: 'createResource',
      summary: 'Create a resource',
      description: 'Create a new resource',
      parameters: [
        {
          name: 'fields',
          in: 'query',
          required: false,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' }
              },
              required: ['name']
            }
          }
        }
      },
      responses: {
        '201': {
          description: 'Created',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' }
                }
              }
            }
          }
        }
      },
      tags: [],
      extensions: {}
    }
  ];

  describe('extractCommonParameters', () => {
    test('should identify common parameters across endpoints', () => {
      const commonParams = ApiUtils.extractCommonParameters(sampleEndpoints);
      
      // 'fields' appears in both endpoints
      expect(commonParams.size).toBe(1);
      expect(commonParams.get('fields')).toBe('string');
    });
    
    test('should handle empty endpoint list', () => {
      const commonParams = ApiUtils.extractCommonParameters([]);
      expect(commonParams.size).toBe(0);
    });
  });

  describe('normalizePath', () => {
    test('should add leading slash if missing', () => {
      expect(ApiUtils.normalizePath('path/to/resource')).toBe('/path/to/resource');
    });
    
    test('should remove trailing slash', () => {
      expect(ApiUtils.normalizePath('/path/to/resource/')).toBe('/path/to/resource');
    });
    
    test('should not remove trailing slash for root path', () => {
      expect(ApiUtils.normalizePath('/')).toBe('/');
    });
    
    test('should replace multiple slashes with single slash', () => {
      expect(ApiUtils.normalizePath('/path//to///resource')).toBe('/path/to/resource');
    });
    
    test('should trim whitespace', () => {
      expect(ApiUtils.normalizePath('  /path/to/resource  ')).toBe('/path/to/resource');
    });
    
    test('should handle empty path', () => {
      expect(ApiUtils.normalizePath('')).toBe('/');
    });
  });

  describe('determineOperationCategory', () => {
    test('should determine "read" for GET with ID path', () => {
      expect(ApiUtils.determineOperationCategory('/resources/{id}', 'GET')).toBe('read');
    });
    
    test('should determine "list" for GET without ID path', () => {
      expect(ApiUtils.determineOperationCategory('/resources', 'GET')).toBe('list');
    });
    
    test('should determine "create" for POST without ID path', () => {
      expect(ApiUtils.determineOperationCategory('/resources', 'POST')).toBe('create');
    });
    
    test('should determine "action" for POST with ID path', () => {
      expect(ApiUtils.determineOperationCategory('/resources/{id}/action', 'POST')).toBe('action');
    });
    
    test('should determine "update" for PUT', () => {
      expect(ApiUtils.determineOperationCategory('/resources/{id}', 'PUT')).toBe('update');
    });
    
    test('should determine "update" for PATCH', () => {
      expect(ApiUtils.determineOperationCategory('/resources/{id}', 'PATCH')).toBe('update');
    });
    
    test('should determine "delete" for DELETE', () => {
      expect(ApiUtils.determineOperationCategory('/resources/{id}', 'DELETE')).toBe('delete');
    });
  });

  describe('extractResourceName', () => {
    test('should extract resource name from path', () => {
      expect(ApiUtils.extractResourceName('/resources/{id}')).toBe('resources');
    });
    
    test('should handle nested resources', () => {
      expect(ApiUtils.extractResourceName('/api/v1/resources')).toBe('api');
    });
    
    test('should handle empty path', () => {
      expect(ApiUtils.extractResourceName('')).toBe('');
    });
    
    test('should handle root path', () => {
      expect(ApiUtils.extractResourceName('/')).toBe('');
    });
    
    test('should strip template parameters', () => {
      expect(ApiUtils.extractResourceName('/{id}')).toBe('id');
    });
  });

  describe('generateToolDescription', () => {
    test('should use description if available', () => {
      expect(ApiUtils.generateToolDescription(sampleEndpoints[0])).toBe('Get a resource by ID');
    });
    
    test('should use summary if description not available', () => {
      const endpoint = { ...sampleEndpoints[0], description: '' };
      expect(ApiUtils.generateToolDescription(endpoint)).toBe('Get a resource');
    });
    
    test('should generate description for "create" operation', () => {
      const endpoint = { 
        ...sampleEndpoints[1], 
        description: '', 
        summary: '' 
      };
      expect(ApiUtils.generateToolDescription(endpoint)).toBe('Create a new Resourc');
    });
  });

  describe('determineToolAnnotations', () => {
    test('should mark GET operations as read-only', () => {
      const annotations = ApiUtils.determineToolAnnotations(sampleEndpoints[0]);
      expect(annotations.readOnlyHint).toBe(true);
      expect(annotations.destructiveHint).toBe(false);
    });
    
    test('should not mark POST operations as read-only', () => {
      const annotations = ApiUtils.determineToolAnnotations(sampleEndpoints[1]);
      expect(annotations.readOnlyHint).toBe(false);
    });
    
    test('should mark DELETE operations as destructive', () => {
      const deleteEndpoint = {
        ...sampleEndpoints[0],
        method: 'DELETE',
        operationId: 'deleteResource'
      };
      const annotations = ApiUtils.determineToolAnnotations(deleteEndpoint);
      expect(annotations.destructiveHint).toBe(true);
    });
    
    test('should detect destructive operations by keyword', () => {
      const cancelEndpoint = {
        ...sampleEndpoints[0],
        method: 'POST',
        operationId: 'cancelResource'
      };
      const annotations = ApiUtils.determineToolAnnotations(cancelEndpoint);
      expect(annotations.destructiveHint).toBe(true);
    });
    
    test('should mark GET, PUT, DELETE as idempotent', () => {
      // GET
      let annotations = ApiUtils.determineToolAnnotations(sampleEndpoints[0]);
      expect(annotations.idempotentHint).toBe(true);
      
      // PUT
      const putEndpoint = { ...sampleEndpoints[0], method: 'PUT' };
      annotations = ApiUtils.determineToolAnnotations(putEndpoint);
      expect(annotations.idempotentHint).toBe(true);
      
      // DELETE
      const deleteEndpoint = { ...sampleEndpoints[0], method: 'DELETE' };
      annotations = ApiUtils.determineToolAnnotations(deleteEndpoint);
      expect(annotations.idempotentHint).toBe(true);
      
      // POST (not idempotent)
      annotations = ApiUtils.determineToolAnnotations(sampleEndpoints[1]);
      expect(annotations.idempotentHint).toBe(false);
    });
  });

  describe('formatResponseSchema', () => {
    test('should add description if missing', () => {
      const schema: IMCPSchema = {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      };
      
      const formatted = ApiUtils.formatResponseSchema(schema, 'Default Description');
      expect(formatted.description).toBe('Default Description');
    });
    
    test('should not override existing description', () => {
      const schema: IMCPSchema = {
        type: 'object',
        description: 'Existing Description',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      };
      
      const formatted = ApiUtils.formatResponseSchema(schema, 'Default Description');
      expect(formatted.description).toBe('Existing Description');
    });
    
    test('should handle null schema', () => {
      const formatted = ApiUtils.formatResponseSchema(null, 'Default Description');
      expect(formatted).toEqual({
        type: 'object',
        description: 'Default Description'
      });
    });
  });

  describe('convertPathToTemplate', () => {
    test('should convert {param} to ${param}', () => {
      expect(ApiUtils.convertPathToTemplate('/resources/{id}')).toBe('/resources/${id}');
    });
    
    test('should handle multiple parameters', () => {
      expect(ApiUtils.convertPathToTemplate('/resources/{id}/items/{itemId}')).toBe('/resources/${id}/items/${itemId}');
    });
    
    test('should handle empty path', () => {
      expect(ApiUtils.convertPathToTemplate('')).toBe('');
    });
  });

  describe('getFilenameFromUrl', () => {
    test('should extract filename from URL', () => {
      expect(ApiUtils.getFilenameFromUrl('https://example.com/path/to/file.jpg')).toBe('file.jpg');
    });
    
    test('should handle URLs with query parameters', () => {
      expect(ApiUtils.getFilenameFromUrl('https://example.com/path/to/file.jpg?query=param')).toBe('file.jpg');
    });
    
    test('should handle empty URL', () => {
      expect(ApiUtils.getFilenameFromUrl('')).toBe('');
    });
    
    test('should handle URL ending with slash', () => {
      expect(ApiUtils.getFilenameFromUrl('https://example.com/path/to/')).toBe('');
    });
  });
});