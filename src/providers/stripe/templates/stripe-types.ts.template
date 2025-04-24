// @ts-nocheck
/**
 * Stripe Types
 * 
 * Type definitions for working with the Stripe API.
 */

// Import Stripe from the library
import Stripe from 'stripe';

// Export Stripe types
export type StripeClient = Stripe;
export type StripeCustomer = Stripe.Customer;
export type StripeCharge = Stripe.Charge;
export type StripePaymentIntent = Stripe.PaymentIntent;
export type StripeSubscription = Stripe.Subscription;
export type StripeProduct = Stripe.Product;
export type StripePrice = Stripe.Price;
export type StripeError = Stripe.errors.StripeError;

// Export common parameter types
export interface IStripeListParams {
  limit?: number;
  starting_after?: string;
  ending_before?: string;
}

// Helper type for Stripe resource identifiers
export type StripeId = string & { _brand: 'stripeId' };

// Helper type for API key
export type StripeApiKey = string & { _brand: 'stripeApiKey' };

/**
 * Helper interface to safely access Stripe SDK properties dynamically
 * This provides a compatibility layer between OpenAPI spec naming and SDK naming
 */
export interface StripeResourceHelper {
  getResource(resourceName: string): any;
  executeMethod(resourceName: string, methodName: string, ...args: any[]): Promise<any>;
  mapResourceName(apiResourceName: string): string;
  mapMethodName(resourceName: string, apiMethodName: string): string;
}

/**
 * Maps between snake_case API names and camelCase SDK property names
 */
export const STRIPE_RESOURCE_MAP: Record<string, string> = {
  // Common mappings between OpenAPI names and Stripe SDK names
  'account_links': 'accountLinks',
  'account_sessions': 'accountSessions',
  'apple_pay': 'applePay',
  'bank_accounts': 'bankAccounts',
  'billing_portal': 'billingPortal',
  'cash_balances': 'cashBalances',
  'checkout': 'checkout',
  'connected_accounts': 'connectedAccounts',
  'credit_notes': 'creditNotes',
  'customer_sessions': 'customerSessions',
  'financial_connections': 'financialConnections',
  'identity': 'identity',
  'issuing': 'issuing',
  'payment_intents': 'paymentIntents',
  'payment_links': 'paymentLinks',
  'payment_methods': 'paymentMethods',
  'persons': 'persons',
  'setup_attempts': 'setupAttempts',
  'setup_intents': 'setupIntents',
  'shipping_rates': 'shippingRates',
  'sigma': 'sigma',
  'subscription_items': 'subscriptionItems',
  'subscription_schedules': 'subscriptionSchedules',
  'tax_codes': 'taxCodes',
  'tax_rates': 'taxRates',
  'terminal': 'terminal',
  'test_helpers': 'testHelpers',
  'treasury': 'treasury',
  'webhook_endpoints': 'webhookEndpoints',
};

/**
 * Maps between API method names and SDK method names
 */
export const STRIPE_METHOD_MAP: Record<string, string> = {
  'post': 'create',
  'get': 'retrieve',
  'put': 'update',
  'delete': 'del',
  'list': 'list'
};