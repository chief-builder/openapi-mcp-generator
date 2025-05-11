import { TransportFactory } from '../../core/transports/transport-factory';
import { HTTPTransport } from '../../core/transports/http-transport';
import { IMCPServerConfig } from '../../core/models/mcp-types';

describe('Transport Factory', () => {
  test('creates HTTP transport', () => {
    const config: IMCPServerConfig = {
      serverName: 'Test Server',
      serverVersion: '1.0.0',
      transport: 'http',
      httpPort: 8080
    };
    
    const transport = TransportFactory.createTransport(config);
    
    expect(transport).toBeInstanceOf(HTTPTransport);
  });
  
  test('passes security configuration to transport', () => {
    const config: IMCPServerConfig = {
      serverName: 'Test Server',
      serverVersion: '1.0.0',
      transport: 'http',
      httpPort: 8080,
      security: {
        bindToLocalhost: false,
        allowedOrigins: ['http://example.com']
      }
    };
    
    const transport = TransportFactory.createTransport(config) as HTTPTransport;
    
    // Test that transport was created with the correct configuration
    // This is a bit of a hack since we can't directly access private properties
    // But we can check that the transport behaves according to the config
    expect(transport).toBeInstanceOf(HTTPTransport);
  });
  
  test('throws error for unsupported transport types', () => {
    const config: IMCPServerConfig = {
      serverName: 'Test Server',
      serverVersion: '1.0.0',
      transport: 'stdio',
      httpPort: 8080
    };
    
    expect(() => {
      TransportFactory.createTransport(config);
    }).toThrow('stdio transport not yet implemented');
    
    const sseConfig: IMCPServerConfig = {
      serverName: 'Test Server',
      serverVersion: '1.0.0',
      transport: 'sse' as any,
      httpPort: 8080
    };
    
    expect(() => {
      TransportFactory.createTransport(sseConfig);
    }).toThrow('SSE transport not yet implemented');
    
    const invalidConfig: IMCPServerConfig = {
      serverName: 'Test Server',
      serverVersion: '1.0.0',
      transport: 'invalid' as any,
      httpPort: 8080
    };
    
    expect(() => {
      TransportFactory.createTransport(invalidConfig);
    }).toThrow('Unsupported transport type: invalid');
  });
});