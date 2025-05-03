import { determineToolAnnotations } from '../providers/stripe/parameter-mapper';
import { IParsedEndpoint } from '../core/models/parser-types';

describe('Tool Annotations', () => {
  test('correctly identifies read-only GET operations', () => {
    const operation: IParsedEndpoint = {
      path: '/v1/customers/{id}',
      method: 'GET',
      operationId: 'customers.retrieve',
      summary: 'Get a customer',
      description: 'Retrieves a customer by ID',
      parameters: [],
      responses: {},
      tags: [],
      extensions: {}
    };
    
    const annotations = determineToolAnnotations(operation);
    
    expect(annotations.title).toBe('Retrieve Customer');
    expect(annotations.readOnlyHint).toBe(true);
    expect(annotations.destructiveHint).toBe(false);
    expect(annotations.idempotentHint).toBe(true);
    expect(annotations.openWorldHint).toBe(true);
  });
  
  test('correctly identifies destructive DELETE operations', () => {
    const operation: IParsedEndpoint = {
      path: '/v1/customers/{id}',
      method: 'DELETE',
      operationId: 'customers.delete',
      summary: 'Delete a customer',
      description: 'Deletes a customer',
      parameters: [],
      responses: {},
      tags: [],
      extensions: {}
    };
    
    const annotations = determineToolAnnotations(operation);
    
    expect(annotations.title).toBe('Delete Customer');
    expect(annotations.readOnlyHint).toBe(false);
    expect(annotations.destructiveHint).toBe(true);
    expect(annotations.idempotentHint).toBe(true);
    expect(annotations.openWorldHint).toBe(true);
  });
  
  test('correctly identifies non-destructive POST operations', () => {
    const operation: IParsedEndpoint = {
      path: '/v1/customers',
      method: 'POST',
      operationId: 'customers.create',
      summary: 'Create a customer',
      description: 'Creates a new customer',
      parameters: [],
      responses: {},
      tags: [],
      extensions: {}
    };
    
    const annotations = determineToolAnnotations(operation);
    
    expect(annotations.title).toBe('Create Customer');
    expect(annotations.readOnlyHint).toBe(false);
    expect(annotations.destructiveHint).toBe(false);
    expect(annotations.idempotentHint).toBe(false);
    expect(annotations.openWorldHint).toBe(true);
  });
  
  test('correctly formats tool titles', () => {
    expect(determineToolAnnotations({
      operationId: 'customers.create',
      method: 'POST',
      path: '',
      summary: '',
      description: '',
      parameters: [],
      responses: {},
      tags: [],
      extensions: {}
    }).title).toBe('Create Customer');
    
    expect(determineToolAnnotations({
      operationId: 'payment_intents.confirm',
      method: 'POST',
      path: '',
      summary: '',
      description: '',
      parameters: [],
      responses: {},
      tags: [],
      extensions: {}
    }).title).toBe('Confirm Payment Intent');
    
    expect(determineToolAnnotations({
      operationId: 'createSubscription',
      method: 'POST',
      path: '',
      summary: '',
      description: '',
      parameters: [],
      responses: {},
      tags: [],
      extensions: {}
    }).title).toBe('Create Subscription');
  });
});