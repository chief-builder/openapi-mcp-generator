"use strict";
// @ts-nocheck
/**
 * Stripe Types
 *
 * Type definitions for working with the Stripe API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_METHOD_MAP = exports.STRIPE_RESOURCE_MAP = void 0;
/**
 * Maps between snake_case API names and camelCase SDK property names
 */
exports.STRIPE_RESOURCE_MAP = {
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
exports.STRIPE_METHOD_MAP = {
    'post': 'create',
    'get': 'retrieve',
    'put': 'update',
    'delete': 'del',
    'list': 'list'
};
