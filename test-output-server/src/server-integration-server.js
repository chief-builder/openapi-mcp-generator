"use strict";
// @ts-nocheck
/**
 * server-integration MCP Server Implementation
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerIntegrationServer = void 0;
var mcp_types_1 = require("./mcp-types");
var stripe_auth_provider_1 = require("./stripe-auth-provider");
var stripe_types_1 = require("./stripe-types");
var http = require("http");
var stripe_1 = require("stripe");
/**
 * Helper class for working with Stripe resources
 * Provides a compatibility layer between OpenAPI spec and Stripe SDK
 * Uses type assertions to bypass TypeScript type checking for Stripe SDK access
 */
var StripeResourceHelperImpl = /** @class */ (function () {
    function StripeResourceHelperImpl(stripe) {
        // Store the stripe client as 'any' to allow dynamic property access
        this.stripe = stripe;
    }
    /**
     * Get a Stripe resource by name, handling naming differences
     *
     * @param resourceName The resource name (e.g., 'account_links', 'customers')
     * @returns The Stripe resource or undefined if not found
     */
    StripeResourceHelperImpl.prototype.getResource = function (resourceName) {
        // Map from API resource name to SDK resource name
        var sdkResourceName = this.mapResourceName(resourceName);
        // Access the resource dynamically
        return this.stripe[sdkResourceName];
    };
    /**
     * Execute a method on a Stripe resource
     *
     * @param resourceName The resource name (e.g., 'customers')
     * @param methodName The method name (e.g., 'create', 'list')
     * @param args Arguments to pass to the method
     * @returns The result of the method call
     */
    StripeResourceHelperImpl.prototype.executeMethod = function (resourceName, methodName) {
        var args = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            args[_i - 2] = arguments[_i];
        }
        return __awaiter(this, void 0, void 0, function () {
            var resource, sdkMethodName, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        resource = this.getResource(resourceName);
                        if (!resource) {
                            throw new Error('Resource not found: ' + resourceName);
                        }
                        sdkMethodName = this.mapMethodName(resourceName, methodName);
                        if (typeof resource[sdkMethodName] !== 'function') {
                            throw new Error('Method not found: ' + resourceName + '.' + sdkMethodName);
                        }
                        return [4 /*yield*/, resource[sdkMethodName].apply(resource, args)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        error_1 = _a.sent();
                        console.error('Error executing Stripe method: ' + resourceName + '.' + methodName, error_1);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Map an API resource name to the corresponding SDK resource name
     *
     * @param apiResourceName The resource name from the API spec
     * @returns The SDK resource name
     */
    StripeResourceHelperImpl.prototype.mapResourceName = function (apiResourceName) {
        // Check if we have a specific mapping for this resource
        if (apiResourceName in stripe_types_1.STRIPE_RESOURCE_MAP) {
            return stripe_types_1.STRIPE_RESOURCE_MAP[apiResourceName];
        }
        // Special case for singular "account" (Stripe uses "accounts")
        if (apiResourceName === 'account') {
            return 'accounts';
        }
        // Otherwise, use the resource name as-is
        return apiResourceName;
    };
    /**
     * Map an API method name to the corresponding SDK method name
     *
     * @param resourceName The resource name
     * @param apiMethodName The method name from the API spec
     * @returns The SDK method name
     */
    StripeResourceHelperImpl.prototype.mapMethodName = function (resourceName, apiMethodName) {
        // Check if we have a specific mapping for this method
        if (apiMethodName in stripe_types_1.STRIPE_METHOD_MAP) {
            return stripe_types_1.STRIPE_METHOD_MAP[apiMethodName];
        }
        // Otherwise, use the method name as-is
        return apiMethodName;
    };
    return StripeResourceHelperImpl;
}());
/**
 * Stripe MCP Server implementation
 */
var ServerIntegrationServer = /** @class */ (function (_super) {
    __extends(ServerIntegrationServer, _super);
    /**
     * Create a new Stripe MCP server
     *
     * @param config Server configuration
     */
    function ServerIntegrationServer(config) {
        var _this = this;
        // Create base MCP server configuration
        var mcpConfig = {
            serverName: 'server-integration',
            serverVersion: '1.0.0',
            serverDescription: 'Server integration test',
            transport: config.transport || 'http',
            httpPort: config.httpPort || 8080
        };
        // Call parent constructor
        _this = _super.call(this, mcpConfig) || this;
        _this.server = null;
        _this.stripe = null; // Stripe client
        _this.stripeHelper = null; // Stripe resource helper
        // Initialize auth provider
        _this.authProvider = new stripe_auth_provider_1.StripeAuthProvider(config);
        // Initialize Stripe client if API key is available
        if (config.apiKey) {
            _this.initializeStripeClient(config.apiKey, config.stripeApiVersion);
        }
        return _this;
    }
    ServerIntegrationServer.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.config.transport === 'http')) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.startHttpServer()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 2: return [4 /*yield*/, this.startStdioServer()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ServerIntegrationServer.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (this.server) {
                    return [2 /*return*/, new Promise(function (resolve, reject) {
                            var _a;
                            (_a = _this.server) === null || _a === void 0 ? void 0 : _a.close(function (err) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    _this.server = null;
                                    resolve();
                                }
                            });
                        })];
                }
                return [2 /*return*/];
            });
        });
    };
    ServerIntegrationServer.prototype.startHttpServer = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve) {
                        _this.server = http.createServer(function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                            var chunks, chunk, e_1_1, body, requestData, response, error_2;
                            var _a, req_1, req_1_1;
                            var _b, e_1, _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0:
                                        // Enable CORS
                                        res.setHeader('Access-Control-Allow-Origin', '*');
                                        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                                        // Handle preflight requests
                                        if (req.method === 'OPTIONS') {
                                            res.statusCode = 204;
                                            res.end();
                                            return [2 /*return*/];
                                        }
                                        // Only accept POST requests
                                        if (req.method !== 'POST') {
                                            res.statusCode = 405;
                                            res.end(JSON.stringify({ error: 'Method not allowed' }));
                                            return [2 /*return*/];
                                        }
                                        _e.label = 1;
                                    case 1:
                                        _e.trys.push([1, 15, , 16]);
                                        chunks = [];
                                        _e.label = 2;
                                    case 2:
                                        _e.trys.push([2, 7, 8, 13]);
                                        _a = true, req_1 = __asyncValues(req);
                                        _e.label = 3;
                                    case 3: return [4 /*yield*/, req_1.next()];
                                    case 4:
                                        if (!(req_1_1 = _e.sent(), _b = req_1_1.done, !_b)) return [3 /*break*/, 6];
                                        _d = req_1_1.value;
                                        _a = false;
                                        chunk = _d;
                                        chunks.push(Buffer.from(chunk));
                                        _e.label = 5;
                                    case 5:
                                        _a = true;
                                        return [3 /*break*/, 3];
                                    case 6: return [3 /*break*/, 13];
                                    case 7:
                                        e_1_1 = _e.sent();
                                        e_1 = { error: e_1_1 };
                                        return [3 /*break*/, 13];
                                    case 8:
                                        _e.trys.push([8, , 11, 12]);
                                        if (!(!_a && !_b && (_c = req_1.return))) return [3 /*break*/, 10];
                                        return [4 /*yield*/, _c.call(req_1)];
                                    case 9:
                                        _e.sent();
                                        _e.label = 10;
                                    case 10: return [3 /*break*/, 12];
                                    case 11:
                                        if (e_1) throw e_1.error;
                                        return [7 /*endfinally*/];
                                    case 12: return [7 /*endfinally*/];
                                    case 13:
                                        body = Buffer.concat(chunks).toString('utf8');
                                        requestData = JSON.parse(body);
                                        return [4 /*yield*/, this.handleRequest(requestData, req.headers)];
                                    case 14:
                                        response = _e.sent();
                                        // Send response
                                        res.setHeader('Content-Type', 'application/json');
                                        res.statusCode = 200;
                                        res.end(JSON.stringify(response));
                                        return [3 /*break*/, 16];
                                    case 15:
                                        error_2 = _e.sent();
                                        // Handle errors
                                        res.statusCode = 500;
                                        res.end(JSON.stringify({
                                            jsonrpc: '2.0',
                                            id: null,
                                            error: {
                                                code: -32603,
                                                message: 'Internal error',
                                                data: { message: error_2.message }
                                            }
                                        }));
                                        return [3 /*break*/, 16];
                                    case 16: return [2 /*return*/];
                                }
                            });
                        }); });
                        // Start server
                        var port = _this.config.httpPort || 8080;
                        _this.server.listen(port, function () {
                            console.log('[StripeServer] HTTP server listening on port ' + port);
                            resolve();
                        });
                    })];
            });
        });
    };
    ServerIntegrationServer.prototype.startStdioServer = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                console.log('[StripeServer] STDIO transport not yet implemented');
                return [2 /*return*/, Promise.resolve()];
            });
        });
    };
    ServerIntegrationServer.prototype.handleRequest = function (request, headers) {
        return __awaiter(this, void 0, void 0, function () {
            var authContext, _a, error_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        // Validate JSON-RPC request
                        if (request.jsonrpc !== '2.0') {
                            return [2 /*return*/, {
                                    jsonrpc: '2.0',
                                    id: request.id,
                                    error: {
                                        code: -32600,
                                        message: 'Invalid request',
                                        data: { message: 'Invalid JSON-RPC version' }
                                    }
                                }];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 10, , 11]);
                        // Authenticate request
                        if (headers && headers.authorization) {
                            request.headers = { authorization: headers.authorization };
                        }
                        return [4 /*yield*/, this.authProvider.authenticate(request)];
                    case 2:
                        authContext = _b.sent();
                        request.authContext = authContext || undefined;
                        _a = request.method;
                        switch (_a) {
                            case 'server.info': return [3 /*break*/, 3];
                            case 'tools.list': return [3 /*break*/, 4];
                            case 'tools.call': return [3 /*break*/, 5];
                            case 'lifecycle.status': return [3 /*break*/, 7];
                        }
                        return [3 /*break*/, 8];
                    case 3: return [2 /*return*/, this.handleServerInfo(request)];
                    case 4: return [2 /*return*/, this.handleToolsList(request)];
                    case 5: return [4 /*yield*/, this.handleToolsCall(request)];
                    case 6: return [2 /*return*/, _b.sent()];
                    case 7: return [2 /*return*/, this.handleLifecycleStatus(request)];
                    case 8: return [2 /*return*/, {
                            jsonrpc: '2.0',
                            id: request.id,
                            error: {
                                code: -32601,
                                message: 'Method not found',
                                data: { method: request.method }
                            }
                        }];
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_3 = _b.sent();
                        return [2 /*return*/, {
                                jsonrpc: '2.0',
                                id: request.id,
                                error: {
                                    code: -32603,
                                    message: 'Internal error',
                                    data: { message: error_3.message }
                                }
                            }];
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    ServerIntegrationServer.prototype.handleServerInfo = function (request) {
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                name: this.config.serverName,
                version: this.config.serverVersion,
                description: this.config.serverDescription
            }
        };
    };
    ServerIntegrationServer.prototype.handleToolsList = function (request) {
        var tools = [
            {
                "id": "getTest",
                "type": "tool",
                "name": "getTest",
                "description": "",
                "parameters": {
                    "type": "object",
                    "properties": {}
                },
                "returns": {
                    "type": "object",
                    "description": "Stripe API response"
                },
                "requiresAuth": true,
                "metadata": {
                    "path": "/test",
                    "method": "GET",
                    "operationId": "getTest"
                }
            }
        ];
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                tools: tools
            }
        };
    };
    ServerIntegrationServer.prototype.handleToolsCall = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            var toolCall, _a, stripe, helper, methodMatch, httpMethod, resourcePath, segments, result, _b, error_4, error_5;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        toolCall = request.params;
                        if (!toolCall.tool) {
                            return [2 /*return*/, this.createErrorResponse(request.id, -32602, 'Invalid params', { message: 'Tool name is required' })];
                        }
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 8, , 9]);
                        _a = this.getStripeClientAndHelper(request.authContext), stripe = _a.client, helper = _a.helper;
                        methodMatch = toolCall.tool.match(/^(get|post|delete)(.*?)$/);
                        if (!methodMatch) {
                            return [2 /*return*/, this.createErrorResponse(request.id, -32601, 'Invalid tool name format', { tool: toolCall.tool })];
                        }
                        httpMethod = methodMatch[1];
                        resourcePath = methodMatch[2];
                        segments = resourcePath.replace(/([a-z0-9])([A-Z])/g, '$1.$2').toLowerCase().split('.');
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 6, , 7]);
                        return [4 /*yield*/, this.executeCustomerOperations(helper, toolCall)];
                    case 3:
                        _b = (_c.sent());
                        if (_b) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.executeOperation(helper, httpMethod, segments, toolCall.parameters)];
                    case 4:
                        _b = (_c.sent());
                        _c.label = 5;
                    case 5:
                        result = _b;
                        if (result) {
                            return [2 /*return*/, this.createSuccessResponse(request.id, result)];
                        }
                        // If we reached here, we couldn't handle the operation
                        return [2 /*return*/, this.createErrorResponse(request.id, -32601, 'Operation not supported', { tool: toolCall.tool })];
                    case 6:
                        error_4 = _c.sent();
                        return [2 /*return*/, this.createErrorResponse(request.id, -32603, error_4.message, { tool: toolCall.tool })];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        error_5 = _c.sent();
                        return [2 /*return*/, this.createErrorResponse(request.id, -32603, error_5.message, { tool: toolCall.tool })];
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Handle common customer operations that are specifically used in tests
     */
    ServerIntegrationServer.prototype.executeCustomerOperations = function (helper, toolCall) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, id, updateParams;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = toolCall.tool;
                        switch (_a) {
                            case 'postCustomers': return [3 /*break*/, 1];
                            case 'getCustomers': return [3 /*break*/, 3];
                            case 'getCustomersCustomer': return [3 /*break*/, 5];
                            case 'postCustomersCustomer': return [3 /*break*/, 7];
                            case 'deleteCustomersCustomer': return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 11];
                    case 1: return [4 /*yield*/, helper.executeMethod('customers', 'create', toolCall.parameters)];
                    case 2: return [2 /*return*/, _c.sent()];
                    case 3: return [4 /*yield*/, helper.executeMethod('customers', 'list', toolCall.parameters)];
                    case 4: return [2 /*return*/, _c.sent()];
                    case 5: return [4 /*yield*/, helper.executeMethod('customers', 'retrieve', toolCall.parameters.id)];
                    case 6: return [2 /*return*/, _c.sent()];
                    case 7:
                        _b = toolCall.parameters, id = _b.id, updateParams = __rest(_b, ["id"]);
                        return [4 /*yield*/, helper.executeMethod('customers', 'update', id, updateParams)];
                    case 8: return [2 /*return*/, _c.sent()];
                    case 9: return [4 /*yield*/, helper.executeMethod('customers', 'del', toolCall.parameters.id)];
                    case 10: return [2 /*return*/, _c.sent()];
                    case 11: return [2 /*return*/, null]; // Not a common customer operation
                }
            });
        });
    };
    /**
     * Execute a Stripe operation based on HTTP method and path segments
     */
    ServerIntegrationServer.prototype.executeOperation = function (helper, httpMethod, segments, parameters) {
        return __awaiter(this, void 0, void 0, function () {
            var primaryResource;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        primaryResource = segments[0].toLowerCase();
                        if (!(segments.length <= 2)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.executeSimpleOperation(helper, httpMethod, segments, parameters)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2: return [4 /*yield*/, this.executeComplexOperation(helper, httpMethod, segments, parameters)];
                    case 3: 
                    // Handle complex operations with more segments
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    /**
     * Execute simple Stripe operations (1-2 path segments)
     */
    ServerIntegrationServer.prototype.executeSimpleOperation = function (helper, httpMethod, segments, parameters) {
        return __awaiter(this, void 0, void 0, function () {
            var primaryResource, secondSegment, id, updateParams, delMethod, error_6, nestedResource;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        primaryResource = segments[0].toLowerCase();
                        if (!(segments.length === 1)) return [3 /*break*/, 5];
                        if (!(httpMethod === 'get')) return [3 /*break*/, 2];
                        return [4 /*yield*/, helper.executeMethod(primaryResource, 'list', parameters)];
                    case 1: return [2 /*return*/, _a.sent()];
                    case 2:
                        if (!(httpMethod === 'post')) return [3 /*break*/, 4];
                        return [4 /*yield*/, helper.executeMethod(primaryResource, 'create', parameters)];
                    case 3: return [2 /*return*/, _a.sent()];
                    case 4: return [3 /*break*/, 24];
                    case 5:
                        if (!(segments.length === 2)) return [3 /*break*/, 24];
                        secondSegment = segments[1].toLowerCase();
                        if (!(secondSegment === primaryResource.slice(0, -1))) return [3 /*break*/, 12];
                        if (!(httpMethod === 'get')) return [3 /*break*/, 7];
                        return [4 /*yield*/, helper.executeMethod(primaryResource, 'retrieve', parameters.id)];
                    case 6: return [2 /*return*/, _a.sent()];
                    case 7:
                        if (!(httpMethod === 'post')) return [3 /*break*/, 9];
                        id = parameters.id, updateParams = __rest(parameters, ["id"]);
                        return [4 /*yield*/, helper.executeMethod(primaryResource, 'update', id, updateParams)];
                    case 8: return [2 /*return*/, _a.sent()];
                    case 9:
                        if (!(httpMethod === 'delete')) return [3 /*break*/, 11];
                        return [4 /*yield*/, helper.executeMethod(primaryResource, 'del', parameters.id)];
                    case 10: return [2 /*return*/, _a.sent()];
                    case 11: return [3 /*break*/, 24];
                    case 12:
                        _a.trys.push([12, 19, , 24]);
                        if (!(httpMethod === 'post')) return [3 /*break*/, 14];
                        return [4 /*yield*/, helper.executeMethod(primaryResource, secondSegment, parameters)];
                    case 13: return [2 /*return*/, _a.sent()];
                    case 14:
                        if (!(httpMethod === 'get')) return [3 /*break*/, 16];
                        return [4 /*yield*/, helper.executeMethod(primaryResource, secondSegment, parameters)];
                    case 15: return [2 /*return*/, _a.sent()];
                    case 16:
                        if (!(httpMethod === 'delete')) return [3 /*break*/, 18];
                        delMethod = 'del' + secondSegment.charAt(0).toUpperCase() + secondSegment.slice(1);
                        return [4 /*yield*/, helper.executeMethod(primaryResource, delMethod, parameters.id)];
                    case 17: return [2 /*return*/, _a.sent()];
                    case 18: return [3 /*break*/, 24];
                    case 19:
                        error_6 = _a.sent();
                        nestedResource = "".concat(primaryResource, "_").concat(secondSegment);
                        if (!(httpMethod === 'get')) return [3 /*break*/, 21];
                        return [4 /*yield*/, helper.executeMethod(nestedResource, 'list', parameters)];
                    case 20: return [2 /*return*/, _a.sent()];
                    case 21:
                        if (!(httpMethod === 'post')) return [3 /*break*/, 23];
                        return [4 /*yield*/, helper.executeMethod(nestedResource, 'create', parameters)];
                    case 22: return [2 /*return*/, _a.sent()];
                    case 23: return [3 /*break*/, 24];
                    case 24: return [2 /*return*/, null]; // Operation not handled
                }
            });
        });
    };
    /**
     * Execute complex Stripe operations (3+ path segments)
     */
    ServerIntegrationServer.prototype.executeComplexOperation = function (helper, httpMethod, segments, parameters) {
        return __awaiter(this, void 0, void 0, function () {
            var resourceSegments, resourcePath, lastSegment, methodName, error_7, primaryResource, compositeResource, i, methodSegment, methodName, innerError_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 7]);
                        resourceSegments = segments.slice(0, -1);
                        resourcePath = resourceSegments.join('_').toLowerCase();
                        lastSegment = segments[segments.length - 1].toLowerCase();
                        methodName = void 0;
                        if (httpMethod === 'get') {
                            // Check if this is a retrieve or list operation
                            methodName = parameters.id ? 'retrieve' : 'list';
                        }
                        else if (httpMethod === 'post') {
                            methodName = 'create';
                        }
                        else if (httpMethod === 'delete') {
                            methodName = 'del';
                        }
                        else {
                            methodName = lastSegment;
                        }
                        return [4 /*yield*/, helper.executeMethod(resourcePath, methodName, parameters.id || parameters)];
                    case 1: 
                    // Try executing the operation using the helper
                    return [2 /*return*/, _a.sent()];
                    case 2:
                        error_7 = _a.sent();
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        primaryResource = segments[0].toLowerCase();
                        compositeResource = '';
                        for (i = 0; i < segments.length - 1; i++) {
                            if (i === 0) {
                                compositeResource = segments[i].toLowerCase();
                            }
                            else {
                                // Join using underscores for snake_case
                                compositeResource += '_' + segments[i].toLowerCase();
                            }
                        }
                        methodSegment = segments[segments.length - 1].toLowerCase();
                        methodName = void 0;
                        if (httpMethod === 'get') {
                            methodName = parameters.id ? 'retrieve' : 'list';
                        }
                        else if (httpMethod === 'post') {
                            methodName = methodSegment;
                        }
                        else if (httpMethod === 'delete') {
                            methodName = 'del';
                        }
                        else {
                            methodName = methodSegment;
                        }
                        return [4 /*yield*/, helper.executeMethod(compositeResource, methodName, parameters.id || parameters)];
                    case 4: 
                    // Try to execute the operation
                    return [2 /*return*/, _a.sent()];
                    case 5:
                        innerError_1 = _a.sent();
                        // If all approaches fail, return null to indicate the operation is not handled
                        return [2 /*return*/, null];
                    case 6: return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create a success response
     */
    ServerIntegrationServer.prototype.createSuccessResponse = function (id, result) {
        return {
            jsonrpc: '2.0',
            id: id,
            result: result
        };
    };
    /**
     * Create an error response
     */
    ServerIntegrationServer.prototype.createErrorResponse = function (id, code, message, data) {
        return {
            jsonrpc: '2.0',
            id: id,
            error: {
                code: code,
                message: message,
                data: data
            }
        };
    };
    ServerIntegrationServer.prototype.handleLifecycleStatus = function (request) {
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                status: 'running'
            }
        };
    };
    /**
   * getTest operation
   */
    ServerIntegrationServer.prototype.getTest = function (params, authContext) {
        return __awaiter(this, void 0, void 0, function () {
            var stripe, test_1, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        stripe = this.getStripeClient(authContext);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, stripe.test.retrieve(params.id)];
                    case 2:
                        test_1 = _a.sent();
                        return [2 /*return*/, test_1];
                    case 3:
                        error_8 = _a.sent();
                        throw this.transformStripeError(error_8);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get Stripe client and helper with the current API key
     *
     * @param authContext Authentication context with API key
     * @returns Stripe client and helper
     * @throws Error if the client is not initialized
     */
    ServerIntegrationServer.prototype.getStripeClientAndHelper = function (authContext) {
        var _a;
        // Use auth context API key if available and different from current
        if ((authContext === null || authContext === void 0 ? void 0 : authContext.apiKey) && ((_a = this.stripe) === null || _a === void 0 ? void 0 : _a.apiKey) !== authContext.apiKey) {
            this.initializeStripeClient(authContext.apiKey);
        }
        if (!this.stripe || !this.stripeHelper) {
            throw new Error('Stripe client not initialized');
        }
        return {
            client: this.stripe,
            helper: this.stripeHelper
        };
    };
    /**
     * Get Stripe client with the current API key
     * (Legacy method for backward compatibility)
     *
     * @param authContext Authentication context with API key
     * @returns Stripe client instance
     * @throws Error if the client is not initialized
     */
    ServerIntegrationServer.prototype.getStripeClient = function (authContext) {
        return this.getStripeClientAndHelper(authContext).client;
    };
    /**
     * Initialize Stripe client
     *
     * @param apiKey Stripe API key
     * @param apiVersion Optional Stripe API version
     */
    ServerIntegrationServer.prototype.initializeStripeClient = function (apiKey, apiVersion) {
        if (apiVersion === void 0) { apiVersion = '2023-10-16'; }
        try {
            this.stripe = new stripe_1.default(apiKey, {
                apiVersion: apiVersion,
            });
            // Initialize the resource helper
            this.stripeHelper = new StripeResourceHelperImpl(this.stripe);
        }
        catch (error) {
            console.warn('[StripeProvider] Failed to initialize Stripe client:', error.message);
            this.stripe = null;
            this.stripeHelper = null;
        }
    };
    /**
     * Transform Stripe errors to MCP errors
     *
     * @param error Stripe error or other error
     * @returns Formatted error
     */
    ServerIntegrationServer.prototype.transformStripeError = function (error) {
        // Handle Stripe-specific errors
        if (error && typeof error === 'object' && 'type' in error) {
            var stripeError = error;
            switch (stripeError.type) {
                case 'StripeCardError':
                    return new Error('Card error: ' + stripeError.message);
                case 'StripeInvalidRequestError':
                    return new Error('Invalid request: ' + stripeError.message);
                case 'StripeAuthenticationError':
                    return new Error('Authentication error: ' + stripeError.message);
                case 'StripeAPIError':
                    return new Error('API error: ' + stripeError.message);
                case 'StripeConnectionError':
                    return new Error('Connection error: ' + stripeError.message);
                case 'StripeRateLimitError':
                    return new Error('Rate limit error: ' + stripeError.message);
                default:
                    return new Error('Stripe error: ' + stripeError.message);
            }
        }
        // Return the original error if it's not a Stripe-specific error
        return error instanceof Error ? error : new Error(String(error));
    };
    return ServerIntegrationServer;
}(mcp_types_1.MCPServerBase));
exports.ServerIntegrationServer = ServerIntegrationServer;
