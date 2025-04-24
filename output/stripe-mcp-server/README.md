# stripe-mcp

MCP Server for the Stripe API (Test)

This is a Model Context Protocol (MCP) server for the Stripe API API, generated from an OpenAPI specification.

## Installation

```bash
npm install
npm run build
```

## Usage

### Environment Variables

- `API_KEY`: Your API key (optional if providing in requests)
- `PORT`: Port to run the server on (default: 8080)
- `TRANSPORT`: Transport method to use ('http' or 'stdio', default: 'http')

### Starting the Server

```bash
npm start
```

Or with environment variables:

```bash
API_KEY=your_api_key PORT=8080 npm start
```

### Using the CLI

```bash
# Install globally
npm install -g .

# Run the server
stripe-mcp --port=8080 --apiKey=your_api_key
```

## Available Tools

This MCP server exposes the following API endpoints as MCP tools:

- `GetAccount`: Retrieve account
- `PostAccountLinks`: Create an account link
- `PostAccountSessions`: Create an Account Session
- `GetAccounts`: List all connected accounts
- `PostAccounts`: <p>With <a href="/docs/connect">Connect</a>, you can create Stripe accounts for your users.
To do this, you’ll first need to <a href="https://dashboard.stripe.com/account/applications/settings">register your platform</a>.</p>

<p>If you’ve already collected information for your connected accounts, you <a href="/docs/connect/best-practices#onboarding">can prefill that information</a> when
creating the account. Connect Onboarding won’t ask for the prefilled information during account onboarding.
You can prefill any information on the account.</p>
- `DeleteAccountsAccount`: Delete an account
- `GetAccountsAccount`: Retrieve account
- `PostAccountsAccount`: Update an account
- `PostAccountsAccountBankAccounts`: Create an external account
- `DeleteAccountsAccountBankAccountsId`: Delete an external account

...and 547 more

## Authentication

The server supports authentication using API keys. You can authenticate requests in one of the following ways:

1. Pass the API key in the Authorization header:
 ```
 Authorization: Bearer your_api_key
 ```

2. Pass the API key in the request parameters:
 ```json
 {
   "jsonrpc": "2.0",
   "id": "1",
   "method": "tools.call",
   "params": {
     "tool": "someOperation",
     "parameters": {
       "apiKey": "your_api_key",
       // other parameters
     }
   }
 }
 ```

3. Use the default API key configured when starting the server.

## Example Requests

### List Available Tools

```json
{
"jsonrpc": "2.0",
"id": "1",
"method": "tools.list"
}
```

### Sample Tool Call

```json
{
"jsonrpc": "2.0",
"id": "2",
"method": "tools.call",
"params": {
  "tool": "GetAccount",
  "parameters": {
    // Add parameters here based on the tool's requirements
  }
}
}
```

## License

MIT