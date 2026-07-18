/**
 * Provider implementations
 *
 * This file imports and registers all available providers.
 */

const { ProviderRegistry } = require('../core');
const { StripeProvider } = require('./stripe');
const { PayPalProvider } = require('./paypal/provider');
const { GenericProvider } = require('./generic/provider');

for (const Provider of [GenericProvider, StripeProvider, PayPalProvider]) {
  try {
    ProviderRegistry.registerProvider(new Provider());
  } catch (error) {
    console.warn(`Warning: ${Provider.name} could not be loaded`, error);
  }
}

module.exports = {
  GenericProvider,
  StripeProvider,
  PayPalProvider,
};
