// HTTP test setup file

// This hook runs before all tests
beforeAll(() => {
  // Set the timeout to a longer value for HTTP tests
  jest.setTimeout(10000);
});

// This hook runs after all tests
afterAll(() => {
  // Ensure we clean up any pending timers
  jest.useRealTimers();
});