/**
 * Jest setup file
 * 
 * This file is run before Jest runs any tests.
 * It sets up mocks and other globals used in tests.
 */

// Mock process.exit to prevent tests from exiting
const originalProcessExit = process.exit;
process.exit = jest.fn((code?: number) => {
  console.log(`Mock process.exit called with code ${code}`);
  return undefined as never;
}) as any;

// Restore original process.exit after all tests
afterAll(() => {
  process.exit = originalProcessExit;
});

// Silence console output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (process.env.JEST_SILENT_CONSOLE !== 'false') {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
}

// Restore original console methods after all tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});