/**
 * Registry for API providers
 */

import { IProvider } from '../models/provider';

/**
 * Registry for dynamically registering and retrieving providers
 */
export class ProviderRegistry {
  // Use a private static field with explicit initialization
  private static _providers: Map<string, IProvider> = new Map();
  
  // Use a getter to ensure the map is always initialized
  private static get providers(): Map<string, IProvider> {
    if (!ProviderRegistry._providers) {
      ProviderRegistry._providers = new Map();
    }
    return ProviderRegistry._providers;
  }
  
  /**
   * Register a provider
   * 
   * @param provider Provider to register
   */
  public static registerProvider(provider: IProvider): void {
    console.log(`Registering provider: ${provider.name} v${provider.version}`);
    ProviderRegistry.providers.set(provider.name, provider);
  }
  
  /**
   * Get a provider by name
   * 
   * @param name Provider name
   * @returns Provider
   * @throws Error if provider not found
   */
  public static getProvider(name: string): IProvider {
    const provider = ProviderRegistry.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not found: ${name}`);
    }
    return provider;
  }
  
  /**
   * Get all registered providers
   * 
   * @returns Array of providers
   */
  public static getAllProviders(): IProvider[] {
    return Array.from(ProviderRegistry.providers.values());
  }
  
  /**
   * Check if a provider is registered
   * 
   * @param name Provider name
   * @returns Whether the provider is registered
   */
  public static hasProvider(name: string): boolean {
    return ProviderRegistry.providers.has(name);
  }
  
  /**
   * Remove a provider
   * 
   * @param name Provider name
   * @returns Whether the provider was removed
   */
  public static removeProvider(name: string): boolean {
    return ProviderRegistry.providers.delete(name);
  }
  
  /**
   * Clear all providers
   */
  public static clearProviders(): void {
    ProviderRegistry.providers.clear();
  }
}