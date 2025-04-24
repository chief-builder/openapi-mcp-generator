# Functional Testing for Generated MCP Servers

This directory contains functional tests for the generated MCP servers. These tests build, run, and test the generated servers to ensure they work correctly.

## Running the Tests

To run the functional test for the Stripe MCP server:

1. First, generate the server:
   ```bash
   npm run test:stripe
   ```

2. Then run the functional test:
   ```bash
   npm run test:functional
   ```

## Test Steps

The functional test performs the following steps:

1. **Install Dependencies**: Installs all required dependencies for the generated server.
2. **Build the Server**: Compiles the TypeScript code to JavaScript.
3. **Start the Server**: Starts the server in a child process.
4. **Test the Server**: Sends test requests to the server to verify functionality.
5. **Stop the Server**: Gracefully terminates the server process.

## Test Checks

The test verifies:

- Server info (name, version, description)
- Available tools (the list should match the expected tools)
- Server status (should be "ready")

## Environment Variables

You can configure the test with the following environment variables:

- `STRIPE_API_KEY`: Stripe API key to use for testing (default: placeholder test key)

Example:
```bash
STRIPE_API_KEY=sk_test_your_key npm run test:functional
```

## Adding New Tests

To add tests for other API providers:

1. Create a new test file in this directory (e.g., `test-github-server.ts`)
2. Implement similar steps: install, build, start, test, stop
3. Add a new script in package.json (e.g., `"test:functional:github": "ts-node src/test/functional/test-github-server.ts"`)

## Troubleshooting

If tests fail:

1. **Server not starting**: Check for errors in the server output.
2. **Connection refused**: Ensure the port is not already in use.
3. **Authentication errors**: Verify the API key is valid.
4. **Missing dependencies**: Ensure all dependencies are installed.