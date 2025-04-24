/**
 * Provider implementations
 * 
 * This file imports and registers all available providers.
 */

import { ProviderRegistry } from '../core';

// Try to import providers, but don't fail if they're not available
let StripeProvider: any;
try {
  // Import providers dynamically
  const stripeModule = require('./stripe');
  StripeProvider = stripeModule.StripeProvider;
  
  // Register providers
  if (StripeProvider) {
    ProviderRegistry.registerProvider(new StripeProvider());
    console.log('Registered Stripe provider');
  }
} catch (error) {
  console.warn('Warning: Stripe provider could not be loaded');
}

// This function can be used to register additional providers dynamically
export function registerProvider(providerModule: string, providerName?: string) {
  try {
    const module = require(providerModule);
    const ProviderClass = module[providerName || 'Provider'];
    
    if (ProviderClass) {
      ProviderRegistry.registerProvider(new ProviderClass());
      console.log(`Registered provider from ${providerModule}`);
      return true;
    }
  } catch (error) {
    console.warn(`Warning: Provider could not be loaded from ${providerModule}`);
  }
  
  return false;
}