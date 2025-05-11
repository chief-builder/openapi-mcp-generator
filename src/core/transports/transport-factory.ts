/**
 * MCP Transport Factory
 * 
 * This module provides a factory for creating MCP transports.
 */

import { IMCPTransport, IMCPTransportConfig } from './transport-interface';
import { HTTPTransport, IHTTPTransportConfig } from './http-transport';
import { IMCPServerConfig } from '../models/mcp-types';

/**
 * Supported transport types
 */
export type TransportType = 'http' | 'stdio' | 'sse';

/**
 * Transport factory for creating MCP transports
 */
export class TransportFactory {
  /**
   * Create a transport instance based on configuration
   * 
   * @param config MCP server configuration
   * @returns MCP transport instance
   */
  static createTransport(config: IMCPServerConfig): IMCPTransport {
    const transport = config.transport || 'http';
    
    switch (transport) {
      case 'http':
        return new HTTPTransport({
          port: config.httpPort,
          security: config.security
        } as IHTTPTransportConfig);
      
      // Other transport types will be implemented later
      case 'stdio':
        throw new Error('stdio transport not yet implemented');
      
      case 'sse':
        throw new Error('SSE transport not yet implemented');
      
      default:
        throw new Error(`Unsupported transport type: ${transport}`);
    }
  }
}