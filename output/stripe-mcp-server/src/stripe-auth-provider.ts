/**
 * Stripe Authentication Provider for MCP
 */
import { IMCPAuthProvider, IMCPAuthContext, IMCPRequest } from './mcp-types';

export class StripeAuthProvider implements IMCPAuthProvider {
  public type = 'stripe-api-key';
  public config: any;

  constructor(config: any) {
    this.config = config;
  }

  public async authenticate(request: IMCPRequest): Promise<IMCPAuthContext | null> {
    try {
      // Extract API key from various sources
      const apiKey = this.extractApiKey(request);
      
      if (!apiKey) {
        return null;
      }

      // Validate API key format
      if (!this.isValidApiKeyFormat(apiKey)) {
        throw new Error('Invalid API key format');
      }

      // Create auth context
      const authContext: IMCPAuthContext = {
        apiKey,
        scopes: this.determineScopes(apiKey),
        metadata: {
          mode: this.determineMode(apiKey)
        }
      };

      return authContext;
    } catch (error) {
      console.error('[StripeAuthProvider] Authentication error:', (error as Error).message);
      return null;
    }
  }

/**
 * Extract API key from request
 */
private extractApiKey(request: IMCPRequest): string | null {
  // Try to extract from Authorization header
  if (request.headers?.authorization) {
    const authHeader = request.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      const key = authHeader.substring(7);
      return key;
    }
  }

  // Try to extract from request parameters
  if (request.params?.apiKey) {
    return request.params.apiKey;
  }

  // Use default API key from config if available
  if (this.config.apiKey) {
    return this.config.apiKey;
  }

  return null;
}

  /**
   * Validate API key format
   */
private isValidApiKeyFormat(apiKey: string): boolean {
  // Updated regex to include underscores in the allowed characters
  return /^(sk|pk)_(test|live)_[A-Za-z0-9_]+$/.test(apiKey);
}

  /**
   * Determine API key mode
   */
  private determineMode(apiKey: string): 'test' | 'live' {
    return apiKey.includes('_test_') ? 'test' : 'live';
  }

  /**
   * Determine scopes based on API key
   */
  private determineScopes(apiKey: string): string[] {
    const scopes = [];
    
    // Determine read/write scopes based on key type
    if (apiKey.startsWith('sk_')) {
      scopes.push('read', 'write');
    } else if (apiKey.startsWith('pk_')) {
      scopes.push('read');
    }
    
    // Add mode-specific scope
    scopes.push(`mode:${this.determineMode(apiKey)}`);
    
    return scopes;
  }
}