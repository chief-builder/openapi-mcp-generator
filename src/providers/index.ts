/**
 * Provider implementations
 * 
 * This file imports and registers all available providers.
 */

const { ProviderRegistry } = require('../core');
const { StripeProvider } = require('./stripe');
const { PayPalProvider } = require('./paypal/provider');

// Register the Stripe provider
try {
  console.log('Registering Stripe provider...');
  const stripeProvider = new StripeProvider();
  ProviderRegistry.registerProvider(stripeProvider);
  console.log('Registered Stripe provider');
} catch (error) {
  console.warn('Warning: Stripe provider could not be loaded', error);
}

// Register the PayPal provider
try {
  console.log('Registering PayPal provider...');
  const paypalProvider = new PayPalProvider();
  ProviderRegistry.registerProvider(paypalProvider);
  console.log('Registered PayPal provider');
} catch (error) {
  console.warn('Warning: PayPal provider could not be loaded', error);
}

// Export the providers
module.exports = {
  StripeProvider,
  PayPalProvider
};